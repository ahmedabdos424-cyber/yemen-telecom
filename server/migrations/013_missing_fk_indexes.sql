BEGIN;

CREATE INDEX IF NOT EXISTS idx_sims_activated_by ON sims(activated_by);
CREATE INDEX IF NOT EXISTS idx_alerts_created_by ON alerts(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_activated_by ON customers(activated_by);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_distribution_requests_approved_by ON distribution_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_distribution_requests_created_by ON distribution_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

COMMIT;
