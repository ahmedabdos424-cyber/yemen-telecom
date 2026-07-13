BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_agents_phone_unique'
  ) THEN
    DELETE FROM agents a1
    USING agents a2
    WHERE a1.phone = a2.phone
      AND a1.phone != ''
      AND a1.phone IS NOT NULL
      AND a1.id > a2.id;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_phone_unique ON agents(phone)
      WHERE phone != '' AND phone IS NOT NULL;
  END IF;
END $$;

COMMIT;
