-- Migration 042: Add audit trail to transactions table
-- Adds created_by FK for accountability (who created this transaction)

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);
