# Database Threat Model

**Date:** 2026-07-14
**Method:** STRIDE-style analysis of the data layer, mapped to existing controls and residual risk.
**Scope:** PostgreSQL (Supabase) + Express data-access path.

---

## Threat catalogue

### T1 — Unauthenticated direct DB access via Supabase Data API
- **Vector:** `anon`/`authenticated` roles reach Postgres through Supabase's auto-generated REST/GraphQL endpoints.
- **Likelihood before fix:** High (every Supabase project exposes this by default).
- **Impact:** Critical — full read/write on all tables (PII, credentials hashes, finance).
- **Control now in place:** RLS `ENABLE` on all 16 `public` tables; those roles have **0 policies ⇒ default-deny**. Verified: `SELECT` returns 0 rows, `INSERT` rejected with `violates row-level security policy`.
- **Residual risk:** 🟢 Low. Mitigated at DB layer; app never uses these roles.

### T2 — SQL injection
- **Vector:** Unsanitized user input concatenated into SQL.
- **Likelihood:** Low — 98–100 % of queries are parameterized (`$1` placeholders).
- **Control:** Parameterized queries throughout; 16 Zod schemas; `stripHtml()` XSS guard; `validation.ts`.
- **Residual risk:** 🟢 Low. Recommend periodic grep audit for string-built SQL (CI gate).

### T3 — JWT forgery / auth bypass
- **Vector:** Weak/algo-confusion attack on HS256.
- **Control:** `algorithms:['HS256']` pinned; secret in server env (never in repo/history); `crypto.timingSafeEqual` for CSRF; 1h access + 7d rotating refresh.
- **Residual risk:** 🟢 Low. Keep `JWT_SECRET` ≥ 32 bytes, rotated.

### T4 — Insecure Direct Object Reference (IDOR)
- **Vector:** Agent reads another agent's SIMs/customers.
- **Control:** Ownership-scoped queries (`agents.user_id=$1`, `sims.assigned_to`, `sellers.agent_id`) in `routes/sims.ts`, `routes/agents.ts`.
- **Residual risk:** 🟡 Medium. Relies on correct scoping in every new route — enforce via code review + tests.

### T5 — Privilege escalation via DB roles
- **Vector:** App role `manager` mapped to a powerful DB role.
- **Control:** App roles are **logical only**; the app always connects as `postgres`. No `GRANT`/role mapping to end users. RLS does not create per-user DB roles.
- **Residual risk:** 🟢 Low.

### T6 — Secret / credential exposure
- **Vector:** API keys, JWT secret, DB URL, signing key committed to git or leaked in build.
- **Control:** Source scan found **no** anon/service_role/Firebase/private-key literals. `.env`, `server/.env`, `.env.keystore`, `backups/*`, `android/key.properties` are `git check-ignore`-confirmed ignored. Signing key untracked and absent from history. `npm audit --omit=dev` → 0 vulns.
- **Residual risk:** 🟢 Low. Monitor via secret-scanning CI.

### T7 — Backup / artifact leakage
- **Vector:** `backups/*/root.env`, `server.env`, `android/key.properties` pushed to remote.
- **Control:** All git-ignored (verified). Android falls back to debug signing if env absent (warning only).
- **Residual risk:** 🟢 Low.

### T8 — Over-privileged application DB role
- **Vector:** `postgres` (BYPASSRLS, near-superuser) used by the app.
- **Control:** RLS still denies `anon`/`authenticated`; app needs broad write for its multi-tenant logic.
- **Residual risk:** 🟡 Medium (accepted). **Recommendation:** introduce a dedicated least-privilege app role (e.g. `app_writer`) with `GRANT` on the 16 tables and **without** BYPASSRLS, keeping `postgres` only for migrations. This Hardening item is tracked in `SECURITY_RECOMMENDATIONS.md`.

### T9 — Connection pool exhaustion / DoS
- **Vector:** Many concurrent requests exhaust the 8-connection pool.
- **Control:** `pg` Pool max=8, idle=20s, connTimeout=10s, statementTimeout=15s; 9 rate limiters in `index.ts`.
- **Residual risk:** 🟡 Medium (free-plan Render). Monitor pool wait metrics under load.

### T10 — Token replay / session fixation
- **Vector:** Stolen JWT reused after logout.
- **Control:** `token_blacklist` (jti/token_hash unique); refresh-token rotation + revocation on logout/refresh.
- **Residual risk:** 🟢 Low.

## Risk matrix

| ID | Threat | Likelihood | Impact | Residual | Primary control |
|----|--------|-----------|--------|----------|-----------------|
| T1 | Data-API direct access | Low (was High) | Critical | 🟢 | RLS deny for anon/auth |
| T2 | SQLi | Low | High | 🟢 | Parameterized + Zod |
| T3 | JWT forgery | Low | High | 🟢 | HS256 pin + secret hygiene |
| T4 | IDOR | Med | High | 🟡 | Ownership-scoped queries |
| T5 | Priv-esc via DB role | Low | High | 🟢 | No role mapping |
| T6 | Secret leak | Low | Critical | 🟢 | Scan + gitignore |
| T7 | Backup leak | Low | High | 🟢 | gitignore |
| T8 | Over-priv role | Med | High | 🟡 | RLS + (future) least-priv role |
| T9 | Pool DoS | Med | Med | 🟡 | Pool limits + rate limiters |
| T10 | Token replay | Low | Med | 🟢 | Blacklist + rotation |

## Conclusion
The highest-severity exposure (T1) is **closed** by RLS. Remaining 🟡 items are accepted
risks with documented compensating controls and tracked hardening recommendations.
