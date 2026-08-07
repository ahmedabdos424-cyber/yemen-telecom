import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import type { BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { captureError } from '../lib/monitor';

const CREDENTIAL_KEY = 'tele_biometric_credential';

export interface BiometricCredential {
  username: string;
  refreshToken: string;
  savedAt: number;
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

export async function isBiometricAvailable(): Promise<boolean> {
  if (!detectCapacitor()) return false;
  try {
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch (err) {
    captureError(err, 'isBiometricAvailable');
    return false;
  }
}

export async function authenticateBiometric(reason?: string): Promise<boolean> {
  if (!detectCapacitor()) return false;
  try {
    await BiometricAuth.authenticate({
      reason: reason || 'التحقق من هويتك للدخول السريع',
      androidTitle: 'الدخول بالبصمة',
      androidSubtitle: 'استخدم بصمة إصبعك أو قفل الجهاز للدخول',
      cancelTitle: 'إلغاء',
      allowDeviceCredential: true,
    });
    return true;
  } catch (err) {
    const code = (err as { code?: BiometryErrorType })?.code;
    if (code === 'userCancel' || code === 'systemCancel' || code === 'appCancel') {
      return false;
    }
    captureError(err, 'authenticateBiometric');
    return false;
  }
}

export async function saveBiometricCredential(credential: BiometricCredential): Promise<void> {
  try {
    const storage = await getStorage();
    await storage.set(CREDENTIAL_KEY, JSON.stringify(credential));
  } catch (err) {
    captureError(err, 'saveBiometricCredential');
  }
}

export async function getBiometricCredential(): Promise<BiometricCredential | null> {
  try {
    const storage = await getStorage();
    const raw = await storage.get(CREDENTIAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BiometricCredential;
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
