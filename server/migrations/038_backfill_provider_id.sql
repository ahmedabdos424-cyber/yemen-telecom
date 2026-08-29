-- P1-08: Comprehensive provider_id backfill for all tables
-- Ensures all existing rows have provider_id populated from legacy text columns

-- 1. Backfill sims.provider_id from provider (display_name)
UPDATE sims s
SET provider_id = p.id
FROM providers p
WHERE LOWER(s.provider) = LOWER(p.display_name)
  AND s.provider_id IS NULL;

-- 2. Backfill transactions.provider_id from provider (display_name)
UPDATE transactions t
SET provider_id = p.id
FROM providers p
WHERE LOWER(t.provider) = LOWER(p.display_name)
  AND t.provider_id IS NULL;

-- 3. Backfill inventories.provider_id from operator (slug)
UPDATE inventories i
SET provider_id = p.id
FROM providers p
WHERE LOWER(i.operator) = LOWER(p.slug)
  AND i.provider_id IS NULL;

-- 4. Backfill operations.provider_id from operator (slug)
UPDATE operations o
SET provider_id = p.id
FROM providers p
WHERE LOWER(o.operator) = LOWER(p.slug)
  AND o.provider_id IS NULL;

-- 5. Backfill distribution_requests.provider_id from operator (slug)
UPDATE distribution_requests d
SET provider_id = p.id
FROM providers p
WHERE LOWER(d.operator) = LOWER(p.slug)
  AND d.provider_id IS NULL;

-- 6. Verify no NULL provider_id remains in tables that should have it
-- (These are informational - if any rows remain NULL, they need manual review)
-- SELECT 'sims' AS table_name, COUNT(*) AS null_count FROM sims WHERE provider_id IS NULL
-- UNION ALL SELECT 'transactions', COUNT(*) FROM transactions WHERE provider_id IS NULL
-- UNION ALL SELECT 'inventories', COUNT(*) FROM inventories WHERE provider_id IS NULL
-- UNION ALL SELECT 'operations', COUNT(*) FROM operations WHERE provider_id IS NULL
-- UNION ALL SELECT 'distribution_requests', COUNT(*) FROM distribution_requests WHERE provider_id IS NULL;

-- 7. Add indexes for provider_id lookups (idempotent)
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_inventories_provider_id ON inventories(provider_id);
CREATE INDEX IF NOT EXISTS idx_operations_provider_id ON operations(provider_id);
CREATE INDEX IF NOT EXISTS idx_distribution_requests_provider_id ON distribution_requests(provider_id);