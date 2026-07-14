-- Migration 024: Enable Row Level Security (RLS) on all public tables.
-- Idempotent: safe to re-run (DROP POLICY IF EXISTS + CREATE + ENABLE).
--
-- SECURITY MODEL
--   * The Express backend connects to Postgres as the `postgres` role, which
--     has BYPASSRLS = true. Supabase `service_role` also has BYPASSRLS = true.
--     Both bypass RLS, so application behaviour is unchanged.
--   * The publicly reachable Supabase `anon` and `authenticated` roles are
--     granted NO policy on these tables and are therefore fully denied all
--     direct Data-API access. This closes the only externally reachable
--     path to the data (the app never uses the Supabase JS client).
--   * Manager / Agent / Seller authorization is enforced in the Express layer
--     (requireRole + per-row ownership WHERE clauses), not at the DB level.
--
-- NOTE: Do NOT use FORCE ROW LEVEL SECURITY — table owners (postgres) must
-- keep bypassing RLS so the backend keeps working.

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
