/**
 * @vitest-environment jsdom
 *
 * Native session-token encryption (Keystore envelope) tests.
 * Mocks the Capacitor Preferences store and the BiometricAuth native plugin
 * with a reversible toy transform (NOT real crypto — shape-only fakes).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const prefStore: Record<string, string> = {};

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: prefStore[key] ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      prefStore[key] = value;
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      delete prefStore[key];
    }),
  },
}));

let encryptShouldFail = false;

vi.mock('../plugins/BiometricAuth', () => ({
  default: {
    // Toy "encryption": base64(iv) + '.' + base64(reversed plaintext).
    encrypt: vi.fn(async (data: string) => {
      if (encryptShouldFail) throw new Error('keystore unavailable');
      const rev = data.split('').reverse().join('');
      return {
        iv: btoa('iv'),
        ciphertext: btoa(unescape(encodeURIComponent(rev))),
      };
    }),
    decrypt: vi.fn(async (iv: string, ciphertext: string) => {
      if (iv !== btoa('iv')) throw Object.assign(new Error('bad key'), { code: 'decryptFailed' });
      const rev = decodeURIComponent(escape(atob(ciphertext)));
      return { data: rev.split('').reverse().join('') };
    }),
  },
}));

function setNative(native: boolean) {
  Object.defineProperty(window, 'Capacitor', {
    value: native ? { isNative: true } : undefined,
    writable: true,
    configurable: true,
  });
}

async function freshTokenStorage() {
  vi.resetModules();
  const mod = await import('../services/tokenStorage');
  return mod.tokenStorage;
}

beforeEach(() => {
  Object.keys(prefStore).forEach((k) => delete prefStore[k]);
  localStorage.clear();
  encryptShouldFail = false;
  vi.clearAllMocks();
});

afterEach(() => {
  setNative(false);
});

describe('Native encrypted token storage', () => {
  it('stores an encrypted envelope, never plaintext', async () => {
    setNative(true);
    const tokenStorage = await freshTokenStorage();
    await tokenStorage.setAuthToken('secret-jwt-value');

    const raw = prefStore['auth_token'];
    expect(raw).toBeDefined();
    expect(raw).not.toContain('secret-jwt-value');
    const envelope = JSON.parse(raw);
    expect(typeof envelope.iv).toBe('string');
    expect(typeof envelope.ciphertext).toBe('string');
  });

  it('round-trips through decrypt', async () => {
    setNative(true);
    const tokenStorage = await freshTokenStorage();
    await tokenStorage.setRefreshToken('refresh-abc-123');
    await expect(tokenStorage.getRefreshToken()).resolves.toBe('refresh-abc-123');
  });

  it('migrates legacy plaintext forward on read', async () => {
    setNative(true);
    prefStore['auth_token'] = 'legacy-plaintext-jwt';
    const tokenStorage = await freshTokenStorage();

    await expect(tokenStorage.getAuthToken()).resolves.toBe('legacy-plaintext-jwt');
    // Background migration rewrites the entry as an envelope.
    await vi.waitFor(() => {
      expect(prefStore['auth_token']).not.toBe('legacy-plaintext-jwt');
    });
    const envelope = JSON.parse(prefStore['auth_token']);
    expect(typeof envelope.ciphertext).toBe('string');
    // And the migrated value still reads back correctly.
    await expect(tokenStorage.getAuthToken()).resolves.toBe('legacy-plaintext-jwt');
  });

  it('drops undecryptable envelopes and returns null (clean re-login)', async () => {
    setNative(true);
    prefStore['auth_token'] = JSON.stringify({ iv: btoa('wrong'), ciphertext: btoa('junk') });
    const tokenStorage = await freshTokenStorage();

    await expect(tokenStorage.getAuthToken()).resolves.toBeNull();
    expect(prefStore['auth_token']).toBeUndefined();
  });

  it('falls back to plaintext Preferences when Keystore encrypt fails', async () => {
    setNative(true);
    encryptShouldFail = true;
    const tokenStorage = await freshTokenStorage();

    await tokenStorage.setAuthToken('fallback-jwt');
    expect(prefStore['auth_token']).toBe('fallback-jwt');
    await expect(tokenStorage.getAuthToken()).resolves.toBe('fallback-jwt');
  });

  it('wipes legacy WebView localStorage copies on native', async () => {
    setNative(true);
    localStorage.setItem('auth_token', 'stale-copy');
    localStorage.setItem('refresh_token', 'stale-copy');
    const tokenStorage = await freshTokenStorage();

    await tokenStorage.setAuthToken('fresh-jwt');
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});

describe('Web behavior unchanged', () => {
  it('keeps plaintext localStorage fallback on web', async () => {
    setNative(false);
    const tokenStorage = await freshTokenStorage();
    await tokenStorage.setAuthToken('web-jwt');
    expect(localStorage.getItem('auth_token')).toBe('web-jwt');
    await expect(tokenStorage.getAuthToken()).resolves.toBe('web-jwt');
    await tokenStorage.clearAll();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
