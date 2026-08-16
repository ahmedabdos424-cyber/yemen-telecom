/**
 * In-memory cache for the system maintenance_mode flag.
 *
 * Avoids a database round-trip on every mutating request while the flag is
 * cached. The cache is invalidated explicitly whenever the flag is updated
 * (settings save or emergency lockdown toggle), and also expires after a
 * bounded TTL as a safety net so a stale value can never stick around longer
 * than MAINTENANCE_CACHE_TTL_MS.
 */

import { query } from './db';

const MAINTENANCE_CACHE_TTL_MS = 45_000;

interface MaintenanceCacheEntry {
  value: boolean;
  expiresAt: number;
}

let maintenanceCache: MaintenanceCacheEntry | null = null;

export function invalidateMaintenanceMode(): void {
  maintenanceCache = null;
}

export async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && maintenanceCache.expiresAt > now) {
    return maintenanceCache.value;
  }

  let value = false;
  try {
    const result = await query('SELECT maintenance_mode FROM system_settings WHERE id = 1');
    value = result.rows.length > 0 && Boolean(result.rows[0]?.maintenance_mode);
  } catch {
    // On DB errors fall back to the last known value (or false when empty)
    // rather than failing the request; the next TTL window retries the query.
    value = maintenanceCache?.value ?? false;
  }

  maintenanceCache = { value, expiresAt: now + MAINTENANCE_CACHE_TTL_MS };
  return value;
}