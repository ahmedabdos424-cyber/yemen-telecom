-- Migration 044: Security hardening
-- 1. Persistent login lockout table (survives restarts, works across instances)
-- 2. token_version column for global session revocation

-- Persistent lockout table
CREATE TABLE IF NOT EXISTS login_lockouts (
  username TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  failures INT NOT NULL DEFAULT 0,
  lock_level INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, ip)
);

CREATE INDEX IF NOT EXISTS idx_login_lockouts_locked_until ON login_lockouts (locked_until);

-- Global token revocation: bump this to invalidate all sessions for a user
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;
