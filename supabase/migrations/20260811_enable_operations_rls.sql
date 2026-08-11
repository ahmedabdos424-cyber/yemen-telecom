-- Yemen Telecom - Enable Row Level Security on partitioned operations tables
-- Migration date: 2026-08-11
-- Purpose: Close the security gap where operations_2025/2026/2027/default
--          were fully exposed to the anon role via Supabase REST API.

-- ============================================================
-- STEP 1: Enable RLS on all four tables
-- ============================================================
ALTER TABLE public.operations_2025 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_2026 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_2027 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_default ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: Backend service policies (postgres / service_role)
-- Consistent with the existing pattern on `operations` and `users`
-- (operations_backend_full_access / users_backend_full_access).
-- The Express backend connects via `pg` Pool using the postgres
-- role and must NOT be blocked. RLS does not apply to table owners
-- by default, but we keep an explicit policy for clarity and safety.
-- ============================================================
CREATE POLICY operations_backend_full_access
  ON public.operations_2025
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY operations_backend_full_access
  ON public.operations_2026
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY operations_backend_full_access
  ON public.operations_2027
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY operations_backend_full_access
  ON public.operations_default
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STEP 3: Authenticated user policies (Supabase Auth)
-- Only authenticated users (auth.uid() IS NOT NULL) can access.
-- The anon role has NO policies => zero access.
-- NOTE on ownership: the `created_by` column is INTEGER referencing
-- the internal users.id (custom JWT auth), NOT auth.uid() (UUID).
-- Direct ownership matching (auth.uid() = created_by) is therefore
-- NOT possible without adding a UUID column. See optional section
-- at the bottom of this file once the app adopts Supabase Auth.
-- ============================================================

-- READ
CREATE POLICY operations_authenticated_read
  ON public.operations_2025
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_read
  ON public.operations_2026
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_read
  ON public.operations_2027
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_read
  ON public.operations_default
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT
CREATE POLICY operations_authenticated_insert
  ON public.operations_2025
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_insert
  ON public.operations_2026
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_insert
  ON public.operations_2027
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_insert
  ON public.operations_default
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE
CREATE POLICY operations_authenticated_update
  ON public.operations_2025
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_update
  ON public.operations_2026
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_update
  ON public.operations_2027
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_update
  ON public.operations_default
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE
CREATE POLICY operations_authenticated_delete
  ON public.operations_2025
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_delete
  ON public.operations_2026
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_delete
  ON public.operations_2027
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY operations_authenticated_delete
  ON public.operations_default
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- OPTIONAL (future): ownership-scoped policies.
-- Requires adding a UUID column linked to Supabase Auth, e.g.:
--
--   ALTER TABLE public.operations_2025 ADD COLUMN auth_user_id UUID;
--   -- backfill from users mapping table, then:
--   DROP POLICY operations_authenticated_read ON public.operations_2025;
--   CREATE POLICY operations_owner_read ON public.operations_2025
--     FOR SELECT TO authenticated
--     USING (auth.uid() = auth_user_id);
-- (repeat per table + per command; same pattern for I/U/D)
-- ============================================================
