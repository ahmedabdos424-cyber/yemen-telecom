-- 030_batch_sim_inventory.sql
-- Batch SIM inventory (range-based ICCID) + ownership tracking
--
-- Extends the sims table for the batch stock feature:
--   * status gains 'assigned' (distributed to an agent/seller) and 'activated'
--     (sold/activated to an end customer)
--   * owner_role tracks the current inventory owner: admin (central stock),
--     agent, or seller
--   * assigned_to_agent tracks which agent holds an assigned SIM

ALTER TABLE sims DROP CONSTRAINT IF EXISTS sims_status_check;
ALTER TABLE sims ADD CONSTRAINT sims_status_check
  CHECK (status IN ('available', 'assigned', 'activated', 'sold', 'reserved', 'inactive', 'suspended'));

ALTER TABLE sims ADD COLUMN IF NOT EXISTS owner_role VARCHAR(10) NOT NULL DEFAULT 'admin'
  CHECK (owner_role IN ('admin', 'agent', 'seller'));

ALTER TABLE sims ADD COLUMN IF NOT EXISTS assigned_to_agent INTEGER REFERENCES agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sims_owner_role ON sims(owner_role);
CREATE INDEX IF NOT EXISTS idx_sims_iccid_status ON sims(iccid, status);
