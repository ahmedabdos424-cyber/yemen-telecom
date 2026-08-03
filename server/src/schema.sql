-- Yemen Telecom - Database Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(200) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'agent', 'seller')),
  status VARCHAR(20) DEFAULT 'active',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(200) DEFAULT '',
  region VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  region VARCHAR(200) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(200) DEFAULT '',
  sellers_count INTEGER DEFAULT 0,
  sims_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sellers (
  id SERIAL PRIMARY KEY,
  seller_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  store_name VARCHAR(200) DEFAULT '',
  id_number VARCHAR(50) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(200) DEFAULT '',
  region VARCHAR(200) DEFAULT '',
  region_code VARCHAR(50) DEFAULT '',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'low_stock')),
  total_sales INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  efficiency INTEGER DEFAULT 0,
  sims_count INTEGER DEFAULT 0,
  sales_30_days INTEGER DEFAULT 0,
  sales_growth INTEGER DEFAULT 0,
  activity_rate INTEGER DEFAULT 0,
  creation_date VARCHAR(20) DEFAULT '',
  last_login VARCHAR(100) DEFAULT '',
  avatar VARCHAR(500) DEFAULT '',
  agent_name VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sims (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(50) NOT NULL DEFAULT '',
  iccid VARCHAR(50) UNIQUE NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'Yemen Mobile',
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'activated', 'sold', 'reserved', 'inactive', 'suspended')),
  owner VARCHAR(200) DEFAULT 'المركز الرئيسي',
  date_added VARCHAR(20) DEFAULT '',
  package_type VARCHAR(100) DEFAULT 'باقة مزايا الشهرية',
  assigned_to INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  contract_image VARCHAR(500) DEFAULT '',
  customer_name VARCHAR(200) DEFAULT '',
  customer_id VARCHAR(50) DEFAULT '',
  owner_role VARCHAR(10) NOT NULL DEFAULT 'admin' CHECK (owner_role IN ('admin', 'agent', 'seller')),
  assigned_to_agent INTEGER REFERENCES agents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  description TEXT DEFAULT '',
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  time VARCHAR(50) DEFAULT '',
  category VARCHAR(100) DEFAULT '',
  is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(200) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'Yemen Mobile',
  sims_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
  relative_time VARCHAR(50) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS operations (
  id SERIAL PRIMARY KEY,
  op_id VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('activate', 'recharge')),
  target VARCHAR(100) DEFAULT '',
  operator VARCHAR(50) DEFAULT '',
  date VARCHAR(20) DEFAULT '',
  time VARCHAR(50) DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  customer_name VARCHAR(200),
  customer_id VARCHAR(50),
  contract_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Upgrade existing operations table if needed
ALTER TABLE operations ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200);
ALTER TABLE operations ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50);
ALTER TABLE operations ADD COLUMN IF NOT EXISTS contract_image VARCHAR(500);
ALTER TABLE operations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Ensure sims and alerts have created_at for tracking
ALTER TABLE sims ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS inventories (
  id SERIAL PRIMARY KEY,
  operator VARCHAR(50) NOT NULL UNIQUE,
  available INTEGER DEFAULT 0,
  remaining INTEGER DEFAULT 0,
  period_days INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  log_id VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT '',
  title VARCHAR(300) DEFAULT '',
  username VARCHAR(200) DEFAULT '',
  time VARCHAR(50) DEFAULT '',
  status VARCHAR(20) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  two_fa_enabled BOOLEAN DEFAULT TRUE,
  email_2fa_enabled BOOLEAN DEFAULT FALSE,
  trusted_devices_enabled BOOLEAN DEFAULT TRUE,
  session_timeout VARCHAR(50) DEFAULT '30 دقيقة',
  password_special_required BOOLEAN DEFAULT TRUE,
  password_expiry_90_days BOOLEAN DEFAULT TRUE,
  password_no_reuse_5 BOOLEAN DEFAULT FALSE,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  language VARCHAR(100) DEFAULT 'العربية (المملكة العربية السعودية)',
  email_alerts_enabled BOOLEAN DEFAULT TRUE,
  sms_alerts_enabled BOOLEAN DEFAULT TRUE,
  app_notifications_enabled BOOLEAN DEFAULT FALSE,
  stock_shortage_threshold INTEGER DEFAULT 5,
  inactive_sims_threshold INTEGER DEFAULT 90,
  max_failed_logins_threshold INTEGER DEFAULT 3,
  high_risk_duplicates_threshold INTEGER DEFAULT 5,
  identity_reminders_enabled BOOLEAN DEFAULT TRUE,
  identity_reminders_frequency VARCHAR(10) DEFAULT 'weekly' CHECK (identity_reminders_frequency IN ('daily', 'weekly'))
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  token_hash VARCHAR(64) PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_user ON token_blacklist(expires_at, user_id);

CREATE TABLE IF NOT EXISTS duplicate_identities (
  id SERIAL PRIMARY KEY,
  id_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  sims_count INTEGER DEFAULT 0,
  duplicates_count INTEGER DEFAULT 0,
  risk VARCHAR(50) DEFAULT '',
  region VARCHAR(200) DEFAULT '',
  avatar_initials VARCHAR(10) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  id_number VARCHAR(50) NOT NULL,
  id_type VARCHAR(50) DEFAULT '',
  id_issue_date VARCHAR(20) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  region VARCHAR(200) DEFAULT '',
  sims_count INTEGER DEFAULT 1,
  first_activation TIMESTAMP DEFAULT NOW(),
  last_activation TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  activated_by INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS distribution_requests (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(100) UNIQUE NOT NULL,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  operator VARCHAR(50) NOT NULL,
  count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  created_at TIMESTAMP DEFAULT NOW(),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  notes TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_customers_id_number ON customers(id_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);
CREATE INDEX IF NOT EXISTS idx_distribution_status ON distribution_requests(status);
CREATE INDEX IF NOT EXISTS idx_distribution_agent ON distribution_requests(agent_id);

-- Remove the static duplicate_identities seed data since we now query dynamically
DELETE FROM duplicate_identities WHERE id > 0;

-- Allow soft-delete status for sellers
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;
ALTER TABLE sellers ADD CONSTRAINT sellers_status_check CHECK (status IN ('active', 'inactive', 'suspended', 'low_stock', 'deleted'));

-- Add FK columns for audit trail (migration 002 compatibility)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sims ADD COLUMN IF NOT EXISTS activated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE distribution_requests ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add UNIQUE constraint on customers.id_number
ALTER TABLE customers ADD CONSTRAINT IF NOT EXISTS customers_id_number_unique UNIQUE (id_number);

-- Add created_at to transactions if missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sellers_agent_id ON sellers(agent_id);
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_agent_name ON sellers(agent_name);
CREATE INDEX IF NOT EXISTS idx_sellers_phone ON sellers(phone);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_sims_iccid ON sims(iccid);
CREATE INDEX IF NOT EXISTS idx_sims_provider ON sims(provider);
CREATE INDEX IF NOT EXISTS idx_sims_status ON sims(status);
CREATE INDEX IF NOT EXISTS idx_sims_assigned_to ON sims(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sims_owner_role ON sims(owner_role);
CREATE INDEX IF NOT EXISTS idx_sims_iccid_status ON sims(iccid, status);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type);
CREATE INDEX IF NOT EXISTS idx_duplicate_identities_region ON duplicate_identities(region);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Identity risk actions (production: flag/block/unblock decisions on identities)
CREATE TABLE IF NOT EXISTS identity_risk_actions (
  id SERIAL PRIMARY KEY,
  id_no VARCHAR(50) NOT NULL,
  name VARCHAR(200) DEFAULT '',
  action VARCHAR(20) NOT NULL CHECK (action IN ('flag', 'block', 'unblock')),
  reason TEXT DEFAULT '',
  performed_by VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_risk_actions_id_no ON identity_risk_actions(id_no);
CREATE INDEX IF NOT EXISTS idx_identity_risk_actions_created ON identity_risk_actions(created_at);

-- Providers (production: telecom operators)
CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schema migrations (production: applied migration filenames)
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- TODO: Migrate app code from provider VARCHAR(50) to provider_id FK (providers table).
-- Production already has provider_id in sims/transactions/inventories/operations/distribution_requests
-- (migration 009_normalize_providers.sql). Code still writes/reads the legacy text column.
-- See docs/provider-id-migration-impact.md for the full impact report.

-- Periodic cleanup function for expired blacklisted tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM token_blacklist WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- SEED DATA

INSERT INTO users (username, password_hash, display_name, role, status) VALUES
  ('manager', 'SEED_REQUIRED_RUN_NPM_RUN_DB_SEED', 'أحمد محمد', 'manager', 'active'),
  ('agent', 'SEED_REQUIRED_RUN_NPM_RUN_DB_SEED', 'الوكيل أحمد محمد', 'agent', 'active'),
  ('seller', 'SEED_REQUIRED_RUN_NPM_RUN_DB_SEED', 'البائع عبدالرحمن العتيبي', 'seller', 'active')
ON CONFLICT (username) DO NOTHING;

INSERT INTO sims (phone, iccid, provider, status, owner, date_added, package_type) VALUES
  ('777123456', '8996701123456789012', 'Yemen Mobile', 'available', 'المركز الرئيسي', '2023/10/25', 'باقة مزايا الشهرية'),
  ('711987654', '8996702233445566778', 'Sabafon', 'sold', 'البائع عبدالرحمن العتيبي', '2023/10/24', 'باقة البيانات 10GB'),
  ('733554433', '8996703344556677889', 'YOU', 'reserved', 'وكالة الأمل', '2023/10/24', 'باقة هلا الفضية'),
  ('770987654', '8996700012345678901', 'Yemen Mobile', 'available', 'البائع عبدالرحمن العتيبي', '2023/10/25', 'باقة مزايا الشهرية'),
  ('775432109', '8996700012345678902', 'Yemen Mobile', 'available', 'البائع عبدالرحمن العتيبي', '2023/10/24', 'باقة البيانات 10GB'),
  ('712345678', '8996700012345678903', 'Sabafon', 'reserved', 'البائع عبدالرحمن العتيبي', '2023/10/24', 'باقة هلا الفضية'),
  ('731111222', '8996700012345678904', 'YOU', 'inactive', 'البائع عبدالرحمن العتيبي', '2023/10/22', 'باقة مزايا الشهرية')
ON CONFLICT (iccid) DO NOTHING;

INSERT INTO agents (user_id, name, region, phone, sellers_count, sims_count, status) VALUES
  ((SELECT id FROM users WHERE username='agent'), 'الوكيل أحمد محمد', 'أمانة العاصمة', '1012398455', 45, 1240, 'active'),
  (NULL, 'خالد ناصر الحميري', 'عدن - كريتر', '2039485761', 12, 340, 'inactive'),
  (NULL, 'صالح علي القحطاني', 'تعز - الحوبان', '4012394844', 28, 890, 'active'),
  (NULL, 'يسر محسن علوي', 'حضرموت - المكلا', '5012384742', 19, 620, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO sellers (seller_id, user_id, agent_id, name, store_name, id_number, phone, region, region_code, status, total_sales, current_stock, efficiency, sims_count, sales_30_days, sales_growth, activity_rate, creation_date, last_login) VALUES
  ('SLR-99021', (SELECT id FROM users WHERE username='seller'), (SELECT id FROM agents WHERE name='الوكيل أحمد محمد'), 'البائع عبدالرحمن العتيبي', 'مؤسسة الاتصالات الحديثة', '1092837465', '775323953', 'صنعاء - الأمانة', 'riyadh', 'active', 1248, 252, 85, 252, 1820, 5, 94, '2023/10/12', 'اليوم، 10:45 ص'),
  ('SLR-88124', NULL, NULL, 'سارة سالم اليافعي', 'مركز الصقر للاتصالات', '1084293041', '711904533', 'عدن - خورمكسر', 'makkah', 'suspended', 1540, 150, 85, 12, 0, 0, 0, '2023/10/24', 'أمس، 09:15 م'),
  ('SLR-11054', NULL, NULL, 'خالد عبدالله تعز', 'مؤسسة اتصالات الفجر', '1073829104', '735912445', 'تعز - الجوبان', 'madinah', 'active', 890, 45, 20, 1204, 3421, 12, 98, '2023/10/24', 'منذ ساعتين')
ON CONFLICT (seller_id) DO NOTHING;

INSERT INTO alerts (title, description, priority, time, category) VALUES
  ('نقص حاد في المخزون - فرع صنعاء', 'وصلت كمية شرائح SIM المتوفرة إلى أقل من 5% من الحد الأدنى المطلوب. يتطلب إجراء فوري.', 'high', 'منذ دقيقتين', 'مخزون'),
  ('محاولة دخول غير مصرح بها', 'تم رصد محاولة دخول فاشلة متكررة من عنوان IP 192.168.1.1 على حساب مدير العمليات.', 'medium', 'منذ 15 دقيقة', 'أمان'),
  ('تم إنشاء التقرير اليومي بنجاح', 'تم إنتاج تقرير مبيعات الشرائح والتحصيلات لليوم المنتهي بتاريخ 2023-10-24.', 'low', 'منذ ساعة', 'نظام');

INSERT INTO transactions (client_name, provider, sims_count, status, relative_time) VALUES
  ('شركة الأمل للتجارة', 'Yemen Mobile', 5000, 'completed', 'منذ 10 د'),
  ('مركز الثقة للاتصالات', 'Sabafon', 1200, 'pending', 'منذ ساعة'),
  ('مؤسسة النجم للخدمات', 'YOU', 2500, 'completed', 'منذ 3 ساعات');

INSERT INTO operations (op_id, type, target, operator, date, time, status) VALUES
  ('op1', 'activate', '0504938210', 'yemen_mobile', '2026/05/31', '١٠:٤٥ ص', 'success'),
  ('op2', 'recharge', '#INV-8821', 'you', '2026/05/31', '٠٩:١٢ ص', 'success'),
  ('op3', 'activate', '0504938255', 'sabafon', '2026/05/31', '٠٨:٥٠ ص', 'failed')
ON CONFLICT (op_id) DO NOTHING;

INSERT INTO inventories (operator, available, remaining, period_days) VALUES
  ('yemen_mobile', 542, 48, 12),
  ('you', 412, 62, 18),
  ('sabafon', 330, 20, 5)
ON CONFLICT (operator) DO NOTHING;

INSERT INTO duplicate_identities (id_no, name, sims_count, duplicates_count, risk, region, avatar_initials) VALUES
  ('1023485932', 'صالح محمد العامري', 14, 5, 'مرتفع جداً', 'أمانة العاصمة', 'ص م'),
  ('2094837501', 'نبيل حسن الوداعي', 8, 3, 'متوسط', 'محافظة عدن', 'ن ح'),
  ('1088429103', 'فاطمة قاسم القدسي', 22, 8, 'مرتفع جداً', 'تعز - المدينة', 'ف ق'),
  ('3014772154', 'عمر سالم باسودان', 5, 2, 'متوسط', 'حضرموت - المكلا', 'ع س')
ON CONFLICT (id_no) DO NOTHING;

INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (log_id, type, title, username, time, status) VALUES
  ('A1', 'security_alert', 'حظر الهوية رقم 1023485932', 'صالح القحطاني', 'منذ 15 دقيقة', 'blocked'),
  ('A2', 'ai_analysis', 'بدء تحليل علاقة للعميل "عمر باسودان"', 'نظام التحليل التلقائي (AI)', 'منذ 45 دقيقة', 'analyzing'),
  ('A3', 'normal_audit', 'تأكيد صحة بيانات الهوية رقم 3044123984', 'مريم الصبري', 'منذ ساعتين', 'verified')
ON CONFLICT (log_id) DO NOTHING;
