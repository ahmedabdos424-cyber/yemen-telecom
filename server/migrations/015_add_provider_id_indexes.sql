BEGIN;

CREATE INDEX IF NOT EXISTS idx_sims_provider_id ON sims(provider_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_inventories_provider_id ON inventories(provider_id);
CREATE INDEX IF NOT EXISTS idx_operations_provider_id ON operations(provider_id);
CREATE INDEX IF NOT EXISTS idx_distribution_requests_provider_id ON distribution_requests(provider_id);

COMMIT;
