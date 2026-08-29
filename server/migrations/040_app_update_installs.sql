-- P1-10: Persistent app update install tracking
-- Replaces in-memory installLog with durable database table

CREATE TABLE IF NOT EXISTS app_update_installs (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(128) NOT NULL,
  version VARCHAR(32) NOT NULL,
  version_code INTEGER NOT NULL,
  installed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_update_installs_version ON app_update_installs(version);
CREATE INDEX IF NOT EXISTS idx_app_update_installs_device_id ON app_update_installs(device_id);
CREATE INDEX IF NOT EXISTS idx_app_update_installs_installed_at ON app_update_installs(installed_at);

-- Optional: Keep only last 10000 records per device to prevent unbounded growth
-- This can be enforced by a periodic cleanup job or application logic