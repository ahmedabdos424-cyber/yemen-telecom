-- 035: Per-user notification & display preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sim_notifications BOOLEAN DEFAULT TRUE,
  low_stock_notifications BOOLEAN DEFAULT TRUE,
  font_size VARCHAR(10) DEFAULT 'base',
  dark_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
