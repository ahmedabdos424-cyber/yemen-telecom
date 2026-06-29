BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO schema_migrations (filename)
SELECT '001_performance_indexes.sql'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = '001_performance_indexes.sql');

INSERT INTO schema_migrations (filename)
SELECT '002_foreign_key_cascades.sql'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = '002_foreign_key_cascades.sql');

INSERT INTO schema_migrations (filename)
SELECT '003_token_blacklist_user_id.sql'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = '003_token_blacklist_user_id.sql');

INSERT INTO schema_migrations (filename)
SELECT '004_agent_phone_unique.sql'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = '004_agent_phone_unique.sql');

COMMIT;
