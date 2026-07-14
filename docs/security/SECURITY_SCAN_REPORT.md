# Security Scan Report

**Date:** 2026-07-14
**Covers:** source secret scan, dependency audit, live-DB access control verification.

---

## 1. Source-code secret scan

### 1.1 Patterns checked
- Supabase `anon` key (`eyJ...` JWT / `sb-*` project URLs)
- Supabase `service_role` key
- Firebase `apiKey` / `private_key` / `authDomain`
- Hard-coded JWT signing secret / DB URL with embedded credentials
- Android signing keystore passwords

### 1.2 Result
- **0** matching secrets found in tracked source under `src/`, `server/`, `android/`, configs.
- The only DB connection references use **environment variables** (`DB_USER`, `DB_HOST`, …) resolved at runtime — no literals.

### 1.3 gitignore verification (`git check-ignore`)
| Path | Ignored? |
|---|---|
| `.env` | ✅ |
| `server/.env` | ✅ |
| `.env.keystore` | ✅ |
| `backups/*/root.env` | ✅ |
| `backups/*/server.env` | ✅ |
| `android/key.properties`, `android/app/key.properties` | ✅ |

### 1.4 History scan
- The Android signing key was briefly referenced by an earlier (superseded) `android/key.properties`
  rule; the corrected ignore rule (`android/**/key.properties`) is now in place and verified.
- No secret was ever committed; the production signing key remains untracked and is supplied only
  via CI/env at build time.

## 2. Dependency audit

| Command | Result |
|---|---|
| `npm ci` (reproducible install) | 424 packages, success |
| `npm audit` (full, incl. dev) | 8 moderate (firebase-admin transitive: uuid/gaxios/google-gax) — **accepted risk** per `AGENTS.md` |
| `npm audit --omit=dev` (prod only) | **0 vulnerabilities** |

The production surface is clean. The 8 moderate dev-time issues are transitive through
`firebase-admin` and require a breaking major upgrade to clear; they do not ship to runtime.

## 3. Live database access-control verification

Executed against the production Supabase project:

| Check | Query | Result |
|---|---|---|
| `anon` direct read | `SET ROLE anon; SELECT count(*) FROM users;` | **0 rows** (denied) |
| `authenticated` direct read | `SET ROLE authenticated; SELECT count(*) FROM sims;` | **0 rows** (denied) |
| `anon` direct insert | `SET ROLE anon; INSERT INTO users ...;` | **Rejected:** `violates row-level security policy` |
| `postgres` (app role) read | `SELECT count(*) FROM users;` | 41 rows (bypass) |
| `postgres` (app role) write | `INSERT/UPDATE/DELETE` in rolled-back tx | Succeeded, rolled back |
| RLS enabled per table | `pg_class.relrowsecurity` | **16/16 = true** |
| Policy count per table | `pg_policies` | **1** each (`*_backend_full_access` TO postgres,service_role) |
| FORCE RLS | `pg_class.relforcerowsecurity` | **false** on all (correct — preserves app bypass) |

## 4. Verdict
🟢 **Pass.** No secrets in source or history, production dependencies clean, and the database
enforces default-deny for all non-application roles.
