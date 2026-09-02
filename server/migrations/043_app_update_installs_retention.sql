-- Migration 043: Add retention policy for app_update_installs
-- Keeps only last 5000 records to prevent unbounded table growth

-- Delete oldest records beyond the retention limit
DELETE FROM app_update_installs
WHERE id NOT IN (
  SELECT id FROM app_update_installs
  ORDER BY installed_at DESC
  LIMIT 5000
);

-- Add a function to enforce retention (can be called periodically)
CREATE OR REPLACE FUNCTION enforce_app_update_installs_retention()
RETURNS void AS $$
BEGIN
  DELETE FROM app_update_installs
  WHERE id NOT IN (
    SELECT id FROM app_update_installs
    ORDER BY installed_at DESC
    LIMIT 5000
  );
END;
$$ LANGUAGE plpgsql;
