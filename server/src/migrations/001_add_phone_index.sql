-- Migration 001: Add performance indexes for common query patterns

-- Index for phone number lookups on sims
CREATE INDEX IF NOT EXISTS idx_sims_phone ON sims(phone);

-- Index for customer queries on operations
CREATE INDEX IF NOT EXISTS idx_operations_customer_name ON operations(customer_name);
CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at);

-- Composite index for duplicate identity detection
CREATE INDEX IF NOT EXISTS idx_sellers_id_number ON sellers(id_number) WHERE id_number != '';
