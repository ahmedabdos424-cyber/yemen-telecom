-- Migration 045: Security hardening part 2 (S6 + S7)
-- 1. Enable RLS on the tables created AFTER migration 025 (they were never
--    covered by the policy sweep) so the Supabase Data API continues to deny
--    anon/authenticated access by default. Same policy pattern as 025:
--    postgres / service_role get full access (BYPASSRLS), everyone else denied.
-- 2. customers.id_number: schema.sql declares a full UNIQUE constraint, but no
--    migration ever created it (reported S7). A full UNIQUE on a column whose
--    DEFAULT is '' rejects the second empty string. Replace it with the same
--    partial-unique-index pattern used in migration 008 (empty strings skip the
--    index) and keep ON CONFLICT (id_number) working in the app.

-- RLS — device_tokens (FCM registry, PII)
DROP POLICY IF EXISTS device_tokens_backend_full_access ON public.device_tokens;
CREATE POLICY device_tokens_backend_full_access ON public.device_tokens FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS — user_preferences (per-user settings)
DROP POLICY IF EXISTS user_preferences_backend_full_access ON public.user_preferences;
CREATE POLICY user_preferences_backend_full_access ON public.user_preferences FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS — app_update_installs (device + version telemetry)
DROP POLICY IF EXISTS app_update_installs_backend_full_access ON public.app_update_installs;
CREATE POLICY app_update_installs_backend_full_access ON public.app_update_installs FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.app_update_installs ENABLE ROW LEVEL SECURITY;

-- RLS — login_lockouts (lockout metadata, survives restarts)
DROP POLICY IF EXISTS login_lockouts_backend_full_access ON public.login_lockouts;
CREATE POLICY login_lockouts_backend_full_access ON public.login_lockouts FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.login_lockouts ENABLE ROW LEVEL SECURITY;

-- RLS — identity_risk_actions (flag/block decisions on identities, PII)
DROP POLICY IF EXISTS identity_risk_actions_backend_full_access ON public.identity_risk_actions;
CREATE POLICY identity_risk_actions_backend_full_access ON public.identity_risk_actions FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
ALTER TABLE public.identity_risk_actions ENABLE ROW LEVEL SECURITY;

-- customers.id_number — swap full UNIQUE for a partial unique index
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_id_number_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_id_number_unique ON customers(id_number) WHERE id_number <> '';