/**
 * @vitest-environment node
 *
 * P0 regression suite for the audit remediation batch (C-02/C-03/C-04/H-01/H-03/H-05).
 * Fully hermetic: no database, no network beyond localhost loopback.
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
vi.mock('../cache', () => ({ cacheInvalidate: vi.fn() }));

import { query } from '../db';
import { cacheInvalidate } from '../cache';
import { isSessionExempt } from '../middleware/auth';
import { extractDocumentObjectName, canAccessDocument } from '../routes/upload';
import { broadcastScopedEvent } from '../services/realtime.service';

const mockQuery = query as unknown as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// H-03: overview stats share the report prefix so mutations invalidate them.
// ---------------------------------------------------------------------------
describe('H-03 report cache invalidation covers overview stats', () => {
  it('cacheInvalidate(report:) drops the stats-overview entry', async () => {
    const real = await vi.importActual<typeof import('../cache')>('../cache');
    real.cacheSet('report:stats-overview', { total_sims: 1 }, 300_000);
    expect(real.cacheGet('report:stats-overview')).toEqual({ total_sims: 1 });
    real.cacheInvalidate('report:');
    expect(real.cacheGet('report:stats-overview')).toBeUndefined();
  });

  it('the /api/stats handler reads and writes the report:-prefixed key', async () => {
    const src = await import('fs').then((fs) =>
      fs.readFileSync(new URL('../index.ts', import.meta.url), 'utf-8')
    );
    expect(src).toContain("'report:stats-overview'");
    expect(src).not.toContain("'stats:overview'");
  });

  // Keeps the mocked-cache import referenced (routes under test use it).
  it('mocked cache surface exists', () => {
    expect(cacheInvalidate).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// H-01: demo session exemption never applies in production.
// ---------------------------------------------------------------------------
describe('H-01 demo session exemption is dev-only', () => {
  const prev = process.env.NODE_ENV;
  afterAll(() => {
    process.env.NODE_ENV = prev;
  });

  it('exempts demo usernames outside production', () => {
    process.env.NODE_ENV = 'test';
    expect(isSessionExempt('manager')).toBe(true);
    expect(isSessionExempt('agent')).toBe(true);
    expect(isSessionExempt('seller')).toBe(true);
    expect(isSessionExempt('real_user')).toBe(false);
    expect(isSessionExempt(undefined)).toBe(false);
  });

  it('exempts NOBODY in production — even demo usernames', () => {
    process.env.NODE_ENV = 'production';
    expect(isSessionExempt('manager')).toBe(false);
    expect(isSessionExempt('agent')).toBe(false);
    expect(isSessionExempt('seller')).toBe(false);
    process.env.NODE_ENV = 'test';
  });
});

// ---------------------------------------------------------------------------
// C-02: document authorization uses exact object-name matching.
// ---------------------------------------------------------------------------
describe('C-02 document access requires exact object-name ownership', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/FROM sellers WHERE user_id/i.test(sql)) return { rows: [{ id: 7 }], rowCount: 1 };
      if (/FROM agents WHERE user_id/i.test(sql)) return { rows: [], rowCount: 0 };
      if (/FROM sims/i.test(sql)) {
        return {
          rows: [
            { contract_image: 'https://xyz.supabase.co/storage/v1/object/sign/uploads/1718-ab12cd34.jpg?token=abc' },
          ],
          rowCount: 1,
        };
      }
      if (/FROM operations/i.test(sql)) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
  });

  it('extracts the object name from bare names and signed URLs', () => {
    expect(extractDocumentObjectName('1718-ab12cd34.jpg')).toBe('1718-ab12cd34.jpg');
    expect(extractDocumentObjectName('https://h/sign/uploads/1718-ab12cd34.jpg?token=abc')).toBe(
      '1718-ab12cd34.jpg'
    );
    expect(extractDocumentObjectName('')).toBe('');
    expect(extractDocumentObjectName(null)).toBe('');
  });

  it('grants the exact owned filename', async () => {
    await expect(
      canAccessDocument({ id: 100, role: 'seller' }, '1718-ab12cd34.jpg')
    ).resolves.toBe(true);
  });

  it('denies a partial name such as the bare extension', async () => {
    await expect(canAccessDocument({ id: 100, role: 'seller' }, 'jpg')).resolves.toBe(false);
    await expect(
      canAccessDocument({ id: 100, role: 'seller' }, '1718-ab12cd34')
    ).resolves.toBe(false);
    await expect(
      canAccessDocument({ id: 100, role: 'seller' }, '9999-zzzz9999.jpg')
    ).resolves.toBe(false);
  });

  it('managers bypass ownership checks', async () => {
    mockQuery.mockClear();
    await expect(canAccessDocument({ id: 1, role: 'manager' }, 'anything.jpg')).resolves.toBe(
      true
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// C-04 (operations SIM verification) + H-05 (scoped SIM broadcast).
// ---------------------------------------------------------------------------
describe('operations SIM verification + scoped broadcast', () => {
  let server: http.Server;
  let port: number;

  const agentSim = {
    id: 11,
    iccid: '8996000000000000001',
    status: 'activated',
    owner_role: 'agent',
    assigned_to: null,
    assigned_to_agent: 5,
    activated_by: 10,
  };

  beforeAll(async () => {
    const simsRoutes = (await import('../routes/sims')).default;
    const operationsRoutes = (await import('../routes/operations')).default;
    const app = express();
    app.use(express.json());
    app.use((req: any, _res: Response, next: NextFunction) => {
      const u = req.headers['x-test-user'];
      if (u === 'manager') req.user = { id: 1, username: 'm', role: 'manager' };
      else if (u === 'agent-a') req.user = { id: 10, username: 'agent_a', role: 'agent' };
      else if (u === 'seller-a') req.user = { id: 100, username: 'seller_a1', role: 'seller' };
      next();
    });
    app.use('/api/sims', simsRoutes);
    app.use('/api/operations', operationsRoutes);
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
    mockQuery.mockImplementation(async (sql: string, params: any[] = []) => {
      if (/information_schema\.columns/i.test(sql)) return { rows: [{ '?column?': 1 }], rowCount: 1 };
      if (/pg_advisory_xact_lock/i.test(sql)) return { rows: [], rowCount: 0 };
      if (/SELECT id FROM agents WHERE user_id/i.test(sql)) return { rows: [{ id: 5 }], rowCount: 1 };
      if (/SELECT id FROM sellers WHERE user_id/i.test(sql)) return { rows: [{ id: 1 }], rowCount: 1 };
      if (/SELECT \* FROM operations WHERE op_id/i.test(sql)) return { rows: [], rowCount: 0 };
      if (/SELECT id FROM customers WHERE id_number/i.test(sql)) return { rows: [], rowCount: 0 };
      if (/SELECT \* FROM sims WHERE iccid = \$1 FOR UPDATE/i.test(sql)) {
        return { rows: [{ ...agentSim, status: 'available' }], rowCount: 1 };
      }
      if (/UPDATE sims SET status = 'activated'/i.test(sql)) {
        return { rows: [{ ...agentSim }], rowCount: 1 };
      }
      if (/FROM sims WHERE iccid/i.test(sql)) {
        return String(params[0]) === agentSim.iccid
          ? { rows: [{ ...agentSim }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      if (/SELECT 1 FROM sellers WHERE id/i.test(sql)) return { rows: [], rowCount: 0 };
      if (/INSERT INTO operations/i.test(sql)) {
        return {
          rows: [{ op_id: 'op_test', type: 'recharge', target: 'x', operator: '', date: '', time: '', status: 'success' }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  const post = (path: string, body: unknown, user: string) =>
    fetch(`http://localhost:${port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Test-User': user },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, data: (await r.json()) as Record<string, unknown> }));

  it('C-04 rejects an operation naming a nonexistent SIM (404)', async () => {
    const r = await post(
      '/api/operations',
      { type: 'recharge', target: '777000000', iccid: '8996999999999999999' },
      'agent-a'
    );
    expect(r.status).toBe(404);
  });

  it('C-04 rejects an operation on a SIM outside the caller stock (403)', async () => {
    const r = await post(
      '/api/operations',
      { type: 'recharge', target: '777000000', iccid: agentSim.iccid },
      'seller-a'
    );
    expect(r.status).toBe(403);
  });

  it('C-04 accepts an ICCID-less recharge (201)', async () => {
    const r = await post('/api/operations', { type: 'recharge', target: '#BALANCE-X' }, 'seller-a');
    expect(r.status).toBe(201);
  });

  it('H-05 activation broadcast carries the owning scope ids', async () => {
    const r = await post('/api/sims/activate', { iccid: agentSim.iccid }, 'agent-a');
    expect(r.status).toBe(200);
    expect(broadcastScopedEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sim.updated', agent_id: 5 })
    );
  });
});
