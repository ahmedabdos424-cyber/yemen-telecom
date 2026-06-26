/**
 * Token Storage Abstraction
 *
 * Provides a unified interface for token storage across platforms.
 * - localStorage: Default for browser/web
 * - Capacitor Preferences: Encrypted storage for native Android
 *
 * Auto-detects platform and uses appropriate storage.
 * Backward compatible with existing localStorage-based tokens.
 *
 * TODO: Migrate to httpOnly cookies (server-set) to prevent XSS token theft.
 *       localStorage tokens are accessible to any JS running on the page.
 *       This requires: 1) Server-side cookie setting on login/refresh,
 *       2) CSRF token in response body, 3) No JS access to cookie.
 */

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

let isCapacitor = false;
try {
  isCapacitor = !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
} catch {
  // Not in a browser/Capacitor environment
}

async function getCapacitorStorage(): Promise<{
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}> {
  try {
    // @ts-ignore - dynamically imported only on Capacitor native; falls back to localStorage if unavailable
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
    // Capacitor Preferences not available, fall back to localStorage
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
    storageAdapter = isCapacitor ? await getCapacitorStorage() : getLocalStorageAdapter();
  }
  return storageAdapter;
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

  /** Sync getter for backward compatibility with existing code */
  getAuthTokenSync(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  getRefreshTokenSync(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
};
