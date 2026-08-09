-- Backfill sims.provider_id FK (providers lookup created by 009_normalize_providers.sql)
ALTER TABLE sims 
ADD COLUMN IF NOT EXISTS provider_id INT REFERENCES providers(id) ON DELETE SET NULL;

-- Update legacy text values to new FK reference
UPDATE sims s
SET provider_id = p.id
FROM providers p
WHERE LOWER(s.provider) = LOWER(p.display_name) AND s.provider_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sims_provider_id ON sims(provider_id);
