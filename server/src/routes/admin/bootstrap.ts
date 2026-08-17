import { query } from '../../db';
import { logger } from '../../logger';

// ========================
// Idempotent schema bootstrap for identity risk actions
// (Safe to run on every boot: all statements use IF NOT EXISTS / ON CONFLICT.)
// ========================
let bootstrapDone = false;
async function ensureIdentityRiskSchema() {
  if (bootstrapDone) return;
  bootstrapDone = true;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS identity_risk_actions (
        id SERIAL PRIMARY KEY,
        id_no VARCHAR(50) NOT NULL,
        name VARCHAR(200) DEFAULT '',
        action VARCHAR(20) NOT NULL CHECK (action IN ('flag', 'block', 'unblock')),
        reason TEXT DEFAULT '',
        performed_by VARCHAR(200) DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_identity_risk_actions_id_no ON identity_risk_actions(id_no);
      CREATE INDEX IF NOT EXISTS idx_identity_risk_actions_created ON identity_risk_actions(created_at);

      ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
      ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;
      ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'flagged', 'blocked', 'resolved'));
      CREATE INDEX IF NOT EXISTS idx_duplicate_identities_review ON duplicate_identities(review_status);
    `);
    // Enable RLS for the new table if not already.
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'identity_risk_actions'
        ) THEN
          CREATE POLICY identity_risk_actions_backend_full_access
            ON public.identity_risk_actions FOR ALL
            TO postgres, service_role
            USING (true) WITH CHECK (true);
          ALTER TABLE public.identity_risk_actions ENABLE ROW LEVEL SECURITY;
        END IF;
      END $$;
    `);
    logger.info('Identity risk schema ensured.');
  } catch (err) {
    logger.error('Error ensuring identity risk schema:', err);
  }
}

// ========================
// Idempotent schema bootstrap for single-device sessions + device audit fields
// (Safe to run on every boot: all statements use IF NOT EXISTS / ON CONFLICT.)
// ========================
let sessionSchemaDone = false;
async function ensureSessionSchema() {
  if (sessionSchemaDone) return;
  sessionSchemaDone = true;
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_sid VARCHAR(64);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_name VARCHAR(200) DEFAULT '';
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64) DEFAULT '';
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS mac_address VARCHAR(128) DEFAULT '';
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS login_at TIMESTAMP;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS logout_at TIMESTAMP;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_status VARCHAR(20) DEFAULT 'active';
      CREATE INDEX IF NOT EXISTS idx_audit_logs_username_login ON audit_logs(username, login_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_session_status ON audit_logs(session_status);
    `);
    logger.info('Session tracking schema ensured.');
  } catch (err) {
    logger.error('Error ensuring session schema:', err);
  }
}

// Run bootstraps once the module is loaded (server-side only).
if (process.env.NODE_ENV !== 'test') {
  void ensureIdentityRiskSchema();
  void ensureSessionSchema();
}

export { ensureIdentityRiskSchema, ensureSessionSchema };
