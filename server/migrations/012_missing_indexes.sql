BEGIN;

CREATE INDEX IF NOT EXISTS idx_operations_created_by ON operations(created_by);
CREATE INDEX IF NOT EXISTS idx_sellers_name ON sellers(name);
CREATE INDEX IF NOT EXISTS idx_sellers_created_by ON sellers(created_by);
CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at);
CREATE INDEX IF NOT EXISTS idx_sims_created_at ON sims(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_sellers_sales_30_days ON sellers(sales_30_days DESC);
CREATE INDEX IF NOT EXISTS idx_sims_assigned_to_status ON sims(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_distribution_requests_agent_status ON distribution_requests(agent_id, status);

COMMIT;
