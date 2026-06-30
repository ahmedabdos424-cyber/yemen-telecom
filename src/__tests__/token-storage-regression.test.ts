/**
 * @vitest-environment jsdom
 *
 * P0-03 Regression tests: token storage abstraction.
 * For web (non-Capacitor), tokenStorage uses a noop adapter.
 * Tokens are stored in httpOnly cookies, not accessible via JS.
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (_index: number) => null,
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

import { tokenStorage } from '../services/tokenStorage';
import { loadTokens, getLoadedTokens, setToken, setRefreshToken, clearTokens } from '../api/client';

describe('P0-03 Token Storage Abstraction', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Web startup (noop adapter — httpOnly cookies)', () => {
    it('should return null from getAuthToken (web uses httpOnly cookies)', async () => {
      localStorage.setItem('auth_token', 'test-web-token');
      const token = await tokenStorage.getAuthToken();
      expect(token).toBeNull();
    });

    it('should return null from getRefreshToken (web uses httpOnly cookies)', async () => {
      localStorage.setItem('refresh_token', 'test-refresh');
      const token = await tokenStorage.getRefreshToken();
      expect(token).toBeNull();
    });

    it('should return null when no auth_token exists', async () => {
      const token = await tokenStorage.getAuthToken();
      expect(token).toBeNull();
    });

    it('should return null when no refresh_token exists', async () => {
      const token = await tokenStorage.getRefreshToken();
      expect(token).toBeNull();
    });
  });

  describe('Token write -> read round-trip (web = noop)', () => {
    it('should return null after setAuthToken (web does not persist)', async () => {
      await tokenStorage.setAuthToken('roundtrip-auth');
      const stored = await tokenStorage.getAuthToken();
      expect(stored).toBeNull();
    });

    it('should return null after setRefreshToken (web does not persist)', async () => {
      await tokenStorage.setRefreshToken('roundtrip-refresh');
      const stored = await tokenStorage.getRefreshToken();
      expect(stored).toBeNull();
    });

    it('should noop removeAuthToken', async () => {
      await tokenStorage.setAuthToken('to-remove');
      await tokenStorage.removeAuthToken();
      const stored = await tokenStorage.getAuthToken();
      expect(stored).toBeNull();
    });

    it('should noop removeRefreshToken', async () => {
      await tokenStorage.setRefreshToken('to-remove');
      await tokenStorage.removeRefreshToken();
      const stored = await tokenStorage.getRefreshToken();
      expect(stored).toBeNull();
    });

    it('should noop clearAll', async () => {
      await tokenStorage.setAuthToken('auth-val');
      await tokenStorage.setRefreshToken('refresh-val');
      await tokenStorage.clearAll();
      expect(await tokenStorage.getAuthToken()).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
    });
  });

  describe('loadTokens() from client.ts', () => {
    it('should return null tokens for web (httpOnly cookies)', async () => {
      localStorage.setItem('auth_token', 'load-auth-test');
      localStorage.setItem('refresh_token', 'load-refresh-test');
      const result = await loadTokens();
      expect(result.authToken).toBeNull();
      expect(result.refreshToken).toBeNull();
    });
  });

  describe('getLoadedTokens() from client.ts', () => {
    it('should reflect current in-memory state', async () => {
      setToken('sync-set-auth');
      setRefreshToken('sync-set-refresh');
      const state = getLoadedTokens();
      expect(state.authToken).toBe('sync-set-auth');
      expect(state.refreshToken).toBe('sync-set-refresh');
    });

    it('should reflect cleared state', async () => {
      setToken('temp');
      setRefreshToken('temp');
      clearTokens();
      const state = getLoadedTokens();
      expect(state.authToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });
  });

  describe('setToken + setRefreshToken (write path)', () => {
    beforeEach(() => {
      clearTokens();
    });

    it('setToken should update in-memory but NOT persist to localStorage', async () => {
      setToken('write-auth');
      const stored = await tokenStorage.getAuthToken();
      expect(stored).toBeNull();
      const mem = getLoadedTokens();
      expect(mem.authToken).toBe('write-auth');
    });

    it('setRefreshToken should update in-memory but NOT persist to localStorage', async () => {
      setRefreshToken('write-refresh');
      const stored = await tokenStorage.getRefreshToken();
      expect(stored).toBeNull();
      const mem = getLoadedTokens();
      expect(mem.refreshToken).toBe('write-refresh');
    });

    it('clearTokens should clear in-memory', async () => {
      setToken('clear-auth');
      setRefreshToken('clear-refresh');
      clearTokens();
      const mem = getLoadedTokens();
      expect(mem.authToken).toBeNull();
      expect(mem.refreshToken).toBeNull();
    });
  });

  describe('Session restore simulation (web = noop)', () => {
    beforeEach(() => {
      clearTokens();
      localStorage.clear();
    });

    it('should not restore tokens from a previous session (httpOnly cookies)', async () => {
      await tokenStorage.setAuthToken('session-auth');
      await tokenStorage.setRefreshToken('session-refresh');
      const authToken = await tokenStorage.getAuthToken();
      const refreshToken = await tokenStorage.getRefreshToken();
      expect(authToken).toBeNull();
      expect(refreshToken).toBeNull();
    });

    it('should detect no session when no tokens exist', async () => {
      const authToken = await tokenStorage.getAuthToken();
      expect(authToken).toBeNull();
    });
  });

  describe('Logout flow', () => {
    it('should clear in-memory tokens with clearAll', async () => {
      setToken('logout-auth');
      setRefreshToken('logout-refresh');
      localStorage.setItem('tele_role', 'agent');
      clearTokens();
      const mem = getLoadedTokens();
      expect(mem.authToken).toBeNull();
      expect(mem.refreshToken).toBeNull();
      expect(localStorage.getItem('tele_role')).toBe('agent');
    });
  });
});
