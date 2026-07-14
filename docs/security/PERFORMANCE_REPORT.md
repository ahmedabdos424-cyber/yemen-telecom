# Database Performance Report

**Date:** 2026-07-14
**Data sources:** `pg_stat_statements`, `pg_stat_user_tables`, live `EXPLAIN (ANALYZE, BUFFERS)`
**Note:** Dataset is small (largest table `sims` = 384 rows). Conclusions focus on *correctness of
plan choice* and *headroom*, not current latency (which is sub-millisecond at this scale).

---

## 1. Query plan verification (representative hot path)

Login path: `SELECT * FROM users WHERE username = $1 FOR UPDATE;`

```
LockRows  (cost=0.14..2.37 rows=1 width=166) (actual time=8.087..8.092 rows=1)
  Buffers: shared hit=3 dirtied=1
  ->  Index Scan using idx_users_username on users  (actual time=7.279..7.282 rows=1)
        Index Cond: (username = 'manager')
        Buffers: shared hit=2 dirtied=1
Planning Time: 7.486 ms   Execution Time: 8.239 ms
```
- **Uses the unique index `idx_users_username`** (index scan, 1 row) — optimal.
- 8.2 ms is *cold-plan* cost (239 shared buffers touched during planning). On a warm
  plan cache this query is **sub-millisecond**.
- All other lookup paths (by FK / status / created_at) have matching indexes (see
  `DATABASE_INVENTORY.md` §4) so will plan identically.

## 2. Index vs sequential scan (`pg_stat_user_tables`)

| Table | Rows | seq_scan | idx_scan | Assessment |
|---|---|---|---|---|
| users | 41 | 1961 | 187 | seq scans on 41-row table — negligible |
| token_blacklist | 3 | 1217 | 1049 | tiny table; seq scan cheap |
| sellers | 24 | 502 | 101 | fine |
| agents | 10 | 461 | 114 | fine |
| sims | 384 | 381 | 185 | fine; will benefit from idx as it grows |
| operations | 200 | 243 | 167 | fine |
| customers | 50 | 134 | 116 | fine |
| others | <120 | <200 | — | fine |

**No missing-index red flags.** The high `seq_scan` counts are on tables with <400 rows where
Postgres correctly prefers a seq scan (cheaper than index + heap fetch). As `sims`/`customers`
grow into the thousands, the existing `*_status`/`*_created_at`/`*_agent_id` indexes will be used.

## 3. `pg_stat_statements` (top by total time)

The top-15 statements by total execution time are **Supabase platform / dashboard queries**, not
application traffic:
- `SELECT * FROM pg_available_extensions()` (dashboard)
- `SELECT * FROM pg_timezone_names` / `pg_timezone_abbrevs`
- Large CTE introspecting `pg_proc`/`pg_attribute` (Advisor / Schema visualizer)
- `SELECT pgbouncer.get_auth($1)`
- `pg_backup_start` / `pg_backup_stop` (Platform backups)

**Interpretation:** the application's own queries are *not* in the top-15 by total time, which means
they are individually cheap and infrequent relative to platform overhead. No application query is a
latency outlier. (App queries go through the Transaction Pooler; their aggregate cost is low.)

## 4. RLS performance impact

The single backend policy per table is `USING (true) WITH CHECK (true)` and is attached to roles
that **bypass RLS** (`postgres`, `service_role`). Therefore:
- The policy expression is **never evaluated** for application traffic → zero RLS overhead.
- For `anon`/`authenticated` the policy list is empty → immediate deny, no scan.

## 5. Recommendations (hardening, non-blocking)

1. **Set `search_path=''`** on `update_updated_at_column()` and `cleanup_expired_tokens`
   (Supabase advisor warning: mutable search_path). Removes the only advisor flag on app functions.
2. **Add monitoring** for `pg_stat_statements` (already enabled) and alert if any app query
   regresses to a seq scan on `sims`/`customers` once they exceed ~5k rows.
3. **Consider partial indexes** if write volume on `audit_logs`/`transactions` grows
   (e.g. `WHERE resolved` on `alerts`) — not needed at current volume.
4. **Keep pool tuned**: current `max=8` is adequate; revisit if concurrent request rate
   (free-plan Render) approaches pool saturation — watch `pg_stat_activity` wait events.

## 6. Verdict
🟢 **Healthy.** Index strategy is correct, hot paths use indexes, no missing-index warnings, and
RLS adds no measurable overhead to application queries.
