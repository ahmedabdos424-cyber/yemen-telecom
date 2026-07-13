import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

interface MetricPoint {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

const metricsStore: MetricPoint[] = [];
const MAX_METRICS = 100000;

let inflight = 0;
let totalRequests = 0;
let totalErrors = 0;
const durationBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const histogram = new Map<string, number>();

function bucketFor(duration: number): string {
  for (const b of durationBuckets) {
    if (duration <= b) return `le${b}`;
  }
  return `le+Inf`;
}

export function trackMetric(name: string, value: number, labels: Record<string, string> = {}): void {
  metricsStore.push({ name, value, labels, timestamp: Date.now() });
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.splice(0, metricsStore.length - MAX_METRICS);
  }
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  inflight++;
  totalRequests++;
  const start = Date.now();
  res.on('finish', () => {
    inflight--;
    const duration = Date.now() - start;
    const sc = res.statusCode;
    if (sc >= 500) totalErrors++;
    const bk = bucketFor(duration);
    const hkey = `${req.method}|${req.route?.path || req.path}|${bk}`;
    histogram.set(hkey, (histogram.get(hkey) || 0) + 1);
    trackMetric('http_requests_total', 1, { method: req.method, status: String(sc) });
    trackMetric('http_request_duration_ms', duration, { method: req.method, path: req.route?.path || req.path, status: String(sc) });
  });
  next();
}

export function getMetricsSummary(): Record<string, unknown> {
  const grouped: Record<string, number[]> = {};
  for (const m of metricsStore) {
    if (m.name === 'http_request_duration_ms') {
      const key = `${m.labels.method} ${m.labels.path}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m.value);
    }
  }
  const summary: Record<string, { count: number; avgDuration: number; p95Duration: number }> = {};
  for (const [key, durations] of Object.entries(grouped)) {
    durations.sort((a, b) => a - b);
    const count = durations.length;
    const avg = durations.reduce((s, d) => s + d, 0) / count;
    const p95Idx = Math.ceil(count * 0.95) - 1;
    summary[key] = { count, avgDuration: Math.round(avg), p95Duration: durations[p95Idx] || 0 };
  }
  return summary;
}

export function getPrometheusMetrics(): string {
  const lines: string[] = [];
  const ts = Math.floor(Date.now() / 1000);

  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  const reqGroups = new Map<string, number>();
  for (const m of metricsStore) {
    if (m.name === 'http_requests_total') {
      const key = `method="${m.labels.method}",status="${m.labels.status}"`;
      reqGroups.set(key, (reqGroups.get(key) || 0) + m.value);
    }
  }
  for (const [labels, value] of reqGroups) {
    lines.push(`http_requests_total{${labels}} ${value} ${ts}`);
  }

  lines.push('# HELP http_request_duration_ms Request duration in ms');
  lines.push('# TYPE http_request_duration_ms histogram');
  const durGroups = new Map<string, number[]>();
  for (const m of metricsStore) {
    if (m.name === 'http_request_duration_ms') {
      const key = `${m.labels.method}|${m.labels.path}`;
      if (!durGroups.has(key)) durGroups.set(key, []);
      durGroups.get(key)!.push(m.value);
    }
  }
  for (const [key, durations] of durGroups) {
    const [method, path] = key.split('|');
    const labels = `method="${method}",path="${path}"`;
    for (const b of durationBuckets) {
      const count = durations.filter(d => d <= b).length;
      lines.push(`http_request_duration_ms_bucket{${labels},le="${b}"} ${count} ${ts}`);
    }
    lines.push(`http_request_duration_ms_bucket{${labels},le="+Inf"} ${durations.length} ${ts}`);
  }

  lines.push('# HELP http_requests_inflight Current in-flight requests');
  lines.push('# TYPE http_requests_inflight gauge');
  lines.push(`http_requests_inflight ${inflight} ${ts}`);

  lines.push('# HELP http_errors_total Total HTTP 5xx errors');
  lines.push('# TYPE http_errors_total counter');
  lines.push(`http_errors_total ${totalErrors} ${ts}`);

  lines.push('# HELP up Service health');
  lines.push('# TYPE up gauge');
  lines.push('up 1');

  try {
    const poolTotal = pool.totalCount;
    const poolIdle = pool.idleCount;
    const poolWaiting = pool.waitingCount;
    lines.push('# HELP db_pool_total Database pool total connections');
    lines.push('# TYPE db_pool_total gauge');
    lines.push(`db_pool_total ${poolTotal} ${ts}`);
    lines.push('# HELP db_pool_idle Database pool idle connections');
    lines.push('# TYPE db_pool_idle gauge');
    lines.push(`db_pool_idle ${poolIdle} ${ts}`);
    lines.push('# HELP db_pool_waiting Database pool queued requests');
    lines.push('# TYPE db_pool_waiting gauge');
    lines.push(`db_pool_waiting ${poolWaiting} ${ts}`);
  } catch {}

  return lines.join('\n');
}
