-- Yemen Telecom - Database Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(200) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'agent', 'seller')),
  status VARCHAR(20) DEFAULT 'active',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(200) DEFAULT '',
  region VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  region VARCHAR(200) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(200) DEFAULT '',
  sellers_count INTEGER DEFAULT 0,
  sims_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Keep in sync with migration 048 — soft-deleted agents (DELETE route sets 'deleted').

-- Keep schema.sql in sync with migration 004 — unique phone per agent
-- (partial index allows multiple empty/blank phones).
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_phone_unique ON agents(phone)
  WHERE phone != '' AND phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS sellers (
  id SERIAL PRIMARY KEY,
  seller_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  store_name VARCHAR(200) DEFAULT '',
  id_number VARCHAR(50) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(200) DEFAULT '',
  region VARCHAR(200) DEFAULT '',
  region_code VARCHAR(50) DEFAULT '',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'low_stock')),
  total_sales INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  efficiency INTEGER DEFAULT 0,
  sims_count INTEGER DEFAULT 0,
  sales_30_days INTEGER DEFAULT 0,
  sales_growth INTEGER DEFAULT 0,
  activity_rate INTEGER DEFAULT 0,
  creation_date VARCHAR(20) DEFAULT '',
  last_login VARCHAR(100) DEFAULT '',
  avatar VARCHAR(500) DEFAULT '',
  agent_name VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sims (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(50) NOT NULL DEFAULT '',
  iccid VARCHAR(50) UNIQUE NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'Yemen Mobile',
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'activated', 'sold', 'reserved', 'inactive', 'suspended')),
  owner VARCHAR(200) DEFAULT 'المركز الرئيسي',
  date_added VARCHAR(20) DEFAULT '',
  package_type VARCHAR(100) DEFAULT 'باقة مزايا الشهرية',
  assigned_to INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  contract_image VARCHAR(500) DEFAULT '',
  customer_name VARCHAR(200) DEFAULT '',
  customer_id VARCHAR(50) DEFAULT '',
  owner_role VARCHAR(10) NOT NULL DEFAULT 'admin' CHECK (owner_role IN ('admin', 'agent', 'seller')),
  assigned_to_agent INTEGER REFERENCES agents(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_sims_assigned_to_agent ON sims(assigned_to_agent);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  description TEXT DEFAULT '',
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  time VARCHAR(50) DEFAULT '',
  category VARCHAR(100) DEFAULT '',
  is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(200) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'Yemen Mobile',
  sims_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
  relative_time VARCHAR(50) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS operations (
  id SERIAL PRIMARY KEY,
  op_id VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('activate', 'recharge')),
  target VARCHAR(100) DEFAULT '',
  operator VARCHAR(50) DEFAULT '',
  date VARCHAR(20) DEFAULT '',
  time VARCHAR(50) DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  customer_name VARCHAR(200),
  customer_id VARCHAR(50),
  contract_image VARCHAR(500),
  iccid VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Upgrade existing operations table if needed
ALTER TABLE operations ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200);
ALTER TABLE operations ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50);
ALTER TABLE operations ADD COLUMN IF NOT EXISTS contract_image VARCHAR(500);
ALTER TABLE operations ADD COLUMN IF NOT EXISTS iccid VARCHAR(30);
ALTER TABLE operations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Ensure sims and alerts have created_at for tracking
ALTER TABLE sims ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS inventories (
  id SERIAL PRIMARY KEY,
  operator VARCHAR(50) NOT NULL UNIQUE,
  available INTEGER DEFAULT 0,
  remaining INTEGER DEFAULT 0,
  period_days INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  log_id VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT '',
  title VARCHAR(300) DEFAULT '',
  username VARCHAR(200) DEFAULT '',
  time VARCHAR(50) DEFAULT '',
  status VARCHAR(20) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  two_fa_enabled BOOLEAN DEFAULT TRUE,
  email_2fa_enabled BOOLEAN DEFAULT FALSE,
  trusted_devices_enabled BOOLEAN DEFAULT TRUE,
  session_timeout VARCHAR(50) DEFAULT '30 دقيقة',
  password_special_required BOOLEAN DEFAULT TRUE,
  password_expiry_90_days BOOLEAN DEFAULT TRUE,
  password_no_reuse_5 BOOLEAN DEFAULT FALSE,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  language VARCHAR(100) DEFAULT 'العربية (المملكة العربية السعودية)',
  email_alerts_enabled BOOLEAN DEFAULT TRUE,
  sms_alerts_enabled BOOLEAN DEFAULT TRUE,
  app_notifications_enabled BOOLEAN DEFAULT FALSE,
  stock_shortage_threshold INTEGER DEFAULT 5,
  inactive_sims_threshold INTEGER DEFAULT 90,
  max_failed_logins_threshold INTEGER DEFAULT 3,
  high_risk_duplicates_threshold INTEGER DEFAULT 5,
  identity_reminders_enabled BOOLEAN DEFAULT TRUE,
  identity_reminders_frequency VARCHAR(10) DEFAULT 'weekly' CHECK (identity_reminders_frequency IN ('daily', 'weekly'))
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  token_hash VARCHAR(64) PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_user ON token_blacklist(expires_at, user_id);

CREATE TABLE IF NOT EXISTS duplicate_identities (
  id SERIAL PRIMARY KEY,
  id_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  sims_count INTEGER DEFAULT 0,
  duplicates_count INTEGER DEFAULT 0,
  risk VARCHAR(50) DEFAULT '',
  region VARCHAR(200) DEFAULT '',
  avatar_initials VARCHAR(10) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  id_number VARCHAR(50) NOT NULL,
  id_type VARCHAR(50) DEFAULT '',
  id_issue_date VARCHAR(20) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  region VARCHAR(200) DEFAULT '',
  sims_count INTEGER DEFAULT 1,
  first_activation TIMESTAMP DEFAULT NOW(),
  last_activation TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  activated_by INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS distribution_requests (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(100) UNIQUE NOT NULL,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  operator VARCHAR(50) NOT NULL,
  count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  created_at TIMESTAMP DEFAULT NOW(),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  notes TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_customers_id_number ON customers(id_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);
CREATE INDEX IF NOT EXISTS idx_distribution_status ON distribution_requests(status);
CREATE INDEX IF NOT EXISTS idx_distribution_agent ON distribution_requests(agent_id);

-- Allow soft-delete status for sellers
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;
ALTER TABLE sellers ADD CONSTRAINT sellers_status_check CHECK (status IN ('active', 'inactive', 'suspended', 'low_stock', 'deleted'));

-- Add FK columns for audit trail (migration 002 compatibility)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sims ADD COLUMN IF NOT EXISTS activated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS avatar VARCHAR(500) DEFAULT '';
ALTER TABLE sims ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200) DEFAULT '';
ALTER TABLE sims ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) DEFAULT '';
ALTER TABLE sims ADD COLUMN IF NOT EXISTS contract_image VARCHAR(500) DEFAULT '';
ALTER TABLE operations ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE distribution_requests ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- Schema additions from production migrations (drift sync)
-- 006 (account lockout), 007 (updated_at), 009/037 (provider_id),
-- 010 (timestamp companions), 026 (identity review), 028 (single-device
-- sessions + session audit), 029 (agent full_name), 044 (token_version)
-- ============================================================

-- 006: account lockout counters
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- 028: single-device session enforcement
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_sid VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP;

-- 044: global session revocation (checked by authenticateToken and /auth/refresh)
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

-- 007: updated_at on all mutable tables (auto-triggered below)
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sims ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE distribution_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Providers lookup table (production: telecom operators).
-- Created BEFORE the provider_id FK columns below: on a fresh database the
-- REFERENCES providers(id) clauses fail if the table does not exist yet.
CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 009/037: provider_id FK
ALTER TABLE sims ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;
ALTER TABLE inventories ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;
ALTER TABLE distribution_requests ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;

-- 010: typed timestamp companions (legacy VARCHAR columns kept for compatibility)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS creation_timestamp TIMESTAMP;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_login_timestamp TIMESTAMP;
ALTER TABLE sims ADD COLUMN IF NOT EXISTS date_added_timestamp TIMESTAMP;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_timestamp TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_timestamp TIMESTAMP;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_timestamp TIMESTAMP;

-- 026: identity review status on duplicate_identities
ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending'
  CHECK (review_status IN ('pending', 'flagged', 'blocked', 'resolved'));

-- 028: session audit fields on audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_name VARCHAR(200) DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64) DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS mac_address VARCHAR(128) DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS login_at TIMESTAMP;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS logout_at TIMESTAMP;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_status VARCHAR(20) DEFAULT 'active'
  CHECK (session_status IN ('active', 'closed', 'expired'));

-- 029: agent legal full name (OCR-captured from ID document)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS full_name VARCHAR(200) DEFAULT '';

-- 007: auto-update trigger function + triggers (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TRIGGER IF EXISTS trg_agents_updated_at ON agents;
DROP TRIGGER IF EXISTS trg_sellers_updated_at ON sellers;
DROP TRIGGER IF EXISTS trg_sims_updated_at ON sims;
DROP TRIGGER IF EXISTS trg_alerts_updated_at ON alerts;
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS trg_operations_updated_at ON operations;
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS trg_distribution_requests_updated_at ON distribution_requests;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sellers_updated_at
    BEFORE UPDATE ON sellers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sims_updated_at
    BEFORE UPDATE ON sims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_operations_updated_at
    BEFORE UPDATE ON operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_distribution_requests_updated_at
    BEFORE UPDATE ON distribution_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Partial UNIQUE on customers.id_number (mirrors migration 045): empty
-- strings skip the index so any number of unidentified customers is allowed,
-- while every real national id stays unique. A full UNIQUE constraint would
-- reject the second '' (the column DEFAULT). ON CONFLICT (id_number) in the
-- app keeps working against this index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_id_number_unique ON customers(id_number) WHERE id_number <> '';

-- Add created_at to transactions if missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sellers_agent_id ON sellers(agent_id);
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_agent_name ON sellers(agent_name);
CREATE INDEX IF NOT EXISTS idx_sellers_phone ON sellers(phone);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_sims_iccid ON sims(iccid);
CREATE INDEX IF NOT EXISTS idx_sims_provider ON sims(provider);
CREATE INDEX IF NOT EXISTS idx_sims_status ON sims(status);
CREATE INDEX IF NOT EXISTS idx_sims_assigned_to ON sims(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sims_owner_role ON sims(owner_role);
CREATE INDEX IF NOT EXISTS idx_sims_iccid_status ON sims(iccid, status);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type);
CREATE INDEX IF NOT EXISTS idx_duplicate_identities_region ON duplicate_identities(region);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Missing indexes from migrations 001/028/031/033/035/037 (drift sync)
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role_username ON users(role, username);
CREATE INDEX IF NOT EXISTS idx_sellers_region ON sellers(region);
CREATE INDEX IF NOT EXISTS idx_sellers_region_code ON sellers(region_code);
CREATE INDEX IF NOT EXISTS idx_sellers_id_number ON sellers(id_number);
CREATE INDEX IF NOT EXISTS idx_sellers_created_at ON sellers(created_at);
CREATE INDEX IF NOT EXISTS idx_sims_owner ON sims(owner);
CREATE INDEX IF NOT EXISTS idx_sims_customer_name ON sims(customer_name);
CREATE INDEX IF NOT EXISTS idx_sims_customer_id ON sims(customer_id);
CREATE INDEX IF NOT EXISTS idx_sims_created_at ON sims(created_at);
CREATE INDEX IF NOT EXISTS idx_sims_provider_id ON sims(provider_id);
CREATE INDEX IF NOT EXISTS idx_sims_provider_status ON sims(provider, status);
CREATE INDEX IF NOT EXISTS idx_sims_status_created ON sims(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_target ON operations(target);
CREATE INDEX IF NOT EXISTS idx_operations_operator ON operations(operator);
CREATE INDEX IF NOT EXISTS idx_operations_customer_name ON operations(customer_name);
CREATE INDEX IF NOT EXISTS idx_operations_customer_id ON operations(customer_id);
CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at);
CREATE INDEX IF NOT EXISTS idx_operations_iccid ON operations(iccid);
CREATE INDEX IF NOT EXISTS idx_operations_created_by ON operations(created_by);
CREATE INDEX IF NOT EXISTS idx_operations_agent_created ON operations(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_type_created ON operations(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_type_status ON operations(type, status);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_category ON alerts(category);
CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts(time);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_read_priority_time ON alerts(is_read, priority, time);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_region ON agents(region);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(time);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username_login ON audit_logs(username, login_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_status ON audit_logs(session_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_session ON audit_logs(username, type, session_status, id DESC);
CREATE INDEX IF NOT EXISTS idx_distribution_seller ON distribution_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_distribution_created ON distribution_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_duplicate_identities_risk ON duplicate_identities(risk);
CREATE INDEX IF NOT EXISTS idx_duplicate_identities_name ON duplicate_identities(name);
CREATE INDEX IF NOT EXISTS idx_duplicate_identities_review ON duplicate_identities(review_status);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider);
CREATE INDEX IF NOT EXISTS idx_transactions_client_name ON transactions(client_name);
CREATE INDEX IF NOT EXISTS idx_inventories_available ON inventories(available);
CREATE INDEX IF NOT EXISTS idx_customers_name_created ON customers(full_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_phone_lookup ON customers(phone);

-- Identity risk actions (production: flag/block/unblock decisions on identities)
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

-- Schema migrations (production: applied migration filenames)
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- TODO: Migrate app code from provider VARCHAR(50) to provider_id FK (providers table).
-- Production already has provider_id in sims/transactions/inventories/operations/distribution_requests
-- (migration 009_normalize_providers.sql). Code still writes/reads the legacy text column.
-- See docs/provider-id-migration-impact.md for the full impact report.

-- Periodic cleanup function for expired blacklisted tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM token_blacklist WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Device token registry for push notifications
CREATE TABLE IF NOT EXISTS device_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL DEFAULT 'android'
    CHECK (platform IN ('android', 'ios', 'web')),
  last_used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- APK update install tracking
CREATE TABLE IF NOT EXISTS app_update_installs (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(128) NOT NULL,
  version VARCHAR(32) NOT NULL,
  version_code INTEGER NOT NULL,
  installed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_last_used ON device_tokens(last_used_at);

-- ============================================================
-- P0 convergence (C-01): tables/columns/indexes/triggers/RLS that live in
-- migrations 025/035/038/040-045/047/049/050. A fresh database built from
-- this file alone must match a migrated one — keep this section in sync.
-- ============================================================

-- user_preferences (035)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sim_notifications BOOLEAN DEFAULT TRUE,
  low_stock_notifications BOOLEAN DEFAULT TRUE,
  font_size VARCHAR(10) DEFAULT 'base',
  dark_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- login_lockouts (044)
CREATE TABLE IF NOT EXISTS login_lockouts (
  username TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  failures INT NOT NULL DEFAULT 0,
  lock_level INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, ip)
);
CREATE INDEX IF NOT EXISTS idx_login_lockouts_locked_until ON login_lockouts (locked_until);

-- transactions.created_by (042)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- operations.customer_row_id FK (050) — integrity link, backfilled from id_number
ALTER TABLE operations ADD COLUMN IF NOT EXISTS customer_row_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_operations_customer_row_id ON operations(customer_row_id);

-- sellers.pre_lockdown_status (050) — exact lockdown restore
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pre_lockdown_status VARCHAR(20);

-- Missing indexes (001/038/040/047)
CREATE INDEX IF NOT EXISTS idx_sims_phone ON sims(phone);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_inventories_provider_id ON inventories(provider_id);
CREATE INDEX IF NOT EXISTS idx_operations_provider_id ON operations(provider_id);
CREATE INDEX IF NOT EXISTS idx_distribution_requests_provider_id ON distribution_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_app_update_installs_version ON app_update_installs(version);
CREATE INDEX IF NOT EXISTS idx_app_update_installs_device_id ON app_update_installs(device_id);
CREATE INDEX IF NOT EXISTS idx_app_update_installs_installed_at ON app_update_installs(installed_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_update_installs_device_version
  ON app_update_installs(device_id, version_code);

-- updated_at on the six late tables + triggers (041)
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE identity_risk_actions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON system_settings;
CREATE TRIGGER trg_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_duplicate_identities_updated_at ON duplicate_identities;
CREATE TRIGGER trg_duplicate_identities_updated_at
    BEFORE UPDATE ON duplicate_identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_identity_risk_actions_updated_at ON identity_risk_actions;
CREATE TRIGGER trg_identity_risk_actions_updated_at
    BEFORE UPDATE ON identity_risk_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_device_tokens_updated_at ON device_tokens;
CREATE TRIGGER trg_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_providers_updated_at ON providers;
CREATE TRIGGER trg_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_schema_migrations_updated_at ON schema_migrations;
CREATE TRIGGER trg_schema_migrations_updated_at
    BEFORE UPDATE ON schema_migrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- app_update_installs retention helper (043)
CREATE OR REPLACE FUNCTION enforce_app_update_installs_retention()
RETURNS void AS $$
BEGIN
  DELETE FROM app_update_installs
  WHERE id NOT IN (
    SELECT id FROM app_update_installs
    ORDER BY installed_at DESC
    LIMIT 5000
  );
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (025 + 045): the Express backend connects as postgres
-- (BYPASSRLS) and Supabase service_role bypasses too, so the app is
-- unaffected; anon/authenticated Data-API roles stay denied by default.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END $$;

DROP POLICY IF EXISTS users_backend_full_access ON public.users;
CREATE POLICY users_backend_full_access ON public.users FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agents_backend_full_access ON public.agents;
CREATE POLICY agents_backend_full_access ON public.agents FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sellers_backend_full_access ON public.sellers;
CREATE POLICY sellers_backend_full_access ON public.sellers FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sims_backend_full_access ON public.sims;
CREATE POLICY sims_backend_full_access ON public.sims FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.sims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alerts_backend_full_access ON public.alerts;
CREATE POLICY alerts_backend_full_access ON public.alerts FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactions_backend_full_access ON public.transactions;
CREATE POLICY transactions_backend_full_access ON public.transactions FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS operations_backend_full_access ON public.operations;
CREATE POLICY operations_backend_full_access ON public.operations FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventories_backend_full_access ON public.inventories;
CREATE POLICY inventories_backend_full_access ON public.inventories FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_backend_full_access ON public.audit_logs;
CREATE POLICY audit_logs_backend_full_access ON public.audit_logs FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_settings_backend_full_access ON public.system_settings;
CREATE POLICY system_settings_backend_full_access ON public.system_settings FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS token_blacklist_backend_full_access ON public.token_blacklist;
CREATE POLICY token_blacklist_backend_full_access ON public.token_blacklist FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.token_blacklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS duplicate_identities_backend_full_access ON public.duplicate_identities;
CREATE POLICY duplicate_identities_backend_full_access ON public.duplicate_identities FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.duplicate_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_backend_full_access ON public.customers;
CREATE POLICY customers_backend_full_access ON public.customers FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS distribution_requests_backend_full_access ON public.distribution_requests;
CREATE POLICY distribution_requests_backend_full_access ON public.distribution_requests FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.distribution_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS schema_migrations_backend_full_access ON public.schema_migrations;
CREATE POLICY schema_migrations_backend_full_access ON public.schema_migrations FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS providers_backend_full_access ON public.providers;
CREATE POLICY providers_backend_full_access ON public.providers FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS device_tokens_backend_full_access ON public.device_tokens;
CREATE POLICY device_tokens_backend_full_access ON public.device_tokens FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_preferences_backend_full_access ON public.user_preferences;
CREATE POLICY user_preferences_backend_full_access ON public.user_preferences FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_update_installs_backend_full_access ON public.app_update_installs;
CREATE POLICY app_update_installs_backend_full_access ON public.app_update_installs FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.app_update_installs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS login_lockouts_backend_full_access ON public.login_lockouts;
CREATE POLICY login_lockouts_backend_full_access ON public.login_lockouts FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.login_lockouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS identity_risk_actions_backend_full_access ON public.identity_risk_actions;
CREATE POLICY identity_risk_actions_backend_full_access ON public.identity_risk_actions FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.identity_risk_actions ENABLE ROW LEVEL SECURITY;

-- SEED DATA

INSERT INTO users (username, password_hash, display_name, role, status) VALUES
  ('manager', 'SEED_REQUIRED_RUN_NPM_RUN_DB_SEED', 'أحمد محمد', 'manager', 'active'),
  ('agent', 'SEED_REQUIRED_RUN_NPM_RUN_DB_SEED', 'الوكيل أحمد محمد', 'agent', 'active'),
  ('seller', 'SEED_REQUIRED_RUN_NPM_RUN_DB_SEED', 'البائع عبدالرحمن العتيبي', 'seller', 'active')
ON CONFLICT (username) DO NOTHING;

INSERT INTO sims (phone, iccid, provider, status, owner, date_added, package_type) VALUES
  ('777123456', '8996701123456789012', 'Yemen Mobile', 'available', 'المركز الرئيسي', '2023/10/25', 'باقة مزايا الشهرية'),
  ('711987654', '8996702233445566778', 'Sabafon', 'sold', 'البائع عبدالرحمن العتيبي', '2023/10/24', 'باقة البيانات 10GB'),
  ('733554433', '8996703344556677889', 'YOU', 'reserved', 'وكالة الأمل', '2023/10/24', 'باقة هلا الفضية'),
  ('770987654', '8996700012345678901', 'Yemen Mobile', 'available', 'البائع عبدالرحمن العتيبي', '2023/10/25', 'باقة مزايا الشهرية'),
  ('775432109', '8996700012345678902', 'Yemen Mobile', 'available', 'البائع عبدالرحمن العتيبي', '2023/10/24', 'باقة البيانات 10GB'),
  ('712345678', '8996700012345678903', 'Sabafon', 'reserved', 'البائع عبدالرحمن العتيبي', '2023/10/24', 'باقة هلا الفضية'),
  ('731111222', '8996700012345678904', 'YOU', 'inactive', 'البائع عبدالرحمن العتيبي', '2023/10/22', 'باقة مزايا الشهرية')
ON CONFLICT (iccid) DO NOTHING;

INSERT INTO agents (user_id, name, region, phone, sellers_count, sims_count, status) VALUES
  ((SELECT id FROM users WHERE username='agent'), 'الوكيل أحمد محمد', 'أمانة العاصمة', '1012398455', 45, 1240, 'active'),
  (NULL, 'خالد ناصر الحميري', 'عدن - كريتر', '2039485761', 12, 340, 'inactive'),
  (NULL, 'صالح علي القحطاني', 'تعز - الحوبان', '4012394844', 28, 890, 'active'),
  (NULL, 'يسر محسن علوي', 'حضرموت - المكلا', '5012384742', 19, 620, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO sellers (seller_id, user_id, agent_id, name, store_name, id_number, phone, region, region_code, status, total_sales, current_stock, efficiency, sims_count, sales_30_days, sales_growth, activity_rate, creation_date, last_login) VALUES
  ('SLR-99021', (SELECT id FROM users WHERE username='seller'), (SELECT id FROM agents WHERE name='الوكيل أحمد محمد'), 'البائع عبدالرحمن العتيبي', 'مؤسسة الاتصالات الحديثة', '1092837465', '775323953', 'صنعاء - الأمانة', 'riyadh', 'active', 1248, 252, 85, 252, 1820, 5, 94, '2023/10/12', 'اليوم، 10:45 ص'),
  ('SLR-88124', NULL, NULL, 'سارة سالم اليافعي', 'مركز الصقر للاتصالات', '1084293041', '711904533', 'عدن - خورمكسر', 'makkah', 'suspended', 1540, 150, 85, 12, 0, 0, 0, '2023/10/24', 'أمس، 09:15 م'),
  ('SLR-11054', NULL, NULL, 'خالد عبدالله تعز', 'مؤسسة اتصالات الفجر', '1073829104', '735912445', 'تعز - الجوبان', 'madinah', 'active', 890, 45, 20, 1204, 3421, 12, 98, '2023/10/24', 'منذ ساعتين')
ON CONFLICT (seller_id) DO NOTHING;

INSERT INTO alerts (title, description, priority, time, category) VALUES
  ('نقص حاد في المخزون - فرع صنعاء', 'وصلت كمية شرائح SIM المتوفرة إلى أقل من 5% من الحد الأدنى المطلوب. يتطلب إجراء فوري.', 'high', 'منذ دقيقتين', 'مخزون'),
  ('محاولة دخول غير مصرح بها', 'تم رصد محاولة دخول فاشلة متكررة من عنوان IP 192.168.1.1 على حساب مدير العمليات.', 'medium', 'منذ 15 دقيقة', 'أمان'),
  ('تم إنشاء التقرير اليومي بنجاح', 'تم إنتاج تقرير مبيعات الشرائح والتحصيلات لليوم المنتهي بتاريخ 2023-10-24.', 'low', 'منذ ساعة', 'نظام');

INSERT INTO transactions (client_name, provider, sims_count, status, relative_time) VALUES
  ('شركة الأمل للتجارة', 'Yemen Mobile', 5000, 'completed', 'منذ 10 د'),
  ('مركز الثقة للاتصالات', 'Sabafon', 1200, 'pending', 'منذ ساعة'),
  ('مؤسسة النجم للخدمات', 'YOU', 2500, 'completed', 'منذ 3 ساعات');

INSERT INTO operations (op_id, type, target, operator, date, time, status) VALUES
  ('op1', 'activate', '0504938210', 'yemen_mobile', '2026/05/31', '١٠:٤٥ ص', 'success'),
  ('op2', 'recharge', '#INV-8821', 'you', '2026/05/31', '٠٩:١٢ ص', 'success'),
  ('op3', 'activate', '0504938255', 'sabafon', '2026/05/31', '٠٨:٥٠ ص', 'failed')
ON CONFLICT DO NOTHING;

INSERT INTO inventories (operator, available, remaining, period_days) VALUES
  ('yemen_mobile', 542, 48, 12),
  ('you', 412, 62, 18),
  ('sabafon', 330, 20, 5)
ON CONFLICT (operator) DO NOTHING;

INSERT INTO duplicate_identities (id_no, name, sims_count, duplicates_count, risk, region, avatar_initials) VALUES
  ('1023485932', 'صالح محمد العامري', 14, 5, 'مرتفع جداً', 'أمانة العاصمة', 'ص م'),
  ('2094837501', 'نبيل حسن الوداعي', 8, 3, 'متوسط', 'محافظة عدن', 'ن ح'),
  ('1088429103', 'فاطمة قاسم القدسي', 22, 8, 'مرتفع جداً', 'تعز - المدينة', 'ف ق'),
  ('3014772154', 'عمر سالم باسودان', 5, 2, 'متوسط', 'حضرموت - المكلا', 'ع س')
ON CONFLICT (id_no) DO NOTHING;

INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (log_id, type, title, username, time, status) VALUES
  ('A1', 'security_alert', 'حظر الهوية رقم 1023485932', 'صالح القحطاني', 'منذ 15 دقيقة', 'blocked'),
  ('A2', 'ai_analysis', 'بدء تحليل علاقة للعميل "عمر باسودان"', 'نظام التحليل التلقائي (AI)', 'منذ 45 دقيقة', 'analyzing'),
  ('A3', 'normal_audit', 'تأكيد صحة بيانات الهوية رقم 3044123984', 'مريم الصبري', 'منذ ساعتين', 'verified')
ON CONFLICT (log_id) DO NOTHING;
