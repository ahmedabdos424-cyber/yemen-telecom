import { getLoadedTokens } from '../api/client';

export interface RealtimeEvent {
  type: string;
  at: string;
  [key: string]: unknown;
}

export interface RealtimeOptions {
  role: string | null;
  username: string;
  onEvent: (event: RealtimeEvent) => void;
  onStatusChange?: (connected: boolean) => void;
}

export const REALTIME_EVENT_NAME = 'tele:realtime-event';
export const REALTIME_STATUS_EVENT = 'tele:realtime-status';

const WS_PROD_URL = 'wss://yemen-telecom.onrender.com/ws';
const MIN_RETRY_MS = 2000;
const MAX_RETRY_MS = 30000;
const AUTH_TIMEOUT_MS = 10000;

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let retryDelayMs = MIN_RETRY_MS;
let manualClose = false;
let isConnecting = false;
let authTimer: number | null = null;

// In dev the browser connects to the Vite dev server which proxies /ws to the
// production API (see vite.config.ts). In the packaged app (Capacitor) and in
// production the app always talks directly to the production host.
function resolveWsUrl(): string {
  if (import.meta.env.DEV) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}/ws`;
  }
  return WS_PROD_URL;
}

function emitStatus(connected: boolean): void {
  try {
    window.dispatchEvent(new CustomEvent(REALTIME_STATUS_EVENT, { detail: { connected } }));
  } catch {
    /* noop */
  }
}

function emitEvent(event: RealtimeEvent): void {
  try {
    window.dispatchEvent(new CustomEvent(REALTIME_EVENT_NAME, { detail: event }));
  } catch {
    /* noop */
  }
}

function scheduleReconnect(): void {
  if (manualClose || reconnectTimer !== null) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    void openSocket();
  }, retryDelayMs);
  retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS);
}

function handleMessage(raw: string): void {
  let msg: { type?: string; [key: string]: unknown };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  if (msg.type === 'auth_ok') {
    // Connected and authenticated — reset the retry backoff.
    retryDelayMs = MIN_RETRY_MS;
    if (authTimer !== null) {
      clearTimeout(authTimer);
      authTimer = null;
    }
    emitStatus(true);
    return;
  }
  if (msg.type === 'auth_error') {
    // Token rejected (expired / revoked / session terminated). Close for good
    // and let the session-expired flow take over.
    manualClose = true;
    socket?.close(4001, 'Unauthorized');
    emitStatus(false);
    return;
  }
  emitEvent(msg as unknown as RealtimeEvent);
}

async function openSocket(): Promise<void> {
  if (isConnecting) return;
  isConnecting = true;
  try {
    const { authToken } = getLoadedTokens();
    if (!authToken) {
      // No session yet — nothing to listen to.
      manualClose = true;
      emitStatus(false);
      return;
    }
    const ws = new WebSocket(resolveWsUrl());
    socket = ws;

    ws.onopen = () => {
      // Authenticate over the first frame so the token never lands in URLs
      // (and therefore never in access logs).
      ws.send(JSON.stringify({ type: 'auth', token: authToken }));
      authTimer = window.setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(4002, 'Authentication timeout');
        }
      }, AUTH_TIMEOUT_MS);
    };

    ws.onmessage = (ev: MessageEvent) => {
      handleMessage(typeof ev.data === 'string' ? ev.data : String(ev.data));
    };

    ws.onclose = () => {
      if (authTimer !== null) {
        clearTimeout(authTimer);
        authTimer = null;
      }
      emitStatus(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      // The close event follows and drives the reconnect.
    };
  } finally {
    isConnecting = false;
  }
}

export function connectRealtime(): void {
  manualClose = false;
  retryDelayMs = MIN_RETRY_MS;
  void openSocket();
}

export function disconnectRealtime(): void {
  manualClose = true;
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (authTimer !== null) {
    clearTimeout(authTimer);
    authTimer = null;
  }
  if (socket) {
    socket.close(1000, 'Client disconnect');
    socket = null;
  }
  emitStatus(false);
}

export function isRealtimeConnected(): boolean {
  return !!socket && socket.readyState === WebSocket.OPEN;
}

// Convenience subscriber over the window CustomEvent bus.
export function onRealtimeEvent(cb: (event: RealtimeEvent) => void): () => void {
  const handler = (ev: Event) => {
    cb((ev as CustomEvent).detail as RealtimeEvent);
  };
  window.addEventListener(REALTIME_EVENT_NAME, handler);
  return () => window.removeEventListener(REALTIME_EVENT_NAME, handler);
}

export function onRealtimeStatus(cb: (connected: boolean) => void): () => void {
  const handler = (ev: Event) => {
    cb(!!(ev as CustomEvent).detail?.connected);
  };
  window.addEventListener(REALTIME_STATUS_EVENT, handler);
  return () => window.removeEventListener(REALTIME_STATUS_EVENT, handler);
}
