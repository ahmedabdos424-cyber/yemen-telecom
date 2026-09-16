-- Migration 049: P0 drift repair (C-01)
-- Converges long-lived databases with schema.sql. Every statement is
-- idempotent (IF NOT EXISTS / guarded blocks) and the runner wraps this file
-- in a single transaction, so re-running is always safe.
--
-- Repairs covered:
--  1. operations.occurred_at dropped by the 033 partition rebuild (010 added it).
--     On a partitioned parent the ADD COLUMN propagates to all partitions.
--  2. user_preferences table (035) + RLS (045).
--  3. login_lockouts table + index (044) + RLS (045).
--  4. transactions.created_by + index (042).
--  5. Indexes: idx_sims_phone, idx_audit_logs_username (001),
--     *_provider_id (038), app_update_installs* (040/047).
--  6. updated_at columns + triggers for the six late tables (041).
--  7. RLS for the five late tables (045).
--  8. app_update_installs retention helper (043).

-- 1. occurred_at repair
ALTER TABLE operations ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP;

-- Ensure the RLS role exists (same guard as 025; inert NOLOGIN on plain Postgres).
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END $$;

-- 2. user_preferences (035) + RLS (045)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sim_notifications BOOLEAN DEFAULT TRUE,
  low_stock_notifications BOOLEAN DEFAULT TRUE,
  font_size VARCHAR(10) DEFAULT 'base',
  dark_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
DROP POLICY IF EXISTS user_preferences_backend_full_access ON public.user_preferences;
CREATE POLICY user_preferences_backend_full_access ON public.user_preferences FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 3. login_lockouts (044) + RLS (045)
CREATE TABLE IF NOT EXISTS login_lockouts (
  username TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  failures INT NOT NULL DEFAULT 0,
  lock_level INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, ip)
);
CREATE INDEX IF NOT EXISTS idx_login_lockouts_locked_until ON login_lockouts (locked_until);
DROP POLICY IF EXISTS login_lockouts_backend_full_access ON public.login_lockouts;
CREATE POLICY login_lockouts_backend_full_access ON public.login_lockouts FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.login_lockouts ENABLE ROW LEVEL SECURITY;

-- 4. transactions.created_by (042)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- 5. Missing indexes (001/038/040/047)
CREATE INDEX IF NOT EXISTS idx_sims_phone ON sims(phone);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_inventories_provider_id ON inventories(provider_id);
CREATE INDEX IF NOT EXISTS idx_operations_provider_id ON operations(provider_id);
CREATE INDEX IF NOT EXISTS idx_distribution_requests_provider_id ON distribution_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_app_update_installs_version ON app_update_installs(version);
CREATE INDEX IF NOT EXISTS idx_app_update_installs_device_id ON app_update_installs(device_id);
CREATE INDEX IF NOT EXISTS idx_app_update_installs_installed_at ON app_update_installs(installed_at);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'app_update_installs') THEN
    DELETE FROM app_update_installs a
    USING app_update_installs b
    WHERE a.id > b.id
      AND a.device_id = b.device_id
      AND a.version_code = b.version_code;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_update_installs_device_version
  ON app_update_installs(device_id, version_code);

-- 6. updated_at columns + triggers for the six late tables (041)
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE identity_risk_actions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON system_settings;
CREATE TRIGGER trg_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_duplicate_identities_updated_at ON duplicate_identities;
CREATE TRIGGER trg_duplicate_identities_updated_at
    BEFORE UPDATE ON duplicate_identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_identity_risk_actions_updated_at ON identity_risk_actions;
CREATE TRIGGER trg_identity_risk_actions_updated_at
    BEFORE UPDATE ON identity_risk_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_device_tokens_updated_at ON device_tokens;
CREATE TRIGGER trg_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_providers_updated_at ON providers;
CREATE TRIGGER trg_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_schema_migrations_updated_at ON schema_migrations;
CREATE TRIGGER trg_schema_migrations_updated_at
    BEFORE UPDATE ON schema_migrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS for the remaining late tables (045)
DROP POLICY IF EXISTS device_tokens_backend_full_access ON public.device_tokens;
CREATE POLICY device_tokens_backend_full_access ON public.device_tokens FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_update_installs_backend_full_access ON public.app_update_installs;
CREATE POLICY app_update_installs_backend_full_access ON public.app_update_installs FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.app_update_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identity_risk_actions_backend_full_access ON public.identity_risk_actions;
CREATE POLICY identity_risk_actions_backend_full_access ON public.identity_risk_actions FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.identity_risk_actions ENABLE ROW LEVEL SECURITY;

-- 8. app_update_installs retention helper (043)
CREATE OR REPLACE FUNCTION enforce_app_update_installs_retention()
RETURNS void AS $$
BEGIN
  DELETE FROM app_update_installs
  WHERE id NOT IN (
    SELECT id FROM app_update_installs
    ORDER BY installed_at DESC
    LIMIT 5000
  );
END;
$$ LANGUAGE plpgsql;
