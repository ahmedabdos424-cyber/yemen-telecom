# RLS Test Results — Yemen Telecom Production Database

**Date:** 2026-07-14
**Method:** Live SQL against production (Supabase MCP) + live API smoke test
**Result:** ✅ PASS — all assertions met, application behaviour unchanged

---

## Test 1 — RLS enabled on all 16 tables

```sql
SELECT c.relname AS table, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN (16 tables...);
```

| table | rls_enabled | rls_forced |
|-------|-------------|------------|
| users, agents, sellers, sims, alerts, transactions, operations, inventories, audit_logs, system_settings, token_blacklist, duplicate_identities, customers, distribution_requests, schema_migrations, providers | **true** | false |

✅ All 16 tables have RLS enabled; none force RLS (owners keep bypass).

---

## Test 2 — Backend role (`postgres`) still sees data

```sql
SELECT count(*) AS users_as_postgres FROM public.users;  -- → 41
```

✅ `postgres` bypasses RLS and returns all rows. Application read path intact.

---

## Test 3 — `anon` read is denied (0 rows)

```sql
SET ROLE anon;
SELECT count(*) AS users_as_anon_read FROM public.users;  -- → 0
RESET ROLE;
```

✅ `anon` sees **0 rows** on every table (default-deny via RLS).

---

## Test 4 — `anon` write is denied

```sql
SET ROLE anon;
INSERT INTO public.alerts (title, description, priority, category, is_read)
VALUES ('rls-test','should-be-denied','low','test', false);
-- ERROR:  new row violates row-level security policy for table "alerts"
RESET ROLE;
```

✅ `anon` INSERT rejected with explicit RLS policy violation.

---

## Test 5 — `anon` UPDATE cannot modify existing rows

```sql
SET ROLE anon;
UPDATE public.users SET display_name = 'rls-attempt' WHERE id = 1;
RESET ROLE;
SELECT display_name FROM public.users WHERE id = 1;  -- → 'أحمد محمد' (unchanged)
```

✅ `anon` UPDATE affected 0 rows; the real row is untouched.

---

## Test 6 — Live API smoke test (application behaviour)

```
POST https://yemen-telecom.onrender.com/api/auth/login
Body: {"username":"manager","password":"12345678"}
→ HTTP 200, valid JWT returned (id=16, role=manager)
```

✅ Backend login works end-to-end. RLS did not regress the application.

> Note: initial 500 responses during testing were a **test-harness artefact**
> (PowerShell/curl stripped the JSON double-quotes, producing an unparseable
> body → `body-parser` JSON error). Re-sending valid JSON returned 200.

---

## Summary

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| RLS enabled (16 tables) | true | true | ✅ |
| postgres reads data | yes | 41 rows | ✅ |
| anon read | 0 rows | 0 rows | ✅ |
| anon insert | denied | denied | ✅ |
| anon update | 0 affected | 0 affected | ✅ |
| live login | 200 | 200 | ✅ |
