import { tokenStorage } from '../services/tokenStorage.ts';
import { captureTiming } from '../lib/monitor.ts';
import type {
  ApiLoginResponse, ApiMeResponse, ApiBackupResponse, ApiLockdownResponse, ApiResetPasswordResponse,
  SimRow, CreateSimRequest, UpdateSimRequest, CreateSimBatchRequest, SimBatchResult,
  TransferSimsRequest, TransferSimsResult,
  AgentRow, CreateAgentRequest, CreateAgentResponse, UpdateAgentRequest,
  MappedSeller, CreateSellerRequest, CreateSellerResponse, UpdateSellerRequest,
  AdminSellerRow,
  MappedOperation, CreateOperationRequest,
  MappedInventory, UpdateInventoryItem,
  AlertRow,
  AdminSettingsResponse, UpdateSettingsRequest, MappedTransaction, DuplicateIdentityRow, AuditLogEntry, AuditLogPageResponse,
  UpdateProfileRequest,
  StatsResponse,
  AppVersionResponse,
  ActivationReportRow, SellerReportRow,
  SystemHealthResponse,
} from './types';

const REQUEST_TIMEOUT_MS = 15000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  // إعادة المحاولة (Retry) تقتصر على طلبات القراءة (GET) عند أخطاء الشبكة فقط،
  // لتجنّب عمليات POST/PUT/DELETE غير قابلة للتكرار (non-idempotent).
  const method = (options.method || 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? retries + 1 : 1;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts - 1) {
        await delay(3000);
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
  // E2E/CI builds run `vite preview` against a local API; when the build was
  // produced with VITE_PROXY_TARGET set (ci.yml e2e job) the relative path is
  // safe because the preview proxy forwards /api to the local server. The APK
  // and production builds never set this var, so they keep the absolute URL.
  if (import.meta.env.VITE_PROXY_TARGET) return '/api';
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

// Wake the Render free-tier service up when the app opens. The service sleeps
// after ~15 minutes of idle and its cold start can exceed the normal request
// timeout, so a fire-and-forget ping to /api/health (long timeout, no retries)
// lets the first user request hit a warm server. The promise is cached so
// repeated calls share the same in-flight warm-up.
const WAKE_TIMEOUT_MS = 90000;
let wakePromise: Promise<boolean> | null = null;
export function ensureServerIsAwake(): Promise<boolean> {
  if (!wakePromise) {
    wakePromise = (async () => {
      const deadline = Date.now() + WAKE_TIMEOUT_MS;
      let waitMs = 2000;
      for (;;) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
          const res = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            credentials: 'omit',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) return true;
        } catch {
          // Network error while the server is still waking up — keep waiting.
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) return false;
        const backoff = Math.min(waitMs, 30000, remaining);
        waitMs = Math.min(waitMs * 2, 30000);
        await delay(backoff);
      }
    })();
  }
  return wakePromise;
}

// Blocking gate for requests that must not fire until the server is awake.
// Resolves instantly once the boot-time warm-up has already finished, so this
// is safe to await at the start of the login flow even after app startup.
export function waitForServerAwake(): Promise<boolean> {
  return ensureServerIsAwake();
}

// Public diagnostics endpoint — no auth, no retries (used by SystemHealthMonitor).
export async function getSystemHealth(): Promise<SystemHealthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/health`, { credentials: CREDENTIALS_MODE, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SystemHealthResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

// All mutable token state is encapsulated in a single object to avoid
// scattered module-level variables and make reasoning about state easier.
const tokens = {
  auth: null as string | null,
  refresh: null as string | null,
  csrf: null as string | null,
  csrfHash: null as string | null,
  loaded: false,
  loadPromise: null as Promise<void> | null,
  // Mutex for refreshAccessToken — prevents concurrent refreshes that would
  // overwrite each other's new token and lose the session.
  refreshPromise: null as Promise<string | null> | null,
};

export const SESSION_EXPIRED_EVENT = 'tele:session-expired';

function emitSessionExpired(reason?: string) {
  try {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { reason } }));
  } catch {
    /* noop */
  }
}

function getDeviceId(): string {
  try {
    let id = localStorage.getItem('tele_device_id');
    if (!id) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      id = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('tele_device_id', id);
    }
    return id;
  } catch {
    return '';
  }
}

function getDeviceName(): string {
  try {
    return navigator.userAgent.slice(0, 200);
  } catch {
    return '';
  }
}

export function setToken(token: string | null) {
  tokens.auth = token;
  if (token) {
    tokenStorage.setAuthToken(token);
  } else {
    tokenStorage.removeAuthToken();
  }
}

export function setRefreshToken(token: string | null) {
  tokens.refresh = token;
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

export async function loadTokens(): Promise<{ authToken: string | null; refreshToken: string | null }> {
  if (!tokens.loaded) {
    if (!tokens.loadPromise) {
      tokens.loadPromise = (async () => {
        tokens.auth = await tokenStorage.getAuthToken();
        tokens.refresh = await tokenStorage.getRefreshToken();
        tokens.loaded = true;
      })();
    }
    await tokens.loadPromise;
  }
  return { authToken: tokens.auth, refreshToken: tokens.refresh };
}

export function getLoadedTokens(): { authToken: string | null; refreshToken: string | null } {
  return { authToken: tokens.auth, refreshToken: tokens.refresh };
}

export async function fetchCsrfToken(): Promise<void> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/csrf-token`, { credentials: CREDENTIALS_MODE });
    if (res.ok) {
      const data = await res.json();
      tokens.csrf = data.token;
      tokens.csrfHash = data.hash;
    }
  } catch {
    tokens.csrf = null;
    tokens.csrfHash = null;
  }
}

// Token refresh with mutex: if multiple callers hit 401 concurrently, only one
// refresh request is made and all callers share the same result promise.
async function refreshAccessToken(): Promise<string | null> {
  // If a refresh is already in-flight, piggyback on it.
  if (tokens.refreshPromise) return tokens.refreshPromise;

  tokens.refreshPromise = (async () => {
    try {
      await loadTokens();
      if (!tokens.refresh) return null;
      const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refresh }),
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
  })();

  const result = await tokens.refreshPromise;
  tokens.refreshPromise = null;
  return result;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  await loadTokens();
  const start = performance.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceId(),
    'X-Device-Name': getDeviceName(),
    ...(options.headers as Record<string, string> || {}),
  };
  if (tokens.auth) {
    headers['Authorization'] = `Bearer ${tokens.auth}`;
  }
  const isLogout = path === '/auth/logout';
  if (tokens.csrf && tokens.csrfHash && ((!path.startsWith('/auth/') && path !== '/csrf-token') || isLogout)) {
    headers['X-CSRF-Token'] = tokens.csrf;
    headers['X-CSRF-Hash'] = tokens.csrfHash;
  }
  if (tokens.refresh && isCapacitor && isLogout) {
    headers['X-Refresh-Token'] = tokens.refresh;
  }
  const res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers, credentials: CREDENTIALS_MODE });
  if (res.status === 403 && !path.startsWith('/auth/') && path !== '/csrf-token') {
    const errBody = await res.json().catch(() => ({}));
    if (errBody.error && (errBody.error.includes('CSRF'))) {
      await fetchCsrfToken();
      if (tokens.csrf && tokens.csrfHash) {
        headers['X-CSRF-Token'] = tokens.csrf;
        headers['X-CSRF-Hash'] = tokens.csrfHash;
        // Preserve the original method and body so POST/PUT/DELETE retries work.
        const retryRes = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers, method: options.method || 'GET', body: options.body });
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
  if (res.status === 401 && tokens.refresh && !path.startsWith('/auth/')) {
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
    if (res.status === 401 && !path.startsWith('/auth/')) {
      emitSessionExpired(err.error || '');
    }
    // Disabled/locked account: emit session expired so the UI forces logout
    if (res.status === 403 && !path.startsWith('/auth/') && !path.startsWith('/csrf-token')) {
      const msg = (err.error || '').toLowerCase();
      if (msg.includes('disabled') || msg.includes('deactivated') || msg.includes('inactive') || msg.includes('inactive account') || msg.includes('blocked')) {
        emitSessionExpired(err.error || 'Account disabled');
      }
    }
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
  if (tokens.auth) {
    headers['Authorization'] = `Bearer ${tokens.auth}`;
  }
  if (tokens.csrf && tokens.csrfHash) {
    headers['X-CSRF-Token'] = tokens.csrf;
    headers['X-CSRF-Hash'] = tokens.csrfHash;
  }
  const res = await fetchWithTimeout(`${API_BASE}/upload/image`, { method: 'POST', headers, body: form, credentials: CREDENTIALS_MODE });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export type { ApiLoginResponse, ApiMeResponse, ApiBackupResponse, ApiLockdownResponse, ApiResetPasswordResponse, SystemHealthResponse } from './types';

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
  createSimBatch: (data: CreateSimBatchRequest) =>
    request<SimBatchResult>('/admin/sims/batch', { method: 'POST', body: JSON.stringify(data) }),
  transferSims: (data: TransferSimsRequest) =>
    request<TransferSimsResult>('/sims/transfer', { method: 'POST', body: JSON.stringify(data) }),
  activateSim: (data: { iccid: string; customerName?: string; customerId?: string; contractImage?: string }) =>
    request<SimRow>('/sims/activate', { method: 'POST', body: JSON.stringify(data) }),

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

  // Push notifications (FCM)
  registerDeviceToken: (token: string, platform: string = 'android') =>
    request<{ success: boolean }>('/notifications/device-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    }),
  unregisterDeviceToken: (token: string) =>
    request<{ success: boolean }>('/notifications/device-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    }),

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
  getAuditLogsPaged: (page: number, limit = 20) =>
    request<AuditLogPageResponse>(`/admin/audit-logs?page=${page}&limit=${limit}`),

  // Admin: Seller & POS management
  getAdminSellers: () =>
    request<AdminSellerRow[]>('/admin/sellers'),
  updateSellerStatus: (id: number, status: 'active' | 'inactive') =>
    request<AdminSellerRow>(`/admin/sellers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  getSellerSessions: (id: number, page: number, limit = 15) =>
    request<AuditLogPageResponse>(`/admin/sellers/${id}/sessions?page=${page}&limit=${limit}`),

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
  getActivationsReport: () =>
    request<ActivationReportRow[]>('/reports/activations'),
  getSellersReport: () =>
    request<SellerReportRow[]>('/reports/sellers'),

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

  // User Preferences
  getUserPreferences: () =>
    request<{ simNotifications: boolean; lowStockNotifications: boolean; fontSize: string; darkMode: boolean }>('/users/preferences'),
  updateUserPreferences: (data: { simNotifications?: boolean; lowStockNotifications?: boolean; fontSize?: string; darkMode?: boolean }) =>
    request<{ message: string }>('/users/preferences', { method: 'PUT', body: JSON.stringify(data) }),
};
