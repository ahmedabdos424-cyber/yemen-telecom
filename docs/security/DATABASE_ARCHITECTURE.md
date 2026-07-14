# Database Architecture

**Project:** Yemen Telecom (SIM distribution & customer management platform)
**DBMS:** PostgreSQL, managed by Supabase (project `qxroquilskugfemzmrzp`)
**Last reviewed:** 2026-07-14
**Related:** `DATABASE_INVENTORY.md`, `DATABASE_THREAT_MODEL.md`, `FINAL_CERTIFICATION.md`

---

## 1. Topology

```
┌──────────────────────────────────────────────────────────────┐
│  React + Capacitor clients (web :3000, Android APK/AAB)       │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS (CORS: localhost:3000 / web.app / Capacitor)
┌───────────────────────────▼──────────────────────────────────┐
│  Express API (Node.js, :4000)  — Docker image on Render       │
│   • AuthN: custom HS256 JWT (manager / agent / seller)        │
│   • AuthZ: requireRole() + ownership-scoped WHERE clauses      │
│   • Input: 16 Zod schemas + stripHtml() XSS guard             │
└───────────────────────────┬──────────────────────────────────┘
                            │ node-postgres Pool (max=8, idle=20s)
                            │ Transaction Pooler (Supabase)
┌───────────────────────────▼──────────────────────────────────┐
│  PostgreSQL  ── connected as role `postgres` (rolbypassrls)   │
│   • 16 application tables in schema `public` (RLS ON)         │
│   • Extensions: pgcrypto, pg_stat_statements, pg_trgm,         │
│     uuid-ossp, supabase_vault, pgbouncer                       │
│   • 1 platform table `vault.secrets` (out of scope)            │
└──────────────────────────────────────────────────────────────┘
```

The application **never** uses the Supabase Data API, `@supabase/supabase-js`, or the
`anon`/`authenticated` roles for database access. The only Supabase product in use is
**Storage** (and even that is via **Firebase Storage**, not Supabase) — i.e. zero
client-side code talks to Postgres.

## 2. Connection & Identity Model

| Concern | Value | Source |
|---|---|---|
| Driver | `node-postgres` (`pg`) | `server/src/db.ts` |
| Pool size | 8 (idle 20s, conn 10s, stmt 15s) | `server/src/db.ts` |
| DB role | `postgres` (connects with `DB_USER=postgres`) | `server/src/db.ts` |
| `rolbypassrls` | **true** for `postgres` and `service_role` | `pg_roles` introspection |
| Pooler | Supabase Transaction Pooler | connection string |
| JWT | HS256, secret `JWT_SECRET` (server env, not in repo) | `server/src/middleware/auth.ts:60` |
| JWT payload | `{ id, username, role, iat, exp, iss:'yemen-telecom' }` | `auth.ts` |
| App roles | `manager`, `agent`, `seller` — **logical only**, not DB roles | `auth.ts` |

Because the app authenticates to Postgres as `postgres` (BYPASSRLS), **Row Level Security
is bypassed for the application by construction**. RLS therefore serves as a *defense-in-depth*
control that blocks any path that does **not** use the `postgres`/`service_role` role —
principally the Supabase Data API reachable by `anon`/`authenticated`.

## 3. Authorization Layers (defense in depth)

1. **Network/Transport** — DB is not publicly reachable; only via Supabase pooler + API.
2. **Application authN** — HS256 JWT, algorithm pinned to `HS256` (no `alg` confusion),
   constant-time CSRF compare (`crypto.timingSafeEqual`).
3. **Application authZ** — `requireRole()` middleware + per-request ownership scoping
   (`WHERE users.id=$1`, `agents.user_id`, `sellers.user_id/agent_id`, `sims.assigned_to`).
4. **Database RLS** — `ENABLE ROW LEVEL SECURITY` on all 16 `public` tables;
   `anon`/`authenticated` get **no policy** ⇒ default-deny; `postgres`/`service_role`
   get a full-access policy (bypassed anyway via BYPASSRLS).
5. **Input validation** — 16 Zod schemas + `stripHtml()`; 98–100 % parameterized SQL.

## 4. Schema Domains

| Domain | Tables |
|---|---|
| Identity & Access | `users` |
| Org hierarchy | `agents`, `sellers` |
| SIM inventory | `sims`, `inventories`, `providers` |
| Customers | `customers`, `duplicate_identities`, `distribution_requests` |
| Operations / Finance | `operations`, `transactions`, `alerts` |
| Audit & Config | `audit_logs`, `system_settings`, `token_blacklist` |
| Migrations | `schema_migrations` |

See `DATABASE_INVENTORY.md` for per-table keys, FKs, indexes, triggers and RLS status.

## 5. Why no per-user DB policies

A naive RLS design would add policies keyed on `auth.uid()`. That model is **wrong here**
because:
- The app connects as a single `postgres` role, not per-end-user roles, so `auth.uid()`
  is always NULL.
- Enforcing per-user scoping at the DB layer would *break* the application (the app
  legitimately reads across rows it owns on behalf of the user).

Instead, per-user scoping is enforced in Express (`requireRole` + ownership WHERE
clauses), and RLS is used purely to **deny the Supabase Data API roles**. This is the
correct, minimal, non-breaking control for this architecture.

## 6. Out-of-scope objects

- `vault.secrets` — Supabase Vault system table (schema `vault`, owner `supabase_admin`),
  **not** in `public`, not queried by the app, not exposed via the Data API. No RLS action
  required.
- Supabase platform schemas (`auth`, `storage`, `extensions`, `pg_catalog`, …) — managed
  by Supabase; not part of the application data model.
