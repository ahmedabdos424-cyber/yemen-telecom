const SLOW_THRESHOLD_MS = 1000;
const MAX_LOG_ENTRIES = 200;
const LOG_PREFIX = '[YT]';

const SENSITIVE_PATTERNS = [
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /password["']?\s*[:=]\s*["'][^"']+["']/gi,
  /token["']?\s*[:=]\s*["'][^"']+["']/gi,
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
];

function redact(value: string): string {
  return SENSITIVE_PATTERNS.reduce((v, p) => v.replace(p, '[REDACTED]'), value);
}

type LogEntry = {
  ts: string;
  type: 'error' | 'warn' | 'timing' | 'event';
  message: string;
  data?: unknown;
};

const logRing: LogEntry[] = [];

function push(type: LogEntry['type'], message: string, data?: unknown) {
  logRing.push({ ts: new Date().toISOString(), type, message, data });
  if (logRing.length > MAX_LOG_ENTRIES) logRing.shift();
}

export function captureError(error: unknown, context?: string) {
  const msg = context ? `[${context}]` : '';
  if (error instanceof Error) {
    const safeMsg = redact(error.message);
    const safeStack = error.stack ? redact(error.stack) : undefined;
    console.error(`${LOG_PREFIX}${msg}`, safeMsg);
    push('error', `${msg} ${safeMsg}`, { stack: safeStack, context });
  } else {
    const safeStr = redact(String(error));
    console.error(`${LOG_PREFIX}${msg}`, safeStr);
    push('error', `${msg} ${safeStr}`, { context });
  }
}

export function captureEvent(name: string, data?: Record<string, unknown>) {
  push('event', name, data);
}

export function captureTiming(name: string, durationMs: number) {
  if (durationMs >= SLOW_THRESHOLD_MS) {
    console.warn(`${LOG_PREFIX} [SLOW] ${name} — ${durationMs.toFixed(0)}ms`);
    push('warn', `SLOW: ${name} — ${durationMs.toFixed(0)}ms`);
  } else {
    push('timing', `${name} — ${durationMs.toFixed(0)}ms`);
  }
}

export function getLogs(): LogEntry[] {
  return [...logRing];
}

export function initMonitor() {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    captureError(event.reason, 'UnhandledRejection');
  });

  window.addEventListener('error', (event: ErrorEvent) => {
    captureError(event.error || event.message, 'GlobalError');
  });

  captureEvent('monitor.init');
}
