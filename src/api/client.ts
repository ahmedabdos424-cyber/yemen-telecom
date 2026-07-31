import { tokenStorage } from '../services/tokenStorage.ts';
import { captureTiming } from '../lib/monitor.ts';
import type {
  ApiLoginResponse, ApiMeResponse, ApiBackupResponse, ApiLockdownResponse, ApiResetPasswordResponse,
  SimRow, CreateSimRequest, UpdateSimRequest,
  AgentRow, CreateAgentRequest, CreateAgentResponse, UpdateAgentRequest,
  MappedSeller, CreateSellerRequest, CreateSellerResponse, UpdateSellerRequest, UpdateSellerBalanceRequest,
  MappedOperation, CreateOperationRequest,
  MappedInventory, UpdateInventoryItem,
  AlertRow,
  AdminSettingsResponse, UpdateSettingsRequest, MappedTransaction, DuplicateIdentityRow, AuditLogEntry,
  UpdateProfileRequest,
  StatsResponse,
  CustomerRow,
  DistributionRequestRow, CreateDistributionRequest,
  AppVersionResponse,
} from './types';

const REQUEST_TIMEOUT_MS = 60000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await delay(1500 * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Network request failed');
}

const hostname = window.location.hostname;
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('192.168.');

function detectCapacitor(): boolean {
  try {
    return !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
  } catch {
    return false;
  }
}

// Resolve the API base URL for every request rather than once at module load.
// In the Capacitor WebView the page origin is https://localhost but the API is
// served from yemen-telecom.onrender.com. If window.Capacitor is not yet injected
// (timing) we still must target the real API host, so any localhost origin inside
// the packaged app resolves to the production API. The dev server (Vite proxy)
// keeps the relative '/api' path.
const PROD_API = 'https://yemen-telecom.onrender.com/api';
function resolveApiBase(): string {
  if (import.meta.env.DEV) return '/api';
  if (detectCapacitor()) return PROD_API;
  if (isLocal) {
    // Inside the native WebView (androidScheme https) the origin is localhost but
    // there is no local server, so always use the production API.
    return PROD_API;
  }
  return PROD_API;
}

const isCapacitor = detectCapacitor();
const API_BASE = resolveApiBase();

const CREDENTIALS_MODE: RequestCredentials = isCapacitor ? 'omit' : 'include';

let authToken: string | null = null;
let refreshToken: string | null = null;
let csrfToken: string | null = null;
let csrfHash: string | null = null;
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];
let tokensLoaded = false;
let tokensLoadPromise: Promise<void> | null = null;

export function setToken(token: string | null) {
  authToken = token;
  if (isCapacitor) {
    if (token) {
      tokenStorage.setAuthToken(token);
    } else {
      tokenStorage.removeAuthToken();
    }
  }
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
  if (isCapacitor) {
    if (token) {
      tokenStorage.setRefreshToken(token);
    } else {
      tokenStorage.removeRefreshToken();
    }
  }
}

export function clearTokens() {
  setToken(null);
  setRefreshToken(null);
}

export async function loadTokens(): Promise<{ authToken: string | null; refreshToken: string | null }> {
  if (!isCapacitor) {
    return { authToken: null, refreshToken: null };
  }
  if (!tokensLoaded) {
    if (!tokensLoadPromise) {
      tokensLoadPromise = (async () => {
        authToken = await tokenStorage.getAuthToken();
        refreshToken = await tokenStorage.getRefreshToken();
        tokensLoaded = true;
      })();
    }
    await tokensLoadPromise;
  }
  return { authToken, refreshToken };
}

export function getLoadedTokens(): { authToken: string | null; refreshToken: string | null } {
  return { authToken, refreshToken };
}

export async function fetchCsrfToken(): Promise<void> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/csrf-token`, { credentials: CREDENTIALS_MODE });
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
  if (!isCapacitor) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.token;
    } catch {
      return null;
    }
  }
  await loadTokens();
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
  await loadTokens();
  const start = performance.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken && isCapacitor) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const isLogout = path === '/auth/logout';
  if (csrfToken && csrfHash && ((!path.startsWith('/auth/') && path !== '/csrf-token') || isLogout)) {
    headers['X-CSRF-Token'] = csrfToken;
    headers['X-CSRF-Hash'] = csrfHash;
  }
  if (refreshToken && isCapacitor && isLogout) {
    headers['X-Refresh-Token'] = refreshToken;
  }
  const res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers, credentials: CREDENTIALS_MODE });
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
  await loadTokens();
  const form = new FormData();
  form.append(fieldName, file);
  const headers: Record<string, string> = {};
  if (authToken && isCapacitor) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (csrfToken && csrfHash) {
    headers['X-CSRF-Token'] = csrfToken;
    headers['X-CSRF-Hash'] = csrfHash;
  }
  const res = await fetchWithTimeout(`${API_BASE}/upload/image`, { method: 'POST', headers, body: form, credentials: CREDENTIALS_MODE });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export type { ApiLoginResponse, ApiMeResponse, ApiBackupResponse, ApiLockdownResponse, ApiResetPasswordResponse } from './types';

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<ApiLoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request<ApiMeResponse>('/auth/me'),
  logout: () => request<Record<string, unknown>>('/auth/logout', { method: 'POST' }),
  refresh: () => refreshAccessToken(),

  // Users (profile, password)
  updatePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  updateProfile: (data: UpdateProfileRequest) =>
    request<{ id: number; username: string; displayName: string; role: string; phone: string; region: string }>('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // SIMs (admin)
  getSims: () => request<SimRow[]>('/sims'),
  createSim: (data: CreateSimRequest) =>
    request<SimRow>('/sims', { method: 'POST', body: JSON.stringify(data) }),
  updateSim: (id: number, data: UpdateSimRequest) =>
    request<SimRow>(`/sims/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSim: (id: number) =>
    request<{ message: string }>(`/sims/${id}`, { method: 'DELETE' }),

  // Agents
  getAgents: () => request<AgentRow[]>('/agents'),
  createAgent: (data: CreateAgentRequest) =>
    request<CreateAgentResponse>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: number, data: UpdateAgentRequest) =>
    request<AgentRow>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Sellers
  getSellers: () => request<MappedSeller[]>('/sellers'),
  createSeller: (data: CreateSellerRequest) =>
    request<CreateSellerResponse>('/sellers', { method: 'POST', body: JSON.stringify(data) }),
  updateSeller: (id: number, data: UpdateSellerRequest) =>
    request<MappedSeller>(`/sellers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateSellerBalance: (id: number, amount: number, invoiceImage?: string) =>
    request<MappedSeller>(`/sellers/${id}/balance`, {
      method: 'PUT',
      body: JSON.stringify(invoiceImage ? { amount, invoiceImage } : { amount }),
    }),
  deleteSeller: (id: number) =>
    request<{ message: string }>(`/sellers/${id}`, { method: 'DELETE' }),
  resetSellerPassword: (id: number) =>
    request<ApiResetPasswordResponse>(
      `/sellers/${id}/reset-password`, { method: 'POST' }
    ),

  // Operations
  getOperations: () => request<MappedOperation[]>('/operations'),
  createOperation: (data: CreateOperationRequest) =>
    request<MappedOperation>('/operations', { method: 'POST', body: JSON.stringify(data) }),

  // Inventories
  getInventories: () => request<MappedInventory[]>('/inventories'),
  updateInventories: (data: UpdateInventoryItem[]) =>
    request<MappedInventory[]>('/inventories', { method: 'PUT', body: JSON.stringify(data) }),

  // Customers
  createCustomer: (data: { fullName: string; idNumber: string; idType?: string; idIssueDate?: string; phone?: string; region?: string }) =>
    request<Record<string, unknown>>('/customers', { method: 'POST', body: JSON.stringify(data) }),

  // Alerts
  getAlerts: () => request<AlertRow[]>('/alerts'),
  resolveAlert: (id: number) =>
    request<{ message: string }>(`/alerts/${id}`, { method: 'DELETE' }),

  // Admin
  getStats: () => request<StatsResponse>('/stats'),
  getSettings: () => request<AdminSettingsResponse>('/admin/settings'),
  updateSettings: (data: UpdateSettingsRequest) =>
    request<AdminSettingsResponse>('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getTransactions: () => request<MappedTransaction[]>('/admin/transactions'),
  getDuplicateIdentities: () => request<DuplicateIdentityRow[]>('/admin/duplicate-identities'),
  flagDuplicateIdentity: (idNo: string, data?: Record<string, unknown>) =>
    request<{ success: boolean; idNo: string }>(`/admin/duplicate-identities/${encodeURIComponent(idNo)}/flag`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  blockDuplicateIdentity: (idNo: string, data?: Record<string, unknown>) =>
    request<{ success: boolean; idNo: string }>(`/admin/duplicate-identities/${encodeURIComponent(idNo)}/block`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  unblockDuplicateIdentity: (idNo: string, data?: Record<string, unknown>) =>
    request<{ success: boolean; idNo: string }>(`/admin/duplicate-identities/${encodeURIComponent(idNo)}/unblock`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  getAuditLogs: () => request<AuditLogEntry[]>('/admin/audit-logs'),

  // System: Backup
  createBackup: () =>
    request<ApiBackupResponse>('/admin/system/backup', { method: 'POST' }),
  downloadBackup: (filename: string) =>
    `${API_BASE}/admin/system/backup/download/${filename}`,

  // System: Lockdown
  toggleLockdown: () =>
    request<ApiLockdownResponse>('/admin/system/lockdown', { method: 'POST' }),
  getLockdownStatus: () =>
    request<{ locked: boolean }>('/admin/system/lockdown/status'),

  // Account deletion
  deleteAccount: () =>
    request<{ success: boolean }>('/users/account', { method: 'DELETE' }),

  // Reports
  getDailySales: () =>
    request<Array<{ day: string; activations: number; unique_customers: number; operator: string }>>('/reports/daily-sales'),
  getAgentPerformance: () =>
    request<Array<{ id: number; agent_name: string; region: string; seller_count: number; total_sims: number; sales_30_days: number; avg_efficiency: number }>>('/reports/agent-performance'),
  getOperatorDistribution: () =>
    request<{ sims: Array<{ operator: string; count: number; status: string }>; operations: Array<{ operator: string; count: number; status: string }> }>('/reports/operator-distribution'),
  getSellerPerformance: () =>
    request<Array<{ id: number; name: string; store_name: string; region: string; sims_count: number; sales_30_days: number; sales_growth: number; efficiency: number; activity_rate: number; status: string; agent_name: string }>>('/reports/seller-performance'),

  // App Update
  getAppVersion: () =>
    request<AppVersionResponse>('/app-version'),
  recordAppUpdate: (data: { deviceId: string; version: string; versionCode: number }) =>
    request<{ ok: boolean }>('/app-update-installed', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Upload
  uploadFile,
};
