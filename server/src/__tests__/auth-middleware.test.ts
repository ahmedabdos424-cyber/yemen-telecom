import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../db', () => ({ query: vi.fn().mockResolvedValue({ rows: [] }) }));
vi.mock('../sentry', () => ({ setSentryUser: vi.fn() }));

let mockVerify: ReturnType<typeof vi.fn>;

vi.mock('jsonwebtoken', () => {
  mockVerify = vi.fn();
  return { default: { verify: mockVerify } };
});

describe('Auth Middleware', () => {
  beforeEach(async () => {
    vi.resetModules();
    process.env.JWT_SECRET = 'test-secret-key-12345';
    mockVerify = vi.fn();
    vi.doMock('jsonwebtoken', () => ({ default: { verify: mockVerify } }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.JWT_SECRET;
  });

  it('hashToken: produces consistent SHA-256 hashes', async () => {
    const { hashToken } = await import('../middleware/auth');
    const hash1 = hashToken('my-secret-token');
    const hash2 = hashToken('my-secret-token');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashToken: different inputs produce different hashes', async () => {
    const { hashToken } = await import('../middleware/auth');
    const h1 = hashToken('token-a');
    const h2 = hashToken('token-b');
    expect(h1).not.toBe(h2);
  });

  it('authenticateToken: returns 401 when no Authorization header', async () => {
    const { authenticateToken } = await import('../middleware/auth');
    const req = { headers: {}, cookies: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    await authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('authenticateToken: returns 401 for invalid JWT', async () => {
    mockVerify.mockImplementation(() => { throw new Error('invalid'); });
    const { authenticateToken } = await import('../middleware/auth');
    const req = { headers: { authorization: 'Bearer invalid-token' }, cookies: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    await authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authenticateToken: returns 401 for expired JWT', async () => {
    mockVerify.mockImplementation(() => { throw new Error('jwt expired'); });
    const { authenticateToken } = await import('../middleware/auth');
    const req = { headers: { authorization: 'Bearer expired-token' }, cookies: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    await authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authenticateToken: sets req.user for valid JWT', async () => {
    mockVerify.mockReturnValue({ id: 1, username: 'admin', role: 'manager' });
    const { query } = await import('../db');
    const mockQuery = query as ReturnType<typeof vi.fn>;
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'active' }] });

    const { authenticateToken } = await import('../middleware/auth');
    const req = { headers: { authorization: 'Bearer valid-token' }, cookies: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    await authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 1, username: 'admin', role: 'manager' });
  });

  it('requireRole(manager): returns 403 for non-manager users', async () => {
    const { requireRole } = await import('../middleware/auth');
    const req = { user: { id: 1, username: 'user', role: 'agent' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    requireRole('manager')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('requireRole(manager): passes through for manager users', async () => {
    const { requireRole } = await import('../middleware/auth');
    const req = { user: { id: 1, username: 'mgr', role: 'manager' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    requireRole('manager')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('requireRole(manager,agent): passes through for both roles', async () => {
    const { requireRole } = await import('../middleware/auth');
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    const reqManager = { user: { id: 1, username: 'mgr', role: 'manager' } } as any;
    const next1 = vi.fn();
    requireRole('manager', 'agent')(reqManager, res, next1);
    expect(next1).toHaveBeenCalled();

    const reqAgent = { user: { id: 2, username: 'ag', role: 'agent' } } as any;
    const next2 = vi.fn();
    requireRole('manager', 'agent')(reqAgent, res, next2);
    expect(next2).toHaveBeenCalled();
  });

  it('isTokenBlacklisted: returns false for non-blacklisted tokens', async () => {
    const { query } = await import('../db');
    const mockQuery = query as ReturnType<typeof vi.fn>;
    mockQuery.mockResolvedValue({ rows: [] });

    const { isTokenBlacklisted } = await import('../middleware/auth');
    const result = await isTokenBlacklisted('some-token');
    expect(result).toBe(false);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('token_blacklist'),
      expect.any(Array)
    );
  });
});
