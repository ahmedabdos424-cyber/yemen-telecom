import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Pagination Guard', () => {
  let warnSpy: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.fn>;

  function mockReqRes(method = 'GET', path = '/api/test', query: Record<string, string | undefined> = {}) {
    return {
      req: { method, path, query } as any,
      res: { status: vi.fn().mockReturnThis(), json: vi.fn() } as any,
      next: vi.fn(),
    };
  }

  beforeEach(async () => {
    vi.resetModules();
    warnSpy = vi.fn();
    logSpy = vi.fn();
    vi.stubGlobal('console', { log: logSpy, warn: warnSpy, error: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('passes through non-GET requests unchanged', async () => {
    const { paginationGuard } = await import('../paginationGuard');
    const { req, res, next } = mockReqRes('POST');
    paginationGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBeUndefined();
  });

  it('passes through GET without page/limit in dev mode', async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    vi.resetModules();
    warnSpy = vi.fn();
    logSpy = vi.fn();
    vi.stubGlobal('console', { log: logSpy, warn: warnSpy, error: vi.fn() });
    const { paginationGuard } = await import('../paginationGuard');
    const { req, res, next } = mockReqRes('GET');
    paginationGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBeUndefined();
    if (orig !== undefined) process.env.NODE_ENV = orig;
    else delete process.env.NODE_ENV;
  });

  it('enforces page=1, limit=50 in production for requests without params', async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    vi.resetModules();
    warnSpy = vi.fn();
    logSpy = vi.fn();
    vi.stubGlobal('console', { log: logSpy, warn: warnSpy, error: vi.fn() });
    const { paginationGuard } = await import('../paginationGuard');
    const { req, res, next } = mockReqRes('GET');
    paginationGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe('1');
    expect(req.query.limit).toBe('50');
    if (orig !== undefined) process.env.NODE_ENV = orig;
    else delete process.env.NODE_ENV;
  });

  it('caps limit to MAX_PAGE_LIMIT when exceeded', async () => {
    const origMax = process.env.MAX_PAGE_LIMIT;
    process.env.MAX_PAGE_LIMIT = '500';
    vi.resetModules();
    warnSpy = vi.fn();
    logSpy = vi.fn();
    vi.stubGlobal('console', { log: logSpy, warn: warnSpy, error: vi.fn() });
    const { paginationGuard } = await import('../paginationGuard');
    const { req, res, next } = mockReqRes('GET', '/api/test', { limit: '9999' });
    paginationGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.limit).toBe('500');
    if (origMax !== undefined) process.env.MAX_PAGE_LIMIT = origMax;
    else delete process.env.MAX_PAGE_LIMIT;
  });

  it('sets limit to 1 when negative', async () => {
    const { paginationGuard } = await import('../paginationGuard');
    const { req, res, next } = mockReqRes('GET', '/api/test', { limit: '-5' });
    paginationGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.limit).toBe('1');
  });

  it('passes through valid page/limit params', async () => {
    const { paginationGuard } = await import('../paginationGuard');
    const { req, res, next } = mockReqRes('GET', '/api/test', { page: '3', limit: '25' });
    paginationGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe('3');
    expect(req.query.limit).toBe('25');
  });
});
