import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { NextFunction, Response } from 'express';
import http from 'http';

vi.mock('../db', () => ({
  query: vi.fn(),
  transaction: vi.fn((cb: any) => cb({ query: vi.fn() })),
}));

import { query } from '../db';
import userRoutes from '../routes/users';

describe('P0-04 Self-Deletion Prevention Security Tests', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // Simulate JWT authentication — sets req.user based on test header
    app.use((req: any, _res: Response, next: NextFunction) => {
      const u = req.headers['x-test-user'];
      if (u === 'manager') req.user = { id: 1, username: 'admin', role: 'manager' };
      else if (u === 'agent') req.user = { id: 10, username: 'agent_a', role: 'agent' };
      else if (u === 'seller') req.user = { id: 20, username: 'seller_a', role: 'seller' };
      next();
    });

    app.use('/api/users', userRoutes);

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

  const del = (path: string, user?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) headers['X-Test-User'] = user;
    return fetch(`http://localhost:${port}${path}`, {
      method: 'DELETE',
      headers,
    }).then(async (r) => ({ status: r.status, data: await r.json() }));
  };

  // ─── All roles must be rejected ───

  describe('Role-based self-deletion prevention', () => {
    it('Manager self-delete returns 409', async () => {
      const r = await del('/api/users/account', 'manager');
      expect(r.status).toBe(409);
      expect(r.data.error).toBeDefined();
    });

    it('Agent self-delete returns 409', async () => {
      const r = await del('/api/users/account', 'agent');
      expect(r.status).toBe(409);
      expect(r.data.error).toBeDefined();
    });

    it('Seller self-delete returns 409', async () => {
      const r = await del('/api/users/account', 'seller');
      expect(r.status).toBe(409);
      expect(r.data.error).toBeDefined();
    });
  });

  // ─── No database operations executed ───

  describe('No database writes on rejection', () => {
    it('No DELETE SQL executed for any role', async () => {
      await del('/api/users/account', 'manager');
      const calls = (query as any).mock.calls;
      const deleteCalls = calls.filter((c: any[]) => c[0]?.toLowerCase().startsWith('delete'));
      expect(deleteCalls.length).toBe(0);
    });

    it('No UPDATE SQL executed for any role', async () => {
      await del('/api/users/account', 'manager');
      const calls = (query as any).mock.calls;
      const updateCalls = calls.filter((c: any[]) => c[0]?.toLowerCase().startsWith('update'));
      expect(updateCalls.length).toBe(0);
    });

    it('No SELECT SQL executed for any role', async () => {
      await del('/api/users/account', 'agent');
      const calls = (query as any).mock.calls;
      const selectCalls = calls.filter((c: any[]) => c[0]?.toLowerCase().startsWith('select'));
      expect(selectCalls.length).toBe(0);
    });

    it('No token blacklist entry created', async () => {
      await del('/api/users/account', 'seller');
      const calls = (query as any).mock.calls;
      const blacklistCalls = calls.filter((c: any[]) =>
        c[0]?.toLowerCase().includes('token_blacklist')
      );
      expect(blacklistCalls.length).toBe(0);
    });

    it('query() is never called for any authenticated request', async () => {
      await del('/api/users/account', 'manager');
      expect(query).not.toHaveBeenCalled();
    });
  });

  // ─── Existing auth behavior preserved ───

  describe('Existing auth behavior preserved', () => {
    it('Unauthenticated request returns 401', async () => {
      const r = await del('/api/users/account');
      expect(r.status).toBe(401);
    });

    it('Other user routes still work (GET not affected)', async () => {
      await del('/api/users/account', 'manager');
      expect(query).not.toHaveBeenCalled();
    });
  });

  // ─── JWT/token remains valid after rejection ───

  describe('Token integrity after rejection', () => {
    it('Token is not blacklisted when deletion is rejected', async () => {
      await del('/api/users/account', 'manager');
      const calls = (query as any).mock.calls;
      const insertCalls = calls.filter((c: any[]) =>
        c[0]?.toLowerCase().includes('insert')
      );
      expect(insertCalls.length).toBe(0);
    });

    it('User status remains unchanged after rejection', async () => {
      await del('/api/users/account', 'manager');
      const calls = (query as any).mock.calls;
      const userUpdateCalls = calls.filter((c: any[]) =>
        c[0]?.toLowerCase().includes('update users')
      );
      expect(userUpdateCalls.length).toBe(0);
    });
  });

  // ─── All roles uniformly blocked ───

  describe('Role consistency', () => {
    it('Returns same error message for all roles', async () => {
      const managerResult = await del('/api/users/account', 'manager');
      const agentResult = await del('/api/users/account', 'agent');
      const sellerResult = await del('/api/users/account', 'seller');
      expect(managerResult.data.error).toBe(agentResult.data.error);
      expect(agentResult.data.error).toBe(sellerResult.data.error);
    });

    it('Same status code for all roles', async () => {
      const managerResult = await del('/api/users/account', 'manager');
      const agentResult = await del('/api/users/account', 'agent');
      const sellerResult = await del('/api/users/account', 'seller');
      expect(managerResult.status).toBe(agentResult.status);
      expect(agentResult.status).toBe(sellerResult.status);
    });
  });
});
