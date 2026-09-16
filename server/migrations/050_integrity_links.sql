-- Migration 050: P0 integrity links (C-03 / C-05)
-- Idempotent; the runner wraps this file in a single transaction.
--
--  1. operations.customer_row_id FK → customers(id). The text column
--     customer_id carries the national id_number (see the activation flow),
--     so it is backfilled by matching id_number. Detail views prefer this key
--     and never match operations by bare customer_name (C-03).
--  2. sellers.pre_lockdown_status stores the status active at lockdown time so
--     deactivation restores the exact previous state (C-05).

-- 1. Customer integrity link on operations
ALTER TABLE operations ADD COLUMN IF NOT EXISTS customer_row_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_operations_customer_row_id ON operations(customer_row_id);
UPDATE operations o
SET customer_row_id = c.id
FROM customers c
WHERE o.customer_row_id IS NULL
  AND o.customer_id IS NOT NULL
  AND o.customer_id <> ''
  AND c.id_number = o.customer_id;

-- 2. Lockdown state memory on sellers
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pre_lockdown_status VARCHAR(20);
