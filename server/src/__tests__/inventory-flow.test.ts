import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { NextFunction, Response } from 'express';
import http from 'http';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_SECRET = 'test-refresh-secret';
  process.env.CSRF_SECRET = 'test-csrf-secret';
  process.env.BLACKLIST_HMAC_SECRET = 'test-blacklist-hmac-secret';
});

// ---------------------------------------------------------------------------
// In-memory database simulation (stateful) so the multi-level stock flow can
// be exercised end-to-end without a real Postgres instance in unit tests.
// ---------------------------------------------------------------------------
type SimRow = {
  id: number;
  iccid: string;
  phone: string;
  provider: string;
  status: string;
  owner: string;
  date_added: string;
  package_type: string;
  owner_role: string;
  assigned_to: number | null;
  assigned_to_agent: number | null;
  activated_by?: number | null;
};

type DbState = {
  users: { id: number; username: string; role: string; status: string }[];
  agents: { id: number; name: string; user_id: number }[];
  sellers: { id: number; name: string; user_id: number; agent_id: number; status: string; agent_name?: string }[];
  sims: SimRow[];
  alerts: any[];
};

let db: DbState;

function resetDb(): DbState {
  return (db = {
    users: [
      { id: 1, username: 'admin', role: 'manager', status: 'active' },
      { id: 10, username: 'agent_a', role: 'agent', status: 'active' },
      { id: 20, username: 'agent_b', role: 'agent', status: 'active' },
      { id: 100, username: 'seller_a1', role: 'seller', status: 'active' },
      { id: 200, username: 'seller_b1', role: 'seller', status: 'active' },
    ],
    agents: [
      { id: 5, name: 'وكيل أ', user_id: 10 },
      { id: 6, name: 'وكيل ب', user_id: 20 },
    ],
    sellers: [
      { id: 1, name: 'البائع أ1', user_id: 100, agent_id: 5, status: 'active' },
      { id: 2, name: 'البائع ب1', user_id: 200, agent_id: 6, status: 'active' },
    ],
    sims: [],
    alerts: [],
  });
}

vi.mock('../db', () => {
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    const d = (globalThis as any).__db as DbState;
    const rows: any[] = [];

    // ---- Agents: must check user_id queries BEFORE id queries ----
    if (/SELECT id, name FROM agents WHERE user_id/i.test(sql)) {
      const a = d.agents.find((x) => x.user_id === Number(params[0]));
      if (a) rows.push({ id: a.id, name: a.name });
    } else if (/SELECT id, name FROM agents WHERE id/i.test(sql)) {
      const a = d.agents.find((x) => x.id === Number(params[0]));
      if (a) rows.push(a);
    } else if (/SELECT id FROM agents WHERE user_id/i.test(sql)) {
      const a = d.agents.find((x) => x.user_id === Number(params[0]));
      if (a) rows.push({ id: a.id });

      // ---- Sellers ----
    } else if (/SELECT id, name FROM sellers WHERE id/i.test(sql)) {
      const s = d.sellers.find((x) => x.id === Number(params[0]));
      if (s) rows.push({ id: s.id, name: s.name });
    } else if (/SELECT \* FROM sellers WHERE id/i.test(sql)) {
      const s = d.sellers.find((x) => x.id === Number(params[0]));
      if (s) rows.push({ ...s, agent_name: d.agents.find((a) => a.id === s.agent_id)?.name || '' });
    } else if (/SELECT id FROM sellers WHERE user_id/i.test(sql)) {
      const s = d.sellers.find((x) => x.user_id === Number(params[0]));
      if (s) rows.push({ id: s.id });
    } else if (/SELECT id FROM sellers WHERE name/i.test(sql)) {
      const s = d.sellers.find((x) => x.name === String(params[0]));
      if (s) rows.push({ id: s.id });

      // ---------- SIMs batch insert ----------
    } else if (/INSERT INTO sims \(.*iccid/i.test(sql) && /VALUES/i.test(sql)) {
      const COLS = 10;
      const startIdx = d.sims.length;
      for (let i = 0; i < params.length; i += COLS) {
        const off = i;
        const iccid = String(params[off + 0]);
        const conflict = d.sims.find((s) => s.iccid === iccid);
        if (conflict) continue;
        const row: SimRow = {
          id: d.sims.length + 1,
          iccid,
          phone: String(params[off + 1] ?? ''),
          provider: String(params[off + 2] ?? ''),
          status: String(params[off + 3] ?? 'available'),
          owner: String(params[off + 4] ?? ''),
          date_added: String(params[off + 5] ?? ''),
          package_type: String(params[off + 6] ?? ''),
          owner_role: String(params[off + 7] ?? 'admin'),
          assigned_to: params[off + 8] != null ? Number(params[off + 8]) : null,
          assigned_to_agent: params[off + 9] != null ? Number(params[off + 9]) : null,
        };
        d.sims.push(row);
      }
      d.sims.forEach((s, idx) => (s.id = idx + 1));
      return { rows: d.sims.slice(startIdx).map((s) => ({ id: s.id })) };
    }

    // ---------- SIM lookup / update ----------
    else if (/SELECT \* FROM sims WHERE iccid/i.test(sql)) {
      const s = d.sims.find((x) => x.iccid === String(params[0]));
      if (s) rows.push(s);
    } else if (/SELECT iccid FROM sims\s+WHERE iccid = ANY/i.test(sql)) {
      const iccids: string[] = params[0];
      const agentId = Number(params[1]);
      for (const iccid of iccids) {
        const s = d.sims.find((x) => x.iccid === iccid);
        if (s && s.owner_role === 'agent' && Number(s.assigned_to_agent) === agentId) rows.push({ iccid });
      }
    } else if (/UPDATE sims SET status = 'activated'/i.test(sql)) {
      const simId = params.length >= 5 ? Number(params[4]) : Number(params[1]);
      const s = d.sims.find((x) => x.id === simId);
      if (s) {
        s.status = 'activated';
        s.activated_by = params[0] != null ? Number(params[0]) : null;
        s.customer_name = (params[1] ?? s.customer_name) != null ? String(params[1] ?? s.customer_name) : s.customer_name;
        s.customer_id = params[2] != null ? String(params[2]) : s.customer_id;
        s.contract_image = params[3] != null ? String(params[3]) : s.contract_image;
        rows.push({ ...s });
      }
    } else if (/UPDATE sims SET owner_role = 'seller'/i.test(sql)) {
      const sellerId = Number(params[0]);
      const ownerText = String(params[1]);
      const iccids: string[] = params[2];
      const agentId = Number(params[3]);
      let matched = 0;
      for (const s of d.sims) {
        if (iccids.includes(s.iccid) && s.owner_role === 'agent' && Number(s.assigned_to_agent) === agentId) {
          s.owner_role = 'seller';
          s.assigned_to = sellerId;
          s.assigned_to_agent = null;
          s.owner = ownerText;
          s.status = 'available';
          matched++;
          rows.push({ id: s.id });
        }
      }
      return { rows, rowCount: matched };
    }

    // ---------- Alerts ----------
    else if (/INSERT INTO alerts/i.test(sql)) {
      d.alerts.push({ id: d.alerts.length + 1 });
      return { rows: [], rowCount: 1 };
    }

    // ---------- Reset: clearance + sequence reset ----------
    // The users DELETE must come BEFORE the generic DELETE branch below.
    else if (/DELETE FROM users WHERE role/i.test(sql)) {
      const before = d.users.filter((u) => u.role === 'agent' || u.role === 'seller').length;
      d.users = d.users.filter((u) => u.role !== 'agent' && u.role !== 'seller');
      return { rows: [], rowCount: before };
    } else if (/^DELETE FROM (\w+)/i.test(sql)) {
      const table = (sql.match(/DELETE FROM (\w+)/i) || [])[1];
      const removed = (d as any)[table] ? (d as any)[table].length : 0;
      if ((d as any)[table]) (d as any)[table] = [];
      return { rows: [], rowCount: removed };
    } else if (/UPDATE inventories SET available/i.test(sql)) {
      return { rows: [], rowCount: 1 };
    } else if (/pg_get_serial_sequence/i.test(sql)) {
      return { rows: [{ seq: `public.${params[0]}_id_seq` }] };
    } else if (/setval\(/i.test(sql)) {
      return { rows: [] };
    }

    return { rows, rowCount: rows.length };
  });
  return {
    query,
    transaction: vi.fn((cb: any) => {
      const mockClient = { query };
      return Promise.resolve(cb(mockClient));
    }),
  };
});

import simsRoutes from '../routes/sims';
import adminRoutes from '../routes/admin';

describe('DATA RESET & MULTI-LEVEL INVENTORY VERIFICATION', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    (globalThis as any).__db = resetDb();
    const app = express();
    app.use(express.json());

    // Simulate JWT auth
    app.use((req: any, _res: Response, next: NextFunction) => {
      const u = req.headers['x-test-user'];
      if (u === 'manager') req.user = { id: 1, username: 'admin', role: 'manager' };
      else if (u === 'agent-a') req.user = { id: 10, username: 'agent_a', role: 'agent' };
      else if (u === 'agent-b') req.user = { id: 20, username: 'agent_b', role: 'agent' };
      else if (u === 'seller-a') req.user = { id: 100, username: 'seller_a1', role: 'seller' };
      else if (u === 'seller-b') req.user = { id: 200, username: 'seller_b1', role: 'seller' };
      next();
    });

    app.use('/api/sims', simsRoutes);
    app.use('/api/admin', adminRoutes);

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
    (globalThis as any).__db = resetDb();
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

  // ---------------------------------------------------------------------
  // 1) SECURE DATA RESET
  // ---------------------------------------------------------------------
  describe('Secure system data reset (POST /api/admin/reset)', () => {
    it('rejects non-manager callers with 403', async () => {
      const r = await req('POST', '/api/admin/reset', { confirm: 'RESET_INVENTORY' }, 'agent-a');
      expect(r.status).toBe(403);
    });

    it('rejects a missing confirmation token with 400', async () => {
      const r = await req('POST', '/api/admin/reset', {}, 'manager');
      expect(r.status).toBe(400);
    });

    it('rejects an invalid confirmation token with 400', async () => {
      const r = await req('POST', '/api/admin/reset', { confirm: 'WRONG_TOKEN' }, 'manager');
      expect(r.status).toBe(400);
      expect(r.data.error).toMatch(/confirmation/i);
    });

    it('clears inventory, relational data and non-admin accounts, keeping the manager', async () => {
      // Seed stock so the reset has something to wipe.
      await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000010', owner_role: 'agent', owner_id: 5 },
        'manager'
      );
      expect((globalThis as any).__db.sims.length).toBe(10);

      const r = await req('POST', '/api/admin/reset', { confirm: 'RESET_INVENTORY' }, 'manager');
      expect(r.status).toBe(200);
      expect(r.data.success).toBe(true);

      const state = (globalThis as any).__db as DbState;
      expect(state.sims.length).toBe(0);
      expect(state.agents.length).toBe(0);
      expect(state.sellers.length).toBe(0);
      expect(state.users.some((u) => u.role === 'agent')).toBe(false);
      expect(state.users.some((u) => u.role === 'seller')).toBe(false);
      expect(state.users.some((u) => u.role === 'manager')).toBe(true);
      expect(state.alerts.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------
  // 2) MULTI-LEVEL INVENTORY HIERARCHY FLOW
  // ---------------------------------------------------------------------
  describe('Strict multi-level inventory hierarchy flow', () => {
    it('(Manager) assigns a 10-SIM range to Agent A via batch', async () => {
      const r = await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000010', owner_role: 'agent', owner_id: 5 },
        'manager'
      );
      expect(r.status).toBe(201);
      expect(r.data.created).toBe(10);

      const agentSims = (globalThis as any).__db.sims as SimRow[];
      expect(agentSims.length).toBe(10);
      expect(agentSims.every((s) => s.owner_role === 'agent')).toBe(true);
      expect(agentSims.every((s) => Number(s.assigned_to_agent) === 5)).toBe(true);
      expect(agentSims.every((s) => s.status === 'available')).toBe(true);
    });

    it('agent A transfers a 5-SIM sub-range to seller A1', async () => {
      await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000010', owner_role: 'agent', owner_id: 5 },
        'manager'
      );
      const r = await req(
        'POST',
        '/api/sims/transfer',
        { seller_id: 1, from_iccid: '89900000000000000001', to_iccid: '89900000000000000005' },
        'agent-a'
      );
      expect(r.status).toBe(200);
      expect(r.data.transferred).toBe(5);

      const state = (globalThis as any).__db as DbState;
      const toSeller = state.sims.filter((s) => s.owner_role === 'seller' && Number(s.assigned_to) === 1);
      const remaining = state.sims.filter((s) => s.owner_role === 'agent');
      expect(toSeller.length).toBe(5);
      expect(remaining.length).toBe(5);
      expect(toSeller.every((s) => s.status === 'available')).toBe(true);
      expect(toSeller.every((s) => s.assigned_to_agent === null)).toBe(true);
    });

    it('rejects transfer to a seller outside the agent escrow (isolation A/B)', async () => {
      await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000010', owner_role: 'agent', owner_id: 5 },
        'manager'
      );
      // Agent A tries to transfer to Agent B's seller (seller 2).
      const r = await req(
        'POST',
        '/api/sims/transfer',
        { seller_id: 2, from_iccid: '89900000000000000001', to_iccid: '89900000000000000002' },
        'agent-a'
      );
      expect(r.status).toBe(403);
      expect(r.data.error).toMatch(/Access denied/i);
    });

    it('rejects transfer of stock the agent does not own (out-of-stock, 400 Arabic)', async () => {
      await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000005', owner_role: 'agent', owner_id: 5 },
        'manager'
      );
      // Transfer 10 SIMs, but only 5 exist in the agent's stock.
      const r = await req(
        'POST',
        '/api/sims/transfer',
        { seller_id: 1, from_iccid: '89900000000000000001', to_iccid: '89900000000000000010' },
        'agent-a'
      );
      expect(r.status).toBe(400);
      expect(r.data.error).toBe('الرقم التسلسلي غير متوفر في مخزونك');
    });

    it('agent activates its own available SIM successfully', async () => {
      await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000001', owner_role: 'agent', owner_id: 5 },
        'manager'
      );
      const r = await req('POST', '/api/sims/activate', { iccid: '89900000000000000001' }, 'agent-a');
      expect(r.status).toBe(200);
      const sim = (globalThis as any).__db.sims[0];
      expect(sim.status).toBe('activated');
    });

    it('seller activates a SIM that was transferred to their stock', async () => {
      await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000010', owner_role: 'agent', owner_id: 5 },
        'manager'
      );
      await req(
        'POST',
        '/api/sims/transfer',
        { seller_id: 1, from_iccid: '89900000000000000001', to_iccid: '89900000000000000005' },
        'agent-a'
      );
      const r = await req('POST', '/api/sims/activate', { iccid: '89900000000000000002' }, 'seller-a');
      expect(r.status).toBe(200);
      const sim = (globalThis as any).__db.sims.find((s: SimRow) => s.iccid === '89900000000000000002');
      expect(sim.status).toBe('activated');
    });

    it('rejects activation of a SIM outside the requester stock (400 Arabic)', async () => {
      await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000001', owner_role: 'agent', owner_id: 5 },
        'manager'
      );
      // Seller B attempts to activate a SIM that belongs to Agent A.
      const r = await req('POST', '/api/sims/activate', { iccid: '89900000000000000001' }, 'seller-b');
      expect(r.status).toBe(400);
      expect(r.data.error).toBe('الرقم التسلسلي غير متوفر في مخزونك');
    });

    it('manager activates an admin-owned available SIM', async () => {
      await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000002', owner_role: 'admin' },
        'manager'
      );
      const r = await req('POST', '/api/sims/activate', { iccid: '89900000000000000001' }, 'manager');
      expect(r.status).toBe(200);
    });

    it('manager can also assign directly to a seller (owner_role=seller)', async () => {
      const r = await req(
        'POST',
        '/api/admin/sims/batch',
        { from_iccid: '89900000000000000001', to_iccid: '89900000000000000003', owner_role: 'seller', owner_id: 1 },
        'manager'
      );
      expect(r.status).toBe(201);
      expect(r.data.created).toBe(3);
      const sellerSims = (globalThis as any).__db.sims.filter((s: SimRow) => s.owner_role === 'seller');
      expect(sellerSims.every((s: SimRow) => Number(s.assigned_to) === 1)).toBe(true);
    });
  });
});