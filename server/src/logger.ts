import crypto from 'crypto';

const SENSITIVE_PATTERNS = [
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /password["']?\s*[:=]\s*["'][^"']+["']/gi,
  /token["']?\s*[:=]\s*["'][^"']+["']/gi,
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  /secret["']?\s*[:=]\s*["'][^"']+["']/gi,
  /key["']?\s*[:=]\s*["'][^"']+["']/gi,
  /private_key["']?\s*[:=]\s*["'][^"']+["']/gi,
  /-----BEGIN[^-]+-----/g,
];

function redact(value: string): string {
  return SENSITIVE_PATTERNS.reduce((v, p) => v.replace(p, '[REDACTED]'), value);
}

const isProd = process.env.NODE_ENV === 'production';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function generateErrorId(): string {
  return crypto.randomBytes(8).toString('hex');
}

const STRINGIFIER_REPLACER = (_key: string, value: unknown): unknown => {
  if (typeof value === 'string') return redact(value);
  return value;
};

function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data, STRINGIFIER_REPLACER);
  } catch {
    return String(data);
  }
}

export type LogContext = {
  correlationId?: string;
  requestId?: string;
  userId?: number;
  role?: string;
  path?: string;
  method?: string;
};

let currentContext: LogContext = {};

export function setLogContext(ctx: LogContext) {
  currentContext = { ...currentContext, ...ctx };
}

export function clearLogContext() {
  currentContext = {};
}

export function resetLogContext(ctx: LogContext) {
  currentContext = { ...ctx };
}

function buildMeta(args: unknown[]): { data?: unknown[]; errorId?: string } {
  const meta: { data?: unknown[]; errorId?: string } = {};
  if (args.length > 0) {
    meta.data = args.map(a => {
      if (a instanceof Error) {
        const errorId = generateErrorId();
        meta.errorId = errorId;
        return { message: a.message, stack: a.stack?.split('\n').slice(0, 5).join('\n'), errorId };
      }
      return a;
    });
  }
  return meta;
}

function log(level: string, message: string, ...args: unknown[]) {
  const safe = redact(message);
  const meta = buildMeta(args);

  const entry: Record<string, unknown> = {
    level,
    ts: formatTimestamp(),
    msg: safe,
    ...currentContext,
  };

  if (meta.data) entry.data = meta.data;
  if (meta.errorId) entry.errorId = meta.errorId;

  const output = JSON.stringify(entry, STRINGIFIER_REPLACER);

  switch (level) {
    case 'error': console.error(output); break;
    case 'warn': console.warn(output); break;
    default: console.log(output); break;
  }
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (isProd) return;
    log('debug', message, ...args);
  },

  info: (message: string, ...args: unknown[]) => {
    log('info', message, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    log('warn', message, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    log('error', message, ...args);
  },
};
