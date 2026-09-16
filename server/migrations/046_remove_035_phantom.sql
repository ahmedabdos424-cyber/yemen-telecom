-- Migration 046: Remove phantom schema_migrations row registered by migration 036
-- Created: 2026-09-12
-- Purpose: migration 036 embedded an INSERT that registered the wrong filename
-- ('035_add_missing_performance_indexes.sql'). That phantom row misreports the
-- applied state and would silently block a future real 035_* migration.
-- This removes it. Idempotent: no-op on fresh databases, corrective on applied ones.
DELETE FROM schema_migrations WHERE filename = '035_add_missing_performance_indexes.sql';