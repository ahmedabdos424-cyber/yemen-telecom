-- Rollback: Drop feature_flags table
-- Migration: 020_feature_flags.sql

BEGIN;

DROP TABLE IF EXISTS feature_flags;

COMMIT;
