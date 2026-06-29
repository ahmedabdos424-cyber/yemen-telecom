const SENSITIVE_PATTERNS = [
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /password["']?\s*[:=]\s*["'][^"']+["']/gi,
  /token["']?\s*[:=]\s*["'][^"']+["']/gi,
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  /secret["']?\s*[:=]\s*["'][^"']+["']/gi,
  /key["']?\s*[:=]\s*["'][^"']+["']/gi,
];

function redact(value: string): string {
  return SENSITIVE_PATTERNS.reduce((v, p) => v.replace(p, '[REDACTED]'), value);
}

const isProd = process.env.NODE_ENV === 'production';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function stringify(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (isProd) return;
    const safe = redact(message);
    const extra = args.length ? ' ' + args.map(a => stringify(a)).join(' ') : '';
    console.debug(`[DEBUG] ${formatTimestamp()} ${safe}${extra}`);
  },

  info: (message: string, ...args: unknown[]) => {
    const safe = redact(message);
    const extra = args.length ? ' ' + args.map(a => stringify(a)).join(' ') : '';
    if (isProd) {
      console.log(JSON.stringify({ level: 'info', ts: formatTimestamp(), msg: safe, data: args.length ? args.map(a => redact(stringify(a))) : undefined }));
    } else {
      console.log(`[INFO]  ${formatTimestamp()} ${safe}${extra}`);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    const safe = redact(message);
    const extra = args.length ? ' ' + args.map(a => stringify(a)).join(' ') : '';
    if (isProd) {
      console.warn(JSON.stringify({ level: 'warn', ts: formatTimestamp(), msg: safe, data: args.length ? args.map(a => redact(stringify(a))) : undefined }));
    } else {
      console.warn(`[WARN]  ${formatTimestamp()} ${safe}${extra}`);
    }
  },

  error: (message: string, ...args: unknown[]) => {
    const safe = redact(message);
    const extra = args.length ? ' ' + args.map(a => stringify(a)).join(' ') : '';
    if (isProd) {
      console.error(JSON.stringify({ level: 'error', ts: formatTimestamp(), msg: safe, data: args.length ? args.map(a => redact(stringify(a))) : undefined }));
    } else {
      console.error(`[ERROR] ${formatTimestamp()} ${safe}${extra}`);
    }
  },
};
