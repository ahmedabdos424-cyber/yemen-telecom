-- Migration 002: Foreign Key Cascade Rules
-- Date: 2026-06-10
--
-- Adds ON DELETE CASCADE to all foreign key relationships
-- so that deleting a parent row automatically removes children.
-- Recreates constraints where needed (drops existing, adds cascading).
--
-- Safe for re-run: uses IF EXISTS / DO blocks where necessary.

BEGIN;

-- ============================================================
-- sellers → users (created_by)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sellers_created_by_fkey'
  ) THEN
    ALTER TABLE sellers DROP CONSTRAINT sellers_created_by_fkey;
  END IF;
END $$;
ALTER TABLE sellers ADD CONSTRAINT sellers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- sims → sellers (seller_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sims_seller_id_fkey'
  ) THEN
    ALTER TABLE sims DROP CONSTRAINT sims_seller_id_fkey;
  END IF;
END $$;
ALTER TABLE sims ADD CONSTRAINT sims_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL;

-- ============================================================
-- sims → users (activated_by)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sims_activated_by_fkey'
  ) THEN
    ALTER TABLE sims DROP CONSTRAINT sims_activated_by_fkey;
  END IF;
END $$;
ALTER TABLE sims ADD CONSTRAINT sims_activated_by_fkey
  FOREIGN KEY (activated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- operations → users (created_by)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'operations_created_by_fkey'
  ) THEN
    ALTER TABLE operations DROP CONSTRAINT operations_created_by_fkey;
  END IF;
END $$;
ALTER TABLE operations ADD CONSTRAINT operations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- alerts → users (created_by)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'alerts_created_by_fkey'
  ) THEN
    ALTER TABLE alerts DROP CONSTRAINT alerts_created_by_fkey;
  END IF;
END $$;
ALTER TABLE alerts ADD CONSTRAINT alerts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- distribution_requests → sellers
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'distribution_requests_seller_id_fkey'
  ) THEN
    ALTER TABLE distribution_requests DROP CONSTRAINT distribution_requests_seller_id_fkey;
  END IF;
END $$;
ALTER TABLE distribution_requests ADD CONSTRAINT distribution_requests_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE;

-- ============================================================
-- distribution_requests → users (approved_by / created_by)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'distribution_requests_approved_by_fkey'
  ) THEN
    ALTER TABLE distribution_requests DROP CONSTRAINT distribution_requests_approved_by_fkey;
  END IF;
END $$;
ALTER TABLE distribution_requests ADD CONSTRAINT distribution_requests_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'distribution_requests_created_by_fkey'
  ) THEN
    ALTER TABLE distribution_requests DROP CONSTRAINT distribution_requests_created_by_fkey;
  END IF;
END $$;
ALTER TABLE distribution_requests ADD CONSTRAINT distribution_requests_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- token_blacklist → no FK needed (standalone)
-- ============================================================

-- ============================================================
-- audit_logs → no FK to preserve historical integrity
-- ============================================================

COMMIT;
