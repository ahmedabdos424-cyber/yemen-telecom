/**
 * @vitest-environment node
 *
 * Live-Postgres smoke test. Runs only when DB_HOST/DB_USER/DB_PASSWORD/DB_NAME
 * are set (local dev without a db mock, or the CI Postgres 17 service
 * container). Skipped in hermetic unit runs via describeLivePostgres().
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { describeLivePostgres } from './setup';

describeLivePostgres('live Postgres connectivity', () => {
  let pool: Pool;
  let query: <T extends import('pg').QueryResultRow = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<import('pg').QueryResult<T>>;

  beforeAll(async () => {
    const db = await import('../db');
    pool = db.pool;
    query = db.query;
  });

  afterAll(async () => {
    await pool.end().catch(() => undefined);
  });

  it('SELECT 1 round-trips', async () => {
    const res = await query<{ ok: number }>('SELECT 1 AS ok');
    expect(Number(res.rows[0]?.ok)).toBe(1);
  });
});