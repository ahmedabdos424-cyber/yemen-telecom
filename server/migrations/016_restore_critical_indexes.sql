BEGIN;

-- Restore indexes that were incorrectly dropped by migration 014
-- These indexes are critical for query performance:
--   - sims(created_at): stats date-range queries (index.ts:395-401)
--   - operations(created_at): report date-range filters (reports.ts:13-23)
--   - token_blacklist(expires_at, user_id): isTokenBlacklisted() on every request
--   - token_blacklist(user_id): user session cleanup
--   - alerts(priority): alert filtering/sorting

CREATE INDEX IF NOT EXISTS idx_sims_created_at ON sims(created_at);
CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_user ON token_blacklist(expires_at, user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);

-- New composite index for report aggregation queries (type + date range)
CREATE INDEX IF NOT EXISTS idx_operations_type_created ON operations(type, created_at);

-- Index for agents stats query
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at);

COMMIT;
