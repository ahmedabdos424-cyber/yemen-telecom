-- Rollback: Drop sellers FK indexes
-- Migration: 018_missing_fk_indexes.sql

BEGIN;

DROP INDEX IF EXISTS idx_sellers_agent_id;
DROP INDEX IF EXISTS idx_sellers_user_id;

COMMIT;
