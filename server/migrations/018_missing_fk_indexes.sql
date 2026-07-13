BEGIN;

CREATE INDEX IF NOT EXISTS idx_sellers_agent_id ON sellers(agent_id);
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);

COMMIT;
