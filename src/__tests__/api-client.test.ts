/**
 * @vitest-environment jsdom
 *
 * Tests for api/client.ts — the fetch wrapper, token management, CSRF, and all api.* methods.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../services/tokenStorage.ts', () => ({
  tokenStorage: {
    getAuthToken: vi.fn().mockResolvedValue(null),
    setAuthToken: vi.fn().mockResolvedValue(undefined),
    removeAuthToken: vi.fn().mockResolvedValue(undefined),
    getRefreshToken: vi.fn().mockResolvedValue(null),
    setRefreshToken: vi.fn().mockResolvedValue(undefined),
    removeRefreshToken: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../lib/monitor.ts', () => ({
  captureTiming: vi.fn(),
}));

// ── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// We need to import the module after mocks are set up
let api: typeof import('../api/client').api;
let setToken: typeof import('../api/client').setToken;
let setRefreshToken: typeof import('../api/client').setRefreshToken;
let clearTokens: typeof import('../api/client').clearTokens;
let fetchCsrfToken: typeof import('../api/client').fetchCsrfToken;
let loadTokens: typeof import('../api/client').loadTokens;
let getLoadedTokens: typeof import('../api/client').getLoadedTokens;

beforeEach(async () => {
  mockFetch.mockReset();
  // Default: no CSRF endpoint
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/csrf-token')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'csrf-tok', hash: 'csrf-h' }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });

  // Re-import to reset module state
  const mod = await import('../api/client');
  api = mod.api;
  setToken = mod.setToken;
  setRefreshToken = mod.setRefreshToken;
  clearTokens = mod.clearTokens;
  fetchCsrfToken = mod.fetchCsrfToken;
  loadTokens = mod.loadTokens;
  getLoadedTokens = mod.getLoadedTokens;
});

// ── Token helpers ────────────────────────────────────────────────────────────

describe('setToken / setRefreshToken / clearTokens / getLoadedTokens', () => {
  it('setToken stores token in module state', () => {
    setToken('abc');
    expect(getLoadedTokens().authToken).toBe('abc');
  });

  it('setToken(null) clears the token', () => {
    setToken('abc');
    setToken(null);
    expect(getLoadedTokens().authToken).toBeNull();
  });

  it('setRefreshToken stores refresh token', () => {
    setRefreshToken('r1');
    expect(getLoadedTokens().refreshToken).toBe('r1');
  });

  it('clearTokens clears both tokens', () => {
    setToken('a');
    setRefreshToken('b');
    clearTokens();
    expect(getLoadedTokens().authToken).toBeNull();
    expect(getLoadedTokens().refreshToken).toBeNull();
  });
});

// ── loadTokens ───────────────────────────────────────────────────────────────

describe('loadTokens', () => {
  it('returns nulls when not Capacitor', async () => {
    const result = await loadTokens();
    expect(result).toEqual({ authToken: null, refreshToken: null });
  });
});

// ── fetchCsrfToken ───────────────────────────────────────────────────────────

describe('fetchCsrfToken', () => {
  it('fetches CSRF token from server', async () => {
    mockFetch.mockImplementationOnce((url: string) => {
      if (url.includes('/csrf-token')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'tok1', hash: 'hash1' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    await fetchCsrfToken();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/csrf-token'),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('handles fetch failure gracefully', async () => {
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('network')));
    await expect(fetchCsrfToken()).resolves.toBeUndefined();
  });

  it('handles non-ok response', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500 })
    );
    await expect(fetchCsrfToken()).resolves.toBeUndefined();
  });
});

// ── api.login ────────────────────────────────────────────────────────────────

describe('api.login', () => {
  it('sends POST with username and password', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: 'jwt', refreshToken: 'rt', user: { id: 1, username: 'u', displayName: 'U', role: 'manager', phone: '', region: '' } }),
      })
    );
    const result = await api.login('admin', 'pass');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.token).toBe('jwt');
    expect(result.user.role).toBe('manager');
  });

  it('throws on login failure', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Bad credentials' }) })
    );
    await expect(api.login('admin', 'wrong')).rejects.toThrow('Bad credentials');
  });
});

// ── api.getMe ────────────────────────────────────────────────────────────────

describe('api.getMe', () => {
  it('fetches current user', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1, username: 'admin' }) })
    );
    const result = await api.getMe();
    expect(result.username).toBe('admin');
  });
});

// ── api.logout ───────────────────────────────────────────────────────────────

describe('api.logout', () => {
  it('sends POST to logout', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await api.logout();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

// ── api.getSims / createSim / updateSim / deleteSim ──────────────────────────

describe('api SIMs CRUD', () => {
  it('getSims fetches list', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1 }]) })
    );
    const result = await api.getSims();
    expect(result).toEqual([{ id: 1 }]);
  });

  it('createSim sends POST', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 2 }) })
    );
    const result = await api.createSim({ iccid: '123' });
    expect(result.id).toBe(2);
  });

  it('updateSim sends PUT', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1, status: 'sold' }) })
    );
    const result = await api.updateSim(1, { status: 'sold' });
    expect(result.status).toBe('sold');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sims/1'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('deleteSim sends DELETE', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await api.deleteSim(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sims/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

// ── api Agents ───────────────────────────────────────────────────────────────

describe('api Agents CRUD', () => {
  it('getAgents', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getAgents()).toEqual([]);
  });

  it('createAgent', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'a1' }) })
    );
    expect((await api.createAgent({ name: 'Agent1' })).id).toBe('a1');
  });

  it('updateAgent', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1 }) })
    );
    await api.updateAgent(1, { name: 'New' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/agents/1'),
      expect.objectContaining({ method: 'PUT' })
    );
  });
});

// ── api Sellers ──────────────────────────────────────────────────────────────

describe('api Sellers CRUD', () => {
  it('getSellers', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getSellers()).toEqual([]);
  });

  it('createSeller', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 's1' }) })
    );
    expect((await api.createSeller({ name: 'S1' })).id).toBe('s1');
  });

  it('updateSeller', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await api.updateSeller(1, { name: 'X' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sellers/1'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('updateSellerBalance', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await api.updateSellerBalance(1, 500);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sellers/1/balance'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('deleteSeller', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await api.deleteSeller(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sellers/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('resetSellerPassword', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'ok', credentials: { username: 'u', password: 'p' } }),
      })
    );
    const result = await api.resetSellerPassword(1);
    expect(result.credentials.username).toBe('u');
  });
});

// ── api Operations ───────────────────────────────────────────────────────────

describe('api Operations', () => {
  it('getOperations', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getOperations()).toEqual([]);
  });

  it('createOperation', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'op1' }) })
    );
    const result = await api.createOperation({ type: 'activate' });
    expect(result.id).toBe('op1');
  });
});

// ── api Inventories ──────────────────────────────────────────────────────────

describe('api Inventories', () => {
  it('getInventories', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getInventories()).toEqual([]);
  });

  it('updateInventories', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    await api.updateInventories([{ operator: 'yemen_mobile', available: 10, remaining: 5, periodDays: 30 }]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventories'),
      expect.objectContaining({ method: 'PUT' })
    );
  });
});

// ── api Alerts ───────────────────────────────────────────────────────────────

describe('api Alerts', () => {
  it('getAlerts', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getAlerts()).toEqual([]);
  });

  it('resolveAlert', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await api.resolveAlert(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/alerts/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

// ── api Admin ────────────────────────────────────────────────────────────────

describe('api Admin', () => {
  it('getStats', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ total: 100 }) })
    );
    expect((await api.getStats()).total).toBe(100);
  });

  it('getSettings', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ language: 'ar' }) })
    );
    expect((await api.getSettings()).language).toBe('ar');
  });

  it('updateSettings', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await api.updateSettings({ language: 'en' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/settings'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('getTransactions', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getTransactions()).toEqual([]);
  });

  it('getDuplicateIdentities', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getDuplicateIdentities()).toEqual([]);
  });

  it('getAuditLogs', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getAuditLogs()).toEqual([]);
  });
});

// ── api System: Backup / Lockdown ────────────────────────────────────────────

describe('api System', () => {
  it('createBackup', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, filename: 'b.sql.gz', size: 1000, sizeFormatted: '1KB', tables: 5, records: 100, downloadUrl: '/dl' }),
      })
    );
    const result = await api.createBackup();
    expect(result.filename).toBe('b.sql.gz');
  });

  it('downloadBackup returns a URL', () => {
    const url = api.downloadBackup('backup.sql.gz');
    expect(url).toContain('backup.sql.gz');
  });

  it('toggleLockdown', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, locked: true, message: 'locked' }),
      })
    );
    const result = await api.toggleLockdown();
    expect(result.locked).toBe(true);
  });

  it('getLockdownStatus', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ locked: false }) })
    );
    const result = await api.getLockdownStatus();
    expect(result.locked).toBe(false);
  });
});

// ── api Account ──────────────────────────────────────────────────────────────

describe('api Account', () => {
  it('deleteAccount', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
    );
    const result = await api.deleteAccount();
    expect(result.success).toBe(true);
  });
});

// ── api Reports ──────────────────────────────────────────────────────────────

describe('api Reports', () => {
  it('getDailySales', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getDailySales()).toEqual([]);
  });

  it('getAgentPerformance', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getAgentPerformance()).toEqual([]);
  });

  it('getOperatorDistribution', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ yemen_mobile: 50 }) })
    );
    expect((await api.getOperatorDistribution()).yemen_mobile).toBe(50);
  });

  it('getSellerPerformance', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    expect(await api.getSellerPerformance()).toEqual([]);
  });
});

// ── api User Profile / Password ──────────────────────────────────────────────

describe('api User profile/password', () => {
  it('updatePassword', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await api.updatePassword('old', 'new');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/password'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('updateProfile', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await api.updateProfile({ phone: '123' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/profile'),
      expect.objectContaining({ method: 'PUT' })
    );
  });
});

// ── Error handling ───────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('throws on non-ok response with error message', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      })
    );
    await expect(api.getStats()).rejects.toThrow('Server error');
  });

  it('throws on non-ok response with statusText fallback', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.reject(new Error('no json')),
      })
    );
    await expect(api.getStats()).rejects.toThrow('Not Found');
  });

  it('handles network failure (fetch rejects)', async () => {
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));
    await expect(api.getStats()).rejects.toThrow('Network error');
  });
});

// ── CSRF retry on 403 ────────────────────────────────────────────────────────

describe('CSRF retry', () => {
  it('retries with new CSRF token on 403 CSRF error', async () => {
    let callCount = 0;
    mockFetch.mockImplementation((url: string) => {
      callCount++;
      if (url.includes('/csrf-token') && callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'old', hash: 'old-h' }) });
      }
      if (url.includes('/stats') && callCount === 2) {
        return Promise.resolve({
          ok: false, status: 403,
          json: () => Promise.resolve({ error: 'CSRF token invalid' }),
        });
      }
      if (url.includes('/csrf-token') && callCount === 3) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'new', hash: 'new-h' }) });
      }
      if (url.includes('/stats') && callCount === 4) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: 1 }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // First trigger fetchCsrfToken
    await fetchCsrfToken();

    // Now make a request that hits 403 CSRF
    // The request function calls fetchCsrfToken internally on 403 CSRF
    const result = await api.getStats();
    expect(result).toEqual({ data: 1 });
  });
});

// ── Upload ───────────────────────────────────────────────────────────────────

describe('api.uploadFile', () => {
  it('uploads a file with FormData', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ url: '/img.jpg', filename: 'img.jpg' }) })
    );
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    const result = await api.uploadFile(file);
    expect(result.url).toBe('/img.jpg');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/upload/image'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws on upload failure', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 413,
        statusText: 'Too Large',
        json: () => Promise.reject(new Error('no json')),
      })
    );
    const file = new File(['x'], 'big.png', { type: 'image/png' });
    await expect(api.uploadFile(file)).rejects.toThrow('Too Large');
  });
});
