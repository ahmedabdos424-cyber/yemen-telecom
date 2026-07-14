# RLS Rollback Guide — Yemen Telecom

**Applies to:** migration `024_enable_rls`
**When to use:** only if RLS must be reverted (e.g. an unforeseen integration
that uses the Supabase `anon`/`authenticated` roles directly).

---

## ⚠️ Pre-rollback consideration

The application does **not** use the `anon`/`authenticated` roles — it connects
as `postgres`. Reverting RLS **re-opens the public Data-API exposure** that this
change closed. Prefer fixing the integration over disabling RLS.

---

## Option A — Supabase SQL Editor (dashboard)

1. Open the Supabase project → **SQL Editor**.
2. Paste the contents of `docs/security/024_rollback_rls.sql`.
3. Run it.
4. Confirm with:
   ```sql
   SELECT c.relname, c.relrowsecurity
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r';
   ```
   All `relrowsecurity` values should now be `false`.

## Option B — Supabase MCP tool

Run the rollback SQL via the `supabase_execute_sql` MCP tool using the same
`docs/security/024_rollback_rls.sql` content.

---

## What the rollback does

For each of the 16 tables:
```sql
ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS <table>_backend_full_access ON public.<table>;
```
This restores pre-024 behaviour (tables accessible by `anon`/`authenticated`
again).

---

## Re-applying RLS

After fixing the underlying issue, re-enable with
`server/migrations/024_enable_rls.sql` (idempotent — safe to re-run).

---

## Emergency note

Because the backend connects as `postgres` (`BYPASSRLS`), **the application keeps
working regardless of RLS state**. Rollback affects only the external Data-API
exposure, never the app itself.
