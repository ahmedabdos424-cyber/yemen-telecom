-- 033_indexing_and_partitioning.sql
-- Task 4: DB indexing & partitioning
--
-- 1) Composite indexes for the hottest query paths:
--    * Agent dashboard: operations filtered by created_by + ordered by id DESC
--    * Daily-sales report: WHERE type='activate' AND created_at > NOW() - 30 days
--    * Auth session lookup: audit_logs by username+type+session_status (login check)
--    * Stats: sims grouped by status with created_at window
-- 2) Range partitioning on operations by created_at (yearly partitions + DEFAULT).
--    Rebuilds the table safely: new partitioned table -> copy -> swap -> recreate
--    constraints, indexes, trigger, RLS, and sequence.
--
-- NOTE: idempotent — skips the rebuild entirely if operations is already partitioned.
-- NOTE: the migration runner wraps this file in BEGIN/COMMIT, so the rebuild is atomic.
-- NOTE: partitions are yearly; add future partitions (operations_2028, ...) as years roll.

-- ============================================================
-- 1. Composite indexes (safe, additive, idempotent)
-- ============================================================

-- Agent dashboard / operations listing: WHERE created_by = $1 ORDER BY id DESC
CREATE INDEX IF NOT EXISTS idx_operations_agent_created ON operations(created_by, created_at DESC);
-- Daily-sales & stats: WHERE type='activate' AND created_at > NOW() - INTERVAL '30 days'
CREATE INDEX IF NOT EXISTS idx_operations_type_created ON operations(type, created_at DESC);
-- Login session check in auth.ts: username + type='login' + session_status + latest id
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_session ON audit_logs(username, type, session_status, id DESC);
-- Stats overview: sims by status + created_at window (30d/60d comparisons)
CREATE INDEX IF NOT EXISTS idx_sims_status_created ON sims(status, created_at DESC);
-- Customers lookup by identity/name
CREATE INDEX IF NOT EXISTS idx_customers_name_created ON customers(full_name, created_at DESC);

-- ============================================================
-- 2. Range partitioning on operations
-- ============================================================

DO $$
DECLARE
  is_partitioned BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'operations' AND relkind = 'p') INTO is_partitioned;
  IF NOT is_partitioned THEN
    -- Detach the id sequence so it survives the old table being dropped
    ALTER SEQUENCE operations_id_seq OWNED BY NONE;

    -- Normalize created_at so every row routes into a partition.
    -- NOTE: occurred_at is not present in every environment, so default to NOW().
    UPDATE operations SET created_at = NOW() WHERE created_at IS NULL;

    -- New partitioned parent table (same columns as the legacy table)
    CREATE TABLE operations_new (
      id INTEGER NOT NULL DEFAULT nextval('operations_id_seq'),
      op_id VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'activate' CHECK (type IN ('activate', 'recharge')),
      target VARCHAR(100) DEFAULT '',
      operator VARCHAR(50) DEFAULT '',
      date VARCHAR(20) DEFAULT '',
      time VARCHAR(50) DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
      customer_name VARCHAR(200),
      customer_id VARCHAR(50),
      contract_image VARCHAR(500),
      iccid VARCHAR(30),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      provider_id INTEGER,
      created_by INTEGER,
      PRIMARY KEY (id, created_at),
      UNIQUE (op_id, created_at)
    ) PARTITION BY RANGE (created_at);

    -- Yearly partitions + a DEFAULT catch-all (also absorbs NULL/out-of-range rows)
    CREATE TABLE operations_2025 PARTITION OF operations_new
      FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
    CREATE TABLE operations_2026 PARTITION OF operations_new
      FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
    CREATE TABLE operations_2027 PARTITION OF operations_new
      FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
    CREATE TABLE operations_default PARTITION OF operations_new DEFAULT;

    -- Copy existing rows (explicit column list — order-safe)
    INSERT INTO operations_new
      (id, op_id, type, target, operator, date, time, status,
       customer_name, customer_id, contract_image, iccid,
       created_at, updated_at, provider_id, created_by)
    SELECT
      id, op_id, type, target, operator, date, time, status,
      customer_name, customer_id, contract_image, iccid,
      created_at, updated_at, provider_id, created_by
    FROM operations;

    -- Swap: drop legacy table (sequence survives via OWNED BY NONE), rename new
    DROP TABLE operations;
    ALTER TABLE operations_new RENAME TO operations;

    -- Re-sync sequence to the current max id
    PERFORM setval('operations_id_seq', COALESCE((SELECT MAX(id) FROM operations), 1));

    -- Recreate foreign keys (were dropped with the legacy table)
    ALTER TABLE operations ADD CONSTRAINT operations_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE operations ADD CONSTRAINT operations_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL;

    -- Recreate the updated_at trigger (function from migration 007 still exists)
    CREATE TRIGGER trg_operations_updated_at
      BEFORE UPDATE ON operations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- NOTE: no BEFORE INSERT trigger here — PostgreSQL forbids modifying the
    -- partition key column (created_at) inside BEFORE FOR EACH ROW triggers.
    -- All app insert paths (operations.ts, sellers.ts, seed) omit created_at
    -- and rely on DEFAULT NOW(), so rows always carry a timestamp. NULL values
    -- were normalized to occurred_at/NOW() during the data copy above.

    -- Recreate RLS (migrations 024/025) — policies were dropped with the table
    DROP POLICY IF EXISTS operations_backend_full_access ON public.operations;
    CREATE POLICY operations_backend_full_access ON public.operations
      FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
    ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

    -- Recreate all operation indexes (dropped with the legacy table)
    CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(type);
    CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
    CREATE INDEX IF NOT EXISTS idx_operations_target ON operations(target);
    CREATE INDEX IF NOT EXISTS idx_operations_operator ON operations(operator);
    CREATE INDEX IF NOT EXISTS idx_operations_customer_name ON operations(customer_name);
    CREATE INDEX IF NOT EXISTS idx_operations_customer_id ON operations(customer_id);
    CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at);
    CREATE INDEX IF NOT EXISTS idx_operations_type_status ON operations(type, status);
    CREATE INDEX IF NOT EXISTS idx_operations_iccid ON operations(iccid);
    CREATE INDEX IF NOT EXISTS idx_operations_agent_created ON operations(created_by, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_operations_type_created ON operations(type, created_at DESC);

    RAISE NOTICE 'operations rebuilt as range-partitioned table (yearly partitions + DEFAULT)';
  END IF;
END $$;
