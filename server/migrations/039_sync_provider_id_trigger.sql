-- P1-09: Auto-sync provider_id from legacy text columns
-- Ensures provider_id stays in sync when provider/operator text columns are written

CREATE OR REPLACE FUNCTION sync_provider_id()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_id INT;
BEGIN
  -- Determine which table we're on and sync accordingly
  IF TG_TABLE_NAME = 'sims' THEN
    SELECT id INTO v_provider_id FROM providers WHERE LOWER(display_name) = LOWER(NEW.provider);
    IF v_provider_id IS NOT NULL THEN
      NEW.provider_id := v_provider_id;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    SELECT id INTO v_provider_id FROM providers WHERE LOWER(display_name) = LOWER(NEW.provider);
    IF v_provider_id IS NOT NULL THEN
      NEW.provider_id := v_provider_id;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'inventories' THEN
    SELECT id INTO v_provider_id FROM providers WHERE LOWER(slug) = LOWER(NEW.operator);
    IF v_provider_id IS NOT NULL THEN
      NEW.provider_id := v_provider_id;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'operations' THEN
    SELECT id INTO v_provider_id FROM providers WHERE LOWER(slug) = LOWER(NEW.operator);
    IF v_provider_id IS NOT NULL THEN
      NEW.provider_id := v_provider_id;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'distribution_requests' THEN
    SELECT id INTO v_provider_id FROM providers WHERE LOWER(slug) = LOWER(NEW.operator);
    IF v_provider_id IS NOT NULL THEN
      NEW.provider_id := v_provider_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to all relevant tables (idempotent)
DROP TRIGGER IF EXISTS trg_sims_sync_provider_id ON sims;
CREATE TRIGGER trg_sims_sync_provider_id
  BEFORE INSERT OR UPDATE ON sims
  FOR EACH ROW EXECUTE FUNCTION sync_provider_id();

DROP TRIGGER IF EXISTS trg_transactions_sync_provider_id ON transactions;
CREATE TRIGGER trg_transactions_sync_provider_id
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION sync_provider_id();

DROP TRIGGER IF EXISTS trg_inventories_sync_provider_id ON inventories;
CREATE TRIGGER trg_inventories_sync_provider_id
  BEFORE INSERT OR UPDATE ON inventories
  FOR EACH ROW EXECUTE FUNCTION sync_provider_id();

DROP TRIGGER IF EXISTS trg_operations_sync_provider_id ON operations;
CREATE TRIGGER trg_operations_sync_provider_id
  BEFORE INSERT OR UPDATE ON operations
  FOR EACH ROW EXECUTE FUNCTION sync_provider_id();

DROP TRIGGER IF EXISTS trg_distribution_requests_sync_provider_id ON distribution_requests;
CREATE TRIGGER trg_distribution_requests_sync_provider_id
  BEFORE INSERT OR UPDATE ON distribution_requests
  FOR EACH ROW EXECUTE FUNCTION sync_provider_id();