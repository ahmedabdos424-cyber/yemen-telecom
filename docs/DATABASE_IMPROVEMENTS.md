# Database Improvements — Yemen Telecom v1.0.0

## Schema Overview

14 tables across PostgreSQL 16 with 39 indexes, parameterized queries, and transaction support.

## Migration Applied

**File:** `server/migrations/001_performance_indexes.sql`

### New Indexes (25 total)

| Table | New Indexes | Purpose |
|-------|-------------|---------|
| users | `status`, `phone`, `role_username` | Login filtering, user management |
| sellers | `region`, `region_code`, `id_number`, `created_at` | Search, filtering, sorting |
| sims | `phone`, `owner`, `customer_name`, `customer_id`, `created_at`, `provider_status` | Search, reporting dashboard |
| operations | `status`, `target`, `operator`, `customer_name`, `customer_id`, `created_at`, `type_status` | Activity log queries |
| alerts | `priority`, `category`, `time`, `read_priority_time` | Alert dashboard, filtering |
| agents | `status`, `region` | Agent management |
| audit_logs | `status`, `username`, `time` | Audit trail queries |
| distribution_requests | `seller_id`, `created_at` | Distribution tracking |
| duplicate_identities | `risk`, `name` | Identity monitoring |
| transactions | `status`, `provider`, `client_name` | Transaction history |

### Maintenance

```sql
-- Recommended: run hourly via pg_cron or app scheduler
SELECT cleanup_expired_tokens();
```

## Recommendations

- Adopt `node-pg-migrate` for structured migrations
- Add `ON DELETE CASCADE` to `operations` → `sellers` FK
- Consider partitioning `operations` and `audit_logs` for large datasets (>1M rows)
