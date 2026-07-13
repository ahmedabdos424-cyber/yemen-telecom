-- Rollback: Drop restored indexes from migration 016
-- Migration: 016_restore_critical_indexes.sql

BEGIN;

DROP INDEX IF EXISTS idx_sims_created_at;
DROP INDEX IF EXISTS idx_operations_created_at;
DROP INDEX IF EXISTS idx_token_blacklist_user_id;
DROP INDEX IF EXISTS idx_token_blacklist_expires_user;
DROP INDEX IF EXISTS idx_alerts_priority;
DROP INDEX IF EXISTS idx_operations_type_created;
DROP INDEX IF EXISTS idx_agents_created_at;

COMMIT;
