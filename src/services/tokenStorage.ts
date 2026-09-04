import { captureError } from '../lib/monitor';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

interface AsyncKV {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

function detectCapacitor(): boolean {
  try {
    return !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
  } catch {
    return false;
  }
}

async function getPreferences(): Promise<AsyncKV | null> {
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
    return null;
  }
}

let prefsPromise: Promise<AsyncKV | null> | null = null;
function preferences(): Promise<AsyncKV | null> {
  if (!prefsPromise) prefsPromise = getPreferences();
  return prefsPromise;
}

function getLocalStorageAdapter(): AsyncKV {
  return {
    get: async (key: string) => localStorage.getItem(key),
    set: async (key: string, value: string) => { localStorage.setItem(key, value); },
    remove: async (key: string) => { localStorage.removeItem(key); },
  };
}

// ---------- Android Keystore envelope (native only) ----------
// The native BiometricAuth.encrypt/decrypt pair uses an AES-256-GCM key held
// in the Android Keystore. The key is non-extractable and — importantly —
// created WITHOUT setUserAuthenticationRequired, so silent background
// encrypt/decrypt works with no biometric prompt (no UX change).

interface KeystoreEnvelope {
  iv: string;
  ciphertext: string;
}

function looksEncrypted(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as Partial<KeystoreEnvelope>;
    return typeof parsed?.iv === 'string' && typeof parsed?.ciphertext === 'string';
  } catch {
    return false;
  }
}

async function encryptNative(plaintext: string): Promise<string | null> {
  try {
    const mod = await import('../plugins/BiometricAuth');
    const out = await mod.default.encrypt(plaintext);
    if (!out || typeof out.iv !== 'string' || typeof out.ciphertext !== 'string') {
      return null;
    }
    const envelope: KeystoreEnvelope = { iv: out.iv, ciphertext: out.ciphertext };
    return JSON.stringify(envelope);
  } catch (err) {
    captureError(err, 'tokenEncrypt');
    return null;
  }
}

async function decryptNative(raw: string): Promise<string | null> {
  try {
    const parsed = JSON.parse(raw) as KeystoreEnvelope;
    const mod = await import('../plugins/BiometricAuth');
    const out = await mod.default.decrypt(parsed.iv, parsed.ciphertext);
    return out?.data ?? null;
  } catch {
    return null;
  }
}

// One-time migration hygiene: if any legacy plaintext copies of the session
// tokens exist in WebView localStorage, drop them — Preferences (encrypted)
// is the source of truth on native.
let legacyWiped = false;
async function wipeLegacyLocalCopies(): Promise<void> {
  if (legacyWiped) return;
  legacyWiped = true;
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    /* noop */
  }
}

/**
 * Native adapter: tokens rest Keystore-encrypted inside Preferences.
 * - set: encrypt, falling back to plaintext Preferences only if the
 *   Keystore call fails (availability beats perfect secrecy).
 * - get: decrypt; legacy plaintext values are served once and migrated
 *   forward in the background; undecryptable envelopes (Keystore key
 *   rotated/reset) are dropped so the refresh flow forces a clean re-login.
 */
const secureAdapter: AsyncKV = {
  get: async (key: string) => {
    const prefs = await preferences();
    if (!prefs) return getLocalStorageAdapter().get(key);
    await wipeLegacyLocalCopies();
    const raw = await prefs.get(key);
    if (!raw) return null;
    if (!looksEncrypted(raw)) {
      void encryptNative(raw).then((enc) => {
        if (enc) void prefs.set(key, enc).catch(() => undefined);
      });
      return raw;
    }
    const data = await decryptNative(raw);
    if (data === null) {
      await prefs.remove(key).catch(() => undefined);
      return null;
    }
    return data;
  },

  set: async (key: string, value: string) => {
    const prefs = await preferences();
    if (!prefs) {
      await getLocalStorageAdapter().set(key, value);
      return;
    }
    await wipeLegacyLocalCopies();
    const enc = await encryptNative(value);
    await prefs.set(key, enc ?? value);
  },

  remove: async (key: string) => {
    const prefs = await preferences();
    if (!prefs) {
      await getLocalStorageAdapter().remove(key);
      return;
    }
    await prefs.remove(key).catch(() => undefined);
  },
};

let localAdapter: AsyncKV | null = null;

async function getStorage(): Promise<AsyncKV> {
  // Evaluated per call (not cached at module load) so a late-injected
  // Capacitor bridge can never leave the native app on the web adapter.
  if (detectCapacitor()) return secureAdapter;
  if (!localAdapter) localAdapter = getLocalStorageAdapter();
  return localAdapter;
}

export const tokenStorage = {
  async getAuthToken(): Promise<string | null> {
    const storage = await getStorage();
    return storage.get(STORAGE_KEYS.AUTH_TOKEN);
  },

  async setAuthToken(token: string): Promise<void> {
    const storage = await getStorage();
    await storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async removeAuthToken(): Promise<void> {
    const storage = await getStorage();
    await storage.remove(STORAGE_KEYS.AUTH_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    const storage = await getStorage();
    return storage.get(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setRefreshToken(token: string): Promise<void> {
    const storage = await getStorage();
    await storage.set(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async removeRefreshToken(): Promise<void> {
    const storage = await getStorage();
    await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async clearAll(): Promise<void> {
    const storage = await getStorage();
    await storage.remove(STORAGE_KEYS.AUTH_TOKEN);
    await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
  },
};
