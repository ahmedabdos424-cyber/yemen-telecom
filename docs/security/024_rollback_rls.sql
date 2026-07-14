-- ROLLBACK for migration 024 (enable_rls): remove RLS from all public tables.
-- Run ONLY if RLS must be reverted. This restores pre-024 behaviour where the
-- public `anon`/`authenticated` Supabase roles again have direct table access.
-- NOTE: This file lives OUTSIDE server/migrations/ so it is never auto-applied
-- by the deploy pipeline. Run it manually via the Supabase SQL editor or the
-- supabase_execute_sql MCP tool.

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_backend_full_access ON public.users;

ALTER TABLE public.agents DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agents_backend_full_access ON public.agents;

ALTER TABLE public.sellers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sellers_backend_full_access ON public.sellers;

ALTER TABLE public.sims DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sims_backend_full_access ON public.sims;

ALTER TABLE public.alerts DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alerts_backend_full_access ON public.alerts;

ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactions_backend_full_access ON public.transactions;

ALTER TABLE public.operations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS operations_backend_full_access ON public.operations;

ALTER TABLE public.inventories DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventories_backend_full_access ON public.inventories;

ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_backend_full_access ON public.audit_logs;

ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_settings_backend_full_access ON public.system_settings;

ALTER TABLE public.token_blacklist DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS token_blacklist_backend_full_access ON public.token_blacklist;

ALTER TABLE public.duplicate_identities DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS duplicate_identities_backend_full_access ON public.duplicate_identities;

ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_backend_full_access ON public.customers;

ALTER TABLE public.distribution_requests DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS distribution_requests_backend_full_access ON public.distribution_requests;

ALTER TABLE public.schema_migrations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS schema_migrations_backend_full_access ON public.schema_migrations;

ALTER TABLE public.providers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS providers_backend_full_access ON public.providers;
