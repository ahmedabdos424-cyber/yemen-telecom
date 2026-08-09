-- Migration 035: Add missing performance indexes for queries
-- Created: 2026-08-09
-- Purpose: Improve query performance for common lookup operations

-- 1. Index on sims.phone for fast phone number lookups
CREATE INDEX IF NOT EXISTS idx_sims_phone ON sims(phone);

-- 2. Index on operations.created_by for audit queries
CREATE INDEX IF NOT EXISTS idx_operations_created_by ON operations(created_by);

-- 3. Index on alerts.created_at for time-based filtering
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

-- 4. Index on agents.user_id (already exists but ensure)
-- Note: This index might already exist from prior migrations

-- 5. Index on customers.phone for customer lookup
CREATE INDEX IF NOT EXISTS idx_customers_phone_lookup ON customers(phone);

-- 6. Index on operations.type + status for filtering
CREATE INDEX IF NOT EXISTS idx_operations_type_status ON operations(type, status);

-- 7. Index on audit_logs.username for user activity
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);

-- Record migration
INSERT INTO schema_migrations (filename, applied_at)
VALUES ('035_add_missing_performance_indexes.sql', NOW())
ON CONFLICT (filename) DO NOTHING;