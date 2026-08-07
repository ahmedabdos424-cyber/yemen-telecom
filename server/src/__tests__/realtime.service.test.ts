import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';

// middleware/auth throws at import time when these are missing.
vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.BLACKLIST_HMAC_SECRET = 'test-blacklist-secret';
});

import { createRealtimeGateway } from '../services/realtime.service';
import type { RealtimeDeps, RealtimeGateway } from '../services/realtime.service';

interface TestClient {
  ws: WebSocket;
  waitFor(type: string, timeoutMs?: number): Promise<Record<string, unknown>>;
  close(): void;
}

// Client helper with a message queue — safe against concurrent messages
// (auth_ok + broadcast can arrive in the same tick).
function makeClient(url: string, token: string): TestClient {
  const ws = new WebSocket(url);
  const queue: Record<string, unknown>[] = [];
  const waiters: Array<{ type: string; resolve: (m: Record<string, unknown>) => void; timer: NodeJS.Timeout }> = [];

  ws.on('message', (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const waiterIdx = waiters.findIndex((w) => w.type === msg.type);
    if (waiterIdx >= 0) {
      const waiter = waiters.splice(waiterIdx, 1)[0];
      clearTimeout(waiter.timer);
      waiter.resolve(msg);
    } else {
      queue.push(msg);
    }
  });

  function waitFor(type: string, timeoutMs = 3000): Promise<Record<string, unknown>> {
    const queuedIdx = queue.findIndex((m) => m.type === type);
    if (queuedIdx >= 0) {
      return Promise.resolve(queue.splice(queuedIdx, 1)[0]);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = waiters.findIndex((w) => w.type === type);
        if (idx >= 0) waiters.splice(idx, 1);
        reject(new Error(`timeout waiting for ${type}`));
      }, timeoutMs);
      waiters.push({ type, resolve, timer });
    });
  }

  return {
    ws,
    waitFor,
    close() {
      try { ws.terminate(); } catch { /* noop */ }
    },
  };
}

async function connect(url: string, token: string): Promise<TestClient> {
  const client = makeClient(url, token);
  await new Promise<void>((resolve, reject) => {
    client.ws.once('open', () => resolve());
    client.ws.once('error', reject);
  });
  client.ws.send(JSON.stringify({ type: 'auth', token }));
  await client.waitFor('auth_ok');
  return client;
}

describe('realtime.service', () => {
  let server: http.Server;
  let gateway: RealtimeGateway;
  let url: string;
  const clients: TestClient[] = [];
  const deps: RealtimeDeps = {
    resolveUser: vi.fn(async (token: string) => {
      if (token === 'valid-token') return { id: 1, username: 'manager', role: 'manager' };
      if (token === 'agent-token') return { id: 2, username: 'agent1', role: 'agent' };
      return null;
    }),
  };

  beforeEach(async () => {
    server = http.createServer((_req, res) => res.end('ok'));
    gateway = createRealtimeGateway(server, deps);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address && typeof address === 'object') {
      url = `ws://127.0.0.1:${address.port}/ws`;
    } else {
      throw new Error('failed to allocate port');
    }
  });

  afterEach(async () => {
    gateway.close();
    for (const c of clients) c.close();
    clients.length = 0;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects a connection that never authenticates', { timeout: 15000 }, async () => {
    const client = makeClient(url, '');
    clients.push(client);
    const closed = new Promise<number>((resolve) => client.ws.once('close', (code) => resolve(code)));
    await new Promise<void>((resolve, reject) => {
      client.ws.once('open', () => resolve());
      client.ws.once('error', reject);
    });
    const code = await closed;
    expect(code).toBe(4002);
  });

  it('rejects a non-auth first message', async () => {
    const client = makeClient(url, '');
    clients.push(client);
    const closed = new Promise<number>((resolve) => client.ws.once('close', (code) => resolve(code)));
    await new Promise<void>((resolve, reject) => {
      client.ws.once('open', () => resolve());
      client.ws.once('error', reject);
    });
    client.ws.send(JSON.stringify({ hello: 'world' }));
    const msg = await client.waitFor('auth_error');
    expect(msg.reason).toBe('auth_required');
    const code = await closed;
    expect(code).toBe(4001);
  });

  it('rejects an invalid token', async () => {
    const client = makeClient(url, 'bad-token');
    clients.push(client);
    const closed = new Promise<number>((resolve) => client.ws.once('close', (code) => resolve(code)));
    await new Promise<void>((resolve, reject) => {
      client.ws.once('open', () => resolve());
      client.ws.once('error', reject);
    });
    client.ws.send(JSON.stringify({ type: 'auth', token: 'bad-token' }));
    const msg = await client.waitFor('auth_error');
    expect(msg.reason).toBe('invalid_token');
    const code = await closed;
    expect(code).toBe(4001);
  });

  it('authenticates with a valid token and receives auth_ok', async () => {
    const client = await connect(url, 'valid-token');
    clients.push(client);
    expect(gateway.stats().authenticated).toBeGreaterThanOrEqual(1);
  });

  it('broadcasts events to all authenticated roles', async () => {
    const m1 = await connect(url, 'valid-token');
    clients.push(m1);
    const m2 = await connect(url, 'agent-token');
    clients.push(m2);

    gateway.broadcastEvent({ type: 'test.event', entity: 'sim', id: 42, at: 'now' });

    const r1 = await m1.waitFor('test.event');
    expect(r1.id).toBe(42);
    const r2 = await m2.waitFor('test.event');
    expect(r2.id).toBe(42);
  });

  it('filters broadcasts by role', async () => {
    const managerWs = await connect(url, 'valid-token');
    clients.push(managerWs);
    const agentWs = await connect(url, 'agent-token');
    clients.push(agentWs);

    gateway.broadcastToRoles({ type: 'manager.only', entity: 'distribution', id: 7, at: 'now' }, ['manager']);

    const r1 = await managerWs.waitFor('manager.only');
    expect(r1.id).toBe(7);
    await expect(agentWs.waitFor('manager.only', 500)).rejects.toThrow('timeout');
  });

  it('filters broadcasts by user id', async () => {
    const managerWs = await connect(url, 'valid-token');
    clients.push(managerWs);

    gateway.broadcastToUserIds({ type: 'user.only', entity: 'sim', id: 3, at: 'now' }, [1]);

    const r1 = await managerWs.waitFor('user.only');
    expect(r1.id).toBe(3);
  });

  it('ignores messages after authentication', async () => {
    const client = await connect(url, 'valid-token');
    clients.push(client);
    client.ws.send(JSON.stringify({ type: 'not-auth', token: 'x' }));
    client.ws.send('garbage');
    // Give the server a moment — the connection must stay open.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
  });
});
