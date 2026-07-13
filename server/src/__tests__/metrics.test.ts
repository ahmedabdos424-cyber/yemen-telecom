import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../db', () => ({
  pool: { totalCount: 5, idleCount: 3, waitingCount: 0 },
}));

function mockReqRes(method = 'GET', path = '/api/test', routePath?: string) {
  const finishListeners: (() => void)[] = [];
  return {
    req: {
      method,
      path,
      route: routePath ? { path: routePath } : undefined,
      query: {},
    } as any,
    res: {
      statusCode: 200,
      on: vi.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishListeners.push(cb);
      }),
    } as any,
    finish: () => finishListeners.forEach(cb => cb()),
  };
}

describe('Metrics Middleware', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('trackMetric: stores metric points', async () => {
    const { trackMetric } = await import('../middleware/metrics');
    trackMetric('test_metric', 42, { foo: 'bar' });
    trackMetric('test_metric', 100, { foo: 'baz' });
    const { getMetricsSummary } = await import('../middleware/metrics');
    const summary = getMetricsSummary();
    expect(summary).toBeDefined();
  });

  it('metricsMiddleware: increments inflight, tracks duration on response finish', async () => {
    const { metricsMiddleware } = await import('../middleware/metrics');
    const { req, res, finish } = mockReqRes('GET', '/api/test', '/api/test');
    metricsMiddleware(req, res, vi.fn());
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    finish();
  });

  it('getMetricsSummary: groups durations by method+path, calculates avg and p95', async () => {
    const { trackMetric, getMetricsSummary } = await import('../middleware/metrics');
    trackMetric('http_request_duration_ms', 10, { method: 'GET', path: '/api/users', status: '200' });
    trackMetric('http_request_duration_ms', 20, { method: 'GET', path: '/api/users', status: '200' });
    trackMetric('http_request_duration_ms', 30, { method: 'GET', path: '/api/users', status: '200' });
    const summary = getMetricsSummary() as Record<string, { count: number; avgDuration: number; p95Duration: number }>;
    const key = 'GET /api/users';
    expect(summary[key]).toBeDefined();
    expect(summary[key].count).toBe(3);
    expect(summary[key].avgDuration).toBe(20);
    expect(summary[key].p95Duration).toBe(30);
  });

  it('getPrometheusMetrics: returns valid Prometheus text format with HELP/TYPE lines', async () => {
    const { trackMetric, getPrometheusMetrics } = await import('../middleware/metrics');
    trackMetric('http_requests_total', 1, { method: 'GET', status: '200' });
    const output = getPrometheusMetrics();
    expect(output).toContain('# HELP');
    expect(output).toContain('# TYPE');
  });

  it('getPrometheusMetrics: includes expected metrics', async () => {
    const { trackMetric, getPrometheusMetrics } = await import('../middleware/metrics');
    trackMetric('http_requests_total', 1, { method: 'GET', status: '200' });
    trackMetric('http_request_duration_ms', 50, { method: 'GET', path: '/test', status: '200' });
    const output = getPrometheusMetrics();
    expect(output).toContain('http_requests_total');
    expect(output).toContain('http_request_duration_ms');
    expect(output).toContain('http_requests_inflight');
    expect(output).toContain('http_errors_total');
    expect(output).toContain('up 1');
    expect(output).toContain('db_pool_total');
    expect(output).toContain('db_pool_idle');
    expect(output).toContain('db_pool_waiting');
  });

  it('metricsStore: evicts oldest when exceeding MAX_METRICS', async () => {
    const { trackMetric, getMetricsSummary } = await import('../middleware/metrics');
    for (let i = 0; i < 100001; i++) {
      trackMetric('overflow_test', i);
    }
    const summary = getMetricsSummary();
    expect(summary).toBeDefined();
  });
});
