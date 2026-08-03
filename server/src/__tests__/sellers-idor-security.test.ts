import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { NextFunction, Response } from 'express';
import http from 'http';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_SECRET = 'test-refresh-secret';
  process.env.CSRF_SECRET = 'test-csrf-secret';
  process.env.BLACKLIST_HMAC_SECRET = 'test-blacklist-hmac-secret';
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

import { query } from '../db';
import sellerRoutes from '../routes/sellers';

const makeSeller = (id: number, agentId: number, name: string) => ({
  id,
  seller_id: `SLR-${String(id).padStart(3, '0')}`,
  user_id: 1000 + id,
  agent_id: agentId,
  name,
  store_name: `Store ${name}`,
  id_number: `ID-${id}`,
  phone: `777${String(id).padStart(6, '0')}`,
  region: "Sana'a",
  region_code: 'SA',
  status: 'active',
  total_sales: 100,
  current_stock: 50,
  efficiency: 75,
  sims_count: 10,
  sales_30_days: 30,
  sales_growth: 5,
  activity_rate: 80,
  creation_date: '2024/01/15',
  last_login: '2024/06/01',
  avatar: null,
  agent_name: 'Test Agent',
});

const sellerA = makeSeller(1, 5, 'Seller A');
const sellerB = makeSeller(2, 6, 'Seller B');

describe('P0-01 IDOR Security Regression Tests', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // Simulate JWT authentication — sets req.user based on test header
    app.use((req: any, _res: Response, next: NextFunction) => {
      const u = req.headers['x-test-user'];
      if (u === 'agent-a') req.user = { id: 10, username: 'agent_a', role: 'agent' };
      else if (u === 'agent-b') req.user = { id: 20, username: 'agent_b', role: 'agent' };
      else if (u === 'manager') req.user = { id: 1, username: 'admin', role: 'manager' };
      next();
    });

    app.use('/api/sellers', sellerRoutes);

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

  const setupMockQuery = () => {
    (query as any).mockImplementation((sql: string, params: any[]) => {
      if (sql.includes('FOR UPDATE')) {
        const id = Number(params[0]);
        if (id === 1) return Promise.resolve({ rows: [{ sales_30_days: 30, total_sales: 100 }] });
        if (id === 2) return Promise.resolve({ rows: [{ sales_30_days: 20, total_sales: 80 }] });
        return Promise.resolve({ rows: [{ sales_30_days: 0, total_sales: 0 }] });
      }
      if (sql.includes('FROM sellers WHERE id')) {
        const id = Number(params[0]);
        if (id === 1) return Promise.resolve({ rows: [sellerA] });
        if (id === 2) return Promise.resolve({ rows: [sellerB] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('SELECT id FROM agents WHERE user_id')) {
        const userId = Number(params[0]);
        if (userId === 10) return Promise.resolve({ rows: [{ id: 5 }] }); // agent A -> id 5
        if (userId === 20) return Promise.resolve({ rows: [{ id: 6 }] }); // agent B -> id 6
        return Promise.resolve({ rows: [] });
      }
      // Default for UPDATE / JOIN queries
      return Promise.resolve({ rows: [{ id: 1, name: 'default', agent_name: 'default' }] });
    });
  };

  // ─── Agent A owns Seller A (agent_id=5), Agent B owns Seller B (agent_id=6) ───

  describe('Agent A — own seller (Seller A, agent_id=5)', () => {
    it('can UPDATE own seller', async () => {
      setupMockQuery();
      const r = await req('PUT', '/api/sellers/1', { name: 'Updated' }, 'agent-a');
      expect(r.status).toBe(200);
    });

    it('can UPDATE BALANCE of own seller', async () => {
      setupMockQuery();
      const r = await req('PUT', '/api/sellers/1/balance', { amount: 50 }, 'agent-a');
      expect(r.status).toBe(200);
    });

    it('can RESET PASSWORD of own seller', async () => {
      setupMockQuery();
      const r = await req('POST', '/api/sellers/1/reset-password', null, 'agent-a');
      expect(r.status).toBe(200);
    });

    it('can DELETE own seller', async () => {
      setupMockQuery();
      const r = await req('DELETE', '/api/sellers/1', null, 'agent-a');
      expect(r.status).toBe(200);
    });
  });

  describe('Agent A — other agent\'s seller (Seller B, agent_id=6)', () => {
    it('cannot UPDATE other seller (403)', async () => {
      setupMockQuery();
      const r = await req('PUT', '/api/sellers/2', { name: 'Updated' }, 'agent-a');
      expect(r.status).toBe(403);
      expect(r.data.error).toMatch(/Access denied/i);
    });

    it('cannot UPDATE BALANCE of other seller (403)', async () => {
      setupMockQuery();
      const r = await req('PUT', '/api/sellers/2/balance', { amount: 50 }, 'agent-a');
      expect(r.status).toBe(403);
      expect(r.data.error).toMatch(/Access denied/i);
    });

    it('cannot RESET PASSWORD of other seller (403)', async () => {
      setupMockQuery();
      const r = await req('POST', '/api/sellers/2/reset-password', null, 'agent-a');
      expect(r.status).toBe(403);
      expect(r.data.error).toMatch(/Access denied/i);
    });

    it('cannot DELETE other seller (403)', async () => {
      setupMockQuery();
      const r = await req('DELETE', '/api/sellers/2', null, 'agent-a');
      expect(r.status).toBe(403);
      expect(r.data.error).toMatch(/Access denied/i);
    });
  });

  describe('Manager — unrestricted access to any seller', () => {
    it('can UPDATE any seller', async () => {
      setupMockQuery();
      const r = await req('PUT', '/api/sellers/2', { name: 'Updated' }, 'manager');
      expect(r.status).toBe(200);
    });

    it('can UPDATE BALANCE of any seller', async () => {
      setupMockQuery();
      const r = await req('PUT', '/api/sellers/1/balance', { amount: 50 }, 'manager');
      expect(r.status).toBe(200);
    });

    it('can RESET PASSWORD of any seller', async () => {
      setupMockQuery();
      const r = await req('POST', '/api/sellers/1/reset-password', null, 'manager');
      expect(r.status).toBe(200);
    });

    it('can DELETE any seller', async () => {
      setupMockQuery();
      const r = await req('DELETE', '/api/sellers/2', null, 'manager');
      expect(r.status).toBe(200);
    });
  });
});
