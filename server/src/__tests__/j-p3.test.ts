/**
 * @vitest-environment node
 *
 * J-P3 regression suite (logic stability + contract unification).
 * Fully hermetic: no database, no network beyond localhost loopback.
 *  - J-03: unique conflicts surface as 409, not 500.
 *  - J-05: reports/transactions expose X-Total-Count with bounded pages.
 *  - J-06: install telemetry requires a real deviceId.
 *  - J-07: ambiguous seller_name is rejected with 409.
 *  - J-08: daily-sales counts distinct customers by key.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { NextFunction, Response } from 'express';
import http from 'http';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_SECRET = 'test-refresh-secret';
  process.env.CSRF_SECRET = 'test-csrf-secret';
  process.env.BLACKLIST_HMAC_SECRET = 'test-blacklist-hmac-secret';
  process.env.NODE_ENV = 'test';
  process.env.RATE_LIMIT_DISABLED = 'true';
});

vi.mock('../db', () => {
  const query = vi.fn(async () => ({ rows: [], rowCount: 0 }));
  return {
    query,
    transaction: vi.fn((cb: any) => Promise.resolve(cb({ query }))),
  };
});
vi.mock('../services/realtime.service', () => ({
  broadcastEvent: vi.fn(),
  broadcastScopedEvent: vi.fn(),
  broadcastToRoles: vi.fn(),
  broadcastToUserIds: vi.fn(),
}));
vi.mock('../services/alerts.service', () => ({ createAlert: vi.fn() }));
vi.mock('../services/fcm.service', () => ({
  notifyNewMember: vi.fn(),
  notifyBatchAssigned: vi.fn(),
  notifyDistributionApproved: vi.fn(),
}));
vi.mock('../cache', () => ({ cacheInvalidate: vi.fn(), cacheGet: vi.fn(() => undefined), cacheSet: vi.fn() }));

import { query } from '../db';
import { clearColumnCache } from '../dbColumns';

const mockQuery = query as unknown as ReturnType<typeof vi.fn>;

function stubUser(role: string, id = 1) {
  return (req: any, _res: Response, next: NextFunction) => {
    req.user = { id, username: `${role}${id}`, role };
    next();
  };
}

async function listenWith(routes: Array<{ path: string; router: unknown }>, role = 'manager', id = 1) {
  const app = express();
  app.use(express.json());
  app.use(stubUser(role, id));
  for (const r of routes) app.use(r.path, r.router as any);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  return { server, port };
}

const call = (port: number, method: string, path: string, body?: unknown) =>
  fetch(`http://localhost:${port}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, headers: r.headers, data: (await r.json().catch(() => ({}))) as Record<string, unknown> }));

// ---------------------------------------------------------------------------
// J-03: unique conflicts are 409.
// ---------------------------------------------------------------------------
describe('J-03 unique violations return 409', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const simsRoutes = (await import('../routes/sims')).default;
    const sellersRoutes = (await import('../routes/sellers')).default;
    ({ server, port } = await listenWith([
      { path: '/api/sims', router: simsRoutes },
      { path: '/api/sellers', router: sellersRoutes },
    ]));
  });

  afterAll(() => {
    server?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/SELECT \* FROM sims WHERE id/i.test(sql)) {
        return { rows: [{ id: 3, iccid: 'old', status: 'available', owner_role: 'admin' }], rowCount: 1 };
      }
      if (/UPDATE sims SET/i.test(sql)) {
        throw { code: '23505', message: 'duplicate key value violates unique constraint "sims_iccid_key"' };
      }
      if (/SELECT id FROM users WHERE username/i.test(sql)) return { rows: [], rowCount: 0 };
      if (/INSERT INTO users/i.test(sql)) return { rows: [{ id: 9 }], rowCount: 1 };
      if (/INSERT INTO sellers/i.test(sql)) {
        throw { code: '23505', message: 'duplicate key value violates unique constraint "sellers_seller_id_key"' };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('PUT /sims/:id with a duplicate ICCID returns 409', async () => {
    const r = await call(port, 'PUT', '/api/sims/3', { iccid: 'already-used' });
    expect(r.status).toBe(409);
  });

  it('POST /sellers with a duplicate seller_id returns 409', async () => {
    const r = await call(port, 'POST', '/api/sellers', { name: 'X', username: 'uniquser9', password: 'Abcdef12' });
    expect(r.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// J-05: paged reports expose totals.
// ---------------------------------------------------------------------------
describe('J-05 report pagination contract', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const reportsRoutes = (await import('../routes/reports')).default;
    const transactionsRoutes = (await import('../routes/admin/transactions')).default;
    ({ server, port } = await listenWith([
      { path: '/api/reports', router: reportsRoutes },
      { path: '/api/admin', router: transactionsRoutes },
    ]));
  });

  afterAll(() => {
    server?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/SELECT COUNT\(\*\) AS count FROM sellers/i.test(sql)) return { rows: [{ count: '250' }], rowCount: 1 };
      if (/SELECT COUNT\(\*\) AS count FROM transactions/i.test(sql)) return { rows: [{ count: '7' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
  });

  it('seller-performance returns the full count in X-Total-Count', async () => {
    const r = await call(port, 'GET', '/api/reports/seller-performance');
    expect(r.status).toBe(200);
    expect(r.headers.get('x-total-count')).toBe('250');
  });

  it('transactions are capped with a total header', async () => {
    const r = await call(port, 'GET', '/api/admin/transactions');
    expect(r.status).toBe(200);
    expect(r.headers.get('x-total-count')).toBe('7');
  });
});

// ---------------------------------------------------------------------------
// J-06: install telemetry hygiene. J-07: seller_name ambiguity.
// ---------------------------------------------------------------------------
describe('J-06 install telemetry + J-07 distribution ambiguity', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const appUpdateRoutes = (await import('../routes/app-update')).default;
    const app = express();
    app.use(express.json());
    app.use('/api', appUpdateRoutes);
    const distributionsRoutes = (await import('../routes/distributions')).default;
    const app2 = express();
    app2.use(express.json());
    app2.use(stubUser('agent', 10));
    app2.use('/api/distributions', distributionsRoutes);
    const s1 = http.createServer(app);
    const s2 = http.createServer(app2);
    await Promise.all([
      new Promise<void>((resolve) => s1.listen(0, resolve)),
      new Promise<void>((resolve) => s2.listen(0, resolve)),
    ]);
    (globalThis as any).__j06 = { s1, p1: (s1.address() as any).port, s2, p2: (s2.address() as any).port };
    server = s1;
    port = (s1.address() as any).port;
  });

  afterAll(() => {
    (globalThis as any).__j06?.s1?.close();
    (globalThis as any).__j06?.s2?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/INSERT INTO app_update_installs/i.test(sql)) return { rows: [], rowCount: 1 };
      if (/SELECT id FROM agents WHERE user_id/i.test(sql)) return { rows: [{ id: 5 }], rowCount: 1 };
      if (/SELECT id FROM sellers WHERE name/i.test(sql)) {
        return (globalThis as any).__dupSellers
          ? { rows: [{ id: 9 }, { id: 10 }], rowCount: 2 }
          : { rows: [{ id: 9 }], rowCount: 1 };
      }
      if (/SELECT id FROM sellers WHERE id/i.test(sql)) return { rows: [{ id: 9 }], rowCount: 1 };
      if (/INSERT INTO distribution_requests/i.test(sql)) {
        return { rows: [{ id: 3, agent_id: 5 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    (globalThis as any).__dupSellers = false;
  });

  it('J-06 rejects install reports without a real deviceId', async () => {
    const { p1 } = (globalThis as any).__j06;
    const r1 = await call(p1, 'POST', '/api/app-update-installed', { version: '1.1.0' });
    expect(r1.status).toBe(400);
    const r2 = await call(p1, 'POST', '/api/app-update-installed', { deviceId: 'unknown', version: '1.1.0' });
    expect(r2.status).toBe(400);
    const r3 = await call(p1, 'POST', '/api/app-update-installed', { deviceId: 'd-1', version: '1.1.0', versionCode: 24 });
    expect(r3.status).toBe(200);
  });

  it('J-07 rejects an ambiguous seller_name with 409', async () => {
    const { p2 } = (globalThis as any).__j06;
    (globalThis as any).__dupSellers = true;
    const r = await call(p2, 'POST', '/api/distributions', { seller_name: 'Dup', operator: 'yemen_mobile', count: 5 });
    expect(r.status).toBe(409);
  });

  it('J-07 accepts an unambiguous seller_name', async () => {
    const { p2 } = (globalThis as any).__j06;
    const r = await call(p2, 'POST', '/api/distributions', { seller_name: 'Solo', operator: 'yemen_mobile', count: 5 });
    expect(r.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// J-08: daily-sales distinct customer key.
// ---------------------------------------------------------------------------
describe('J-08 daily-sales counts distinct customers by key', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const reportsRoutes = (await import('../routes/reports')).default;
    ({ server, port } = await listenWith([{ path: '/api/reports', router: reportsRoutes }]));
  });

  afterAll(() => {
    server?.close();
  });

  const lastDistinctSql = () =>
    mockQuery.mock.calls.map((c) => String(c[0])).find((s) => s.includes('COUNT(DISTINCT')) || '';

  beforeEach(() => {
    vi.clearAllMocks();
    clearColumnCache();
  });

  it('uses customer_row_id when the column exists', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (/information_schema\.columns/i.test(sql)) return { rows: [{ '?column?': 1 }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const r = await call(port, 'GET', '/api/reports/daily-sales');
    expect(r.status).toBe(200);
    expect(lastDistinctSql()).toContain('customer_row_id');
  });

  it('falls back to customer_id on pre-migration databases', async () => {
    mockQuery.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
    const r = await call(port, 'GET', '/api/reports/daily-sales');
    expect(r.status).toBe(200);
    const sql = lastDistinctSql();
    expect(sql).toContain('customer_id');
    expect(sql).not.toContain('customer_row_id');
  });
});
