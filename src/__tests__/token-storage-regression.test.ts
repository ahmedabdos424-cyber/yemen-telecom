/**
 * @vitest-environment jsdom
 *
 * P0-03 Regression tests: token storage abstraction.
 * For web (non-Capacitor), tokenStorage persists tokens in localStorage so
 * the Authorization: Bearer header can always be attached (fixes "No token
 * provided" when the httpOnly cookie is unavailable). httpOnly cookies remain
 * the primary web session mechanism; localStorage is the fallback.
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

  describe('Web startup (localStorage adapter — Bearer fallback)', () => {
    it('should restore auth token from localStorage', async () => {
      localStorage.setItem('auth_token', 'test-web-token');
      const token = await tokenStorage.getAuthToken();
      expect(token).toBe('test-web-token');
    });

    it('should restore refresh token from localStorage', async () => {
      localStorage.setItem('refresh_token', 'test-refresh');
      const token = await tokenStorage.getRefreshToken();
      expect(token).toBe('test-refresh');
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

  describe('Token write -> read round-trip (web persists)', () => {
    it('should return the token after setAuthToken', async () => {
      await tokenStorage.setAuthToken('roundtrip-auth');
      const stored = await tokenStorage.getAuthToken();
      expect(stored).toBe('roundtrip-auth');
    });

    it('should return the token after setRefreshToken', async () => {
      await tokenStorage.setRefreshToken('roundtrip-refresh');
      const stored = await tokenStorage.getRefreshToken();
      expect(stored).toBe('roundtrip-refresh');
    });

    it('should removeAuthToken', async () => {
      await tokenStorage.setAuthToken('to-remove');
      await tokenStorage.removeAuthToken();
      const stored = await tokenStorage.getAuthToken();
      expect(stored).toBeNull();
    });

    it('should removeRefreshToken', async () => {
      await tokenStorage.setRefreshToken('to-remove');
      await tokenStorage.removeRefreshToken();
      const stored = await tokenStorage.getRefreshToken();
      expect(stored).toBeNull();
    });

    it('should clearAll', async () => {
      await tokenStorage.setAuthToken('auth-val');
      await tokenStorage.setRefreshToken('refresh-val');
      await tokenStorage.clearAll();
      expect(await tokenStorage.getAuthToken()).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
    });
  });

  describe('loadTokens() from client.ts', () => {
    it('should restore tokens from localStorage for web', async () => {
      localStorage.setItem('auth_token', 'load-auth-test');
      localStorage.setItem('refresh_token', 'load-refresh-test');
      const result = await loadTokens();
      expect(result.authToken).toBe('load-auth-test');
      expect(result.refreshToken).toBe('load-refresh-test');
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

    it('setToken should update in-memory AND persist to localStorage', async () => {
      setToken('write-auth');
      const stored = await tokenStorage.getAuthToken();
      expect(stored).toBe('write-auth');
      const mem = getLoadedTokens();
      expect(mem.authToken).toBe('write-auth');
    });

    it('setRefreshToken should update in-memory AND persist to localStorage', async () => {
      setRefreshToken('write-refresh');
      const stored = await tokenStorage.getRefreshToken();
      expect(stored).toBe('write-refresh');
      const mem = getLoadedTokens();
      expect(mem.refreshToken).toBe('write-refresh');
    });

    it('clearTokens should clear in-memory and storage', async () => {
      setToken('clear-auth');
      setRefreshToken('clear-refresh');
      clearTokens();
      const mem = getLoadedTokens();
      expect(mem.authToken).toBeNull();
      expect(mem.refreshToken).toBeNull();
      expect(await tokenStorage.getAuthToken()).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
    });
  });

  describe('Session restore simulation (web persists)', () => {
    beforeEach(() => {
      clearTokens();
      localStorage.clear();
    });

    it('should restore tokens from a previous session', async () => {
      await tokenStorage.setAuthToken('session-auth');
      await tokenStorage.setRefreshToken('session-refresh');
      const authToken = await tokenStorage.getAuthToken();
      const refreshToken = await tokenStorage.getRefreshToken();
      expect(authToken).toBe('session-auth');
      expect(refreshToken).toBe('session-refresh');
    });

    it('should detect no session when no tokens exist', async () => {
      const authToken = await tokenStorage.getAuthToken();
      expect(authToken).toBeNull();
    });
  });

  describe('Logout flow', () => {
    it('should clear in-memory and persisted tokens with clearTokens', async () => {
      setToken('logout-auth');
      setRefreshToken('logout-refresh');
      localStorage.setItem('tele_role', 'agent');
      clearTokens();
      const mem = getLoadedTokens();
      expect(mem.authToken).toBeNull();
      expect(mem.refreshToken).toBeNull();
      expect(await tokenStorage.getAuthToken()).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
      expect(localStorage.getItem('tele_role')).toBe('agent');
    });
  });
});
