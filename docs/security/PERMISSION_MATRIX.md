# Permission Matrix — Yemen Telecom Database

This matrix shows **database-level** access after RLS (migration 024) and the
**application-level** authorization that the Express backend enforces on top.

## Database-level (Postgres RLS)

| Table | postgres / service_role | anon / authenticated |
|-------|--------------------------|----------------------|
| users | Full (bypasses RLS) | **Denied** (no policy) |
| agents | Full | **Denied** |
| sellers | Full | **Denied** |
| sims | Full | **Denied** |
| alerts | Full | **Denied** |
| transactions | Full | **Denied** |
| operations | Full | **Denied** |
| inventories | Full | **Denied** |
| audit_logs | Full | **Denied** |
| system_settings | Full | **Denied** |
| token_blacklist | Full | **Denied** |
| duplicate_identities | Full | **Denied** |
| customers | Full | **Denied** |
| distribution_requests | Full | **Denied** |
| schema_migrations | Full | **Denied** |
| providers | Full | **Denied** |

Legend: **Full** = SELECT/INSERT/UPDATE/DELETE allowed. **Denied** = 0 rows on
read, all writes rejected. `postgres`/`service_role` bypass RLS (`BYPASSRLS`).

---

## Application-level (Express, enforced in code — NOT RLS)

The backend, after authenticating the JWT, scopes every query by ownership.
These rules are the real manager/agent/seller isolation and remain in force:

| Resource | Manager | Agent | Seller |
|----------|---------|-------|--------|
| users | all | own (`users.id`) | own (`users.id`) |
| agents | all | own (`agents.user_id`) | n/a |
| sellers | all | own (`sellers.agent_id` / `user_id`) | own (`sellers.user_id`) |
| sims | all | own scope (`sims.assigned_to`) | own assigned SIMs |
| customers | all | own (`created_by`/`activated_by`) | n/a |
| operations | all | own (`created_by`) | n/a |
| inventories | all | own inventory | n/a |
| distributions | all | own requests | own requests |
| alerts | all | all (read) | all (read) |
| transactions | all | own scope | own sales |
| audit_logs | all (read) | own scope (read) | own (read) |
| system_settings | all (admin) | n/a | n/a |
| token_blacklist | own (`user_id`) | own | own |
| duplicate_identities | all | own scope | n/a |
| providers | all (read) | read | read |
| schema_migrations | system (backend) | n/a | n/a |

**Why no per-user RLS policies:** the application connects with a single shared
`postgres` role and its JWT is its own HS256 token (not a Supabase JWT), so
Postgres cannot distinguish manager/agent/seller at the row level. Implementing
fake `request.jwt.claims` policies would be unverifiable and insecure. The
existing Express-layer authorization is the correct, tested control and is
documented here for audit completeness.
