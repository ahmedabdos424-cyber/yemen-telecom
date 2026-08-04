-- 032_add_alerts_created_by.sql
-- alerts.created_by was missing in production, breaking every INSERT INTO alerts
-- that includes created_by (sims activation guard, admin SIM batch, system reset).
-- Matches schema.sql: ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
