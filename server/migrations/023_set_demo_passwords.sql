BEGIN;

-- Set a known 8-char demo password (12345678) for the three default accounts
-- so they can log in from the APK / web. Hash produced with bcryptjs cost 10,
-- matching the algorithm used by the /api/auth/login route. Also clear any
-- stale lockout counters so a previous bad attempt cannot block login.
UPDATE users
SET password_hash = '$2a$10$OV0jADiCiE.eUJ59pKKztOwwpj4iccZEPFoSS1ntZNlNFQiAXicFy',
    failed_attempts = 0,
    locked_until = NULL
WHERE username IN ('manager', 'agent', 'seller');

COMMIT;
