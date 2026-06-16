import { tokenStorage } from '../services/tokenStorage.ts';
import { captureTiming } from '../lib/monitor.ts';

const REQUEST_TIMEOUT_MS = 15000;

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

const isCapacitor = !!(window as any).Capacitor?.isNative;
const hostname = window.location.hostname;
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('192.168.');
const API_BASE = isCapacitor || (!import.meta.env.DEV && !isLocal)
  ? 'https://yemen-telecom-api.onrender.com/api'
  : '/api';

let authToken: string | null = tokenStorage.getAuthTokenSync();
let refreshToken: string | null = tokenStorage.getRefreshTokenSync();
let csrfToken: string | null = null;
let csrfHash: string | null = null;
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    tokenStorage.setAuthToken(token);
  } else {
    tokenStorage.removeAuthToken();
  }
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
  if (token) {
    tokenStorage.setRefreshToken(token);
  } else {
    tokenStorage.removeRefreshToken();
  }
}

export function clearTokens() {
  setToken(null);
  setRefreshToken(null);
}

export async function fetchCsrfToken(): Promise<void> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/csrf-token`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.token;
      csrfHash = data.hash;
    }
  } catch {
    csrfToken = null;
    csrfHash = null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = await res.json();
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    return data.token;
  } catch {
    clearTokens();
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const start = performance.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const isLogout = path === '/auth/logout';
  if (csrfToken && csrfHash && ((!path.startsWith('/auth/') && path !== '/csrf-token') || isLogout)) {
    headers['X-CSRF-Token'] = csrfToken;
    headers['X-CSRF-Hash'] = csrfHash;
  }
  if (refreshToken && isLogout) {
    headers['X-Refresh-Token'] = refreshToken;
  }
  const res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 403 && !path.startsWith('/auth/') && path !== '/csrf-token') {
    const errBody = await res.json().catch(() => ({}));
    if (errBody.error && (errBody.error.includes('CSRF'))) {
      await fetchCsrfToken();
      if (csrfToken && csrfHash) {
        headers['X-CSRF-Token'] = csrfToken;
        headers['X-CSRF-Hash'] = csrfHash;
        const retryRes = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers });
        if (!retryRes.ok) {
          const err2 = await retryRes.json().catch(() => ({ error: retryRes.statusText }));
          const dur = performance.now() - start;
          captureTiming(`${options.method || 'GET'} ${path} (csrf-retry)`, dur);
          throw new Error(err2.error || `HTTP ${retryRes.status}`);
        }
        const dur = performance.now() - start;
        captureTiming(`${options.method || 'GET'} ${path} (csrf-retry)`, dur);
        return retryRes.json();
      }
      const dur = performance.now() - start;
      captureTiming(`${options.method || 'GET'} ${path}`, dur);
      throw new Error(errBody.error || `HTTP ${res.status}`);
    }
  }
  if (res.status === 401 && refreshToken && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers });
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ error: retryRes.statusText }));
        const dur = performance.now() - start;
        captureTiming(`${options.method || 'GET'} ${path} (token-retry)`, dur);
        throw new Error(err.error || `HTTP ${retryRes.status}`);
      }
      const dur = performance.now() - start;
      captureTiming(`${options.method || 'GET'} ${path} (token-retry)`, dur);
      return retryRes.json();
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const dur = performance.now() - start;
    captureTiming(`${options.method || 'GET'} ${path}`, dur);
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const dur = performance.now() - start;
  captureTiming(`${options.method || 'GET'} ${path}`, dur);
  return res.json();
}

async function uploadFile(file: File | Blob, fieldName = 'image'): Promise<{ url: string; filename: string }> {
  const form = new FormData();
  form.append(fieldName, file);
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (csrfToken && csrfHash) {
    headers['X-CSRF-Token'] = csrfToken;
    headers['X-CSRF-Hash'] = csrfHash;
  }
  const res = await fetchWithTimeout(`${API_BASE}/upload/image`, { method: 'POST', headers, body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request<any>('/auth/me'),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  refresh: () => refreshAccessToken(),

  // Users (profile, password)
  updatePassword: (currentPassword: string, newPassword: string) =>
    request<any>('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  updateProfile: (data: any) =>
    request<any>('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // SIMs (admin)
  getSims: () => request<any[]>('/sims'),
  createSim: (data: any) =>
    request<any>('/sims', { method: 'POST', body: JSON.stringify(data) }),
  updateSim: (id: number, data: any) =>
    request<any>(`/sims/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSim: (id: number) =>
    request<any>(`/sims/${id}`, { method: 'DELETE' }),

  // Agents
  getAgents: () => request<any[]>('/agents'),
  createAgent: (data: any) =>
    request<any>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: number, data: any) =>
    request<any>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Sellers
  getSellers: () => request<any[]>('/sellers'),
  createSeller: (data: any) =>
    request<any>('/sellers', { method: 'POST', body: JSON.stringify(data) }),
  updateSeller: (id: number, data: any) =>
    request<any>(`/sellers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateSellerBalance: (id: number, amount: number) =>
    request<any>(`/sellers/${id}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    }),
  deleteSeller: (id: number) =>
    request<any>(`/sellers/${id}`, { method: 'DELETE' }),
  resetSellerPassword: (id: number) =>
    request<{ message: string; credentials: { username: string; password: string } }>(
      `/sellers/${id}/reset-password`, { method: 'POST' }
    ),

  // Operations
  getOperations: () => request<any[]>('/operations'),
  createOperation: (data: any) =>
    request<any>('/operations', { method: 'POST', body: JSON.stringify(data) }),

  // Inventories
  getInventories: () => request<any[]>('/inventories'),
  updateInventories: (data: any[]) =>
    request<any[]>('/inventories', { method: 'PUT', body: JSON.stringify(data) }),

  // Alerts
  getAlerts: () => request<any[]>('/alerts'),
  resolveAlert: (id: number) =>
    request<any>(`/alerts/${id}`, { method: 'DELETE' }),

  // Admin
  getStats: () => request<any>('/stats'),
  getSettings: () => request<any>('/admin/settings'),
  updateSettings: (data: any) =>
    request<any>('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getTransactions: () => request<any[]>('/admin/transactions'),
  getDuplicateIdentities: () => request<any[]>('/admin/duplicate-identities'),
  getAuditLogs: () => request<any[]>('/admin/audit-logs'),

  // System: Backup
  createBackup: () =>
    request<{ success: boolean; filename: string; size: number; sizeFormatted: string; tables: number; records: number; downloadUrl: string }>('/admin/system/backup', { method: 'POST' }),
  downloadBackup: (filename: string) =>
    `${API_BASE}/admin/system/backup/download/${filename}`,

  // System: Lockdown
  toggleLockdown: () =>
    request<{ success: boolean; locked: boolean; message: string }>('/admin/system/lockdown', { method: 'POST' }),
  getLockdownStatus: () =>
    request<{ locked: boolean }>('/admin/system/lockdown/status'),

  // Account deletion
  deleteAccount: () =>
    request<{ success: boolean }>('/users/account', { method: 'DELETE' }),

  // Upload
  uploadFile,
};
