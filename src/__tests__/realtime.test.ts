import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../api/client', () => ({
  getLoadedTokens: () => ({ authToken: 'test-token', refreshToken: null }),
}));

import {
  connectRealtime,
  disconnectRealtime,
  onRealtimeEvent,
  onRealtimeStatus,
} from '../services/realtime';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev: { code?: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  closedCode: number | null = null;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number): void {
    this.closedCode = code ?? 1000;
    this.readyState = 3;
    this.onclose?.({ code: this.closedCode });
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(payload: unknown): void {
    this.onmessage?.({ data: typeof payload === 'string' ? payload : JSON.stringify(payload) });
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  disconnectRealtime();
});

describe('realtime client', () => {
  it('connects and authenticates with the stored token over the first frame', async () => {
    connectRealtime();
    expect(FakeWebSocket.instances.length).toBe(1);
    const ws = FakeWebSocket.instances[0];
    ws.open();
    expect(ws.sent.length).toBe(1);
    const auth = JSON.parse(ws.sent[0]);
    expect(auth.type).toBe('auth');
    expect(auth.token).toBe('test-token');
  });

  it('reports connected after auth_ok', async () => {
    const statuses: boolean[] = [];
    const unsub = onRealtimeStatus((connected) => statuses.push(connected));
    connectRealtime();
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.receive({ type: 'auth_ok' });
    expect(statuses).toContain(true);
    unsub();
  });

  it('forwards realtime events to subscribers after authentication', async () => {
    const events: unknown[] = [];
    const unsub = onRealtimeEvent((event) => events.push(event));
    connectRealtime();
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.receive({ type: 'auth_ok' });
    ws.receive({ type: 'sim.updated', entity: 'sim', id: 42, at: '2026-01-01T00:00:00Z' });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'sim.updated', id: 42 });
    unsub();
  });

  it('closes permanently on auth_error without reconnecting', async () => {
    vi.useFakeTimers();
    connectRealtime();
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.receive({ type: 'auth_error', reason: 'invalid_token' });
    expect(ws.closedCode).toBe(4001);
    vi.advanceTimersByTime(60000);
    expect(FakeWebSocket.instances.length).toBe(1);
    vi.useRealTimers();
  });

  it('reconnects with backoff after an unexpected close', async () => {
    vi.useFakeTimers();
    connectRealtime();
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.receive({ type: 'auth_ok' });
    ws.close(1006);
    expect(FakeWebSocket.instances.length).toBe(1);
    vi.advanceTimersByTime(2500);
    expect(FakeWebSocket.instances.length).toBe(2);
    vi.useRealTimers();
  });

  it('stops reconnecting after disconnectRealtime', async () => {
    vi.useFakeTimers();
    connectRealtime();
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.close(1006);
    disconnectRealtime();
    vi.advanceTimersByTime(60000);
    expect(FakeWebSocket.instances.length).toBe(1);
    vi.useRealTimers();
  });
});
