BEGIN;
CREATE INDEX IF NOT EXISTS idx_operations_operator_status ON operations(operator, status);
COMMIT;
