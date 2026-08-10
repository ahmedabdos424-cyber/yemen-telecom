import BiometricAuth, { type BiometryStatus } from '../plugins/BiometricAuth';
import { captureError } from '../lib/monitor';

const CREDENTIAL_KEY = 'tele_biometric_credential';

export interface BiometricCredential {
  username: string;
  refreshToken: string;
  savedAt: number;
}

export type { BiometryStatus };

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

/** Full device capability report from the native BiometricPrompt layer. */
export async function getBiometricStatus(): Promise<BiometryStatus> {
  if (!detectCapacitor()) return UNAVAILABLE_STATUS;
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

export async function authenticateBiometric(reason?: string): Promise<boolean> {
  if (!detectCapacitor()) return false;
  try {
    const result = await BiometricAuth.authenticate({
      reason: reason || 'التحقق من هويتك للدخول السريع',
      androidTitle: 'الدخول بالبصمة',
      androidSubtitle: 'استخدم بصمة إصبعك أو قفل الجهاز للدخول',
      cancelTitle: 'إلغاء',
      allowDeviceCredential: true,
    });
    return result?.verified === true;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'userCancel' || code === 'systemCancel' || code === 'appCancel' || code === 'canceled') {
      return false;
    }
    captureError(err, 'authenticateBiometric');
    return false;
  }
}

export async function saveBiometricCredential(credential: BiometricCredential): Promise<void> {
  try {
    const storage = await getStorage();
    const payload = JSON.stringify(credential);
    const toStore = detectCapacitor() ? await encryptValue(payload) : payload;
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
  try {
    const storage = await getStorage();
    const raw = await storage.get(CREDENTIAL_KEY);
    if (!raw) return null;
    let json = raw;
    if (detectCapacitor()) {
      const decrypted = await decryptValue(raw);
      if (decrypted === null) {
        await storage.remove(CREDENTIAL_KEY).catch(() => {});
        return null;
      }
      json = decrypted;
    }
    const parsed = JSON.parse(json) as BiometricCredential;
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
