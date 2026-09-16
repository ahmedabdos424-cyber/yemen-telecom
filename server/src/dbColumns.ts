import { query } from './db';

// Backward-compatibility probe for columns added by newer migrations.
// The server does not auto-apply migrations at boot (see init-db.ts), so a
// fresh code deploy may run briefly against a database that lacks the newest
// columns. Callers use this to pick a compatible query shape instead of
// throwing 42703 (undefined column). Positive results are cached forever;
// negative results are cached for 60s so a migration applied right after a
// deploy is picked up without a restart.
const cache = new Map<string, { has: boolean; at: number }>();
const NEGATIVE_TTL_MS = 60_000;

export async function hasColumn(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  const hit = cache.get(key);
  if (hit && (hit.has || Date.now() - hit.at < NEGATIVE_TTL_MS)) {
    return hit.has;
  }
  try {
    const r = await query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
      [table, column]
    );
    const has = r.rows.length > 0;
    cache.set(key, { has, at: Date.now() });
    return has;
  } catch {
    return false;
  }
}

/** Test-only hook to reset the probe cache. */
export function clearColumnCache(): void {
  cache.clear();
}
