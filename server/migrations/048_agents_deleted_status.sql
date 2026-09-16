-- Migration 048: Allow soft-deleted agents (status = 'deleted')
-- Created: 2026-09-16
-- Purpose: DELETE /api/agents/:id sets status='deleted', but the agents status
-- CHECK only allowed ('active','inactive'), so every delete failed with 23514
-- (C-03). Sellers were already fixed for 'deleted' in schema.sql; agents were
-- not. PUT validation still forbids 'deleted' (delete only via DELETE).
-- Idempotent on both fresh and already-applied databases.
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_status_check;
ALTER TABLE agents ADD CONSTRAINT agents_status_check
  CHECK (status IN ('active', 'inactive', 'deleted'));
