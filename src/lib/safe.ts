export function safeNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function safeString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}

export function safeObject<T extends Record<string, unknown>>(v: unknown, fallback: T): T {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as T;
  return fallback;
}
