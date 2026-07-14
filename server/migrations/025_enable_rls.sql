-- Migration 025: enable Row Level Security on all public tables (canonical,
-- idempotent, re-assertable). Mirrors migration 024; safe to run after it or on
-- a fresh database.
--
-- SECURITY MODEL (verified from source, not assumed)
--   * The Express backend connects as `postgres` (BYPASSRLS = true); Supabase
--     `service_role` also has BYPASSRLS = true. Both bypass RLS, so the
--     application is unaffected.
--   * The publicly reachable Supabase `anon` and `authenticated` roles receive
--     NO policy and are therefore fully denied all direct Data-API access. The
--     app never uses those roles (no supabase-js; custom HS256 JWT in Express).
--   * Manager / Agent / Seller authorization is enforced in Express
--     (requireRole + ownership WHERE clauses), not at the DB layer.
--   * No FORCE ROW LEVEL SECURITY — table owners (postgres) must keep bypassing.

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
