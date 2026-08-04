-- 031_add_operations_iccid.sql
-- Persist the SIM ICCID on activation operations so the activations report
-- can display the serial number alongside the phone number.

ALTER TABLE operations ADD COLUMN IF NOT EXISTS iccid VARCHAR(30);
CREATE INDEX IF NOT EXISTS idx_operations_iccid ON operations(iccid);
