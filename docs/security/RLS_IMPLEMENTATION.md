# RLS Implementation — Yemen Telecom Production Database

**Status:** ✅ COMPLETE · Applied to production Supabase Postgres (2026-07-14)
**Scope:** 16 public tables · 0 application behaviour change

---

## 1. Objective

Close the externally reachable data-exposure gap identified by the Supabase
security advisor (`rls_disabled_in_public` on every table) by enabling
enterprise-grade **Row Level Security** on the production database, **without
breaking the running application**.

---

## 2. Architecture findings (verified, not assumed)

| Fact | Evidence | Implication |
|------|----------|-------------|
| Backend connects as `postgres` | `server/src/db.ts:28` (`safeEnv('DB_USER')`, default `postgres`) → pool `user: postgres.qxroquilskugfemzmrzp` | `postgres` role has `BYPASSRLS = true` → RLS is **bypassed** for the app |
| `service_role` has `BYPASSRLS = true` | `pg_roles` inspection | Supabase internal tooling unaffected |
| `anon` / `authenticated` have `BYPASSRLS = false`, **0 policies** | `pg_roles` + `pg_policies` | These are the only externally reachable roles and were fully exposed |
| App never uses the Supabase JS client | repo-wide grep: no `@supabase/supabase-js`, no `from(`, no Data-API calls; uploads use Firebase Storage | `anon`/`authenticated` are **never used by the app** |
| App JWT is the app's own HS256 token `{id,username,role}` | `server/src/middleware/auth.ts` | It is **not** a Supabase JWT, so `request.jwt.claims` never carries app claims |
| Authorization (manager/agent/seller) is in Express | `requireRole` + ownership `WHERE` clauses in every route | Enforced at the application layer, not the DB layer |

**Conclusion:** enabling RLS cannot break the backend, because the backend
queries the database through a role that bypasses RLS. RLS only removes the
public `anon`/`authenticated` hole.

---

## 3. Design decision

- **Enable RLS** on all 16 tables.
- **Backend policy** (`FOR ALL TO postgres, service_role USING (true) WITH CHECK (true)`)
  on every table: explicit full-access backstop so the backend keeps working
  even if `BYPASSRLS` is ever revoked.
- **`anon` / `authenticated`: no policy → denied by default.** With RLS on and no
  matching policy, Postgres returns 0 rows for reads and rejects all writes.
- **No `FORCE ROW LEVEL SECURITY`** — table owners (`postgres`) must keep
  bypassing RLS.
- **No role-scoped per-user policies** (manager/agent/seller). These application
  roles are not PostgreSQL roles, the single backend connection cannot be scoped
  per request, and the app's JWT is not a Supabase JWT — so such policies could
  not be exercised or verified against the running app and would be fabricated
  security theatre. Manager/agent/seller isolation remains correctly enforced in
  the Express layer (see `PERMISSION_MATRIX.md` and the audit report).

---

## 4. What was applied

Migration `024_enable_rls` (file: `server/migrations/024_enable_rls.sql`, also
applied directly to production via the Supabase MCP):

```sql
CREATE POLICY <table>_backend_full_access
  ON public.<table> FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
```

Applied to all 16 tables:
`users, agents, sellers, sims, alerts, transactions, operations, inventories,
audit_logs, system_settings, token_blacklist, duplicate_identities, customers,
distribution_requests, schema_migrations, providers`.

---

## 5. Verification (see `RLS_TEST_RESULTS.md`)

- RLS enabled on all 16 tables, `relforcerowsecurity = false`.
- `postgres` (app role) still reads all 41 users and the live `/api/auth/login`
  returns **HTTP 200** with a valid JWT.
- `anon` SELECT → 0 rows; INSERT → `violates row-level security policy`;
  UPDATE/DELETE → 0 rows affected.
- All other API endpoints unaffected (401 for unauthenticated, 200 for authed).

---

## 6. Reproducibility / rollback

- Migration SQL: `server/migrations/024_enable_rls.sql` (idempotent).
- Rollback SQL: `docs/security/024_rollback_rls.sql` (run manually if needed).
- See `ROLLBACK_GUIDE.md`.
