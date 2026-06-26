-- Migration 004: Add UNIQUE constraint on agents(phone)
-- Date: 2026-06-20
--
-- Removes duplicate phone numbers from agents table,
-- then adds UNIQUE constraint to prevent future duplicates.

BEGIN;

-- Step 1: Delete duplicate phone records keeping only the oldest (lowest id)
-- Only processes non-empty phone values
DELETE FROM agents a1
USING agents a2
WHERE a1.phone = a2.phone
  AND a1.phone != ''
  AND a1.phone IS NOT NULL
  AND a1.id > a2.id;

-- Step 2: Add UNIQUE constraint (allows multiple NULL/empty phones)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_phone_unique ON agents(phone)
  WHERE phone != '' AND phone IS NOT NULL;

COMMIT;
