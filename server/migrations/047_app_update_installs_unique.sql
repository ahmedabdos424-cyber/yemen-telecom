-- Migration 047: Unique install per device + build for app_update_installs
-- Created: 2026-09-12
-- Purpose: enable the upsert (ON CONFLICT) in POST /api/app-update-installed so
-- a client retry never inflates install counts. Idempotent on both fresh and
-- already-applied databases.
--
-- First collapse pre-existing duplicates, then create the unique index.
DELETE FROM app_update_installs a
USING app_update_installs b
WHERE a.id > b.id
  AND a.device_id = b.device_id
  AND a.version_code = b.version_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_update_installs_device_version
  ON app_update_installs(device_id, version_code);