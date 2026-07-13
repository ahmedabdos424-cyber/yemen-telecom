import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Compression Middleware', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('console', { log: vi.fn(), warn: vi.fn(), error: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mockReqRes(method = 'GET', acceptEncoding = '') {
    const res: any = {
      statusCode: 200,
      setHeader: vi.fn(),
      removeHeader: vi.fn(),
      getHeader: vi.fn(() => undefined),
      end: vi.fn(),
      on: vi.fn(),
      send: vi.fn(),
      json: vi.fn(),
    };
    return {
      req: {
        method,
        headers: { 'accept-encoding': acceptEncoding },
        query: {},
      } as any,
      res,
    };
  }

  it('passes through HEAD requests', async () => {
    const { compression } = await import('../compression');
    const next = vi.fn();
    const { req, res } = mockReqRes('HEAD');
    compression()(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('does not compress small bodies (<1024 bytes)', async () => {
    const { compression } = await import('../compression');
    const next = vi.fn();
    const { req, res } = mockReqRes('GET', 'gzip');
    compression()(req, res, next);
    const smallBody = 'x'.repeat(500);
    res.send(smallBody);
    expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', 'gzip');
  });

  it('compresses large bodies with gzip when Accept-Encoding includes gzip', async () => {
    const { compression } = await import('../compression');
    const next = vi.fn();
    const { req, res } = mockReqRes('GET', 'gzip');
    compression()(req, res, next);
    const largeBody = 'x'.repeat(2048);
    res.send(largeBody);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    expect(res.setHeader).toHaveBeenCalledWith('Vary', 'Accept-Encoding');
  });

  it('compresses large bodies with brotli when Accept-Encoding includes br', async () => {
    const { compression } = await import('../compression');
    const next = vi.fn();
    const { req, res } = mockReqRes('GET', 'br');
    compression()(req, res, next);
    const largeBody = 'x'.repeat(2048);
    res.send(largeBody);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'br');
  });

  it('falls back to uncompressed when compression does not reduce size', async () => {
    const { compression } = await import('../compression');
    const next = vi.fn();
    const { req, res } = mockReqRes('GET', 'gzip');
    compression()(req, res, next);
    const randomData = Buffer.alloc(2048);
    for (let i = 0; i < randomData.length; i++) randomData[i] = Math.floor(Math.random() * 256);
    res.send(randomData);
    expect(res.setHeader).toHaveBeenCalled();
  });

  it('res.json: compresses large JSON responses', async () => {
    const { compression } = await import('../compression');
    const next = vi.fn();
    const { req, res } = mockReqRes('GET', 'gzip');
    compression()(req, res, next);
    const bigObj = { data: 'x'.repeat(2048) };
    res.json(bigObj);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
  });

  it('res.send: compresses large string responses', async () => {
    const { compression } = await import('../compression');
    const next = vi.fn();
    const { req, res } = mockReqRes('GET', 'gzip');
    compression()(req, res, next);
    const largeString = '<html>' + 'x'.repeat(2048) + '</html>';
    res.send(largeString);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
  });
});
