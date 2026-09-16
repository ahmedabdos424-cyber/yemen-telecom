/**
 * @vitest-environment node
 *
 * J-robustness regression suite (P2 remediation batch).
 * Fully hermetic: no database, no network beyond localhost loopback.
 *  - J-04: admin batch invalidates the report cache.
 *  - J-02: non-numeric :id fails fast with 400 (never a 500 from Postgres).
 *  - J-01: multer / malformed-JSON errors map to 413/400.
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
vi.mock('../cache', () => ({ cacheInvalidate: vi.fn(), cacheGet: vi.fn(), cacheSet: vi.fn() }));

import { query } from '../db';
import { cacheInvalidate } from '../cache';
import { clientErrorMapper } from '../middleware/httpErrors';

const mockQuery = query as unknown as ReturnType<typeof vi.fn>;
const mockInvalidate = cacheInvalidate as unknown as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// J-04: admin batch invalidates cached reports.
// ---------------------------------------------------------------------------
describe('J-04 admin batch invalidates report cache', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const batchRoutes = (await import('../routes/admin/batch')).default;
    const app = express();
    app.use(express.json());
    app.use((req: any, _res: Response, next: NextFunction) => {
      req.user = { id: 1, username: 'm', role: 'manager' };
      next();
    });
    app.use('/api/admin', batchRoutes);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    server?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/INSERT INTO sims/i.test(sql)) return { rows: [{ id: 1 }, { id: 2 }, { id: 3 }], rowCount: 3 };
      return { rows: [], rowCount: 0 };
    });
  });

  it('POST /admin/sims/batch calls cacheInvalidate(report:) on success', async () => {
    const res = await fetch(`http://localhost:${port}/api/admin/sims/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_iccid: '100', to_iccid: '102', provider: 'Yemen Mobile' }),
    });
    expect(res.status).toBe(201);
    expect(mockInvalidate).toHaveBeenCalledWith('report:');
  });
});

// ---------------------------------------------------------------------------
// J-02: non-numeric :id fails fast with 400.
// ---------------------------------------------------------------------------
describe('J-02 numeric :id guard', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const simsRoutes = (await import('../routes/sims')).default;
    const sellersRoutes = (await import('../routes/sellers')).default;
    const alertsRoutes = (await import('../routes/alerts')).default;
    const customersRoutes = (await import('../routes/customers')).default;
    const distributionsRoutes = (await import('../routes/distributions')).default;
    const app = express();
    app.use(express.json());
    app.use((req: any, _res: Response, next: NextFunction) => {
      req.user = { id: 1, username: 'm', role: 'manager' };
      next();
    });
    app.use('/api/sims', simsRoutes);
    app.use('/api/sellers', sellersRoutes);
    app.use('/api/alerts', alertsRoutes);
    app.use('/api/customers', customersRoutes);
    app.use('/api/distributions', distributionsRoutes);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    server?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/FROM sims WHERE id/i.test(sql)) {
        return { rows: [{ id: 7, iccid: '1', status: 'available' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  const call = (method: string, path: string, body?: unknown) =>
    fetch(`http://localhost:${port}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(async (r) => ({ status: r.status }));

  it.each([
    ['GET', '/api/sims/abc', undefined],
    ['PUT', '/api/sims/abc', { status: 'available' }],
    ['DELETE', '/api/sims/abc', undefined],
    ['GET', '/api/sellers/abc', undefined],
    ['PUT', '/api/sellers/abc', { name: 'x' }],
    ['DELETE', '/api/sellers/abc', undefined],
    ['PUT', '/api/sellers/abc/balance', { amount: 10 }],
    ['POST', '/api/sellers/abc/reset-password', {}],
    ['DELETE', '/api/alerts/abc', undefined],
    ['GET', '/api/customers/abc', undefined],
    ['PUT', '/api/distributions/abc/approve', { status: 'approved' }],
  ])('%s %s with a non-numeric id returns 400, not 500', async (method, path, body) => {
    const r = await call(method, path, body);
    expect(r.status).toBe(400);
  });

  it('numeric ids still reach the handler', async () => {
    const r = await call('GET', '/api/sims/7');
    expect(r.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// J-01: client error mapping.
// ---------------------------------------------------------------------------
describe('J-01 client error mapper', () => {
  const fakeRes = () => {
    const out: { status?: number; body?: unknown } = {};
    const res: any = {
      status: (code: number) => {
        out.status = code;
        return { json: (body: unknown) => { out.body = body; } };
      },
    };
    return { res, out };
  };

  it('LIMIT_FILE_SIZE maps to 413', () => {
    const { res, out } = fakeRes();
    const next = vi.fn();
    clientErrorMapper({ name: 'MulterError', code: 'LIMIT_FILE_SIZE' }, {} as any, res, next);
    expect(out.status).toBe(413);
    expect(next).not.toHaveBeenCalled();
  });

  it('other MulterErrors map to 400', () => {
    const { res, out } = fakeRes();
    const next = vi.fn();
    clientErrorMapper({ name: 'MulterError', code: 'LIMIT_UNEXPECTED_FILE', message: 'nope' }, {} as any, res, next);
    expect(out.status).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('malformed JSON maps to 400', () => {
    const { res, out } = fakeRes();
    const next = vi.fn();
    clientErrorMapper({ type: 'entity.parse.failed', status: 400 }, {} as any, res, next);
    expect(out.status).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('generic errors fall through to the 500 handler', () => {
    const { res } = fakeRes();
    const next = vi.fn();
    const err = new Error('boom');
    clientErrorMapper(err, {} as any, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
