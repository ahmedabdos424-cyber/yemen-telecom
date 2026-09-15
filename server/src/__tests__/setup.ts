/**
 * Shared setup for server tests (loaded via vitest.config setupFiles).
 * Runs before every test file (frontend + backend) so server unit tests get a
 * hermetic, deterministic environment without each file re-declaring secrets.
 *
 * Responsibilities:
 *  - Provide default secret env vars used by auth/middleware modules.
 *  - Expose hasLivePostgres() / describeLivePostgres() so tests that need a real
 *    PostgreSQL (local dev, or the CI Postgres 17 service container) can either
 *    run when DB_* are present or skip gracefully when they are not.
 */
import { describe } from 'vitest';

const DEFAULT_SECRETS: Record<string, string> = {
  JWT_SECRET: 'test-jwt-secret',
  REFRESH_SECRET: 'test-refresh-secret',
  CSRF_SECRET: 'test-csrf-secret',
  BLACKLIST_HMAC_SECRET: 'test-blacklist-hmac-secret',
  RATE_LIMIT_DISABLED: 'true',
};

for (const [key, value] of Object.entries(DEFAULT_SECRETS)) {
  if (!process.env[key]) process.env[key] = value;
}

export const LIVE_DB_ENV_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const;

/**
 * True when all Postgres connection vars are present. This matches the gate
 * used by AGENTS.md: "DB tests need a live Postgres via DB_HOST/DB_PORT/
 * DB_USER/DB_PASSWORD/DB_NAME env vars." Present locally from `server/.env` or
 * in CI from the Postgres 17 service container with placeholder secrets.
 */
export function hasLivePostgres(): boolean {
  return LIVE_DB_ENV_VARS.every((key) => Boolean(process.env[key]));
}

/**
 * Wraps `describe` so a suite runs only when a live Postgres is reachable.
 * Skipped (reported, not failed) in hermetic unit runs.
 */
export function describeLivePostgres(name: string, fn: () => void): void {
  const run = hasLivePostgres() ? describe : describe.skip;
  run(name, fn);
}