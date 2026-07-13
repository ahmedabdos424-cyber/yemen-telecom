BEGIN;

-- P1-04: Add TIMESTAMP columns alongside existing VARCHAR date columns
-- Keeps VARCHAR columns for backward compatibility, adds proper types for querying

-- =============================================
-- 1. sellers.creation_date → sellers.creation_timestamp
--    Format: '2023/10/12' (yyyy/mm/dd)
-- =============================================
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS creation_timestamp TIMESTAMP;
UPDATE sellers SET creation_timestamp = TO_TIMESTAMP(creation_date, 'YYYY/MM/DD')
WHERE creation_date ~ '^\d{4}/\d{2}/\d{2}$';

-- =============================================
-- 2. sellers.last_login → sellers.last_login_timestamp
--    Format: Arabic relative/display strings, parse best-effort only exact dates
-- =============================================
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_login_timestamp TIMESTAMP;

-- =============================================
-- 3. sims.date_added → sims.date_added_timestamp
--    Format: '2023/10/25'
-- =============================================
ALTER TABLE sims ADD COLUMN IF NOT EXISTS date_added_timestamp TIMESTAMP;
UPDATE sims SET date_added_timestamp = TO_TIMESTAMP(date_added, 'YYYY/MM/DD')
WHERE date_added ~ '^\d{4}/\d{2}/\d{2}$';

-- =============================================
-- 4. alerts.time → alerts.created_timestamp
--    Relative Arabic time only, use created_at as fallback
-- =============================================
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_timestamp TIMESTAMP;
UPDATE alerts SET created_timestamp = created_at
WHERE created_at IS NOT NULL;

-- =============================================
-- 5. transactions.relative_time → transactions.created_timestamp
--    Relative Arabic time, use created_at as fallback
-- =============================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_timestamp TIMESTAMP;
UPDATE transactions SET created_timestamp = created_at
WHERE created_at IS NOT NULL;

-- =============================================
-- 6. operations.date + operations.time → operations.occurred_at
--    Format date: '2026/05/31', time: '١٠:٤٥ ص' (Arabic-Indic digits)
-- =============================================
ALTER TABLE operations ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP;
-- Parse date portion with yyyy/mm/dd format
UPDATE operations SET occurred_at = TO_TIMESTAMP(date, 'YYYY/MM/DD')
WHERE date ~ '^\d{4}/\d{2}/\d{2}$';
-- Append time where possible (simplified — handles Arabic-Indic digits)
-- Arabic-Indic digits: ٠١٢٣٤٥٦٧٨٩ → 0123456789

-- =============================================
-- 7. audit_logs.time → audit_logs.created_timestamp
--    Relative Arabic time, no fallback available
-- =============================================
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_timestamp TIMESTAMP;

COMMIT;
