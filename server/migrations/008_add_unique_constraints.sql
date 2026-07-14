BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sellers_id_number_unique') THEN
    DELETE FROM sellers a USING (
        SELECT MIN(id) as id, id_number
        FROM sellers
        WHERE id_number IS NOT NULL AND id_number != ''
        GROUP BY id_number
        HAVING COUNT(*) > 1
    ) b WHERE a.id_number = b.id_number AND a.id != b.id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email_unique') THEN
    DELETE FROM users a USING (
        SELECT MIN(id) as id, email
        FROM users
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email
        HAVING COUNT(*) > 1
    ) b WHERE a.email = b.email AND a.id != b.id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_agents_email_unique') THEN
    DELETE FROM agents a USING (
        SELECT MIN(id) as id, email
        FROM agents
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email
        HAVING COUNT(*) > 1
    ) b WHERE a.email = b.email AND a.id != b.id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sellers_email_unique') THEN
    DELETE FROM sellers a USING (
        SELECT MIN(id) as id, email
        FROM sellers
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email
        HAVING COUNT(*) > 1
    ) b WHERE a.email = b.email AND a.id != b.id;
  END IF;
END $$;

ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_id_number_unique;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_email_unique;
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sellers_id_number_unique ON sellers(id_number) WHERE id_number != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_email_unique ON agents(email) WHERE email != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_sellers_email_unique ON sellers(email) WHERE email != '';

COMMIT;
