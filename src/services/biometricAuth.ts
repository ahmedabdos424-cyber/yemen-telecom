import BiometricAuth, { type BiometryStatus } from '../plugins/BiometricAuth';
import { captureError } from '../lib/monitor';

const CREDENTIAL_KEY = 'tele_biometric_credential';

export interface BiometricCredential {
  username: string;
  refreshToken: string;
  savedAt: number;
}

export type { BiometryStatus };

/** Outcome of a single biometric prompt so callers can tell a user cancel
 *  apart from a genuine verification failure and react accordingly. */
export interface BiometricAuthResult {
  verified: boolean;
  /** True when the user dismissed the system prompt (not a failure). */
  cancelled: boolean;
  code?: string;
  message?: string;
}

/** Result of enabling quick-login from a settings toggle. */
export interface BiometricToggleResult {
  enabled: boolean;
  cancelled: boolean;
  message?: string;
}

/** Thrown by the login flow so the UI can separate a user cancel from a
 *  real biometric failure and avoid scary/incorrect toasts. */
export class BiometricAuthError extends Error {
  cancelled: boolean;
  code?: string;
  constructor(message: string, cancelled: boolean, code?: string) {
    super(message);
    this.name = 'BiometricAuthError';
    this.cancelled = cancelled;
    this.code = code;
  }
}

function detectCapacitor(): boolean {
  try {
    return !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
  } catch {
    return false;
  }
}

async function getCapacitorStorage(): Promise<{
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    return {
      get: async (key: string) => {
        const result = await Preferences.get({ key });
        return result.value;
      },
      set: async (key: string, value: string) => {
        await Preferences.set({ key, value });
      },
      remove: async (key: string) => {
        await Preferences.remove({ key });
      },
    };
  } catch {
    return getLocalStorageAdapter();
  }
}

function getLocalStorageAdapter() {
  return {
    get: async (key: string) => localStorage.getItem(key),
    set: async (key: string, value: string) => { localStorage.setItem(key, value); },
    remove: async (key: string) => { localStorage.removeItem(key); },
  };
}

let storageAdapter: ReturnType<typeof getLocalStorageAdapter> | null = null;

async function getStorage() {
  if (!storageAdapter) {
    storageAdapter = detectCapacitor() ? await getCapacitorStorage() : getLocalStorageAdapter();
  }
  return storageAdapter;
}

export function isNativeBiometrics(): boolean {
  return detectCapacitor();
}

const UNAVAILABLE_STATUS: BiometryStatus = {
  isAvailable: false,
  isEnrolled: false,
  hardwarePresent: false,
};

const WEB_UNAVAILABLE_STATUS: BiometryStatus = {
  ...UNAVAILABLE_STATUS,
  errorMessage: 'الدخول السريع بالبصمة متاح في تطبيق الجوال فقط، وليس عبر متصفح الويب',
};

/** Full device capability report from the native BiometricPrompt layer. */
export async function getBiometricStatus(): Promise<BiometryStatus> {
  if (!detectCapacitor()) return WEB_UNAVAILABLE_STATUS;
  try {
    const result = await BiometricAuth.checkBiometry();
    return {
      isAvailable: result?.isAvailable === true,
      isEnrolled: result?.isEnrolled === true,
      hardwarePresent: result?.hardwarePresent === true,
      errorMessage: result?.errorMessage,
    };
  } catch (err) {
    captureError(err, 'checkBiometry');
    return UNAVAILABLE_STATUS;
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  const status = await getBiometricStatus();
  return status.isAvailable;
}

export async function isBiometricEnrolled(): Promise<boolean> {
  const status = await getBiometricStatus();
  return status.isEnrolled;
}

const CANCEL_CODES = new Set(['userCancel', 'systemCancel', 'appCancel', 'canceled']);

export async function authenticateBiometric(reason?: string): Promise<BiometricAuthResult> {
  if (!detectCapacitor()) return { verified: false, cancelled: false, code: 'web' };
  try {
    const result = await BiometricAuth.authenticate({
      reason: reason || 'التحقق من هويتك للدخول السريع',
      androidTitle: 'الدخول بالبصمة',
      androidSubtitle: 'استخدم بصمة إصبعك أو قفل الجهاز للدخول',
      cancelTitle: 'إلغاء',
      allowDeviceCredential: true,
    });
    return { verified: result?.verified === true, cancelled: false };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
    const cancelled = CANCEL_CODES.has(code ?? '');
    if (!cancelled) captureError(err, 'authenticateBiometric');
    return { verified: false, cancelled, code, message };
  }
}

export async function saveBiometricCredential(credential: BiometricCredential): Promise<void> {
  // Web (non-Capacitor) never persists credentials: localStorage is readable by
  // any script (e.g. via XSS) and would leak the refresh token. Native Android
  // stores it inside the Android Keystore (see plugins/BiometricAuth.encrypt).
  if (!detectCapacitor()) return;
  try {
    const storage = await getStorage();
    const payload = JSON.stringify(credential);
    const toStore = await encryptValue(payload);
    await storage.set(CREDENTIAL_KEY, toStore);
  } catch (err) {
    captureError(err, 'saveBiometricCredential');
  }
}

interface EncryptedEnvelope {
  v: 1;
  iv: string;
  data: string;
}

async function encryptValue(plaintext: string): Promise<string> {
  const { iv, ciphertext } = await BiometricAuth.encrypt(plaintext);
  const envelope: EncryptedEnvelope = { v: 1, iv, data: ciphertext };
  return JSON.stringify(envelope);
}

async function decryptValue(raw: string): Promise<string | null> {
  try {
    const envelope = JSON.parse(raw) as Partial<EncryptedEnvelope>;
    if (envelope?.v !== 1 || typeof envelope.iv !== 'string' || typeof envelope.data !== 'string') {
      return null;
    }
    const result = await BiometricAuth.decrypt(envelope.iv, envelope.data);
    return result?.data ?? null;
  } catch {
    return null;
  }
}

export async function getBiometricCredential(): Promise<BiometricCredential | null> {
  // On web, biometry is unavailable and we must never resume a session from a
  // locally stored refresh token. Wipe any legacy web-stored credential too so
  // a previously persisted token can never be silently reused after an XSS.
  if (!detectCapacitor()) {
    try {
      localStorage.removeItem(CREDENTIAL_KEY);
    } catch {
      /* noop */
    }
    return null;
  }
  try {
    const storage = await getStorage();
    const raw = await storage.get(CREDENTIAL_KEY);
    if (!raw) return null;
    const decrypted = await decryptValue(raw);
    if (decrypted === null) {
      await storage.remove(CREDENTIAL_KEY).catch(() => {});
      return null;
    }
    const parsed = JSON.parse(decrypted) as BiometricCredential;
    if (!parsed.username || !parsed.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearBiometricCredential(): Promise<void> {
  try {
    const storage = await getStorage();
    await storage.remove(CREDENTIAL_KEY);
  } catch {
    /* noop */
  }
}

export async function hasBiometricCredential(): Promise<boolean> {
  return (await getBiometricCredential()) !== null;
}
