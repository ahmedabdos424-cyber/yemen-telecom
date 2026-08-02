const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

let isCapacitor = false;
try {
  isCapacitor = !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
} catch {
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

  getAuthTokenSync(): string | null {
    return isCapacitor ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
  },

  getRefreshTokenSync(): string | null {
    return isCapacitor ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) : null;
  },
};
