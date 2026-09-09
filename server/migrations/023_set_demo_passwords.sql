BEGIN;

-- S8: removed the known 8-char demo password (12345678) that migration 023
-- used to hard-code for the three default accounts. A hard-coded password in a
-- migration resets those accounts to a publicly known credential on every
-- fresh database (incl. CI/dev), which an attacker could use against any
-- environment that relied on the migration.
--
-- Demo credentials are now set ONLY by `npm run db:seed`
-- (server/src/seed.ts), which requires SEED_PASSWORD_MANAGER/AGENT/SELLER (or
-- generates strong random ones) and refuses to run in production. Until seed
-- runs, password_hash is an inert placeholder that can never match a login.
--
-- Seed accounts are still created by schema.sql with the same placeholder.
UPDATE users
SET password_hash = 'SEED_REQUIRED_RUN_NPM_RUN_DB_SEED',
    failed_attempts = 0,
    locked_until = NULL
WHERE username IN ('manager', 'agent', 'seller');

COMMIT;