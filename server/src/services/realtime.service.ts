import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../logger';
import { resolveTokenUser, ResolvedUser } from '../middleware/auth';

export interface RealtimeEvent {
  type: string;
  at?: string;
  [key: string]: unknown;
}

interface RealtimeClient {
  ws: WebSocket;
  user: ResolvedUser | null;
  isAlive: boolean;
}

export interface RealtimeDeps {
  resolveUser: (token: string) => Promise<ResolvedUser | null>;
}

export interface RealtimeGateway {
  broadcastEvent(event: RealtimeEvent): void;
  broadcastToRoles(event: RealtimeEvent, roles: string[]): void;
  broadcastToUserIds(event: RealtimeEvent, userIds: number[]): void;
  stats(): { total: number; authenticated: number };
  close(): void;
}

// Default dependency resolves users exactly like the Express auth middleware
// (JWT + blacklist + active session checks). Tests can inject a stub.
const defaultDeps: RealtimeDeps = {
  resolveUser: resolveTokenUser,
};

const WS_PATH = '/ws';
const AUTH_TIMEOUT_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_PAYLOAD_BYTES = 8192;

function sendJson(ws: WebSocket, payload: unknown): void {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  } catch (err) {
    logger.error('[REALTIME] send failed:', err);
  }
}

// Create an isolated realtime gateway on an existing HTTP server (noServer
// mode). Each gateway owns its clients, so tests can spin up independent
// instances; production attaches a single gateway at startup.
export function createRealtimeGateway(server: http.Server, deps: RealtimeDeps = defaultDeps): RealtimeGateway {
  const clients: Set<RealtimeClient> = new Set();
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

  function attachHandlers(ws: WebSocket): void {
    const client: RealtimeClient = { ws, user: null, isAlive: true };
    clients.add(client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    // First message must be { type: 'auth', token }. Anything else is ignored.
    const authTimer = setTimeout(() => {
      if (!client.user) {
        sendJson(ws, { type: 'auth_error', reason: 'auth_timeout' });
        ws.close(4002, 'Authentication timeout');
      }
    }, AUTH_TIMEOUT_MS);

    ws.on('message', (raw: Buffer) => {
      if (client.user) return;
      let msg: { type?: string; token?: string };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        sendJson(ws, { type: 'auth_error', reason: 'invalid_json' });
        ws.close(4001, 'Invalid message');
        return;
      }
      if (msg.type !== 'auth' || typeof msg.token !== 'string' || msg.token.length === 0) {
        sendJson(ws, { type: 'auth_error', reason: 'auth_required' });
        ws.close(4001, 'Authentication required');
        return;
      }
      void deps.resolveUser(msg.token)
        .then((user) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (!user) {
            sendJson(ws, { type: 'auth_error', reason: 'invalid_token' });
            ws.close(4001, 'Unauthorized');
            return;
          }
          clearTimeout(authTimer);
          client.user = user;
          logger.info(`[REALTIME] client authenticated: ${user.username} (${user.role})`);
          sendJson(ws, { type: 'auth_ok' });
        })
        .catch((err) => {
          logger.error('[REALTIME] auth resolution failed:', err);
          sendJson(ws, { type: 'auth_error', reason: 'auth_failed' });
          ws.close(4001, 'Authentication failed');
        });
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      clients.delete(client);
    });

    ws.on('error', (err) => {
      logger.warn('[REALTIME] websocket error:', err.message);
    });
  }

  server.on('upgrade', (req, socket, head) => {
    let pathname = '/';
    try {
      pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    } catch {
      // keep default
    }
    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    try {
      wss.handleUpgrade(req, socket, head, (ws) => {
        attachHandlers(ws);
      });
    } catch (err) {
      logger.warn('[REALTIME] upgrade failed:', err);
      socket.destroy();
    }
  });

  const heartbeatTimer = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
        continue;
      }
      client.isAlive = false;
      try {
        client.ws.ping();
      } catch {
        client.ws.terminate();
        clients.delete(client);
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();

  function broadcast(event: RealtimeEvent, filter: (user: ResolvedUser) => boolean): void {
    const payload = { ...event, at: event.at ?? new Date().toISOString() };
    for (const client of clients) {
      if (client.user && filter(client.user)) {
        sendJson(client.ws, payload);
      }
    }
  }

  return {
    broadcastEvent(event: RealtimeEvent): void {
      broadcast(event, () => true);
    },
    broadcastToRoles(event: RealtimeEvent, roles: string[]): void {
      const roleSet = new Set(roles);
      broadcast(event, (user) => roleSet.has(user.role));
    },
    broadcastToUserIds(event: RealtimeEvent, userIds: number[]): void {
      const idSet = new Set(userIds);
      broadcast(event, (user) => idSet.has(user.id));
    },
    stats(): { total: number; authenticated: number } {
      let authenticated = 0;
      for (const client of clients) {
        if (client.user) authenticated++;
      }
      return { total: clients.size, authenticated };
    },
    close(): void {
      clearInterval(heartbeatTimer);
      for (const client of clients) {
        try {
          client.ws.terminate();
        } catch {
          /* noop */
        }
      }
      clients.clear();
      wss.close();
    },
  };
}

// Production convenience: attach a single active gateway and expose
// module-level broadcast helpers used by the route handlers.
let activeGateway: RealtimeGateway | null = null;

export function attachRealtimeServer(server: http.Server, deps: RealtimeDeps = defaultDeps): RealtimeGateway {
  const gateway = createRealtimeGateway(server, deps);
  activeGateway = gateway;
  logger.info('[REALTIME] WebSocket gateway attached at /ws');
  return gateway;
}

export function broadcastEvent(event: RealtimeEvent): void {
  activeGateway?.broadcastEvent(event);
}

export function broadcastToRoles(event: RealtimeEvent, roles: string[]): void {
  activeGateway?.broadcastToRoles(event, roles);
}

export function broadcastToUserIds(event: RealtimeEvent, userIds: number[]): void {
  activeGateway?.broadcastToUserIds(event, userIds);
}

export function realtimeStats(): { total: number; authenticated: number } {
  return activeGateway?.stats() ?? { total: 0, authenticated: 0 };
}
