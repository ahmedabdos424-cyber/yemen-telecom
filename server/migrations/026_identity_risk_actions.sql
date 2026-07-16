-- Track manager actions on duplicate/risky identities (flag as suspected, block).
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

-- Denormalized status columns on duplicate_identities so the GET list can reflect actions.
ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending'
  CHECK (review_status IN ('pending', 'flagged', 'blocked', 'resolved'));
CREATE INDEX IF NOT EXISTS idx_duplicate_identities_review ON duplicate_identities(review_status);

-- Ensure RLS allows backend role full access (RLS is enabled on this table).
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
