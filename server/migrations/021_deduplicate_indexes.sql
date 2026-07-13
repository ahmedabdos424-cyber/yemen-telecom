BEGIN;
-- Remove duplicate indexes (IF NOT EXISTS makes these safe, but cleaning for production excellence)
DROP INDEX IF EXISTS idx_sims_created_at;
DROP INDEX IF EXISTS idx_operations_created_at;
DROP INDEX IF EXISTS idx_alerts_priority;
DROP INDEX IF EXISTS idx_token_blacklist_user_id;
DROP INDEX IF EXISTS idx_token_blacklist_expires_user;
-- Re-create only the authoritative versions
CREATE INDEX IF NOT EXISTS idx_sims_created_at ON sims(created_at);
CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_user ON token_blacklist(expires_at, user_id);
COMMIT;
