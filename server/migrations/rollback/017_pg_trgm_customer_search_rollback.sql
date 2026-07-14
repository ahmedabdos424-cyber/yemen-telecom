-- Rollback: Drop pg_trgm extension and indexes
-- Migration: 017_pg_trgm_customer_search.sql

BEGIN;

DROP INDEX IF EXISTS idx_customers_name_trgm;
DROP INDEX IF EXISTS idx_customers_id_number_trgm;
DROP INDEX IF EXISTS idx_customers_phone_trgm;

-- Note: pg_trgm extension is shared — don't DROP EXTENSION if other
-- databases on the same cluster might use it.

COMMIT;
