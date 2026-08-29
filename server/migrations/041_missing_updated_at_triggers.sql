-- P1-11: Add missing updated_at triggers for tables without auto-update
-- Tables missing triggers: system_settings, duplicate_identities, identity_risk_actions, device_tokens, providers, schema_migrations

-- Ensure updated_at column exists on all tables (idempotent)
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE identity_risk_actions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Reuse the existing update_updated_at_column function (created in schema.sql)
-- Attach triggers (idempotent)
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