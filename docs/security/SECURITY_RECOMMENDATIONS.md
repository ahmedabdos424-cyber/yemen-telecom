# Security Recommendations — Yemen Telecom Production Database

**Date:** 2026-07-14
**Context:** Follow-up to the RLS hardening (migration 024). This document lists
forward-looking improvements. Items are ordered by priority.

---

## 1. What is already done (baseline)

- RLS enabled on all 16 public tables; `anon`/`authenticated` fully denied;
  backend (`postgres`/`service_role`, both `BYPASSRLS`) unaffected.
- No Supabase JS client, no anon/service_role keys in the frontend.
- Custom HS256 JWT with issuer check, CSRF, token blacklist, login lockout.
- Secrets live in env vars / gitignored files; none committed to git.

---

## 2. High-priority recommendations

### 2.1 Rotate the public Supabase anon key
RLS now gates the Data API, but defense-in-depth means the publicly known anon
key should be rotated so any previously leaked key stops working. After
rotation, re-verify RLS still denies `anon`.

### 2.2 Add an IP allow-list / WAF on the Data API (or disable it)
The application never uses the Supabase Data API (it uses `pg` directly). If the
Data API is not needed, disable it; otherwise restrict it to known egress IPs.
This removes the entire external attack surface in front of RLS.

### 2.3 Pin `search_path` on the two flagged functions
`cleanup_expired_tokens` and `update_updated_at_column` trigger the Supabase
`function_search_path_mutable` advisor warning. Add `SET search_path = ''` (or
`pg_catalog`) to both. Low risk, high hygiene.

### 2.4 Rotate the Android signing key
The signing key was historically tracked (now gitignored). Treat it as
potentially exposed: generate a new upload key and rotate via Play Console.

---

## 3. Medium-priority recommendations

### 3.1 Dedicated least-privilege database role for the backend
Today the API connects as `postgres` (superuser-equivalent, `BYPASSRLS`). For
stronger isolation, create a dedicated role (e.g. `app_api`) scoped with
explicit `GRANT`s and a matching RLS policy, instead of using the superuser.
This limits blast radius if the API is ever compromised.

### 3.2 Enable Point-in-Time Recovery (PITR)
Confirm PITR is enabled on the Supabase project so the 16 tables (and the RLS
policies) can be recovered to a point in time.

### 3.3 Move `pg_trgm` to a dedicated schema
The `extension_in_public` advisor warning is benign (trigram search is required
by the app) but a dedicated schema is cleaner and avoids polluting `public`.

### 3.4 Secret scanning in CI
Add GitHub secret scanning / a pre-commit hook (e.g. gitleaks) to prevent any
future accidental commit of `.env`, keystores, or keys.

---

## 4. Low-priority / monitoring

- **Alert on `anon`/`authenticated` access attempts** in Supabase logs — any
  such attempt now returns 0 rows / denied writes; an unexpected spike indicates
  probing.
- **Re-run `supabase db advisors`** after every schema change.
- **Load-test** the backend under the free-tier connection pool (`max=8`) to
  confirm no pool exhaustion under RLS policy evaluation.

---

## 5. Verification evidence (this cycle)

| Claim | Evidence |
|-------|----------|
| RLS enabled (16/16) | `RLS_TEST_RESULTS.md` — `relrowsecurity=true` |
| `anon`/`authenticated` denied | live SQL: SELECT 0 rows, INSERT rejected, UPDATE/DELETE 0 rows |
| Backend works | live login 200 (manager/agent/seller), `GET /api/sims` 20 rows, JWT refresh ok |
| App compiles & tests pass | `tsc --noEmit` clean ×2, `npm run build` ok, Vitest 776/776 |
| Secrets safe | `.gitignore` covers all; `git check-ignore` confirms; no source leakage |

---

## 6. Rollback

See `ROLLBACK_GUIDE.md` and `024_rollback_rls.sql`. Because the backend connects
as `postgres` (`BYPASSRLS`), the application keeps working regardless of RLS
state; rollback only re-opens the external Data-API exposure.
