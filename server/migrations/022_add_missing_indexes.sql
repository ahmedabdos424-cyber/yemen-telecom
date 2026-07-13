BEGIN;

-- Add missing index for inventories operator lookups (FOR UPDATE in distribution approval)
CREATE INDEX IF NOT EXISTS idx_inventories_operator ON inventories(operator);

-- Add standalone status index for distribution_requests pending count query
CREATE INDEX IF NOT EXISTS idx_distribution_requests_status ON distribution_requests(status);

-- Add B-tree index for customers id_number exact lookups (complements trigram GIN)
CREATE INDEX IF NOT EXISTS idx_customers_id_number ON customers(id_number);

-- Add index for sellers seller_id business key lookups
CREATE INDEX IF NOT EXISTS idx_sellers_seller_id ON sellers(seller_id);

COMMIT;
