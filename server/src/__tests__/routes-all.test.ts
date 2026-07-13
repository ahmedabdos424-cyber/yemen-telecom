import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ─── Mock dependencies BEFORE any route imports ──────────────────────────────

const mockQuery = vi.fn();
const mockTransaction = vi.fn(async (fn: any) => fn({ query: mockQuery }));

vi.mock('../../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  transaction: (...args: any[]) => mockTransaction(...args),
  pool: { connect: vi.fn(), on: vi.fn() },
}));

vi.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  transaction: (...args: any[]) => mockTransaction(...args),
  pool: { connect: vi.fn(), on: vi.fn() },
}));

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../middleware/auth', () => ({
  requireRole: (..._roles: string[]) => (req: any, _res: any, next: NextFunction) => {
    if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' };
    next();
  },
  authenticateToken: (req: any, _res: any, next: NextFunction) => {
    if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' };
    next();
  },
  hashToken: (t: string) => `hashed_${t}`,
  isTokenBlacklisted: vi.fn().mockResolvedValue(false),
}));

vi.mock('../validation', () => ({
  validate: () => (req: any, _res: any, next: NextFunction) => next(),
  loginSchema: {},
  refreshTokenSchema: {},
  createSimSchema: {},
  updateSimSchema: {},
  createAgentSchema: {},
  updateAgentSchema: {},
  createSellerSchema: {},
  updateSellerSchema: {},
  updateSellerBalanceSchema: {},
  createOperationSchema: {},
  updateInventoriesSchema: {},
  updateSettingsSchema: {},
  createCustomerSchema: {},
  createDistributionSchema: {},
  approveDistributionSchema: {},
  updatePasswordSchema: {},
  updateProfileSchema: {},
}));

vi.mock('../helpers', () => ({
  getPagination: (req: any) => ({
    page: Math.max(1, parseInt(req?.query?.page) || 1),
    limit: Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)),
    offset: ((Math.max(1, parseInt(req?.query?.page) || 1)) - 1) * Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)),
  }),
  paginatedQuery: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 }),
  getDefaultLimit: () => 200,
}));

vi.mock('../cache', () => ({
  cacheGet: vi.fn().mockReturnValue(undefined),
  cacheSet: vi.fn(),
  cacheInvalidate: vi.fn(),
  cacheStats: vi.fn().mockReturnValue({ size: 0, hits: 0, misses: 0, ratio: '0%' }),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi.fn().mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 }),
  },
}));

vi.mock('../firebase-admin', () => ({
  getBucket: vi.fn().mockReturnValue({
    file: vi.fn().mockReturnValue({
      createWriteStream: vi.fn().mockReturnValue({
        on: vi.fn().mockImplementation(function (this: any, event: string, cb: any) {
          if (event === 'finish') setTimeout(() => cb(), 0);
          return this;
        }),
        end: vi.fn(),
      }),
      getSignedUrl: vi.fn().mockResolvedValue(['https://firebase.example.com/file.jpg']),
    }),
  }),
  getFirebaseAdmin: vi.fn(),
}));

vi.mock('../backup-storage', () => ({
  uploadBackup: vi.fn().mockResolvedValue({ url: 'https://backup.example.com/file.json', filename: 'backup.json', size: 1024 }),
  downloadBackup: vi.fn().mockResolvedValue('https://backup.example.com/download'),
  isConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../sentry', () => ({ setSentryUser: vi.fn() }));

// ─── Top-level imports (mocks already registered above) ───────────────────────

import authRouter from '../routes/auth';
import simsRouter from '../routes/sims';
import agentsRouter from '../routes/agents';
import sellersRouter from '../routes/sellers';
import operationsRouter from '../routes/operations';
import inventoriesRouter from '../routes/inventories';
import alertsRouter from '../routes/alerts';
import adminRouter from '../routes/admin';
import uploadRouter from '../routes/upload';
import usersRouter from '../routes/users';
import customersRouter from '../routes/customers';
import distributionsRouter from '../routes/distributions';
import reportsRouter from '../routes/reports';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { isTokenBlacklisted } from '../middleware/auth';
import { paginatedQuery } from '../helpers';
import { cacheGet } from '../cache';

// ─── Mock Express helpers ─────────────────────────────────────────────────────

function mockReq(overrides: Partial<any> = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    cookies: {},
    headers: {},
    user: { id: 1, username: 'testuser', role: 'manager' },
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {
    _status: 200,
    _body: undefined as any,
    _headers: {} as Record<string, string>,
    _cookies: [] as Array<{ name: string; value: string; opts: any }>,
    _cleared: [] as string[],
    _ended: false,
    status(code: number) { res._status = code; return res; },
    json(data: any) { res._body = data; return res; },
    cookie(name: string, value: string, opts?: any) { res._cookies.push({ name, value, opts }); return res; },
    clearCookie(name: string, opts?: any) { res._cleared.push(name); return res; },
    setHeader(name: string, value: string) { res._headers[name] = value; return res; },
    redirect(url: string) { res._body = { _redirect: url }; return res; },
    end() { res._ended = true; return res; },
  };
  return res;
}

async function callHandler(handler: any, req: any, res: any) {
  try {
    await handler(req, res, vi.fn());
  } catch (err: any) {
    if (!res._body && !res._ended) {
      res.status(500).json({ error: err.message });
    }
  }
}

function findHandler(router: any, method: string, path: string): any | null {
  for (const layer of router.stack) {
    if (layer.route && layer.route.path === path && layer.route.methods[method]) {
      const stack = layer.route.stack;
      return stack[stack.length - 1]?.handle;
    }
  }
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockTransaction.mockReset();
  mockTransaction.mockImplementation(async (fn: any) => fn({ query: mockQuery }));
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_SECRET = 'test-refresh-secret';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Auth Routes', () => {
  const router = authRouter;

  describe('POST /login', () => {
    it('logs in successfully with valid credentials', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', role: 'manager', status: 'active', password_hash: '$2a$10$hashedpassword', display_name: 'Test', phone: '123', region: 'Sanaa', failed_attempts: 0, locked_until: null }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ max_failed_logins_threshold: 5 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      vi.mocked(jwt.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
      const req = mockReq({ body: { username: 'testuser', password: 'Password1!' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/login'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveProperty('token');
      expect(res._body).toHaveProperty('refreshToken');
      expect(res._body.user).toHaveProperty('username', 'testuser');
    });

    it('returns 401 for wrong password', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', status: 'active', password_hash: 'hash', failed_attempts: 0, locked_until: null }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ max_failed_logins_threshold: 5 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ body: { username: 'testuser', password: 'wrong' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/login'), req, res);
      expect(res._status).toBe(401);
    });

    it('returns 401 for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ body: { username: 'nouser', password: 'Password1!' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/login'), req, res);
      expect(res._status).toBe(401);
    });

    it('returns 403 for disabled account', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'inactive' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ max_failed_logins_threshold: 5 }] });
      const req = mockReq({ body: { username: 'testuser', password: 'Password1!' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/login'), req, res);
      expect(res._status).toBe(403);
    });

    it('returns 429 for locked account', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active', locked_until: new Date(Date.now() + 600000).toISOString() }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ max_failed_logins_threshold: 5 }] });
      const req = mockReq({ body: { username: 'testuser', password: 'Password1!' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/login'), req, res);
      expect(res._status).toBe(429);
    });

    it('returns 429 when failed_attempts reaches threshold', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active', failed_attempts: 5, locked_until: null }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ max_failed_logins_threshold: 5 }] });
      const req = mockReq({ body: { username: 'testuser', password: 'Password1!' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/login'), req, res);
      expect(res._status).toBe(429);
    });
  });

  describe('POST /refresh', () => {
    it('refreshes tokens successfully', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ status: 'active' }] });
      const req = mockReq({ body: { refreshToken: 'valid-refresh-token' }, cookies: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/refresh'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveProperty('token');
    });

    it('returns 400 when no refresh token provided', async () => {
      const req = mockReq({ body: {}, cookies: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/refresh'), req, res);
      expect(res._status).toBe(400);
    });

    it('returns 401 for expired refresh token', async () => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      vi.mocked(jwt.verify).mockImplementation((() => { throw err; }) as any);
      const req = mockReq({ body: { refreshToken: 'expired' }, cookies: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/refresh'), req, res);
      expect(res._status).toBe(401);
    });

    it('returns 401 for blacklisted refresh token', async () => {
      vi.mocked(isTokenBlacklisted).mockResolvedValueOnce(true);
      const req = mockReq({ body: { refreshToken: 'blacklisted' }, cookies: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/refresh'), req, res);
      expect(res._status).toBe(401);
    });
  });

  describe('POST /logout', () => {
    it('logs out successfully with cookie token', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
      const req = mockReq({ cookies: { token: 'valid-token' }, headers: { 'x-refresh-token': 'rt' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/logout'), req, res);
      expect(res._status).toBe(200);
      expect(res._body.message).toContain('Logged out');
    });

    it('returns 401 when no token provided', async () => {
      const req = mockReq({ cookies: {}, headers: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/logout'), req, res);
      expect(res._status).toBe(401);
    });

    it('returns 401 for invalid token', async () => {
      const err = new Error('invalid');
      err.name = 'JsonWebTokenError';
      vi.mocked(jwt.verify).mockImplementation((() => { throw err; }) as any);
      const req = mockReq({ cookies: { token: 'bad' }, headers: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/logout'), req, res);
      expect(res._status).toBe(401);
    });

    it('extracts token from Authorization header', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
      const req = mockReq({ cookies: {}, headers: { authorization: 'Bearer my-token' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/logout'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /me', () => {
    it('returns current user info', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', display_name: 'Test', role: 'manager', phone: '123', region: 'Sanaa', last_login: new Date().toISOString() }] });
      const req = mockReq({ cookies: { token: 'valid' }, headers: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/me'), req, res);
      expect(res._status).toBe(200);
      expect(res._body.username).toBe('testuser');
    });

    it('returns 401 when no token', async () => {
      const req = mockReq({ cookies: {}, headers: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/me'), req, res);
      expect(res._status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ id: 999, username: 'ghost', role: 'manager', exp: 9999999999 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ cookies: { token: 'valid' }, headers: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/me'), req, res);
      expect(res._status).toBe(404);
    });

    it('returns 401 for revoked token', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
      vi.mocked(isTokenBlacklisted).mockResolvedValueOnce(true);
      const req = mockReq({ cookies: { token: 'revoked' }, headers: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/me'), req, res);
      expect(res._status).toBe(401);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SIMS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Sims Routes', () => {
  const router = simsRouter;

  describe('GET /', () => {
    it('returns all sims for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, phone: '777', iccid: '8997', provider: 'Yemen Mobile', status: 'available' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveLength(1);
    });

    it('returns paginated sims', async () => {
      vi.mocked(paginatedQuery).mockResolvedValueOnce({ data: [{ id: 1 }], total: 1, page: 1, limit: 10 } as any);
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: { page: '1', limit: '10' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns agent-scoped sims', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, phone: '777' }] });
      const req = mockReq({ user: { id: 2, role: 'agent' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toHaveLength(1);
    });

    it('returns empty for agent with no profile', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 2, role: 'agent' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toEqual([]);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('GET /:id', () => {
    it('returns a single sim', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, phone: '777' }] });
      const req = mockReq({ params: { id: '1' }, user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '999' }, user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(404);
    });

    it('agent gets 403 with no profile', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '1' }, user: { id: 2, role: 'agent' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(403);
    });

    it('agent gets 404 for out-of-scope sim', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '1' }, user: { id: 2, role: 'agent' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('POST /', () => {
    it('creates a new sim', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, phone: '777', iccid: '8997' }] });
      const req = mockReq({ body: { iccid: '8997', phone: '777', provider: 'Yemen Mobile' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(201);
    });

    it('returns 409 for duplicate ICCID', async () => {
      const err = new Error('dup'); (err as any).code = '23505';
      mockQuery.mockRejectedValueOnce(err);
      const req = mockReq({ body: { iccid: '8997' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(409);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ body: { iccid: '8997' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('PUT /:id', () => {
    it('updates a sim', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, phone: '777', iccid: '8997', provider: 'YM', status: 'a', owner: 'o', package_type: 'p' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, phone: '888', iccid: '8997' }] });
      const req = mockReq({ params: { id: '1' }, body: { phone: '888' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '999' }, body: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id'), req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('deletes a sim', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/:id'), req, res);
      expect(res._body.success).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AGENTS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Agents Routes', () => {
  const router = agentsRouter;

  describe('GET /', () => {
    it('returns all agents for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Agent A' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toHaveLength(1);
    });

    it('returns paginated agents', async () => {
      vi.mocked(paginatedQuery).mockResolvedValueOnce({ data: [{ id: 1 }], total: 1, page: 1, limit: 10 } as any);
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: { page: '1', limit: '10' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns agent-scoped data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'My Agency' }] });
      const req = mockReq({ user: { id: 2, role: 'agent' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toHaveLength(1);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('GET /:id', () => {
    it('returns an agent by id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Agent A' }] });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('POST /', () => {
    it('creates a new agent with user account', async () => {
      // 1. username check (query) -> no duplicate
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // 2. transaction callback: client.query INSERT user
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 10 }] });
      // 3. transaction callback: client.query INSERT agent
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, name: 'A', region: 'R', phone: '1', status: 'active' }] });
      const req = mockReq({ body: { name: 'Agent A', region: 'Sanaa', phone: '777' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(201);
      expect(res._body).toHaveProperty('agent');
      expect(res._body).toHaveProperty('credentials');
    });

    it('returns 409 for duplicate username', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const req = mockReq({ body: { name: 'A', username: 'taken' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(409);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ body: { name: 'A' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('PUT /:id', () => {
    it('updates an agent', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Old' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Updated' }] });
      const req = mockReq({ params: { id: '1' }, body: { name: 'Updated' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '999' }, body: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id'), req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('soft-deletes an agent', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 5 }] });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/:id'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/:id'), req, res);
      expect(res._status).toBe(404);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SELLERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

const SELLER_ROW = { id: 1, name: 'S', seller_id: 'SLR-1', store_name: 'St', id_number: '123', phone: '777', region: 'R', region_code: 'RC', status: 'active', total_sales: 0, current_stock: 0, efficiency: 0, sims_count: 0, sales_30_days: 0, sales_growth: 0, activity_rate: 0, creation_date: '', last_login: '', avatar: null, user_id: 1, agent_id: 1, agent_name: 'AgentX' };

describe('Sellers Routes', () => {
  const router = sellersRouter;

  describe('GET /', () => {
    it('returns all sellers for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [SELLER_ROW] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
      expect(res._body[0]).toHaveProperty('sellerId');
    });

    it('returns agent-scoped sellers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [SELLER_ROW] });
      const req = mockReq({ user: { id: 2, role: 'agent' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns empty for agent with no profile', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 2, role: 'agent' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toEqual([]);
    });

    it('returns seller-scoped sellers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [SELLER_ROW] });
      const req = mockReq({ user: { id: 3, role: 'seller' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('POST /', () => {
    it('creates a new seller', async () => {
      // 1. agent lookup by name (manager role + agent_name)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // transaction with its own client mock
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        // username check → not taken
        client.query.mockResolvedValueOnce({ rows: [] });
        // insert user
        client.query.mockResolvedValueOnce({ rows: [{ id: 10 }] });
        // insert seller
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, seller_id: 'SLR-12345', user_id: 10, agent_id: 1, name: 'Seller A', store_name: '', id_number: '', phone: '', region: '', region_code: '', status: 'active', creation_date: '2024/01/01', last_login: 'لم يسجل دخول بعد' }] });
        // final select with agent_name
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, seller_id: 'SLR-12345', user_id: 10, agent_id: 1, name: 'Seller A', store_name: '', id_number: '', phone: '', region: '', region_code: '', status: 'active', creation_date: '2024/01/01', last_login: 'لم يسجل دخول بعد', agent_name: 'AgentX' }] });
        return await fn(client);
      });
      const req = mockReq({ user: { id: 1, role: 'manager' }, body: { name: 'Seller A', agent_name: 'AgentX' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(201);
      expect(res._body).toHaveProperty('credentials');
    });

    it('returns 409 for duplicate username', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockTransaction.mockImplementationOnce(async (fn: any) => fn({ query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 1 }] }) }));
      const req = mockReq({ user: { id: 1, role: 'manager' }, body: { name: 'S', username: 'taken' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(409);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' }, body: { name: 'S' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('PUT /:id', () => {
    it('updates a seller', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, agent_id: 1, name: 'O' }] });
        client.query.mockResolvedValueOnce({ rows: [] });
        client.query.mockResolvedValueOnce({ rows: [{ ...SELLER_ROW, name: 'U' }] });
        return await fn(client);
      });
      const req = mockReq({ params: { id: '1' }, body: { name: 'U' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        client.query.mockResolvedValueOnce({ rows: [] });
        throw Object.assign(new Error('Seller not found'), { statusCode: 404 });
      });
      const req = mockReq({ params: { id: '999' }, body: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id'), req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('PUT /:id/balance', () => {
    it('updates seller balance', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, agent_id: 1, sales_30_days: 50 }] });
        client.query.mockResolvedValueOnce({ rows: [] });
        client.query.mockResolvedValueOnce({ rows: [{ ...SELLER_ROW, sales_30_days: 70 }] });
        return await fn(client);
      });
      const req = mockReq({ params: { id: '1' }, body: { amount: 20 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id/balance'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockTransaction.mockImplementationOnce(async () => { throw Object.assign(new Error('Seller not found'), { statusCode: 44 }); });
      const req = mockReq({ params: { id: '999' }, body: { amount: 20 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id/balance'), req, res);
      expect(res._status).toBe(44);
    });
  });

  describe('POST /:id/reset-password', () => {
    it('resets seller password', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 10, agent_id: 1, name: 'S' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ username: 'seller' }] });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/:id/reset-password'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveProperty('credentials');
    });

    it('returns 404 when not found', async () => {
      mockTransaction.mockImplementationOnce(async () => { throw Object.assign(new Error('Seller not found'), { statusCode: 404 }); });
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/:id/reset-password'), req, res);
      expect(res._status).toBe(404);
    });

    it('returns 400 when no linked user', async () => {
      mockTransaction.mockImplementationOnce(async () => { throw Object.assign(new Error('No linked user'), { statusCode: 400 }); });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/:id/reset-password'), req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('DELETE /:id', () => {
    it('soft-deletes a seller', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 10, agent_id: 1 }] });
        return await fn(client);
      });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/:id'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockTransaction.mockImplementationOnce(async () => { throw Object.assign(new Error('Seller not found'), { statusCode: 404 }); });
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/:id'), req, res);
      expect(res._status).toBe(404);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// OPERATIONS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Operations Routes', () => {
  const router = operationsRouter;

  describe('GET /', () => {
    it('returns all operations for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ op_id: 'op_1', type: 'activate', target: '777', operator: 'yemen_mobile', date: '2024/01/01', time: 'الآن', status: 'success' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
      expect(res._body[0]).toHaveProperty('id', 'op_1');
    });

    it('returns paginated operations', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: { page: '1', limit: '10' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns agent-scoped operations', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 2, role: 'agent' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('POST /', () => {
    it('creates a new operation', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ op_id: 'op_123', type: 'activate', target: '777', operator: 'yemen_mobile', date: '2024/01/01', time: 'الآن', status: 'success' }] });
      const req = mockReq({ body: { type: 'activate', target: '777', operator: 'yemen_mobile' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(201);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ body: { type: 'activate', target: '777' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORIES ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Inventories Routes', () => {
  const router = inventoriesRouter;

  describe('GET /', () => {
    it('returns all inventories for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, provider: 'YM', available: 10, reserved: 2, sold: 5 }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('PUT /', () => {
    it('updates inventory', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn().mockResolvedValueOnce({}) };
        return await fn(client);
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ operator: 'YM', available: 15, remaining: 10, period_days: 30 }] });
      const req = mockReq({ body: [{ operator: 'YM', available: 15, remaining: 10 }] });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ body: { id: 1, available: 15 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ALERTS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Alerts Routes', () => {
  const router = alertsRouter;

  describe('GET /', () => {
    it('returns all alerts for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Alert', priority: 'high', category: 'system', time: new Date().toISOString(), is_read: false }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('DELETE /:id', () => {
    it('deletes an alert', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/:id'), req, res);
      expect(res._status).toBe(200);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Admin Routes', () => {
  const router = adminRouter;

  describe('GET /settings', () => {
    it('returns settings', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_failed_logins_threshold: 5, lockout_duration_minutes: 15, maintenance_mode: false }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/settings'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('PUT /settings', () => {
    it('updates settings', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_failed_logins_threshold: 10 }] });
      const req = mockReq({ body: { maxFailedLoginsThreshold: 10 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/settings'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /transactions', () => {
    it('returns transactions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, amount: 100 }] });
      const req = mockReq({ query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/transactions'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /duplicate-identities', () => {
    it('returns duplicates', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/duplicate-identities'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /audit-logs', () => {
    it('returns audit logs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/audit-logs'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('POST /system/lockdown', () => {
    it('enables lockdown', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ maintenance_mode: true }] });
      const req = mockReq({ body: { enabled: true } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/system/lockdown'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /system/lockdown/status', () => {
    it('returns lockdown status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ maintenance_mode: false }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/system/lockdown/status'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /monitoring', () => {
    it('returns monitoring data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/monitoring'), req, res);
      expect(res._status).toBe(200);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// USERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Users Routes', () => {
  const router = usersRouter;

  describe('PUT /password', () => {
    it('changes password successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, password_hash: '$2a$10$hashedpassword' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ body: { currentPassword: 'Password1!', newPassword: 'NewPass1!' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/password'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 401 for wrong current password', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, password_hash: 'hash' }] });
      const req = mockReq({ body: { currentPassword: 'wrong', newPassword: 'NewPass1!' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/password'), req, res);
      expect(res._status).toBe(401);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ body: { currentPassword: 'Password1!', newPassword: 'NewPass1!' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/password'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('DELETE /account', () => {
    it('returns 409 for self-deletion', async () => {
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/account'), req, res);
      expect(res._status).toBe(409);
      expect(res._body.error).toContain('disabled');
    });
  });

  describe('PUT /profile', () => {
    it('updates profile', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, display_name: 'Updated' }] });
      const req = mockReq({ body: { display_name: 'Updated' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/profile'), req, res);
      expect(res._status).toBe(200);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Customers Routes', () => {
  const router = customersRouter;

  describe('GET /', () => {
    it('returns all customers for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'Customer A', phone: '777' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('GET /search', () => {
    it('searches customers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'Customer A' }] });
      const req = mockReq({ query: { q: 'Customer' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/search'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /:id', () => {
    it('returns a customer', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'Customer A' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, type: 'activate' }] });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('POST /', () => {
    it('creates a new customer', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        // check existing customer
        client.query.mockResolvedValueOnce({ rows: [] });
        // insert new customer
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'New Customer', phone: '777' }] });
        return await fn(client);
      });
      const req = mockReq({ body: { full_name: 'New Customer', phone: '777', id_number: 'ID123' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(201);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ body: { full_name: 'New Customer' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTIONS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Distributions Routes', () => {
  const router = distributionsRouter;

  describe('GET /', () => {
    it('returns all distributions for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending', seller_name: 'S', sim_phone: '777' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('POST /', () => {
    it('creates a distribution request', async () => {
      // 1. agent lookup by user_id
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // 2. seller ownership check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // 3. insert distribution request
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, request_id: 'DIST-1', agent_id: 1, seller_id: 1, operator: 'YM', count: 5, notes: '' }] });
      const req = mockReq({ user: { id: 2, role: 'agent' }, body: { seller_id: 1, operator: 'YM', count: 5 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(201);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ body: { seller_id: 1, sim_id: 1, quantity: 5 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('PUT /:id/approve', () => {
    it('approves a distribution', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        // SELECT * FROM distribution_requests WHERE id = $1 FOR UPDATE
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending', agent_id: 1, seller_id: 1, operator: 'YM', count: 5 }] });
        // UPDATE distribution_requests SET status=...
        client.query.mockResolvedValueOnce({});
        // SELECT available FROM inventories WHERE operator = $1 FOR UPDATE
        client.query.mockResolvedValueOnce({ rows: [{ available: 100 }] });
        // UPDATE inventories SET available=...
        client.query.mockResolvedValueOnce({});
        return await fn(client);
      });
      const req = mockReq({ params: { id: '1' }, body: { status: 'approved' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id/approve'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '999' }, body: { status: 'approved' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id/approve'), req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('GET /pending-count', () => {
    it('returns pending count', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/pending-count'), req, res);
      expect(res._status).toBe(200);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Reports Routes', () => {
  const router = reportsRouter;

  describe('GET /daily-sales', () => {
    it('returns daily sales', async () => {
      vi.mocked(cacheGet).mockReturnValue(undefined);
      mockQuery.mockResolvedValueOnce({ rows: [{ date: '2024/01/01', total: 100 }] });
      const req = mockReq({ query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/daily-sales'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /agent-performance', () => {
    it('returns agent performance', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, agent_name: 'A', region: 'R' }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/agent-performance'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /operator-distribution', () => {
    it('returns operator distribution', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ operator: 'YM', count: 10, status: 'active' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ operator: 'YM', count: 5, status: 'success' }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/operator-distribution'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveProperty('sims');
      expect(res._body).toHaveProperty('operations');
    });
  });

  describe('GET /seller-performance', () => {
    it('returns seller performance for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'S' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/seller-performance'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns agent-scoped seller performance', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'S' }] });
      const req = mockReq({ user: { id: 2, role: 'agent' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/seller-performance'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns empty for agent with no profile', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 2, role: 'agent' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/seller-performance'), req, res);
      expect(res._body).toEqual([]);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// UPLOAD ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Upload Routes', () => {
  const router = uploadRouter;

  describe('POST /image', () => {
    it('returns 400 when no file provided', async () => {
      const req = mockReq({ file: undefined });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/image'), req, res);
      expect(res._status).toBe(400);
      expect(res._body.error).toContain('No image file');
    });

    it('returns 400 for invalid magic bytes', async () => {
      const req = mockReq({
        file: {
          buffer: Buffer.from([0x00, 0x00, 0x00]),
          mimetype: 'image/jpeg',
          originalname: 'test.jpg',
        },
      });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/image'), req, res);
      expect(res._status).toBe(400);
      expect(res._body.error).toContain('Invalid image');
    });

    it('uploads valid JPEG', async () => {
      const req = mockReq({
        file: {
          buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
          mimetype: 'image/jpeg',
          originalname: 'photo.jpg',
        },
      });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/image'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveProperty('url');
    });

    it('uploads valid PNG', async () => {
      const req = mockReq({
        file: {
          buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47]),
          mimetype: 'image/png',
          originalname: 'photo.png',
        },
      });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/image'), req, res);
      expect(res._status).toBe(200);
    });

    it('uploads valid GIF', async () => {
      const req = mockReq({
        file: {
          buffer: Buffer.from([0x47, 0x49, 0x46, 0x38]),
          mimetype: 'image/gif',
          originalname: 'anim.gif',
        },
      });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/image'), req, res);
      expect(res._status).toBe(200);
    });

    it('uploads valid WebP', async () => {
      const req = mockReq({
        file: {
          buffer: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
          mimetype: 'image/webp',
          originalname: 'photo.webp',
        },
      });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/image'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('POST /images', () => {
    it('returns 400 when no files provided', async () => {
      const req = mockReq({ files: undefined });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/images'), req, res);
      expect(res._status).toBe(400);
    });

    it('uploads multiple valid images', async () => {
      const req = mockReq({
        files: [
          { buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), mimetype: 'image/jpeg', originalname: 'a.jpg' },
          { buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47]), mimetype: 'image/png', originalname: 'b.png' },
        ],
      });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/images'), req, res);
      expect(res._status).toBe(200);
      expect(Array.isArray(res._body)).toBe(true);
      expect(res._body).toHaveLength(2);
    });

    it('returns 400 when one file has invalid magic bytes', async () => {
      const req = mockReq({
        files: [
          { buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), mimetype: 'image/jpeg', originalname: 'a.jpg' },
          { buffer: Buffer.from([0x00, 0x00, 0x00]), mimetype: 'image/png', originalname: 'b.png' },
        ],
      });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/images'), req, res);
      expect(res._status).toBe(400);
    });
  });
});
