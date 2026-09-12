import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { NextFunction, Response } from 'express';
import http from 'http';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_SECRET = 'test-refresh-secret';
  process.env.CSRF_SECRET = 'test-csrf-secret';
  process.env.BLACKLIST_HMAC_SECRET = 'test-blacklist-hmac-secret';
  process.env.RATE_LIMIT_DISABLED = 'true';
});

vi.mock('../db', () => {
  const query = vi.fn();
  return {
    query,
    transaction: vi.fn((cb: any) => {
      const mockClient = { query };
      return Promise.resolve(cb(mockClient));
    }),
  };
});
vi.mock('../services/realtime.service', () => ({ broadcastEvent: vi.fn() }));
vi.mock('../services/alerts.service', () => ({ createAlert: vi.fn() }));
vi.mock('../cache', () => ({ cacheInvalidate: vi.fn() }));

import { query } from '../db';
import simRoutes from '../routes/sims';

const sellerSim = {
  id: 100,
  iccid: '89148000000000000001',
  status: 'available',
  owner: 'Seller Store',
  owner_role: 'seller',
  assigned_to: 7,
  assigned_to_agent: null,
  provider: 'Yemen Mobile',
  package_type: 'باقة مزايا الشهرية',
  phone: '',
  customer_name: null,
  customer_id: null,
  contract_image: null,
};

const agentSim = {
  id: 101,
  iccid: '89148000000000000002',
  status: 'available',
  owner: 'Agent Stock',
  owner_role: 'agent',
  assigned_to: null,
  assigned_to_agent: 5,
  provider: 'Sabafon',
  package_type: 'باقة مزايا الشهرية',
  phone: '',
  customer_name: null,
  customer_id: null,
  contract_image: null,
};

describe('F2/F3 — SIM PUT ownership & seller status security regression', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    app.use((req: any, _res: Response, next: NextFunction) => {
      const u = req.headers['x-test-user'];
      if (u === 'agent') req.user = { id: 10, username: 'agent_a', role: 'agent' };
      else if (u === 'seller') req.user = { id: 30, username: 'seller_a', role: 'seller' };
      else if (u === 'manager') req.user = { id: 1, username: 'admin', role: 'manager' };
      next();
    });

    app.use('/api/sims', simRoutes);

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
  });

  const req = (method: string, path: string, body?: any, user?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) headers['X-Test-User'] = user;
    return fetch(`http://localhost:${port}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }).then(async (r) => ({ status: r.status, data: await r.json() }));
  };

  const calls = (): { sql: string; params: any[] }[] => {
    return (query as any).mock.calls.map((c: any[]) => ({ sql: String(c[0]), params: c[1] }));
  };

  const updateCall = (): { sql: string; params: any[] } | undefined =>
    calls().find((c) => c.sql.includes('UPDATE sims SET'));

  const setupOwnershipMock = (updateOutcome: 'owned' | 'gone' | 'stolen' = 'owned') => {
    (query as any).mockImplementation((sql: string, params: any[]) => {
      if (sql.includes('SELECT id FROM agents WHERE user_id')) {
        return Promise.resolve({ rows: Number(params[0]) === 10 ? [{ id: 5 }] : [] });
      }
      if (sql.includes('SELECT id FROM sellers WHERE user_id')) {
        return Promise.resolve({ rows: Number(params[0]) === 30 ? [{ id: 7 }] : [] });
      }
      if (sql.includes('SELECT * FROM sims WHERE id')) {
        const id = Number(params[0]);
        if (id === 100) return Promise.resolve({ rows: [sellerSim] });
        if (id === 101) return Promise.resolve({ rows: [agentSim] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('UPDATE sims SET')) {
        if (updateOutcome !== 'owned') return Promise.resolve({ rows: [] });
        const id = Number(params[9]);
        return Promise.resolve({ rows: [{ ...(id === 101 ? agentSim : sellerSim), status: params[3] }] });
      }
      if (sql.includes('SELECT id FROM sims WHERE id')) {
        return Promise.resolve({ rows: updateOutcome === 'gone' ? [] : [{ id: Number(params[0]) }] });
      }
      return Promise.resolve({ rows: [] });
    });
  };

  describe('F2 — seller status semantics', () => {
    it('seller can set reserved (previously dead path)', async () => {
      setupOwnershipMock();
      const r = await req('PUT', '/api/sims/100', { status: 'reserved' }, 'seller');
      expect(r.status).toBe(200);
      expect(updateCall()?.params[3]).toBe('reserved');
    });

    it('seller cannot set the dead requested status (400 via validation)', async () => {
      const r = await req('PUT', '/api/sims/100', { status: 'requested' }, 'seller');
      expect(r.status).toBe(400);
      expect(r.data.error).toMatch(/Validation failed/i);
    });

    it('seller still cannot set activated (not in allowed seller statuses)', async () => {
      const r = await req('PUT', '/api/sims/100', { status: 'activated' }, 'seller');
      expect(r.status).toBe(403);
      expect(r.data.error).toMatch(/only set status to available or reserved/i);
    });
  });

  describe('F3 — atomic ownership re-assertion in UPDATE', () => {
    it('seller UPDATE carries the seller ownership predicate', async () => {
      setupOwnershipMock();
      const r = await req('PUT', '/api/sims/100', { status: 'reserved' }, 'seller');
      expect(r.status).toBe(200);
      const upd = updateCall();
      expect(upd?.sql).toContain("AND owner_role = 'seller' AND assigned_to = $11");
      expect(upd?.params[10]).toBe(7);
    });

    it('agent UPDATE carries the agent ownership predicate', async () => {
      setupOwnershipMock();
      const r = await req('PUT', '/api/sims/101', { status: 'activated' }, 'agent');
      expect(r.status).toBe(200);
      const upd = updateCall();
      expect(upd?.sql).toContain("AND owner_role = 'agent' AND assigned_to_agent = $11");
      expect(upd?.params[10]).toBe(5);
    });

    it('manager UPDATE stays unconstrained (no ownership clause)', async () => {
      setupOwnershipMock();
      const r = await req('PUT', '/api/sims/101', { status: 'activated' }, 'manager');
      expect(r.status).toBe(200);
      const upd = updateCall();
      expect(upd?.sql).not.toContain('$11');
    });

    it('returns 403 when the SIM left the caller stock mid-flight', async () => {
      setupOwnershipMock('stolen');
      const r = await req('PUT', '/api/sims/100', { status: 'reserved' }, 'seller');
      expect(r.status).toBe(403);
      expect(r.data.error).toMatch(/Access denied/i);
    });

    it('returns 404 when the SIM was deleted mid-flight', async () => {
      setupOwnershipMock('gone');
      const r = await req('PUT', '/api/sims/100', { status: 'reserved' }, 'seller');
      expect(r.status).toBe(404);
      expect(r.data.error).toMatch(/SIM not found/i);
    });
  });
});