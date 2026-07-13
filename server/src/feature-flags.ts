import { query } from './db';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  value: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const cache = new Map<string, { flag: FeatureFlag; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

export async function getFlag(key: string): Promise<FeatureFlag | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.flag;
  }
  const res = await query(
    `SELECT key, enabled, value, created_at, updated_at FROM feature_flags WHERE key = $1`,
    [key]
  );
  if (res.rows.length === 0) {
    cache.set(key, { flag: { key, enabled: false, value: {}, createdAt: new Date(), updatedAt: new Date() }, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }
  const row = res.rows[0];
  const flag: FeatureFlag = {
    key: row.key,
    enabled: row.enabled,
    value: row.value || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  cache.set(key, { flag, expiresAt: Date.now() + CACHE_TTL_MS });
  return flag;
}

export async function isEnabled(key: string): Promise<boolean> {
  const flag = await getFlag(key);
  return flag?.enabled ?? false;
}

export async function getFlagValue<T = unknown>(key: string, defaultValue: T): Promise<T> {
  const flag = await getFlag(key);
  if (!flag || !flag.enabled) return defaultValue;
  return (flag.value as T) ?? defaultValue;
}

export async function setFlag(key: string, enabled: boolean, value: Record<string, unknown> = {}): Promise<void> {
  await query(
    `INSERT INTO feature_flags (key, enabled, value, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (key) DO UPDATE SET enabled = $2, value = $3, updated_at = NOW()`,
    [key, enabled, JSON.stringify(value)]
  );
  cache.delete(key);
}

export async function listFlags(): Promise<FeatureFlag[]> {
  const res = await query(
    `SELECT key, enabled, value, created_at, updated_at FROM feature_flags ORDER BY key`
  );
  return res.rows.map((row) => ({
    key: row.key,
    enabled: row.enabled,
    value: row.value || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function clearFlagCache(): void {
  cache.clear();
}
