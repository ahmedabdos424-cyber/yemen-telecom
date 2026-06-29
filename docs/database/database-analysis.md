# Database Analysis — Yemen Telecom

> Strictly derived from `server/src/schema.sql`, 5 migrations in `server/migrations/`, and all TypeScript route files.

---

## 1. Table Inventory

### 1.1 `users`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| username | VARCHAR(100) | string | NO | — | UNIQUE |
| password_hash | VARCHAR(255) | string | NO | — | |
| display_name | VARCHAR(200) | string | NO | `''` | |
| role | VARCHAR(20) | string | NO | — | CHECK IN (`manager`,`agent`,`seller`) |
| status | VARCHAR(20) | string | YES | `'active'` | |
| phone | VARCHAR(50) | string | YES | `''` | |
| email | VARCHAR(200) | string | YES | `''` | |
| region | VARCHAR(200) | string | YES | `''` | |
| created_at | TIMESTAMP | Date | YES | `NOW()` | |
| last_login | TIMESTAMP | Date | YES | — | |

**Indexes:** `idx_users_status`, `idx_users_phone`, `idx_users_role_username`, `idx_users_role`, `idx_users_username`

---

### 1.2 `agents`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| user_id | INTEGER | number | YES | — | UNIQUE, FK → `users(id)` ON DELETE CASCADE |
| name | VARCHAR(200) | string | NO | — | |
| region | VARCHAR(200) | string | YES | `''` | |
| phone | VARCHAR(50) | string | YES | `''` | |
| email | VARCHAR(200) | string | YES | `''` | |
| sellers_count | INTEGER | number | YES | `0` | |
| sims_count | INTEGER | number | YES | `0` | |
| status | VARCHAR(20) | string | YES | `'active'` | CHECK IN (`active`,`inactive`) |
| created_at | TIMESTAMP | Date | YES | `NOW()` | |

**Indexes:** `idx_agents_status`, `idx_agents_region`, `idx_agents_phone_unique` (partial UNIQUE WHERE phone != ''), `idx_agents_user_id`, `idx_agents_name`

---

### 1.3 `sellers`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| seller_id | VARCHAR(50) | string | NO | — | UNIQUE |
| user_id | INTEGER | number | YES | — | UNIQUE, FK → `users(id)` ON DELETE CASCADE |
| agent_id | INTEGER | number | YES | — | FK → `agents(id)` ON DELETE SET NULL |
| name | VARCHAR(200) | string | NO | — | |
| store_name | VARCHAR(200) | string | YES | `''` | |
| id_number | VARCHAR(50) | string | YES | `''` | |
| phone | VARCHAR(50) | string | YES | `''` | |
| email | VARCHAR(200) | string | YES | `''` | |
| region | VARCHAR(200) | string | YES | `''` | |
| region_code | VARCHAR(50) | string | YES | `''` | |
| status | VARCHAR(20) | string | YES | `'active'` | CHECK IN (`active`,`inactive`,`suspended`,`low_stock`,`deleted`) |
| total_sales | INTEGER | number | YES | `0` | |
| current_stock | INTEGER | number | YES | `0` | |
| efficiency | INTEGER | number | YES | `0` | |
| sims_count | INTEGER | number | YES | `0` | |
| sales_30_days | INTEGER | number | YES | `0` | |
| sales_growth | INTEGER | number | YES | `0` | |
| activity_rate | INTEGER | number | YES | `0` | |
| creation_date | VARCHAR(20) | string | YES | `''` | |
| last_login | VARCHAR(100) | string | YES | `''` | |
| avatar | VARCHAR(500) | string | YES | `''` | |
| agent_name | VARCHAR(200) | string | YES | `''` | |
| created_by | INTEGER | number | YES | — | FK → `users(id)` ON DELETE SET NULL |
| created_at | TIMESTAMP | Date | YES | `NOW()` | |

**Indexes:** `idx_sellers_region`, `idx_sellers_region_code`, `idx_sellers_id_number`, `idx_sellers_created_at`, `idx_sellers_agent_id`, `idx_sellers_user_id`, `idx_sellers_agent_name`, `idx_sellers_phone`, `idx_sellers_status`

---

### 1.4 `sims`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| phone | VARCHAR(50) | string | NO | `''` | |
| iccid | VARCHAR(50) | string | NO | — | UNIQUE |
| provider | VARCHAR(50) | string | NO | `'Yemen Mobile'` | |
| status | VARCHAR(20) | string | NO | `'available'` | CHECK IN (`available`,`sold`,`reserved`,`inactive`,`suspended`) |
| owner | VARCHAR(200) | string | YES | `'المركز الرئيسي'` | |
| date_added | VARCHAR(20) | string | YES | `''` | |
| package_type | VARCHAR(100) | string | YES | `'باقة مزايا الشهرية'` | |
| assigned_to | INTEGER | number | YES | — | FK → `sellers(id)` ON DELETE SET NULL |
| contract_image | VARCHAR(500) | string | YES | `''` | |
| customer_name | VARCHAR(200) | string | YES | `''` | |
| customer_id | VARCHAR(50) | string | YES | `''` | |
| activated_by | INTEGER | number | YES | — | FK → `users(id)` ON DELETE SET NULL |
| created_at | TIMESTAMP | Date | YES | `NOW()` | |

**Indexes:** `idx_sims_phone`, `idx_sims_owner`, `idx_sims_customer_name`, `idx_sims_customer_id`, `idx_sims_created_at`, `idx_sims_provider_status`, `idx_sims_iccid`, `idx_sims_provider`, `idx_sims_status`, `idx_sims_assigned_to`

---

### 1.5 `customers`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| full_name | VARCHAR(200) | string | NO | — | |
| id_number | VARCHAR(50) | string | NO | — | UNIQUE (added via ALTER TABLE) |
| phone | VARCHAR(50) | string | YES | `''` | |
| region | VARCHAR(200) | string | YES | `''` | |
| sims_count | INTEGER | number | YES | `1` | |
| first_activation | TIMESTAMP | Date | YES | `NOW()` | |
| last_activation | TIMESTAMP | Date | YES | `NOW()` | |
| created_at | TIMESTAMP | Date | YES | `NOW()` | |
| activated_by | INTEGER | number | YES | — | FK → `sellers(id)` ON DELETE SET NULL |
| created_by | INTEGER | number | YES | — | FK → `users(id)` ON DELETE SET NULL |

**Indexes:** `idx_customers_id_number`, `idx_customers_phone`, `idx_customers_name`

---

### 1.6 `operations`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| op_id | VARCHAR(100) | string | NO | — | UNIQUE |
| type | VARCHAR(20) | string | NO | — | CHECK IN (`activate`,`recharge`) |
| target | VARCHAR(100) | string | YES | `''` | |
| operator | VARCHAR(50) | string | YES | `''` | |
| date | VARCHAR(20) | string | YES | `''` | |
| time | VARCHAR(50) | string | YES | `''` | |
| status | VARCHAR(20) | string | NO | `'success'` | CHECK IN (`success`,`failed`,`pending`) |
| customer_name | VARCHAR(200) | string | YES | — | |
| customer_id | VARCHAR(50) | string | YES | — | |
| contract_image | VARCHAR(500) | string | YES | — | |
| created_by | INTEGER | number | YES | — | FK → `users(id)` ON DELETE SET NULL |
| created_at | TIMESTAMP | Date | YES | `NOW()` | |

**Indexes:** `idx_operations_status`, `idx_operations_target`, `idx_operations_operator`, `idx_operations_customer_name`, `idx_operations_customer_id`, `idx_operations_created_at`, `idx_operations_type_status`, `idx_operations_type`

---

### 1.7 `inventories`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| operator | VARCHAR(50) | string | NO | — | UNIQUE |
| available | INTEGER | number | YES | `0` | |
| remaining | INTEGER | number | YES | `0` | |
| period_days | INTEGER | number | YES | `0` | |

**Indexes:** `idx_inventories_available`

---

### 1.8 `alerts`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| title | VARCHAR(300) | string | NO | — | |
| description | TEXT | string | YES | `''` | |
| priority | VARCHAR(10) | string | NO | — | CHECK IN (`high`,`medium`,`low`) |
| time | VARCHAR(50) | string | YES | `''` | |
| category | VARCHAR(100) | string | YES | `''` | |
| is_read | BOOLEAN | boolean | YES | `FALSE` | |
| created_by | INTEGER | number | YES | — | FK → `users(id)` ON DELETE SET NULL |
| created_at | TIMESTAMP | Date | YES | `NOW()` | |

**Indexes:** `idx_alerts_priority`, `idx_alerts_category`, `idx_alerts_time`, `idx_alerts_read_priority_time`, `idx_alerts_read`

---

### 1.9 `distribution_requests`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| request_id | VARCHAR(100) | string | NO | — | UNIQUE |
| agent_id | INTEGER | number | YES | — | FK → `agents(id)` ON DELETE SET NULL |
| seller_id | INTEGER | number | YES | — | FK → `sellers(id)` ON DELETE CASCADE |
| operator | VARCHAR(50) | string | NO | — | |
| count | INTEGER | number | NO | — | |
| status | VARCHAR(20) | string | YES | `'pending'` | CHECK IN (`pending`,`approved`,`rejected`,`fulfilled`) |
| created_at | TIMESTAMP | Date | YES | `NOW()` | |
| approved_by | INTEGER | number | YES | — | FK → `users(id)` ON DELETE SET NULL |
| approved_at | TIMESTAMP | Date | YES | — | |
| notes | TEXT | string | YES | `''` | |
| created_by | INTEGER | number | YES | — | FK → `users(id)` ON DELETE SET NULL |

**Indexes:** `idx_distribution_seller`, `idx_distribution_created`, `idx_distribution_status`, `idx_distribution_agent`

---

### 1.10 `transactions`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| client_name | VARCHAR(200) | string | NO | — | |
| provider | VARCHAR(50) | string | NO | `'Yemen Mobile'` | |
| sims_count | INTEGER | number | YES | `0` | |
| status | VARCHAR(20) | string | NO | `'completed'` | CHECK IN (`completed`,`pending`) |
| relative_time | VARCHAR(50) | string | YES | `''` | |
| created_at | TIMESTAMP | Date | YES | `NOW()` | |

**Indexes:** `idx_transactions_status`, `idx_transactions_provider`, `idx_transactions_client_name`

---

### 1.11 `audit_logs`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| log_id | VARCHAR(100) | string | NO | — | UNIQUE |
| type | VARCHAR(50) | string | YES | `''` | |
| title | VARCHAR(300) | string | YES | `''` | |
| username | VARCHAR(200) | string | YES | `''` | |
| time | VARCHAR(50) | string | YES | `''` | |
| status | VARCHAR(20) | string | YES | `''` | |

**Indexes:** `idx_audit_logs_status`, `idx_audit_logs_username`, `idx_audit_logs_time`, `idx_audit_logs_type`

---

### 1.12 `duplicate_identities`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | SERIAL | number | NO | — | PK |
| id_no | VARCHAR(50) | string | NO | — | UNIQUE |
| name | VARCHAR(200) | string | NO | — | |
| sims_count | INTEGER | number | YES | `0` | |
| duplicates_count | INTEGER | number | YES | `0` | |
| risk | VARCHAR(50) | string | YES | `''` | |
| region | VARCHAR(200) | string | YES | `''` | |
| avatar_initials | VARCHAR(10) | string | YES | `''` | |

**Indexes:** `idx_duplicate_identities_risk`, `idx_duplicate_identities_name`, `idx_duplicate_identities_region`

---

### 1.13 `system_settings`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| id | INTEGER | number | NO | `1` | PK (singleton row) |
| two_fa_enabled | BOOLEAN | boolean | YES | `TRUE` | |
| email_2fa_enabled | BOOLEAN | boolean | YES | `FALSE` | |
| trusted_devices_enabled | BOOLEAN | boolean | YES | `TRUE` | |
| session_timeout | VARCHAR(50) | string | YES | `'30 دقيقة'` | |
| password_special_required | BOOLEAN | boolean | YES | `TRUE` | |
| password_expiry_90_days | BOOLEAN | boolean | YES | `TRUE` | |
| password_no_reuse_5 | BOOLEAN | boolean | YES | `FALSE` | |
| maintenance_mode | BOOLEAN | boolean | YES | `FALSE` | |
| language | VARCHAR(100) | string | YES | `'العربية (المملكة العربية السعودية)'` | |
| email_alerts_enabled | BOOLEAN | boolean | YES | `TRUE` | |
| sms_alerts_enabled | BOOLEAN | boolean | YES | `TRUE` | |
| app_notifications_enabled | BOOLEAN | boolean | YES | `FALSE` | |
| stock_shortage_threshold | INTEGER | number | YES | `5` | |
| inactive_sims_threshold | INTEGER | number | YES | `90` | |
| max_failed_logins_threshold | INTEGER | number | YES | `3` | |
| high_risk_duplicates_threshold | INTEGER | number | YES | `5` | |
| identity_reminders_enabled | BOOLEAN | boolean | YES | `TRUE` | |
| identity_reminders_frequency | VARCHAR(10) | string | YES | `'weekly'` | CHECK IN (`daily`,`weekly`) |

---

### 1.14 `token_blacklist`

| Column | Type (SQL) | Type (TS) | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| token_hash | VARCHAR(64) | string | NO | — | PK (SHA-256 hex digest) |
| expires_at | TIMESTAMP | Date | NO | — | |
| blacklisted_at | TIMESTAMP | Date | YES | `NOW()` | (added via 003 migration) |
| user_id | INTEGER | number | YES | — | FK → `users(id)` ON DELETE CASCADE |

**Indexes:** `idx_token_blacklist_user_id`, `idx_token_blacklist_expires_user`, `idx_token_blacklist_expires`

---

### 1.15 `schema_migrations` (tracking table, created by `init-db.ts` and `005_migration`)

| Column | Type (SQL) | Nullable | Default |
|---|---|---|---|
| filename | VARCHAR(255) | NO | PK |
| applied_at | TIMESTAMP | YES | `NOW()` |

---

## 2. Relationship Map

### Foreign Key Relationships

| # | Source Table | Source Column | Target Table | Target Column | ON DELETE | Indexed? | Cardinality |
|---|---|---|---|---|---|---|---|
| 1 | agents | user_id | users | id | CASCADE | Yes (`idx_agents_user_id`) | 1:1 (UNIQUE) |
| 2 | sellers | user_id | users | id | CASCADE | Yes (`idx_sellers_user_id`) | 1:1 (UNIQUE) |
| 3 | sellers | agent_id | agents | id | SET NULL | Yes (`idx_sellers_agent_id`) | N:1 |
| 4 | sellers | created_by | users | id | SET NULL | No | N:1 |
| 5 | sims | assigned_to | sellers | id | SET NULL | Yes (`idx_sims_assigned_to`) | N:1 |
| 6 | sims | activated_by | users | id | SET NULL | No | N:1 |
| 7 | operations | created_by | users | id | SET NULL | No | N:1 |
| 8 | alerts | created_by | users | id | SET NULL | No | N:1 |
| 9 | distribution_requests | agent_id | agents | id | SET NULL | Yes (`idx_distribution_agent`) | N:1 |
| 10 | distribution_requests | seller_id | sellers | id | CASCADE | Yes (`idx_distribution_seller`) | N:1 |
| 11 | distribution_requests | approved_by | users | id | SET NULL | No | N:1 |
| 12 | distribution_requests | created_by | users | id | SET NULL | No | N:1 |
| 13 | customers | activated_by | sellers | id | SET NULL | No | N:1 |
| 14 | customers | created_by | users | id | SET NULL | No | N:1 |
| 15 | token_blacklist | user_id | users | id | CASCADE | Yes (`idx_token_blacklist_user_id`) | N:1 |

**Unindexed FK columns:** `sellers.created_by`, `sims.activated_by`, `operations.created_by`, `alerts.created_by`, `distribution_requests.approved_by`, `distribution_requests.created_by`, `customers.activated_by`, `customers.created_by`

---

## 3. Index Analysis

### All 38 Indexes

#### From schema.sql (base indexes)
| Index Name | Table | Column(s) | Type | Notes |
|---|---|---|---|---|
| idx_token_blacklist_user_id | token_blacklist | user_id | b-tree | |
| idx_token_blacklist_expires_user | token_blacklist | expires_at, user_id | b-tree | Composite |
| idx_customers_id_number | customers | id_number | b-tree | |
| idx_customers_phone | customers | phone | b-tree | |
| idx_customers_name | customers | full_name | b-tree | |
| idx_distribution_status | distribution_requests | status | b-tree | |
| idx_distribution_agent | distribution_requests | agent_id | b-tree | |
| idx_users_role | users | role | b-tree | |
| idx_users_username | users | username | b-tree | |
| idx_sellers_agent_id | sellers | agent_id | b-tree | |
| idx_sellers_user_id | sellers | user_id | b-tree | |
| idx_sellers_agent_name | sellers | agent_name | b-tree | |
| idx_sellers_phone | sellers | phone | b-tree | |
| idx_sellers_status | sellers | status | b-tree | |
| idx_agents_user_id | agents | user_id | b-tree | |
| idx_agents_name | agents | name | b-tree | |
| idx_sims_iccid | sims | iccid | b-tree | |
| idx_sims_provider | sims | provider | b-tree | |
| idx_sims_status | sims | status | b-tree | |
| idx_sims_assigned_to | sims | assigned_to | b-tree | |
| idx_alerts_read | alerts | is_read | b-tree | |
| idx_operations_type | operations | type | b-tree | |
| idx_audit_logs_type | audit_logs | type | b-tree | |
| idx_duplicate_identities_region | duplicate_identities | region | b-tree | |
| idx_token_blacklist_expires | token_blacklist | expires_at | b-tree | |

#### From migration 001 (additional indexes)
| Index Name | Table | Column(s) | Type | Notes |
|---|---|---|---|---|
| idx_users_status | users | status | b-tree | |
| idx_users_phone | users | phone | b-tree | |
| idx_sellers_region | sellers | region | b-tree | |
| idx_sellers_region_code | sellers | region_code | b-tree | |
| idx_sellers_id_number | sellers | id_number | b-tree | |
| idx_sellers_created_at | sellers | created_at | b-tree | |
| idx_sims_phone | sims | phone | b-tree | |
| idx_sims_owner | sims | owner | b-tree | |
| idx_sims_customer_name | sims | customer_name | b-tree | |
| idx_sims_customer_id | sims | customer_id | b-tree | |
| idx_sims_created_at | sims | created_at | b-tree | |
| idx_operations_status | operations | status | b-tree | |
| idx_operations_target | operations | target | b-tree | |
| idx_operations_operator | operations | operator | b-tree | |
| idx_operations_customer_name | operations | customer_name | b-tree | |
| idx_operations_customer_id | operations | customer_id | b-tree | |
| idx_operations_created_at | operations | created_at | b-tree | |
| idx_alerts_priority | alerts | priority | b-tree | |
| idx_alerts_category | alerts | category | b-tree | |
| idx_alerts_time | alerts | time | b-tree | |
| idx_agents_status | agents | status | b-tree | |
| idx_agents_region | agents | region | b-tree | |
| idx_audit_logs_status | audit_logs | status | b-tree | |
| idx_audit_logs_username | audit_logs | username | b-tree | |
| idx_audit_logs_time | audit_logs | time | b-tree | |
| idx_distribution_seller | distribution_requests | seller_id | b-tree | |
| idx_distribution_created | distribution_requests | created_at | b-tree | |
| idx_duplicate_identities_risk | duplicate_identities | risk | b-tree | |
| idx_duplicate_identities_name | duplicate_identities | name | b-tree | |
| idx_transactions_status | transactions | status | b-tree | |
| idx_transactions_provider | transactions | provider | b-tree | |
| idx_transactions_client_name | transactions | client_name | b-tree | |
| idx_inventories_available | inventories | available | b-tree | |
| idx_users_role_username | users | role, username | b-tree | Composite |
| idx_sims_provider_status | sims | provider, status | b-tree | Composite |
| idx_operations_type_status | operations | type, status | b-tree | Composite |
| idx_alerts_read_priority_time | alerts | is_read, priority, time | b-tree | Composite (3 columns) |

#### From migration 004 (partial index)
| Index Name | Table | Column(s) | Type | Notes |
|---|---|---|---|---|
| idx_agents_phone_unique | agents | phone | UNIQUE b-tree | Partial: `WHERE phone != '' AND phone IS NOT NULL` |

**Total indexes: 39**

### Composite Indexes
1. `idx_token_blacklist_expires_user` — `(expires_at, user_id)` — query: token expiration + per-user lookup
2. `idx_users_role_username` — `(role, username)` — query: filter by role + sort by username
3. `idx_sims_provider_status` — `(provider, status)` — query: dashboard counts grouped by provider+status
4. `idx_operations_type_status` — `(type, status)` — query: operations filtered by type+status
5. `idx_alerts_read_priority_time` — `(is_read, priority, time)` — query: unread alerts sorted by priority+time

### Partial Indexes
1. `idx_agents_phone_unique` — UNIQUE on `agents(phone)` WHERE `phone != '' AND phone IS NOT NULL`

### Missing Indexes on FK Columns
The following FK columns are **not indexed** — they may cause sequential scans on JOINs or filtered lookups:
- `sellers.created_by`
- `sims.activated_by`
- `operations.created_by`
- `alerts.created_by`
- `distribution_requests.approved_by`
- `distribution_requests.created_by`
- `customers.activated_by`
- `customers.created_by`

---

## 4. Data Integrity Analysis

### CHECK Constraints Present
| Table | Column | Constraint |
|---|---|---|
| users | role | IN (`manager`,`agent`,`seller`) |
| agents | status | IN (`active`,`inactive`) |
| sellers | status | IN (`active`,`inactive`,`suspended`,`low_stock`,`deleted`) |
| sims | status | IN (`available`,`sold`,`reserved`,`inactive`,`suspended`) |
| operations | type | IN (`activate`,`recharge`) |
| operations | status | IN (`success`,`failed`,`pending`) |
| alerts | priority | IN (`high`,`medium`,`low`) |
| transactions | status | IN (`completed`,`pending`) |
| distribution_requests | status | IN (`pending`,`approved`,`rejected`,`fulfilled`) |
| system_settings | identity_reminders_frequency | IN (`daily`,`weekly`) |

### Missing CHECK Constraints
- `sims.provider` — no DB-level constraint; validated in application (Zod enum: `Yemen Mobile`, `Sabafon`, `YOU`)
- `users.status` — no CHECK; application handles values `active`, `inactive`, `deleted`
- `agents.phone` — no format CHECK; application validates in Zod `string().max(50)`
- `inventories.operator` — no CHECK; application validates via `normalizeOperator()` and `isValidOperator()`
- `alerts.type` — no DB-level constraint on type/category

### UNIQUE Constraints
- `users(username)`
- `agents(user_id)`
- `sellers(seller_id)`, `sellers(user_id)`
- `sims(iccid)`
- `operations(op_id)`
- `inventories(operator)`
- `audit_logs(log_id)`
- `duplicate_identities(id_no)`
- `customers(id_number)` (added via ALTER TABLE with `customers_id_number_unique`)
- `token_blacklist(token_hash)` (PK)
- Partial: `idx_agents_phone_unique` on `agents(phone)` WHERE non-empty

### Nullable Column Business Meaning
| Table | Column | Why Nullable |
|---|---|---|
| agents | user_id | An agent may not have a linked user account (seed rows have NULL) |
| sellers | user_id, agent_id | Sellers may be standalone without login or without an agent |
| sims | assigned_to | Unassigned SIMs have NULL; FK SET NULL on seller delete |
| operations | customer_name, customer_id | Optional operational metadata |
| token_blacklist | user_id | Orphaned records before migration 003 (cleaned up) |

### Business Rule Enforcement

| Rule | Enforced At | How |
|---|---|---|
| Password strength | Application | Zod regex: uppercase + lowercase + digit, min 8 chars |
| Operator validation | Application | `normalizeOperator()` maps display names → snake_case; Zod `refine` validates |
| ICCID uniqueness | Database | UNIQUE constraint on `sims.iccid` |
| ID number uniqueness | Database (late) | `customers_id_number_unique` added in schema.sql line 225 |
| Seller ID uniqueness | Database | UNIQUE constraint on `sellers.seller_id` |
| User-role-link uniqueness | Database | `agents.user_id` UNIQUE, `sellers.user_id` UNIQUE |
| Active user check | Application | `authenticateToken` queries `users.status` on every request |
| Maintenance mode block | Application | Middleware checks `system_settings.maintenance_mode` before mutations |
| Distribution status guard | Application | `SELECT ... FOR UPDATE` check: can only approve pending requests |
| Inventory decrement | Application | `GREATEST(available - $1, 0)` prevents negative inventory |
| Token expiry + blacklist | Both | DB stores `expires_at`; app queries `WHERE expires_at > NOW()` |
| Role-based access | Application | `requireRole(...)` middleware on each route |
| Agent scoping | Application | Agents only see their own sellers/customers via `WHERE agent_id = (SELECT id FROM agents WHERE user_id = $1)` |

---

## 5. Schema Gaps & Issues

### 5.1 `customers` Table — No Explicit FK Constraints in `CREATE TABLE`

The original `CREATE TABLE customers` in `schema.sql` (lines 175–187) defines **no FK constraints** on `activated_by` or `created_by`. The FK definitions are added later via `ALTER TABLE` statements in the same file (lines 217–222), which use `IF NOT EXISTS` column adds and `REFERENCES users(id) ON DELETE SET NULL`.

**Root cause:** The `CREATE TABLE` was written without FKs; they were patched in post-creation ALTER statements.

### 5.2 `customers.id_number` — UNIQUE Added Late

The `CREATE TABLE customers` does not include a UNIQUE constraint on `id_number`. The constraint is added via:
```sql
ALTER TABLE customers ADD CONSTRAINT IF NOT EXISTS customers_id_number_unique UNIQUE (id_number);
```
(schema.sql line 225). This means deployments using the original CREATE TABLE without the ALTER will lack this constraint.

### 5.3 `duplicate_identities` — Cache Table with No Write Path

The `duplicate_identities` table is seeded with 4 static rows in `schema.sql` (lines 311–316). The seed data is then explicitly deleted (line 210: `DELETE FROM duplicate_identities WHERE id > 0`).

The admin route `GET /admin/duplicate-identities` (`admin.ts:99`) **does not query this table**. Instead, it dynamically computes duplicates using window functions on the `sellers` table:
```sql
SELECT id_number AS id_no, name,
       COUNT(*) OVER (PARTITION BY id_number) AS duplicates_count,
       ...
FROM sellers WHERE id_number != ''
ORDER BY duplicates_count DESC
```

**Issue:** The `duplicate_identities` table has no application write path. It is a dead table — either a legacy cache that was replaced by the dynamic query or a future target for a scheduled materialization job that was never implemented.

### 5.4 `transactions` — No Write Path

The `transactions` table is seeded with 3 rows in `schema.sql` (lines 294–297). The only route is `GET /admin/transactions` (`admin.ts:76`), which reads from it.

**Issue:** There is no POST/PUT/DELETE route for transactions anywhere in the codebase. This table is read-only via the API and can only be modified by direct SQL or seed scripts.

### 5.5 `audit_logs` — No Write Path

The `audit_logs` table is seeded with 3 rows in `schema.sql` (lines 320–324). The only route is `GET /admin/audit-logs` (`admin.ts:146`), which reads from it.

**Issue:** There is no application code that writes to `audit_logs`. It is a read-only table via the API. Audit events that should be logged (account deletion, password changes, distribution approvals) are not recorded here.

### 5.6 `cleanup_expired_tokens()` — Function Defined in schema.sql

The function **is defined** in `schema.sql` (lines 251–256):
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM token_blacklist WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

However, the application does not use it. Instead, the cleanup is done inline in `index.ts:332–341` via a `setInterval` every hour:
```typescript
const result = await query('DELETE FROM token_blacklist WHERE expires_at < NOW()');
```

The function exists in the database but is unused by the application. Migration 001 (line 83) notes this as a "suggestion" — it was never wired up.

### 5.7 `sims.phone` — Permissive CHECK Pattern

The validation schema in `schema.sql` does **not** include a CHECK constraint on `sims.phone`. The user prompt mentions a regex `^[0-9+/]{7,15}$` which is **not present** in the actual `schema.sql` — the phone column is simply `VARCHAR(50) NOT NULL DEFAULT ''` with no CHECK constraint.

The validation is handled entirely in the application layer via Zod (`z.string().max(50)`).

### 5.8 `sellers.status` CHECK Replaced

The original `CREATE TABLE sellers` had `CHECK (status IN ('active', 'inactive', 'suspended', 'low_stock'))`. The schema.sql file later drops this constraint and adds a new one including `'deleted'` (lines 213–214):
```sql
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;
ALTER TABLE sellers ADD CONSTRAINT sellers_status_check CHECK (status IN ('active', 'inactive', 'suspended', 'low_stock', 'deleted'));
```

### 5.9 `blacklisted_at` Column

The `token_blacklist` table in the `CREATE TABLE` statement (schema.sql line 156) has no `blacklisted_at` column. This column is added implicitly by migration 003, which refers to it but the actual column definition is in the base schema. The `INSERT INTO token_blacklist` statements in the application code do not specify `blacklisted_at`, relying on the `DEFAULT NOW()`.

---

## 6. Seed Data Analysis

### 6.1 `users` — 3 rows
| username | display_name | role | status |
|---|---|---|---|
| manager | أحمد محمد | manager | active |
| agent | الوكيل أحمد محمد | agent | active |
| seller | البائع عبدالرحمن العتيبي | seller | active |

Password hashes are placeholders (`'SEED_REQUIRED_RUN_NPM_RUN_DB_SEED'`) replaced at runtime by `seed.ts` with bcrypt hashes.

### 6.2 `agents` — 4 rows
| name | region | phone | user_id | status |
|---|---|---|---|---|
| الوكيل أحمد محمد | أمانة العاصمة | 1012398455 | (linked to agent user) | active |
| خالد ناصر الحميري | عدن - كريتر | 2039485761 | NULL | inactive |
| صالح علي القحطاني | تعز - الحوبان | 4012394844 | NULL | active |
| يسر محسن علوي | حضرموت - المكلا | 5012384742 | NULL | active |

Note: `sellers_count` (45,12,28,19) and `sims_count` (1240,340,890,620) are pre-computed denormalized values.

### 6.3 `sellers` — 3 rows
| seller_id | name | status | agent | metrics |
|---|---|---|---|---|
| SLR-99021 | البائع عبدالرحمن العتيبي | active | الوكيل أحمد محمد | sales: 1248, stock: 252, efficiency: 85% |
| SLR-88124 | سارة سالم اليافعي | suspended | NULL | sales: 1540, stock: 150, activity: 0% |
| SLR-11054 | خالد عبدالله تعز | active | NULL | sales: 890, stock: 45, efficiency: 20% |

### 6.4 `sims` — 7 rows
| phone | provider | status | owner |
|---|---|---|---|
| 777123456 | Yemen Mobile | available | المركز الرئيسي |
| 711987654 | Sabafon | sold | البائع عبدالرحمن العتيبي |
| 733554433 | YOU | reserved | وكالة الأمل |
| 770987654 | Yemen Mobile | available | البائع عبدالرحمن العتيبي |
| 775432109 | Yemen Mobile | available | البائع عبدالرحمن العتيبي |
| 712345678 | Sabafon | reserved | البائع عبدالرحمن العتيبي |
| 731111222 | YOU | inactive | البائع عبدالرحمن العتيبي |

### 6.5 `customers` — 3 rows (seeded via code, not in schema.sql directly)
3 customers with varying `sims_count`, `first_activation`, `last_activation`.

### 6.6 `inventories` — 3 rows
| operator | available | remaining | period_days |
|---|---|---|---|
| yemen_mobile | 542 | 48 | 12 |
| you | 412 | 62 | 18 |
| sabafon | 330 | 20 | 5 |

### 6.7 `alerts` — 3 rows
- High priority: inventory shortage
- Medium priority: unauthorized access attempt
- Low priority: daily report generated

### 6.8 `transactions` — 3 rows
| client_name | provider | sims_count | status |
|---|---|---|---|
| شركة الأمل للتجارة | Yemen Mobile | 5000 | completed |
| مركز الثقة للاتصالات | Sabafon | 1200 | pending |
| مؤسسة النجم للخدمات | YOU | 2500 | completed |

### 6.9 `operations` — 3 rows
| op_id | type | target | operator | status |
|---|---|---|---|---|
| op1 | activate | 0504938210 | yemen_mobile | success |
| op2 | recharge | #INV-8821 | you | success |
| op3 | activate | 0504938255 | sabafon | failed |

### 6.10 `duplicate_identities` — 4 rows (deleted then seeded)
| id_no | name | risk | duplicates_count |
|---|---|---|---|
| 1023485932 | صالح محمد العامري | مرتفع جداً | 5 |
| 2094837501 | نبيل حسن الوداعي | متوسط | 3 |
| 1088429103 | فاطمة قاسم القدسي | مرتفع جداً | 8 |
| 3014772154 | عمر سالم باسودان | متوسط | 2 |

### 6.11 `system_settings` — 1 row (singleton)
All defaults as documented in Section 1.13.

### 6.12 `audit_logs` — 3 rows
| log_id | type | status |
|---|---|---|
| A1 | security_alert | blocked |
| A2 | ai_analysis | analyzing |
| A3 | normal_audit | verified |

---

## 7. Query Patterns

### 7.1 Pagination Pattern

Used in all list endpoints (`sims`, `agents`, `sellers`, `customers`, `operations`, `alerts`, `transactions`, `audit_logs`, `duplicate identities`).

**Implementation (`helpers.ts:4-9`):**
```typescript
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
const offset = (page - 1) * limit;
```

**Default:** page=1, limit=50, max limit=200.

Two variants:
- **With total count** — `paginatedQuery()` in `helpers.ts:11-22`: runs `SELECT COUNT(*)` then appends `LIMIT $n OFFSET $n+1`
- **Without total count** — manual `SELECT ... LIMIT $1 OFFSET $2` (used in `sellers`, `customers`, `operations`)

### 7.2 Role Scoping Pattern

**Manager:** Sees all records.
**Agent:** Scoped to records where `created_by = user_id` (agents table maps `user_id` → agent `id`).
**Seller:** Scoped to records where `user_id = req.user.id`.

Examples:
```sql
-- customers.ts:16-18 (agent scope)
WHERE created_by = $1

-- sellers.ts:70 (agent scope via agent_id)
WHERE s.agent_id = $1

-- sellers.ts:90 (seller scope)
WHERE s.user_id = $1
```

### 7.3 Aggregation: Dashboard Stats

**`GET /api/stats`** (`index.ts:262-273`) — single query with 9 subqueries:
```sql
SELECT
  (SELECT COUNT(*) FROM sims) AS total_sims,
  (SELECT COUNT(*) FROM sims WHERE status='sold') AS sold_sims,
  (SELECT COUNT(*) FROM sellers WHERE status='active') AS active_sellers,
  (SELECT COUNT(*) FROM sims WHERE status='available') AS available_stock,
  (SELECT COUNT(*) FROM agents) AS total_agents,
  (SELECT COUNT(*) FROM sellers) AS total_sellers,
  (SELECT COUNT(*) FROM sims WHERE status IN ('available','sold','reserved')) AS active_sims,
  (SELECT COALESCE(SUM(sales_30_days) / 4, 0) FROM sellers) AS sales_weekly,
  (SELECT COALESCE((SUM(sales_30_days) - SUM(total_sales)) * 100.0 / NULLIF(SUM(total_sales), 0), 0) FROM sellers) AS sales_growth
```

Results are cached in-memory for 5 minutes (`STATS_CACHE_TTL = 300_000`).

### 7.4 Aggregation: Duplicate Detection via Window Functions

**`GET /admin/duplicate-identities`** (`admin.ts:104-110`) — uses `COUNT(*) OVER (PARTITION BY id_number)`:
```sql
SELECT id_number AS id_no, name,
       COUNT(*) OVER (PARTITION BY id_number) AS duplicates_count,
       SUM(COALESCE(sims_count, 0)) OVER (PARTITION BY id_number) AS sims_count,
       region
FROM sellers
WHERE id_number != ''
ORDER BY duplicates_count DESC
```

Application layer deduplicates results with a `Set` and classifies risk:
- `>= 5` → `'مرتفع جداً'`
- `>= 3` → `'مرتفع'`
- otherwise → `'متوسط'`

### 7.5 Aggregation: Daily Sales Report

**`GET /reports/daily-sales`** (`reports.ts:9-18`):
```sql
SELECT DATE(created_at) AS day, COUNT(*) AS activations,
       COUNT(DISTINCT customer_name) AS unique_customers, operator
FROM operations
WHERE type='activate' AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), operator
ORDER BY day DESC
```

### 7.6 Aggregation: Agent & Seller Performance Reports

**`GET /reports/agent-performance`** (`reports.ts:29-40`):
```sql
SELECT a.id, a.name AS agent_name, a.region,
       COUNT(DISTINCT s.id) AS seller_count,
       COALESCE(SUM(s.sims_count), 0) AS total_sims,
       COALESCE(SUM(s.sales_30_days), 0) AS sales_30_days,
       COALESCE(AVG(s.efficiency), 0) AS avg_efficiency
FROM agents a
LEFT JOIN sellers s ON s.agent_id = a.id
GROUP BY a.id, a.name, a.region
ORDER BY sales_30_days DESC
```

**`GET /reports/seller-performance`** (`reports.ts:77-88`): joins `sellers LEFT JOIN agents`, scoped by role.

**`GET /reports/operator-distribution`** (`reports.ts:50-57`): two separate GROUP BY queries — one on `sims`, one on `operations`.

### 7.7 Search: Customer ILIKE

**`GET /customers/search`** (`customers.ts:42`):
```sql
SELECT * FROM customers
WHERE (full_name ILIKE $1 OR id_number ILIKE $1 OR phone ILIKE $1)
  AND created_by = $2  -- if agent
ORDER BY id DESC LIMIT 20
```

Requires minimum 2-character query. Returns max 20 results. Uses case-insensitive `ILIKE` with `%` wildcards.

### 7.8 Transaction: Distribution Approval with `SELECT FOR UPDATE`

**`PUT /distributions/:id/approve`** (`distributions.ts:94-112`) — wrapped in a `transaction()`:
```sql
BEGIN;
SELECT * FROM distribution_requests WHERE id = $1 FOR UPDATE;
-- App checks status === 'pending'
UPDATE distribution_requests SET status=$1, approved_by=$2, approved_at=NOW() WHERE id=$3;
-- If approved:
UPDATE inventories SET available=GREATEST(available-$1, 0), remaining=remaining+$1 WHERE operator=$2;
COMMIT;
```

Uses PostgreSQL row-level locking to prevent concurrent approvals of the same request.

### 7.9 Token Blacklist Cleanup

**Application-level** (`index.ts:332-341`): runs every 60 minutes:
```sql
DELETE FROM token_blacklist WHERE expires_at < NOW()
```

The database function `cleanup_expired_tokens()` exists but is unused by the application.

### 7.10 Soft Delete Pattern

**Seller deletion** (`sellers.ts:303-308`):
```sql
UPDATE users SET status = 'inactive' WHERE id = $1;        -- deactivate user
UPDATE sims SET assigned_to = NULL, owner = 'المركز الرئيسي' WHERE assigned_to = $2;  -- reassign SIMs
DELETE FROM distribution_requests WHERE seller_id = $2;     -- hard delete requests (CASCADE)
UPDATE sellers SET status = 'deleted' WHERE id = $2;        -- soft delete seller
```

**Account deletion** (`users.ts:43-44`):
```sql
UPDATE users SET status = 'deleted', password_hash = '',
       username = CONCAT(username, '_', id, '_deleted')
WHERE id = $1;
```

### 7.11 Maintenance Mode Lockdown

**`POST /admin/system/lockdown`** (`admin.ts:243-249`):
```sql
UPDATE system_settings SET maintenance_mode = $1 WHERE id = 1;
-- Lock: set all non-deleted sellers to 'suspended'
UPDATE sellers SET status = 'suspended' WHERE status NOT IN ('deleted');
-- Unlock: set all sellers to 'active'
UPDATE sellers SET status = 'active' WHERE status NOT IN ('deleted');
```

### 7.12 CSRF Protection Pattern

All state-changing requests (`POST`, `PUT`, `DELETE`) except `/auth/login`, `/auth/refresh` require `X-CSRF-Token` and `X-CSRF-Hash` headers validated via HMAC-SHA256 with `CSRF_SECRET` (`index.ts:110-125`).

---

## Summary

| Metric | Count |
|---|---|
| Tables | 14 (+1 migration tracking) |
| Columns (total) | ~115 |
| Foreign Keys | 15 |
| Indexes | 39 (including 5 composite, 1 partial) |
| CHECK constraints | 10 |
| UNIQUE constraints | 9 (+1 partial unique index) |
| Seed rows (total) | ~31 |
| API routes (DB-facing) | ~25 |
| Dead tables (no write path) | 3 (`duplicate_identities`, `transactions`, `audit_logs`) |
| Unindexed FK columns | 8 |
| DB-level enum gaps | 3 (`users.status`, `sims.provider`, `agents.phone` format) |
