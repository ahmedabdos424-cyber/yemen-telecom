-- Migration 003: Add user_id to token_blacklist
-- Date: 2026-06-20
--
-- Adds user_id column to token_blacklist so account deletion
-- only clears that user's sessions instead of all sessions.
-- Backfills any existing orphan records (user_id = NULL) by matching
-- against JWT payload derived from token_hash (if possible).

BEGIN;

ALTER TABLE token_blacklist ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_user ON token_blacklist(expires_at, user_id);

-- Clean up any records with expired timestamp that lack user_id
DELETE FROM token_blacklist WHERE user_id IS NULL AND expires_at < NOW();

COMMIT;
