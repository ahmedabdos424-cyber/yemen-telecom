-- Rollback: Drop composite index on operations
-- Migration: 019_operations_operator_status_index.sql

BEGIN;

DROP INDEX IF EXISTS idx_operations_operator_status;

COMMIT;
