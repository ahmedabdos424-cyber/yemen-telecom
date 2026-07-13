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
  getDefaultLimit: () => 1000,
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════

describe('Auth Routes', () => {
  let router: any;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_SECRET = 'test-refresh-secret';
    vi.resetModules();
    vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
    vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
    vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
    vi.mock('../middleware/auth', () => ({
      requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
      authenticateToken: (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
      hashToken: (t: string) => `hashed_${t}`,
      isTokenBlacklisted: vi.fn().mockResolvedValue(false),
    }));
    vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), loginSchema: {} }));
    const authModule = await import('../routes/auth');
    router = authModule.default;
  });

  describe('POST /login', () => {
    it('logs in successfully with valid credentials', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', role: 'manager', status: 'active', password_hash: '$2a$10$hashedpassword', display_name: 'Test', phone: '123', region: 'Sanaa', failed_attempts: 0, locked_until: null }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ max_failed_logins_threshold: 5 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
      const req = mockReq({ body: { username: 'testuser', password: 'Password1!' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/login'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveProperty('token');
      expect(res._body).toHaveProperty('refreshToken');
      expect(res._body.user).toHaveProperty('username', 'testuser');
    });

    it('returns 401 for wrong password', async () => {
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as any);
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
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
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
      const jwt = await import('jsonwebtoken');
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      vi.mocked(jwt.default.verify).mockImplementation((() => { throw err; }) as any);
      const req = mockReq({ body: { refreshToken: 'expired' }, cookies: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/refresh'), req, res);
      expect(res._status).toBe(401);
    });

    it('returns 401 for blacklisted refresh token', async () => {
      const { isTokenBlacklisted } = await import('../middleware/auth');
      vi.mocked(isTokenBlacklisted).mockResolvedValueOnce(true);
      const req = mockReq({ body: { refreshToken: 'blacklisted' }, cookies: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/refresh'), req, res);
      expect(res._status).toBe(401);
    });
  });

  describe('POST /logout', () => {
    it('logs out successfully with cookie token', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
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
      const jwt = await import('jsonwebtoken');
      const err = new Error('invalid');
      err.name = 'JsonWebTokenError';
      vi.mocked(jwt.default.verify).mockImplementation((() => { throw err; }) as any);
      const req = mockReq({ cookies: { token: 'bad' }, headers: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/logout'), req, res);
      expect(res._status).toBe(401);
    });

    it('extracts token from Authorization header', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
      const req = mockReq({ cookies: {}, headers: { authorization: 'Bearer my-token' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/logout'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /me', () => {
    it('returns current user info', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
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
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ id: 999, username: 'ghost', role: 'manager', exp: 9999999999 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ cookies: { token: 'valid' }, headers: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/me'), req, res);
      expect(res._status).toBe(404);
    });

    it('returns 401 for revoked token', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ id: 1, username: 'testuser', role: 'manager', exp: 9999999999 } as any);
      const { isTokenBlacklisted } = await import('../middleware/auth');
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

function setupSimsMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), createSimSchema: {}, updateSimSchema: {} }));
  vi.mock('../helpers', () => ({
    getPagination: (req: any) => ({ page: Math.max(1, parseInt(req?.query?.page) || 1), limit: Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)), offset: ((Math.max(1, parseInt(req?.query?.page) || 1)) - 1) * Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)) }),
    paginatedQuery: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 }),
    getDefaultLimit: () => 1000,
  }));
}

describe('Sims Routes', () => {
  let router: any;
  beforeEach(async () => { setupSimsMocks(); router = (await import('../routes/sims')).default; });

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
      const { paginatedQuery } = await import('../helpers');
      vi.mocked(paginatedQuery).mockResolvedValueOnce({ data: [{ id: 1 }], total: 1, page: 1, limit: 10 });
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

function setupAgentMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), createAgentSchema: {}, updateAgentSchema: {} }));
  vi.mock('../helpers', () => ({
    getPagination: (req: any) => ({ page: Math.max(1, parseInt(req?.query?.page) || 1), limit: Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)), offset: ((Math.max(1, parseInt(req?.query?.page) || 1)) - 1) * Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)) }),
    paginatedQuery: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 }),
    getDefaultLimit: () => 1000,
  }));
  vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('$2a$10$h'), compare: vi.fn().mockResolvedValue(true) } }));
}

describe('Agents Routes', () => {
  let router: any;
  beforeEach(async () => { setupAgentMocks(); router = (await import('../routes/agents')).default; });

  describe('GET /', () => {
    it('returns all agents for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Agent A' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toHaveLength(1);
    });

    it('returns paginated agents', async () => {
      const { paginatedQuery } = await import('../helpers');
      vi.mocked(paginatedQuery).mockResolvedValueOnce({ data: [{ id: 1 }], total: 1, page: 1, limit: 10 });
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
      mockQuery.mockResolvedValueOnce({ rows: [] });
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

function setupSellerMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), createSellerSchema: {}, updateSellerSchema: {}, updateSellerBalanceSchema: {} }));
  vi.mock('../helpers', () => ({
    getPagination: (req: any) => ({ page: Math.max(1, parseInt(req?.query?.page) || 1), limit: Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)), offset: ((Math.max(1, parseInt(req?.query?.page) || 1)) - 1) * Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)) }),
    getDefaultLimit: () => 1000,
  }));
  vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('$2a$10$h'), compare: vi.fn().mockResolvedValue(true) } }));
}

describe('Sellers Routes', () => {
  let router: any;
  beforeEach(async () => { setupSellerMocks(); router = (await import('../routes/sellers')).default; });

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
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [SELLER_ROW] });
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

function setupOperationMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), createOperationSchema: {} }));
  vi.mock('../helpers', () => ({
    getPagination: (req: any) => ({ page: Math.max(1, parseInt(req?.query?.page) || 1), limit: Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)), offset: ((Math.max(1, parseInt(req?.query?.page) || 1)) - 1) * Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)) }),
    getDefaultLimit: () => 1000,
  }));
}

describe('Operations Routes', () => {
  let router: any;
  beforeEach(async () => { setupOperationMocks(); router = (await import('../routes/operations')).default; });

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

function setupInventoryMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), updateInventoriesSchema: {} }));
}

describe('Inventories Routes', () => {
  let router: any;
  beforeEach(async () => { setupInventoryMocks(); router = (await import('../routes/inventories')).default; });

  describe('GET /', () => {
    it('returns all inventories', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ operator: 'yemen_mobile', available: 100, remaining: 50, period_days: 30 }] });
      const req = mockReq({ user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toHaveLength(1);
      expect(res._body[0]).toHaveProperty('periodDays');
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('PUT /', () => {
    it('updates inventories', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ operator: 'yemen_mobile', available: 150, remaining: 80, period_days: 30 }] });
      const req = mockReq({ body: [{ operator: 'yemen_mobile', available: 150, remaining: 80 }] });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('handles empty update array', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ body: [] });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ body: [{ operator: 'yemen_mobile', available: 0, remaining: 0 }] });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/'), req, res);
      expect(res._status).toBe(500);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ALERTS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

function setupAlertMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../helpers', () => ({
    getPagination: (req: any) => ({ page: Math.max(1, parseInt(req?.query?.page) || 1), limit: Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)), offset: ((Math.max(1, parseInt(req?.query?.page) || 1)) - 1) * Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)) }),
    getDefaultLimit: () => 1000,
  }));
}

describe('Alerts Routes', () => {
  let router: any;
  beforeEach(async () => { setupAlertMocks(); router = (await import('../routes/alerts')).default; });

  describe('GET /', () => {
    it('returns all alerts', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, type: 'warning', message: 'Low stock' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toHaveLength(1);
    });

    it('returns paginated alerts', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: { page: '1', limit: '10' } });
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
      const req = mockReq({ params: { id: '1' }, user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/:id'), req, res);
      expect(res._body.success).toBe(true);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq({ params: { id: '1' }, user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/:id'), req, res);
      expect(res._status).toBe(500);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════════════════════════

function setupAdminMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), updateSettingsSchema: {} }));
  vi.mock('../cache', () => ({
    cacheGet: vi.fn().mockReturnValue(undefined),
    cacheSet: vi.fn(),
    cacheInvalidate: vi.fn(),
    cacheStats: vi.fn().mockReturnValue({ size: 5, hits: 100, misses: 20, ratio: '83.3%' }),
  }));
  vi.mock('../helpers', () => ({
    getPagination: (req: any) => ({ page: Math.max(1, parseInt(req?.query?.page) || 1), limit: Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)), offset: ((Math.max(1, parseInt(req?.query?.page) || 1)) - 1) * Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)) }),
    getDefaultLimit: () => 1000,
  }));
}

describe('Admin Routes', () => {
  let router: any;
  beforeEach(async () => { setupAdminMocks(); router = (await import('../routes/admin')).default; });

  describe('GET /settings', () => {
    it('returns settings', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ two_fa_enabled: false, session_timeout: '30m', maintenance_mode: false, language: 'ar', email_alerts_enabled: true, sms_alerts_enabled: false, app_notifications_enabled: true, stock_shortage_threshold: 10, inactive_sims_threshold: 5, max_failed_logins_threshold: 5, high_risk_duplicates_threshold: 3, identity_reminders_enabled: false, identity_reminders_frequency: 'weekly', email_2fa_enabled: false, trusted_devices_enabled: false, password_special_required: true, password_expiry_90_days: false, password_no_reuse_5: false }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/settings'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveProperty('twoFAEnabled');
    });

    it('returns empty object when no settings', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/settings'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toEqual({});
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/settings'), req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('PUT /settings', () => {
    it('updates settings', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{}] });
      const req = mockReq({ body: { maintenanceMode: true, language: 'en' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/settings'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 400 when no valid fields', async () => {
      const req = mockReq({ body: { invalidField: true } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/settings'), req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('GET /transactions', () => {
    it('returns transactions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, client_name: 'Client', provider: 'YM', sims_count: 5, status: 'done', relative_time: '1h' }] });
      const req = mockReq({ query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/transactions'), req, res);
      expect(res._status).toBe(200);
      expect(res._body[0]).toHaveProperty('clientName');
    });

    it('returns paginated transactions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ query: { page: '1', limit: '10' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/transactions'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /duplicate-identities', () => {
    it('returns duplicate identities', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id_no: '123', name: 'Ahmed', sims_count: '3', duplicates_count: '5', region: 'Sanaa' }] });
      const req = mockReq({ query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/duplicate-identities'), req, res);
      expect(res._status).toBe(200);
      expect(res._body[0]).toHaveProperty('risk');
    });
  });

  describe('GET /audit-logs', () => {
    it('returns audit logs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ log_id: 'L1', type: 'login', title: 'Logged in', username: 'user', time: 'now', status: 'ok' }] });
      const req = mockReq({ query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/audit-logs'), req, res);
      expect(res._status).toBe(200);
      expect(res._body[0]).toHaveProperty('id', 'L1');
    });
  });

  describe('POST /system/lockdown', () => {
    it('toggles lockdown on', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ maintenance_mode: false }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/system/lockdown'), req, res);
      expect(res._status).toBe(200);
      expect(res._body.locked).toBe(true);
    });

    it('toggles lockdown off', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ maintenance_mode: true }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/system/lockdown'), req, res);
      expect(res._status).toBe(200);
      expect(res._body.locked).toBe(false);
    });
  });

  describe('GET /system/lockdown/status', () => {
    it('returns lockdown status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ maintenance_mode: true }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/system/lockdown/status'), req, res);
      expect(res._status).toBe(200);
      expect(res._body.locked).toBe(true);
    });
  });

  describe('GET /monitoring', () => {
    it('returns monitoring data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{}] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/monitoring'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveProperty('db', 'connected');
      expect(res._body).toHaveProperty('uptime');
      expect(res._body).toHaveProperty('cache');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// USERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

function setupUserMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), updatePasswordSchema: {}, updateProfileSchema: {} }));
  vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('$2a$10$h'), compare: vi.fn().mockResolvedValue(true) } }));
}

describe('Users Routes', () => {
  let router: any;
  beforeEach(async () => { setupUserMocks(); router = (await import('../routes/users')).default; });

  describe('PUT /password', () => {
    it('updates password successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: '$2a$10$old' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 1 }, body: { currentPassword: 'OldPass1!', newPassword: 'NewPass1!x' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/password'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 401 when not authenticated', async () => {
      const req = mockReq({ user: null, body: { currentPassword: 'x', newPassword: 'y' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/password'), req, res);
      expect(res._status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 1 }, body: { currentPassword: 'x', newPassword: 'y' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/password'), req, res);
      expect(res._status).toBe(404);
    });

    it('returns 401 for wrong current password', async () => {
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: '$2a$10$old' }] });
      const req = mockReq({ user: { id: 1 }, body: { currentPassword: 'wrong', newPassword: 'NewPass1!x' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/password'), req, res);
      expect(res._status).toBe(401);
    });
  });

  describe('DELETE /account', () => {
    it('returns 409 self-deletion disabled', async () => {
      const req = mockReq({ user: { id: 1 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'delete', '/account'), req, res);
      expect(res._status).toBe(409);
    });
  });

  describe('PUT /profile', () => {
    it('updates profile', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'u', display_name: 'New', role: 'r', phone: '1', region: 'R' }] });
      const req = mockReq({ user: { id: 1 }, body: { displayName: 'New', phone: '1', region: 'R' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/profile'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 401 when not authenticated', async () => {
      const req = mockReq({ user: null, body: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/profile'), req, res);
      expect(res._status).toBe(401);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

function setupCustomerMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), createCustomerSchema: {} }));
  vi.mock('../helpers', () => ({
    getPagination: (req: any) => ({ page: Math.max(1, parseInt(req?.query?.page) || 1), limit: Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)), offset: ((Math.max(1, parseInt(req?.query?.page) || 1)) - 1) * Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)) }),
    getDefaultLimit: () => 1000,
  }));
}

describe('Customers Routes', () => {
  let router: any;
  beforeEach(async () => { setupCustomerMocks(); router = (await import('../routes/customers')).default; });

  describe('GET /', () => {
    it('returns all customers for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'Ahmed' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toHaveLength(1);
    });

    it('returns agent-scoped customers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const req = mockReq({ user: { id: 2, role: 'agent' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns paginated customers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: { page: '1', limit: '10' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._status).toBe(200);
    });
  });

  describe('GET /search', () => {
    it('searches customers by name', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'Ahmed' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: { q: 'Ahmed' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/search'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveLength(1);
    });

    it('returns 400 for short query', async () => {
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: { q: 'a' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/search'), req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when no query', async () => {
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/search'), req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('GET /:id', () => {
    it('returns customer with operations', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'Ahmed' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, type: 'activate' }] });
      const req = mockReq({ params: { id: '1' }, user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveProperty('operations');
    });

    it('returns 404 when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: '999' }, user: { id: 1, role: 'manager' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/:id'), req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('POST /', () => {
    it('creates a new customer', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        client.query.mockResolvedValueOnce({ rows: [] }); // no existing
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'Ahmed', id_number: '123' }] }); // insert
        return await fn(client);
      });
      const req = mockReq({ user: { id: 1, role: 'manager' }, body: { full_name: 'Ahmed', id_number: '123', phone: '777' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(201);
    });

    it('increments sims_count for existing customer', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        client.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // existing
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'Ahmed', sims_count: 2 }] }); // update
        return await fn(client);
      });
      const req = mockReq({ user: { id: 1, role: 'manager' }, body: { full_name: 'Ahmed', id_number: '123' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(201);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTIONS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

function setupDistributionMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../validation', () => ({ validate: () => (req: any, _res: any, next: NextFunction) => next(), createDistributionSchema: {}, approveDistributionSchema: {} }));
  vi.mock('../helpers', () => ({
    getPagination: (req: any) => ({ page: Math.max(1, parseInt(req?.query?.page) || 1), limit: Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)), offset: ((Math.max(1, parseInt(req?.query?.page) || 1)) - 1) * Math.min(200, Math.max(1, parseInt(req?.query?.limit) || 50)) }),
    getDefaultLimit: () => 1000,
  }));
}

describe('Distributions Routes', () => {
  let router: any;
  beforeEach(async () => { setupDistributionMocks(); router = (await import('../routes/distributions')).default; });

  describe('GET /', () => {
    it('returns all distributions for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, agent_name: 'A', seller_name: 'S', status: 'pending' }] });
      const req = mockReq({ user: { id: 1, role: 'manager' }, query: {} });
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/'), req, res);
      expect(res._body).toHaveLength(1);
    });

    it('returns agent-scoped distributions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending' }] });
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
  });

  describe('POST /', () => {
    it('creates a distribution request', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // agent lookup
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, request_id: 'DIST-1' }] }); // insert
      const req = mockReq({ user: { id: 2, role: 'agent' }, body: { operator: 'yemen_mobile', count: 10 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(201);
    });

    it('returns 400 when no agent profile', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ user: { id: 2, role: 'agent' }, body: { operator: 'yemen_mobile', count: 10 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(400);
    });

    it('returns 403 for unauthorized seller', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // agent lookup
      mockQuery.mockResolvedValueOnce({ rows: [] }); // seller owner check fails
      const req = mockReq({ user: { id: 2, role: 'agent' }, body: { operator: 'yemen_mobile', count: 10, seller_id: 99 } });
      const res = mockRes();
      await callHandler(findHandler(router, 'post', '/'), req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('PUT /:id/approve', () => {
    it('approves a distribution request', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending', operator: 'yemen_mobile', count: 10 }] });
        client.query.mockResolvedValueOnce({ rows: [] });
        client.query.mockResolvedValueOnce({ rows: [{ available: 100 }] });
        client.query.mockResolvedValueOnce({ rows: [] });
        return await fn(client);
      });
      const req = mockReq({ params: { id: '1' }, body: { status: 'approved' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id/approve'), req, res);
      expect(res._status).toBe(200);
    });

    it('rejects a distribution request', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        client.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending', operator: 'yemen_mobile', count: 10 }] });
        client.query.mockResolvedValueOnce({ rows: [] });
        return await fn(client);
      });
      const req = mockReq({ params: { id: '1' }, body: { status: 'rejected' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id/approve'), req, res);
      expect(res._status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      mockTransaction.mockImplementationOnce(async (fn: any) => {
        const client = { query: vi.fn() };
        client.query.mockResolvedValueOnce({ rows: [] });
        throw new Error('DISTRIBUTION_NOT_FOUND');
      });
      const req = mockReq({ params: { id: '999' }, body: { status: 'approved' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id/approve'), req, res);
      expect(res._status).toBe(404);
    });

    it('returns 400 when already processed', async () => {
      mockTransaction.mockImplementationOnce(async () => { throw new Error('DISTRIBUTION_ALREADY_APPROVED'); });
      const req = mockReq({ params: { id: '1' }, body: { status: 'approved' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id/approve'), req, res);
      expect(res._status).toBe(400);
    });

    it('returns 409 when insufficient inventory', async () => {
      mockTransaction.mockImplementationOnce(async () => { throw new Error('INSUFFICIENT_INVENTORY'); });
      const req = mockReq({ params: { id: '1' }, body: { status: 'approved' } });
      const res = mockRes();
      await callHandler(findHandler(router, 'put', '/:id/approve'), req, res);
      expect(res._status).toBe(409);
    });
  });

  describe('GET /pending-count', () => {
    it('returns pending count', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/pending-count'), req, res);
      expect(res._status).toBe(200);
      expect(res._body.count).toBe(5);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

function setupReportMocks() {
  vi.resetModules();
  vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
  vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
  vi.mock('../middleware/auth', () => ({
    requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
    authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
    hashToken: (t: string) => `hashed_${t}`,
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  }));
  vi.mock('../cache', () => ({
    cacheGet: vi.fn().mockReturnValue(undefined),
    cacheSet: vi.fn(),
    cacheInvalidate: vi.fn(),
    cacheStats: vi.fn().mockReturnValue({ size: 0, hits: 0, misses: 0, ratio: '0%' }),
  }));
}

describe('Reports Routes', () => {
  let router: any;
  beforeEach(async () => { setupReportMocks(); router = (await import('../routes/reports')).default; });

  describe('GET /daily-sales', () => {
    it('returns daily sales', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ day: '2024/01/01', activations: 5, unique_customers: 3, operator: 'YM' }] });
      const req = mockReq();
      const res = mockRes();
      await callHandler(findHandler(router, 'get', '/daily-sales'), req, res);
      expect(res._status).toBe(200);
      expect(res._body).toHaveLength(1);
    });

    it('returns cached data when available', async () => {
      const { cacheGet } = await import('../cache');
      vi.mocked(cacheGet).mockReturnValueOnce([{ day: '2024/01/01' }]);
      const req = mockReq();
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
  let router: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.mock('../../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
    vi.mock('../db', () => ({ query: (...a: any[]) => mockQuery(...a), transaction: (...a: any[]) => mockTransaction(...a), pool: { connect: vi.fn(), on: vi.fn() } }));
    vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
    vi.mock('../middleware/auth', () => ({
      requireRole: () => (req: any, _res: any, next: NextFunction) => { if (!req.user) req.user = { id: 1, username: 'testuser', role: 'manager' }; next(); },
      authenticateToken: (req: any, _res: any, next: NextFunction) => { next(); },
      hashToken: (t: string) => `hashed_${t}`,
      isTokenBlacklisted: vi.fn().mockResolvedValue(false),
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
    }));
     const mod = await import('../routes/upload');
    router = mod.default;
  });

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
