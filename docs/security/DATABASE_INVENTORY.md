# Database Inventory

**Generated:** 2026-07-14 via live Supabase introspection (`pg_class`, `pg_indexes`,
`pg_constraints`, `pg_triggers`, `pg_policies`, `pg_stat_user_tables`).
**Scope:** all 16 application tables in schema `public`, plus the out-of-scope `vault.secrets`.

Legend: ✅ = RLS enabled, 1 policy (`<t>_backend_full_access` FOR ALL TO postgres,service_role).

## 1. Summary table

| # | Table | Rows* | RLS | PK | FKs | Key indexes | Trigger |
|---|---|---|---|---|---|---|---|
| 1 | `users` | 41 | ✅ | id | — | `users_username_key` (uq) | trg_users_updated_at |
| 2 | `agents` | 10 | ✅ | id | user_id→users (CASCADE) | `agents_user_id_key` (uq) | trg_agents_updated_at |
| 3 | `sellers` | 24 | ✅ | id | user_id→users, agent_id→agents | `sellers_username_key` (uq) | trg_sellers_updated_at |
| 4 | `sims` | 384 | ✅ | id | agent_id→agents, assigned_to→sellers | `sims_iccid_key` (uq) | trg_sims_updated_at |
| 5 | `alerts` | 120 | ✅ | id | resolved_by→users | `alerts_priority_idx` | trg_alerts_updated_at |
| 6 | `transactions` | 300 | ✅ | id | created_by→users, seller_id→sellers | `transactions_type_idx` | trg_transactions_updated_at |
| 7 | `operations` | 200 | ✅ | id | agent_id→agents, seller_id→sellers, performed_by→users | `operations_type_idx` | trg_operations_updated_at |
| 8 | `inventories` | 6 | ✅ | id | provider_id→providers | `inventories_status_idx` | — |
| 9 | `audit_logs` | 100 | ✅ | id | — | `idx_audit_logs_actor` | — |
| 10 | `system_settings` | 16 | ✅ | id | — | `system_settings_key_key` (uq) | — |
| 11 | `token_blacklist` | 3 | ✅ | id | — | `token_blacklist_jti_key` (uq), `token_blacklist_token_hash_key` (uq) | — |
| 12 | `duplicate_identities` | 0 | ✅ | id | customer_id→customers | `idx_duplicate_identities_status` | — |
| 13 | `customers` | 50 | ✅ | id | created_by→users (SET NULL), activated_by→sellers (SET NULL) | 3× GIN(trgm) on name/id/phone | trg_customers_updated_at |
| 14 | `distribution_requests` | 50 | ✅ | id | customer_id→customers, distributed_by→users | `idx_distribution_requests_status` | trg_distribution_requests_updated_at |
| 15 | `schema_migrations` | 22 | ✅ | version | — | `schema_migrations_version_key` (uq) | — |
| 16 | `providers` | 0 | ✅ | id | — | `providers_name_key` (uq) | — |

\* `n_live_tup` from `pg_stat_user_tables` (live snapshot).

## 2. Referential integrity (foreign keys)

All FK columns are indexed (matching index present), preventing lock escalation on deletes.
Notable delete semantics:

- `agents.user_id → users(id) ON DELETE CASCADE` — removing a user removes its agent row.
- `customers.created_by → users(id) ON DELETE SET NULL` — audit trail preserved, author nulled.
- `customers.activated_by → sellers(id) ON DELETE SET NULL` — same.
- All other FKs use default `NO ACTION` (delete blocked while children exist).

## 3. Domain / CHECK constraints

Enumerated columns are enforced at the DB layer (defense in depth beneath Zod):

- `users.role` ∈ {manager, agent, seller}
- `agents.status` ∈ {active, inactive}; `sellers.status` ∈ {active, inactive}
- `sims.status` ∈ {available, assigned, activated, suspended, retired}
- `customers.status` ∈ {pending, active, rejected}
- `distribution_requests.status` ∈ {pending, approved, rejected, completed}
- `duplicate_identities.status` ∈ {pending, resolved, ignored}
- `inventories.status` ∈ {available, depleted, maintenance}; `providers.status` ∈ {active, inactive}
- `operations.type` / `transactions.type` ∈ {distribution, activation, adjustment, transfer, return}
- `alerts.priority` ∈ {low, medium, high, critical}; `alerts.status` ∈ {open, acknowledged, resolved}
- `system_settings.type` ∈ {string, number, boolean, json}

## 4. Indexing

- **Uniqueness:** every natural key is a unique index (`username`, `iccid`, `msisdn` where present,
  setting `key`, `jti`, `token_hash`, migration `version`, provider `name`).
- **Lookup indexes:** every FK and common filter column is indexed (`*_status`, `*_created_at`,
  `*_agent_id`, `*_seller_id`, `*_user_id`).
- **Search:** `customers` has three `pg_trgm` GIN indexes (full_name, id_number, phone) for
  fuzzy Arabic-name / national-ID / phone search.
- **No missing-index warnings** from `pg_stat` on the live DB (see `PERFORMANCE_REPORT.md`).

## 5. Triggers

Nine `BEFORE UPDATE` triggers call `update_updated_at_column()`, keeping `updated_at` current:
`users`, `agents`, `sellers`, `sims`, `alerts`, `transactions`, `operations`, `customers`,
`distribution_requests`. `inventories`, `audit_logs`, `system_settings`, `token_blacklist`,
`duplicate_identities`, `schema_migrations`, `providers` have no `updated_at` trigger (by design —
either append-only/immutable or maintained in code).

> **Advisor note:** `update_updated_at_column()` (and `cleanup_expired_tokens`) are flagged by the
> Supabase advisor for a **mutable `search_path`**. Harden by `ALTER FUNCTION … SET search_path=''`.
> This is a hardening item, not a vulnerability (functions run as SECURITY INVOKER / definer-owned).

## 6. Out-of-scope object

| Table | Schema | Owner | RLS | Note |
|---|---|---|---|---|
| `secrets` | `vault` | `supabase_admin` | off | Supabase Vault system table. Not `public`, not queried by app, not exposed via Data API. **No action.** |
