# MIGRATION REGISTRY

**System**: Yemen Telecom Management Platform  
**Updated**: 2026-07-06  
**Total Migrations**: 19  

| # | File | Description | Tables Affected | Applied |
|---|------|-------------|-----------------|---------|
| 001 | 001_init.sql | Initial schema — users, agents, roles | users | ✅ |
| 002 | 002_sims.sql | SIM cards inventory | sims | ✅ |
| 003 | 003_operations.sql | Sales operations tracking | operations | ✅ |
| 004 | 004_sellers.sql | Seller management | sellers | ✅ |
| 005 | 005_distributions.sql | SIM distribution tracking | distributions | ✅ |
| 006 | 006_customers.sql | Customer registry | customers | ✅ |
| 007 | 007_reports.sql | Report generation tables | reports | ✅ |
| 008 | 008_alerts.sql | Alert system | alerts | ✅ |
| 009 | 009_token_blacklist.sql | JWT token revocation | token_blacklist | ✅ |
| 010 | 010_login_attempts.sql | Brute force protection | login_attempts | ✅ |
| 011 | 011_metrics.sql | System metrics storage | metrics | ✅ |
| 012 | 012_maintenance_mode.sql | Emergency lockdown | maintenance_mode | ✅ |
| 013 | 013_backup_logs.sql | Backup tracking | backup_logs | ✅ |
| 014 | 014_index_optimization.sql | Performance indexes | Multiple | ✅ |
| 015 | 015_agent_stats_trigger.sql | Auto-update agent stats | triggers | ✅ |
| 016 | 016_gin_trigram_indexes.sql | Fuzzy search indexes | agents, sellers, customers | ✅ |
| 017 | 017_update_triggers.sql | Updated_at triggers | Multiple | ✅ |
| 018 | 018_composite_indexes.sql | Query optimization | Multiple | ✅ |
| **019** | **019_operations_operator_status_index.sql** | **Composite index on operations(operator, status)** | **operations** | **NEW** |

## MIGRATION CONVENTIONS

- **Naming**: `{NNN}_{description}.sql`
- **Format**: `BEGIN; ... SQL ... COMMIT;`
- **Execution**: Auto-applied via `init-db.ts` on startup
- **Order**: Sorted by filename (ascending)
- **Retry**: Failed migrations log and retry (not marked done)
- **Rollback**: ❌ NOT IMPLEMENTED — roll forward only

## DATABASE SIZE

| Table | Estimated Rows | Indexes | Notes |
|-------|---------------|---------|-------|
| users | <100 | 2 | Managers + agents |
| sims | 10K-100K | 12 | Highest volume |
| operations | 10K-100K | 8 | Transactional |
| sellers | 1K-10K | 8 | Leaf-node agents |
| customers | 1K-10K | 4 | Search-optimized (GIN) |
| distributions | 1K-10K | 4 | SIM transfers |
| inventories | <1K | 3 | Stock tracking |
| alerts | <100 | 2 | Alert management |
| login_attempts | 10K+ | 2 | Auto-cleaned |
| token_blacklist | 10K+ | 2 | Auto-cleaned |
| metrics | 100K+ | 2 | Time-series data |
| reports | <1K | 2 | Generated reports |
