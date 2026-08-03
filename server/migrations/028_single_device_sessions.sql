-- Single-device session enforcement (production: one active session per user,
-- except demo accounts manager/agent/seller which allow concurrent sessions).

ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_sid VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_name VARCHAR(200) DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64) DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS mac_address VARCHAR(128) DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS login_at TIMESTAMP;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS logout_at TIMESTAMP;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_status VARCHAR(20) DEFAULT 'active'
  CHECK (session_status IN ('active', 'closed', 'expired'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_username_login ON audit_logs(username, login_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_status ON audit_logs(session_status);
