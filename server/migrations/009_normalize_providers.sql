-- P1-07: Normalize provider/operator casing
-- Create providers lookup table and normalize existing data

-- Create providers lookup table
CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert canonical providers
INSERT INTO providers (slug, display_name) VALUES
    ('yemen_mobile', 'Yemen Mobile'),
    ('sabafon', 'Sabafon'),
    ('you', 'YOU')
ON CONFLICT (slug) DO NOTHING;

-- Add provider_id FK columns (nullable for backward compatibility)
ALTER TABLE sims ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;
ALTER TABLE inventories ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;
ALTER TABLE distribution_requests ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL;

-- Set provider_id based on existing string values
UPDATE sims s SET provider_id = p.id
FROM providers p
WHERE p.display_name = s.provider AND s.provider_id IS NULL;

UPDATE transactions t SET provider_id = p.id
FROM providers p
WHERE p.display_name = t.provider AND t.provider_id IS NULL;

UPDATE inventories i SET provider_id = p.id
FROM providers p
WHERE p.slug = i.operator AND i.provider_id IS NULL;

UPDATE operations o SET provider_id = p.id
FROM providers p
WHERE p.slug = o.operator AND o.provider_id IS NULL;

UPDATE distribution_requests d SET provider_id = p.id
FROM providers p
WHERE p.slug = d.operator AND d.provider_id IS NULL;
