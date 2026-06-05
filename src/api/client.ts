const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '/api'
  : 'https://yemen-telecom-api.onrender.com/api';

let authToken: string | null = localStorage.getItem('auth_token');
let csrfToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export async function fetchCsrfToken(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/csrf-token`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.token;
    }
  } catch {
    csrfToken = null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (csrfToken && !path.startsWith('/auth/') && path !== '/csrf-token') {
    headers['X-CSRF-Token'] = csrfToken;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function uploadFile(file: File | Blob, fieldName = 'image'): Promise<{ url: string; filename: string }> {
  const form = new FormData();
  form.append(fieldName, file);
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  const res = await fetch(`${API_BASE}/upload/image`, { method: 'POST', headers, body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request<any>('/auth/me'),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),

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

  // Upload
  uploadFile,
};
