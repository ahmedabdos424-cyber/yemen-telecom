import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger Module', () => {
  let logSpy: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    logSpy = vi.fn();
    warnSpy = vi.fn();
    errorSpy = vi.fn();
    vi.stubGlobal('console', { log: logSpy, warn: warnSpy, error: errorSpy });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('logger.info: calls console.log with JSON containing level, ts, msg', async () => {
    const { logger } = await import('../logger');
    logger.info('test message');
    expect(logSpy).toHaveBeenCalled();
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.level).toBe('info');
    expect(output.ts).toBeDefined();
    expect(output.msg).toBe('test message');
  });

  it('logger.warn: calls console.warn', async () => {
    const { logger } = await import('../logger');
    logger.warn('warning message');
    expect(warnSpy).toHaveBeenCalled();
    const output = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(output.level).toBe('warn');
    expect(output.msg).toBe('warning message');
  });

  it('logger.error: calls console.error', async () => {
    const { logger } = await import('../logger');
    logger.error('error message');
    expect(errorSpy).toHaveBeenCalled();
    const output = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(output.level).toBe('error');
    expect(output.msg).toBe('error message');
  });

  it('logger.debug: does NOT log in production mode', async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { logger } = await import('../logger');
    logger.debug('debug message');
    expect(logSpy).not.toHaveBeenCalled();
    if (orig !== undefined) process.env.NODE_ENV = orig;
    else delete process.env.NODE_ENV;
  });

  it('redaction: messages containing Bearer token are redacted', async () => {
    const { logger } = await import('../logger');
    logger.info('Auth header: Bearer xxx123token');
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.msg).not.toContain('xxx123token');
    expect(output.msg).toContain('[REDACTED]');
  });

  it('redaction: JWT tokens are redacted', async () => {
    const { logger } = await import('../logger');
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.signature';
    logger.info(`Token is ${jwt}`);
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.msg).not.toContain(jwt);
    expect(output.msg).toContain('[REDACTED]');
  });

  it('redaction: password="xxx" patterns are redacted', async () => {
    const { logger } = await import('../logger');
    logger.info('password="secret123"');
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.msg).not.toContain('secret123');
    expect(output.msg).toContain('[REDACTED]');
  });

  it('setLogContext: adds context to log entries', async () => {
    const { logger, setLogContext } = await import('../logger');
    setLogContext({ userId: 42, role: 'manager' });
    logger.info('context test');
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.userId).toBe(42);
    expect(output.role).toBe('manager');
  });

  it('clearLogContext: removes all context', async () => {
    const { logger, setLogContext, clearLogContext } = await import('../logger');
    setLogContext({ userId: 42 });
    clearLogContext();
    logger.info('no context');
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.userId).toBeUndefined();
  });

  it('resetLogContext: replaces context entirely', async () => {
    const { logger, setLogContext, resetLogContext } = await import('../logger');
    setLogContext({ userId: 42, role: 'manager' });
    resetLogContext({ correlationId: 'abc-123' });
    logger.info('reset test');
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.correlationId).toBe('abc-123');
    expect(output.userId).toBeUndefined();
    expect(output.role).toBeUndefined();
  });

  it('Error objects: logged with errorId and stack trace', async () => {
    const { logger } = await import('../logger');
    const err = new Error('test error');
    logger.error('something failed', err);
    expect(errorSpy).toHaveBeenCalled();
    const output = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(output.errorId).toBeDefined();
    expect(output.data).toBeDefined();
    expect(output.data[0].message).toBe('test error');
    expect(output.data[0].stack).toBeDefined();
  });
});
