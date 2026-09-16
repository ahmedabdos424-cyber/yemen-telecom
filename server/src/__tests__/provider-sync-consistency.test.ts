/**
 * @vitest-environment node
 *
 * P4 — provider_id ↔ provider text dual-write consistency.
 *
 * Migrations 037 (FK), 038 (backfill) and 039 (TRIGGER) keep `provider_id` in
 * sync with the legacy text columns (sims/transactions use display_name,
 * inventories/operations/distribution_requests use slug). This file locks that
 * guarantee in two layers:
 *
 *  1. STATIC (hermetic): migration 039 must install the sync trigger on exactly
 *     the expected five tables and cover both lookup branches, so a future edit
 *     that silently drops one table/branch fails the suite.
 *  2. LIVE (gated by describeLivePostgres): against a real Postgres, every
 *     non-null provider_id must resolve to a providers row, and its text column
 *     must agree (case-insensitively) with the providers lookup. Runs locally
 *     or in the CI Postgres service container when DB_* vars are present.
 *     Tables missing from an uninitialized DB are skipped (not failed) so the
 *     suite stays green on a bare Postgres while still asserting hard against a
 *     schema-complete database.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describeLivePostgres } from './setup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');

const TABLES_BY_TEXT: Array<{ table: string; textCol: string; matchCol: string }> = [
  { table: 'sims', textCol: 'provider', matchCol: 'display_name' },
  { table: 'transactions', textCol: 'provider', matchCol: 'display_name' },
  { table: 'inventories', textCol: 'operator', matchCol: 'slug' },
  { table: 'operations', textCol: 'operator', matchCol: 'slug' },
  { table: 'distribution_requests', textCol: 'operator', matchCol: 'slug' },
];

describe('migration 039 sync trigger covers all provider tables (static)', () => {
  const sql = fs.readFileSync(path.join(migrationsDir, '039_sync_provider_id_trigger.sql'), 'utf-8');

  it('defines triggers for each expected table', () => {
    for (const { table } of TABLES_BY_TEXT) {
      expect(sql).toMatch(new RegExp(`CREATE TRIGGER trg_${table}_sync_provider_id`));
      expect(sql).toMatch(new RegExp(`DROP TRIGGER IF EXISTS trg_${table}_sync_provider_id ON ${table}`));
    }
  });

  it('covers both display_name (sims/transactions) and slug (rest) lookups', () => {
    expect(sql).toMatch(/LOWER\(display_name\) = LOWER\(NEW\.provider\)/);
    expect(sql).toMatch(/LOWER\(slug\) = LOWER\(NEW\.operator\)/);
  });
});

describeLivePostgres('live provider_id ↔ text consistency', () => {
  let pool: Pool;
  let query: <T extends import('pg').QueryResultRow = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<import('pg').QueryResult<T>>;

  const existingTables = new Set<string>();

  beforeAll(async () => {
    const db = await import('../db');
    pool = db.pool;
    query = db.query;
    const res = await query('SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()');
    for (const row of res.rows) existingTables.add(String(row.table_name));
  });

  afterAll(async () => {
    await pool.end().catch(() => undefined);
  });

  for (const { table, textCol, matchCol } of TABLES_BY_TEXT) {
    it(`${table}: no orphan provider_id and text agrees with providers`, async (ctx) => {
      if (!existingTables.has(table)) {
        ctx.skip(`table "${table}" absent — schema not initialized (migrations not applied)`);
        return;
      }
      const orphan = await query<{ orphan_count: number }>(
        `SELECT COUNT(*)::int AS orphan_count
         FROM ${table} t
         WHERE t.provider_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM providers p WHERE p.id = t.provider_id)`
      );
      expect(orphan.rows[0]?.orphan_count).toBe(0);

      const mismatch = await query<{ mismatch_count: number }>(
        `SELECT COUNT(*)::int AS mismatch_count
         FROM ${table} t
         JOIN providers p ON p.id = t.provider_id
         WHERE NULLIF(LOWER(t.${textCol}), '') IS NOT NULL
           AND LOWER(p.${matchCol}) <> LOWER(t.${textCol})`
      );
      expect(mismatch.rows[0]?.mismatch_count).toBe(0);
    });
  }

  it('sync triggers are installed on all five tables', async (ctx) => {
    for (const { table } of TABLES_BY_TEXT) {
      if (!existingTables.has(table)) {
        ctx.skip(`table "${table}" absent — schema not initialized; trigger lock only partial`);
        continue;
      }
      const res = await query(
        `SELECT tgname FROM pg_trigger
         WHERE tgname = 'trg_${table}_sync_provider_id'
           AND NOT tgisinternal
           AND tgrelid = '${table}'::regclass`
      );
      expect(res.rows.length).toBe(1);
    }
  });
});