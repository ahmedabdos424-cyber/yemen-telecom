BEGIN;

CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  value       JSONB   NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default flags for deployment strategy
INSERT INTO feature_flags (key, enabled, value) VALUES
  ('canary_new_feature', false, '{"rollout_percentage": 10}'),
  ('maintenance_mode', false, '{"message": "System maintenance in progress"}'),
  ('require_email_verification', false, '{}'),
  ('enable_export_csv', true, '{}'),
  ('enable_push_notifications', false, '{}')
ON CONFLICT (key) DO NOTHING;

COMMIT;
