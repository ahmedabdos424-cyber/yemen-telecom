-- Migration 001: Performance Indexes & Constraints
-- Date: 2026-06-10
-- 
-- Adds missing indexes for query performance and data consistency.
-- All statements use IF NOT EXISTS / safe patterns — safe to re-run.

BEGIN;

-- ============================================================
-- Missing Indexes for Frequently Queried Columns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

CREATE INDEX IF NOT EXISTS idx_sellers_region ON sellers(region);
CREATE INDEX IF NOT EXISTS idx_sellers_region_code ON sellers(region_code);
CREATE INDEX IF NOT EXISTS idx_sellers_id_number ON sellers(id_number);
CREATE INDEX IF NOT EXISTS idx_sellers_created_at ON sellers(created_at);

CREATE INDEX IF NOT EXISTS idx_sims_phone ON sims(phone);
CREATE INDEX IF NOT EXISTS idx_sims_owner ON sims(owner);
CREATE INDEX IF NOT EXISTS idx_sims_customer_name ON sims(customer_name);
CREATE INDEX IF NOT EXISTS idx_sims_customer_id ON sims(customer_id);
CREATE INDEX IF NOT EXISTS idx_sims_created_at ON sims(created_at);

CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_target ON operations(target);
CREATE INDEX IF NOT EXISTS idx_operations_operator ON operations(operator);
CREATE INDEX IF NOT EXISTS idx_operations_customer_name ON operations(customer_name);
CREATE INDEX IF NOT EXISTS idx_operations_customer_id ON operations(customer_id);
CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at);

CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_category ON alerts(category);
CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts(time);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_region ON agents(region);

CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(time);

CREATE INDEX IF NOT EXISTS idx_distribution_seller ON distribution_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_distribution_created ON distribution_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_duplicate_identities_risk ON duplicate_identities(risk);
CREATE INDEX IF NOT EXISTS idx_duplicate_identities_name ON duplicate_identities(name);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider);
CREATE INDEX IF NOT EXISTS idx_transactions_client_name ON transactions(client_name);

CREATE INDEX IF NOT EXISTS idx_inventories_available ON inventories(available);

-- ============================================================
-- Missing Unique Constraints
-- ============================================================

-- Ensure unique username+role combinations (prevent duplicate account creation)
-- Note: username is already UNIQUE in users table, this covers the index
CREATE INDEX IF NOT EXISTS idx_users_role_username ON users(role, username);

-- ============================================================
-- Composite Indexes for Common Query Patterns
-- ============================================================

-- Manager dashboard: count sims grouped by provider+status
CREATE INDEX IF NOT EXISTS idx_sims_provider_status ON sims(provider, status);

-- Agent/Seller dashboard: operations filtered by type+status
CREATE INDEX IF NOT EXISTS idx_operations_type_status ON operations(type, status);

-- Alerts dashboard: unread alerts sorted by priority+time
CREATE INDEX IF NOT EXISTS idx_alerts_read_priority_time ON alerts(is_read, priority, time);

-- ============================================================
-- Periodic Token Blacklist Cleanup Function Enhancement
-- ============================================================

-- Scheduled cleanup job suggestion (manual or cron):
-- SELECT cleanup_expired_tokens();
-- Recommended: run every hour via pg_cron or application scheduler

COMMIT;
