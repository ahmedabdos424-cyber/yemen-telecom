# Project Discovery — Yemen Telecom

> **Document generated from source code analysis.**
> Date: 2026-06-27
> NOT a requirements doc. Does NOT describe intended behavior. Only what is implemented.

---

## 1. Project Overview

| Attribute | Value |
|-----------|-------|
| **Name** | yemen-telecom |
| **Version** | 1.0.0 |
| **Type** | SPA + REST API + PostgreSQL |
| **Frontend package** | `yemen-telecom` (private) |
| **Backend package** | `yemen-telecom-server` |
| **Primary use case** | SIM inventory management, seller distribution, customer identity management for a Yemeni telecom operator |
| **Language** | TypeScript (frontend 5.8, backend 5.6) |
| **Target platform** | Web (PWA) + Android (Capacitor) |

### Architecture Style
- **Frontend**: React 19 SPA, built with Vite 6.4, served by Express in production
- **Backend**: Express 4.21 REST API on port 4000
- **Database**: PostgreSQL 14+ via pg Pool (Supabase)
- **Mobile**: Capacitor 8.4 wrapping the web dist as a native Android app
- **Authentication**: Stateless JWT (HS256) with refresh token rotation
- **File Storage**: Firebase Storage for contract images
- **Backup**: S3-compatible storage for database JSON dumps

---

## 2. Frontend Discovery

### 2.1 Route / View System

All views are lazy-loaded with `React.lazy()` and rendered via `Suspense` with an `ErrorBoundary`. Routing is role-gated in `App.tsx`. No client-side router library is used — state-based view switching via `ViewType` enum.

**Manager (`role === 'manager'`)** — managed by `useManagerState`:
| View | `ViewType` | Component | Description |
|------|-----------|-----------|-------------|
| Dashboard | `dashboard` | `DashboardView` | Stats, alerts, transactions, SIM overview |
| SIMs | `sims` | `SIMsView` | Full SIM inventory with CRUD |
| Agents | `agents` | `AgentsView` | Agent list and management |
| Sellers | `sellers` | `SellersView` | Seller list with balance, updates |
| Alerts | `alerts` | `AlertsView` | System alerts with resolve |
| Geographic Risk | `duplicate-identities` | `GeographicRiskView` | Duplicate identity monitoring |
| Reports | `reports` | `ReportsView` | Sales/agent/operator reports |
| Settings | `settings` | `SettingsView` | System settings management |
| Add Agent | `add-agent` | `AddAgentView` | Agent creation form |

**Agent (`role === 'agent'`)** — managed by `useAgentSellerState`:
| View | `activeTab` | Component | Description |
|------|------------|-----------|-------------|
| Home/Sellers/My SIMs | `home`/`sellers`/`my_sims` | `AgentDashboard` | Combined dashboard with tabs |
| Activate SIM | `activate` | `ActivateSimForm` | SIM activation with form |
| Add Seller | `add_seller` | `AddSellerForm` | Seller creation form |
| Account | `account` | `AgentProfileView` | Profile, inventory, logout |

**Seller (`role === 'seller'`)** — managed by `useAgentSellerState`:
| View | `activeTab` | Component | Description |
|------|------------|-----------|-------------|
| Home | `home` | `SellerDashboard` | Available SIMs, operations |
| Activate | `activate` | `ActivateSimForm` | SIM activation |
| My SIMs | `my_sims` | `SellerDashboard` | All assigned SIMs |
| Account | `account` | `SellerDashboard` | Profile, password change |

### 2.2 Hooks

| Hook | File | Responsibilities |
|------|------|-----------------|
| `useAuth` | `src/hooks/useAuth.ts` | Auth state management: token load from Capacitor Prefs/localStorage, `GET /me` validation, auto-logout on failure, CSRF token fetch, session persistence via `localStorage` keys (`tele_role`, `tele_username`, `tele_dark`), login with JWT receive/refresh token rotation, dark mode toggle |
| `useOcr` | `src/hooks/useOcr.ts` | Tesseract.js OCR with 30s timeout, 2 retries, Otsu binarization preprocessing, Arabic traineddata (`ara`), singleton worker pattern, blur detection (< 3 → `BLURRY`), low-light detection (< 40 → `DARK`), confidence threshold (60 for cleaning, 40 for retry), progress callback with stages, max image dimension 1200px |
| `useManagerState` | `src/hooks/useManagerState.ts` | Manager data state: fetches SIMs/agents/sellers/alerts/settings/transactions/stats in parallel via `refreshData`, localStorage persistence for all collections, duplicate identity toast detection via threshold, CRUD handlers for all entities |
| `useAgentSellerState` | `src/hooks/useAgentSellerState.ts` | Agent/seller data state: sellers/SIMs/operations/inventories with localStorage persistence, tab management, seller CRUD, SIM activation workflow, transfer SIMs, password reset, seller credentials modal state |
| `useNetworkStatus` | `src/hooks/useNetworkStatus.ts` | Online/offline detection banner |
| `useMountedRef` | `src/hooks/useMountedRef.ts` | Mounted ref for async safety |
| `useDebounce` | `src/hooks/useDebounce.ts` | Debounce utility |
| `useToast` | `src/hooks/useToast.tsx` | Toast notification state |

### 2.3 Utilities

| File | Purpose |
|------|---------|
| `src/api/client.ts` | HTTP client: AbortController 15s timeout, JWT Bearer auth, CSRF double-submit (X-CSRF-Token + X-CSRF-Hash), JWT refresh rotation with request queuing (`pendingRequests`), CSRF auto-retry on 403, token storage abstraction via `tokenStorage.ts`, API base URL auto-detection (Capacitor native vs dev vs production). Exports `api` object with methods for all 13 route groups. |
| `src/services/tokenStorage.ts` | Token storage adapter: Capacitor Preferences (encrypted) on native Android, localStorage fallback on web. Async interface with sync getters for backward compatibility. Keys: `auth_token`, `refresh_token`. |
| `src/lib/monitor.ts` | In-memory ring buffer (max 200 entries), redacts JWT/password/token patterns, SLOW threshold 1000ms, captures errors/events/timings, global `unhandledrejection` + `error` event listeners. |
| `src/lib/safe.ts` | Safe utility helpers |
| `src/lib/getErrorMessage.ts` | Error message extraction |
| `src/types.ts` | Type definitions: `Role`, `SimStatus`, `SimProvider` (Yemen Mobile/Sabafon/YOU), `Operator`, `ISim`, `Agent`, `Seller`, `SystemAlert`, `Transaction`, `AuditLog`, `SystemSettings` (18 fields), `ViewType`, `Operation`, `OperatorInventory`. Helper functions: `setSimOperator`, `simProvider`, `toOperator`. |
| `src/data.ts` | Static/mock data definitions |

### 2.4 PWA Setup

- Service worker registration in `main.tsx` at `/sw.js`
- `public/manifest.json` for PWA manifest
- No workbox or service worker source file visible — registered but not confirmed implemented

### 2.5 Build Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | 6.4.3 | Bundler, dev server with HMR |
| @vitejs/plugin-react | ^5.0.4 | React Fast Refresh |
| @tailwindcss/vite | 4.3.1 | Tailwind CSS JIT |
| Tailwind CSS | 4.3.1 | Utility CSS framework |
| TypeScript | ~5.8.2 | Type checking (frontend) |
| Vitest | 4.1.9 | Unit/integration test runner |
| jsdom | ^29.1.1 | DOM environment for tests |
| @vitest/coverage-v8 | 4.1.9 | Coverage reporting |
| esbuild | ^0.25.0 | Bundler used by Vitest |

Build splits (`manualChunks`): `vendor-motion`, `vendor-lucide`, `vendor-d3`, `vendor-tesseract`.

### 2.6 Key Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.7 | UI framework |
| react-dom | 19.2.7 | DOM renderer |
| motion | 12.42.0 | Animation library |
| lucide-react | ^0.546.0 | Icon library |
| d3 | ^7.9.0 | Data visualization (reports) |
| tesseract.js | ^7.0.0 | Client-side OCR |
| html5-qrcode | ^2.3.8 | QR/barcode scanning |
| sharp | ^0.34.5 | Image processing |
| uuid | 14.0.1 | UUID generation |
| @capacitor/core | 8.4.1 | Native runtime |
| @capacitor-firebase/authentication | 8.3.0 | Firebase Auth (native) |
| @capacitor-firebase/storage | 8.3.0 | Firebase Storage (native) |
| firebase-admin | ^13.10.0 | Admin SDK (bundled with frontend) |

---

## 3. Backend Discovery

### 3.1 Route Groups — Full Endpoint List

All routes mounted under `/api/` prefix. Parsed from `server/src/index.ts` route registrations and each route file.

**Auth** (`/api/auth`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/auth/login` | Public + rate limit 10/15min | Login with username/password, returns JWT + refresh token |
| POST | `/api/auth/refresh` | Public + rate limit 20/15min | Refresh token rotation, blacklists old refresh |
| POST | `/api/auth/logout` | Authenticated | Blacklists access + refresh tokens |
| GET | `/api/auth/me` | Authenticated | Returns current user profile |

**Users** (`/api/users`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| PUT | `/api/users/password` | Authenticated | Change password with current password verification |
| PUT | `/api/users/profile` | Authenticated | Update display name, phone, region |
| DELETE | `/api/users/account` | Authenticated | Soft-deletes user (status=deleted, username suffixed) |

**Agents** (`/api/agents`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/agents` | Manager, Agent | List agents (paginated), sorted by id |
| POST | `/api/agents` | Manager | Create agent + user account in transaction |
| PUT | `/api/agents/:id` | Manager | Update agent fields |

**Sellers** (`/api/sellers`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/sellers` | All (role-scoped) | List sellers: manager sees all, agent sees own, seller sees self |
| POST | `/api/sellers` | Manager, Agent | Create seller + user account in transaction |
| PUT | `/api/sellers/:id` | Manager, Agent | Update seller (agent-scoped access check) |
| PUT | `/api/sellers/:id/balance` | Manager, Agent | Add to sales_30_days balance |
| POST | `/api/sellers/:id/reset-password` | Manager, Agent | Generate new random password |
| DELETE | `/api/sellers/:id` | Manager, Agent | Soft-delete (status=deleted), unassign SIMs |

**SIMs** (`/api/sims`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/sims` | Manager, Agent | List SIMs (paginated), sorted by id DESC |
| POST | `/api/sims` | Manager | Create SIM |
| PUT | `/api/sims/:id` | Manager | Update SIM fields |
| DELETE | `/api/sims/:id` | Manager | Delete SIM |

**Customers** (`/api/customers`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/customers` | Manager, Agent | List customers (agent-scoped) |
| GET | `/api/customers/search` | Manager, Agent | Search by name/ID/phone (min 2 chars) |
| GET | `/api/customers/:id` | Manager, Agent, Seller | Single customer with operations |
| POST | `/api/customers` | Manager, Agent, Seller | Create customer (dedup by id_number — increments sims_count) |

**Operations** (`/api/operations`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/operations` | Manager, Agent | List operations (agent-scoped) |
| POST | `/api/operations` | Manager, Agent | Create operation (activate/recharge) |

**Alerts** (`/api/alerts`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/alerts` | Manager | List alerts (paginated) |
| DELETE | `/api/alerts/:id` | Manager | Resolve/delete alert |

**Inventories** (`/api/inventories`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/inventories` | Manager, Agent | List operator inventories |
| PUT | `/api/inventories` | Manager | Batch update inventories |

**Upload** (`/api/upload`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/upload/image` | Manager, Agent | Upload single image (5MB, magic bytes validation, Firebase Storage) |
| POST | `/api/upload/images` | Manager, Agent | Upload up to 5 images (batch) |

**Reports** (`/api/reports`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/reports/daily-sales` | Manager | Daily activations for last 30 days |
| GET | `/api/reports/agent-performance` | Manager | Agent performance aggregated |
| GET | `/api/reports/operator-distribution` | Manager | SIM + operation distribution by provider |
| GET | `/api/reports/seller-performance` | Manager, Agent | Top 100 sellers by sales (agent-scoped) |

**Distributions** (`/api/distributions`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/distributions` | Manager, Agent | List distribution requests (agent-scoped) |
| POST | `/api/distributions` | Agent | Create distribution request |
| PUT | `/api/distributions/:id/approve` | Manager | Approve/reject (transactional, updates inventory) |
| GET | `/api/distributions/pending-count` | Manager | Count pending requests |

**Admin** (`/api/admin`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/admin/settings` | Manager | Get system settings (18 fields) |
| PUT | `/api/admin/settings` | Manager | Update system settings |
| GET | `/api/admin/transactions` | Manager | List transactions (paginated) |
| GET | `/api/admin/duplicate-identities` | Manager | Dynamic duplicate detection via window function |
| GET | `/api/admin/audit-logs` | Manager | List audit logs (paginated) |
| POST | `/api/admin/system/backup` | Manager | Full DB backup (13 tables) to S3 |
| GET | `/api/admin/system/backup/download/:filename` | Manager | Download backup via presigned URL |
| POST | `/api/admin/system/lockdown` | Manager | Toggle emergency lockdown |
| GET | `/api/admin/system/lockdown/status` | Manager | Check lockdown status |

**Stats** (`/api/stats`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/stats` | Manager | Dashboard stats (9 metrics, 5 min cache) |

**Health** (`/api/health`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/health` | Public | DB connectivity check, returns `ok` or `degraded` |

**CSRF Token** (`/api/csrf-token`):
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/csrf-token` | Public | Returns random token + HMAC-SHA256 hash |

### 3.2 Middleware Stack (order defined in `index.ts`)

| Order | Middleware | Role |
|-------|-----------|------|
| 1 | `compression()` | Gzip response compression |
| 2 | `express.json({ limit: '1mb' })` | JSON body parser with 1MB limit |
| 3 | `cors()` | CORS: multi-origin (comma-separated env var), Capacitor origins (`https://localhost`, `capacitor://localhost`), credentials: true |
| 4 | `helmet()` | Security headers: CSP (`default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `connect-src 'self'`, `img-src 'self' data: blob:`, `frame-src 'none'`, `object-src 'none'`), `crossOriginResourcePolicy: cross-origin` |
| 5 | `express.static('dist')` | Serves built frontend assets |
| 6 | `GET /api/csrf-token` | Public CSRF token endpoint (before CSRF middleware) |
| 7 | CSRF validation middleware | HMAC-SHA256 double-submit for POST/PUT/DELETE (excludes auth, csrf-token) |
| 8 | Rate limit: auth login | 10 requests per 15 minutes |
| 9 | Rate limit: auth refresh | 20 requests per 15 minutes |
| 10 | Rate limit: general API | 100 requests per minute (all `/api`) |
| 11 | Rate limit: write endpoints | 30 POST/PUT/DELETE per minute (excludes `/auth/`) |
| 12 | `authenticateToken` | JWT verify for all `/api` except `/api/auth` and `/api/health` |
| 13 | Maintenance mode check | Blocks mutation requests when `maintenance_mode = true` |
| 14 | Route mounts (13 groups) | All API routes |
| 15 | Stats endpoint (`/api/stats`) | Manager-only dashboard stats with 5 min cache |
| 16 | Debug routes (`/api/routes`) | Route listing (dev only) |
| 17 | 404 handler | `/api/*` catch-all |
| 18 | Global error handler | 500 fallback |

Additional middleware applied inside route files:
- `requireRole(roles...)` — RBAC guard on specific endpoints
- `validate(schema)` — Zod schema validation on request body

### 3.3 Validation System (Zod)

File: `server/src/validation.ts` — 17 Zod schemas.

| Schema | Purpose | Key Constraints |
|--------|---------|-----------------|
| `loginSchema` | Auth login | username: stripped 1-100, password: min 8, max 200 |
| `refreshTokenSchema` | Token refresh | refreshToken: required string |
| `updatePasswordSchema` | Password change | currentPassword: required; newPassword: min 8, uppercase+lowercase+digit regex |
| `updateProfileSchema` | Profile update | displayName/phone/region/avatar all optional |
| `createSimSchema` | SIM creation | iccid: required max 50; phone optional; provider enum; status enum; owner/package_type default |
| `updateSimSchema` | SIM update | All fields optional |
| `createAgentSchema` | Agent creation | name: required 1-200; username/password optional with strength rules |
| `updateAgentSchema` | Agent update | All optional with stripping |
| `createSellerSchema` | Seller creation | name required; store_name/id_number/phone optional; username/password optional with strength |
| `updateSellerSchema` | Seller update | All optional |
| `updateSellerBalanceSchema` | Balance add | amount: numeric |
| `createOperationSchema` | Operation create | type: activate/recharge; target required; operator normalized; status default success |
| `updateInventoriesSchema` | Inventory batch | Array of {operator (normalized), available, remaining} |
| `updateSettingsSchema` | Settings update | All 18 fields optional |
| `createCustomerSchema` | Customer create | full_name required; id_number required; phone/region optional |
| `createDistributionSchema` | Distribution create | seller_id/seller_name optional; operator normalized; count 1-10000 |
| `approveDistributionSchema` | Distribution approve | status: approved/rejected; notes optional |

Helper functions: `stripHtml()` (XSS prevention via regex), `normalizeOperator()`, `isValidOperator()`.

### 3.4 Database Connection

File: `server/src/db.ts` — pg Pool configuration:

| Parameter | Value | Source |
|-----------|-------|--------|
| Pool | `new Pool(poolConfig)` | pg |
| SSL | `false` if localhost, else configurable | Auto-detected |
| `rejectUnauthorized` | `false` if `DB_SSL_REJECT_UNAUTHORIZED !== 'false'` | Env var |
| CA cert | Optional, `\\n` → `\n` replacement | `DB_SSL_CA_CERT` |
| Max connections | 10 (configurable) | `DB_MAX_CONNECTIONS` |
| `connectionTimeoutMillis` | 15000 | Hardcoded |
| `family` | 4 (configurable) | `DB_FAMILY` |
| Slow query threshold | 500ms (configurable) | `DB_SLOW_QUERY_MS` |

Helper: `transaction(fn)` — wraps async function in BEGIN/COMMIT/ROLLBACK.

### 3.5 Helper Utilities

File: `server/src/helpers.ts`:

| Function | Purpose |
|----------|---------|
| `getPagination(req)` | Extracts page/limit/offset from query (page min 1, limit max 200 default 50) |
| `paginatedQuery<T>(baseQuery, countQuery, params, page, limit, offset)` | Generic paginated query with total count |

### 3.6 Server Index Entry Points

| File | Purpose |
|------|---------|
| `server/src/index.ts` | Main server entry — Express app setup, all middleware, all routes |
| `server/src/init-db.ts` | Database initialization — runs schema.sql + migrations |
| `server/src/seed.ts` | Database seeding — schema + bcrypt password hashing with env-var overrides |

Server lifecycle: hourly expired token cleanup (`setInterval` 1h), graceful shutdown on SIGTERM/SIGINT (10s forced exit).

---

## 4. Database Discovery

### 4.1 All 14 Tables

**`users`** — Core user accounts:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| username | VARCHAR(100) | UNIQUE NOT NULL | |
| password_hash | VARCHAR(255) | NOT NULL | |
| display_name | VARCHAR(200) | NOT NULL | '' |
| role | VARCHAR(20) | NOT NULL, CHECK (manager/agent/seller) | |
| status | VARCHAR(20) | | 'active' |
| phone | VARCHAR(50) | | '' |
| email | VARCHAR(200) | | '' |
| region | VARCHAR(200) | | '' |
| created_at | TIMESTAMP | | NOW() |
| last_login | TIMESTAMP | | |

Indexes: role, username, status, phone, (role, username).

**`agents`** — Agent profiles:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| user_id | INTEGER | UNIQUE, REFERENCES users(id) ON DELETE CASCADE | |
| name | VARCHAR(200) | NOT NULL | |
| region | VARCHAR(200) | | '' |
| phone | VARCHAR(50) | | '' |
| email | VARCHAR(200) | | '' |
| sellers_count | INTEGER | | 0 |
| sims_count | INTEGER | | 0 |
| status | VARCHAR(20) | CHECK (active/inactive) | 'active' |
| created_at | TIMESTAMP | | NOW() |

Indexes: user_id, name, status, region, phone (unique where non-empty).

**`sellers`** — Seller profiles:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| seller_id | VARCHAR(50) | UNIQUE NOT NULL | |
| user_id | INTEGER | UNIQUE, REFERENCES users(id) ON DELETE CASCADE | |
| agent_id | INTEGER | REFERENCES agents(id) ON DELETE SET NULL | |
| name | VARCHAR(200) | NOT NULL | |
| store_name | VARCHAR(200) | | '' |
| id_number | VARCHAR(50) | | '' |
| phone | VARCHAR(50) | | '' |
| email | VARCHAR(200) | | '' |
| region | VARCHAR(200) | | '' |
| region_code | VARCHAR(50) | | '' |
| status | VARCHAR(20) | CHECK (active/inactive/suspended/low_stock/deleted) | 'active' |
| total_sales | INTEGER | | 0 |
| current_stock | INTEGER | | 0 |
| efficiency | INTEGER | | 0 |
| sims_count | INTEGER | | 0 |
| sales_30_days | INTEGER | | 0 |
| sales_growth | INTEGER | | 0 |
| activity_rate | INTEGER | | 0 |
| creation_date | VARCHAR(20) | | '' |
| last_login | VARCHAR(100) | | '' |
| avatar | VARCHAR(500) | | '' |
| agent_name | VARCHAR(200) | | '' |
| created_by | INTEGER | REFERENCES users(id) ON DELETE SET NULL | |
| created_at | TIMESTAMP | | NOW() |

Indexes: agent_id, user_id, agent_name, phone, status, region, region_code, id_number, created_at.

**`sims`** — SIM inventory:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| phone | VARCHAR(50) | NOT NULL | '' |
| iccid | VARCHAR(50) | UNIQUE NOT NULL | |
| provider | VARCHAR(50) | NOT NULL | 'Yemen Mobile' |
| status | VARCHAR(20) | NOT NULL, CHECK (available/sold/reserved/inactive/suspended) | 'available' |
| owner | VARCHAR(200) | | 'المركز الرئيسي' |
| date_added | VARCHAR(20) | | '' |
| package_type | VARCHAR(100) | | 'باقة مزايا الشهرية' |
| assigned_to | INTEGER | REFERENCES sellers(id) ON DELETE SET NULL | |
| contract_image | VARCHAR(500) | | '' |
| customer_name | VARCHAR(200) | | '' |
| customer_id | VARCHAR(50) | | '' |
| activated_by | INTEGER | REFERENCES users(id) ON DELETE SET NULL | |
| created_at | TIMESTAMP | | NOW() |

Indexes: iccid, provider, status, assigned_to, phone, owner, customer_name, customer_id, created_at, (provider, status).

**`customers`** — Customer identity records:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| full_name | VARCHAR(200) | NOT NULL | |
| id_number | VARCHAR(50) | NOT NULL, UNIQUE | |
| phone | VARCHAR(50) | | '' |
| region | VARCHAR(200) | | '' |
| sims_count | INTEGER | | 1 |
| first_activation | TIMESTAMP | | NOW() |
| last_activation | TIMESTAMP | | NOW() |
| created_at | TIMESTAMP | | NOW() |
| activated_by | INTEGER | REFERENCES sellers(id) ON DELETE SET NULL | |
| created_by | INTEGER | REFERENCES users(id) ON DELETE SET NULL | |

Indexes: id_number, phone, full_name.

**`operations`** — SIM activation/recharge records:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| op_id | VARCHAR(100) | UNIQUE NOT NULL | |
| type | VARCHAR(20) | NOT NULL, CHECK (activate/recharge) | |
| target | VARCHAR(100) | | '' |
| operator | VARCHAR(50) | | '' |
| date | VARCHAR(20) | | '' |
| time | VARCHAR(50) | | '' |
| status | VARCHAR(20) | NOT NULL, CHECK (success/failed/pending) | 'success' |
| customer_name | VARCHAR(200) | | |
| customer_id | VARCHAR(50) | | |
| contract_image | VARCHAR(500) | | |
| created_by | INTEGER | REFERENCES users(id) ON DELETE SET NULL | |
| created_at | TIMESTAMP | | NOW() |

Indexes: type, status, target, operator, customer_name, customer_id, created_at, (type, status).

**`alerts`** — System alerts:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| title | VARCHAR(300) | NOT NULL | |
| description | TEXT | | '' |
| priority | VARCHAR(10) | NOT NULL, CHECK (high/medium/low) | |
| time | VARCHAR(50) | | '' |
| category | VARCHAR(100) | | '' |
| is_read | BOOLEAN | | FALSE |
| created_by | INTEGER | REFERENCES users(id) ON DELETE SET NULL | |
| created_at | TIMESTAMP | | NOW() |

Indexes: is_read, priority, category, time, (is_read, priority, time).

**`transactions`** — Client transactions (wholesale):
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| client_name | VARCHAR(200) | NOT NULL | |
| provider | VARCHAR(50) | NOT NULL | 'Yemen Mobile' |
| sims_count | INTEGER | | 0 |
| status | VARCHAR(20) | NOT NULL, CHECK (completed/pending) | 'completed' |
| relative_time | VARCHAR(50) | | '' |
| created_at | TIMESTAMP | | NOW() |

Indexes: status, provider, client_name.

**`inventories`** — Operator stock levels:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| operator | VARCHAR(50) | UNIQUE NOT NULL | |
| available | INTEGER | | 0 |
| remaining | INTEGER | | 0 |
| period_days | INTEGER | | 0 |

Index: available.

**`audit_logs`** — Security and activity logs:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| log_id | VARCHAR(100) | UNIQUE NOT NULL | |
| type | VARCHAR(50) | | '' |
| title | VARCHAR(300) | | '' |
| username | VARCHAR(200) | | '' |
| time | VARCHAR(50) | | '' |
| status | VARCHAR(20) | | '' |

Indexes: type, status, username, time.

**`system_settings`** — Single-row configuration:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | INTEGER | PRIMARY KEY DEFAULT 1 | 1 |
| two_fa_enabled | BOOLEAN | | TRUE |
| email_2fa_enabled | BOOLEAN | | FALSE |
| trusted_devices_enabled | BOOLEAN | | TRUE |
| session_timeout | VARCHAR(50) | | '30 دقيقة' |
| password_special_required | BOOLEAN | | TRUE |
| password_expiry_90_days | BOOLEAN | | TRUE |
| password_no_reuse_5 | BOOLEAN | | FALSE |
| maintenance_mode | BOOLEAN | | FALSE |
| language | VARCHAR(100) | | 'العربية (المملكة العربية السعودية)' |
| email_alerts_enabled | BOOLEAN | | TRUE |
| sms_alerts_enabled | BOOLEAN | | TRUE |
| app_notifications_enabled | BOOLEAN | | FALSE |
| stock_shortage_threshold | INTEGER | | 5 |
| inactive_sims_threshold | INTEGER | | 90 |
| max_failed_logins_threshold | INTEGER | | 3 |
| high_risk_duplicates_threshold | INTEGER | | 5 |
| identity_reminders_enabled | BOOLEAN | | TRUE |
| identity_reminders_frequency | VARCHAR(10) | CHECK (daily/weekly) | 'weekly' |

**`token_blacklist`** — Revoked JWT tokens:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| token_hash | VARCHAR(64) | PRIMARY KEY | |
| expires_at | TIMESTAMP | NOT NULL | |
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | |

Indexes: user_id, expires_at, (expires_at, user_id).

**`duplicate_identities`** — Static duplicate records (now populated dynamically via window function):
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| id_no | VARCHAR(50) | UNIQUE NOT NULL | |
| name | VARCHAR(200) | NOT NULL | |
| sims_count | INTEGER | | 0 |
| duplicates_count | INTEGER | | 0 |
| risk | VARCHAR(50) | | '' |
| region | VARCHAR(200) | | '' |
| avatar_initials | VARCHAR(10) | | '' |

Indexes: region, risk, name.

**`distribution_requests`** — SIM distribution requests:
| Column | Type | Constraints | Default |
|--------|------|------------|---------|
| id | SERIAL | PRIMARY KEY | |
| request_id | VARCHAR(100) | UNIQUE NOT NULL | |
| agent_id | INTEGER | REFERENCES agents(id) ON DELETE SET NULL | |
| seller_id | INTEGER | REFERENCES sellers(id) ON DELETE CASCADE | |
| operator | VARCHAR(50) | NOT NULL | |
| count | INTEGER | NOT NULL | |
| status | VARCHAR(20) | CHECK (pending/approved/rejected/fulfilled) | 'pending' |
| created_at | TIMESTAMP | | NOW() |
| approved_by | INTEGER | REFERENCES users(id) ON DELETE SET NULL | |
| approved_at | TIMESTAMP | | |
| notes | TEXT | | '' |
| created_by | INTEGER | REFERENCES users(id) ON DELETE SET NULL | |

Indexes: status, agent_id, seller_id, created_at.

### 4.2 Migrations (5 total)

| File | Purpose | Statements |
|------|---------|------------|
| `001_performance_indexes.sql` | 22 indexes + 3 composite indexes | Performance indexes on users, sellers, sims, operations, alerts, agents, audit_logs, distribution_requests, duplicate_identities, transactions, inventories. Composite: (provider,status), (type,status), (is_read,priority,time). |
| `002_foreign_key_cascades.sql` | 9 FK cascade rules | Recreates FKs: sellers/created_by SET NULL, sims/assigned_to SET NULL, sims/activated_by SET NULL, operations/created_by SET NULL, alerts/created_by SET NULL, distribution_requests/seller_id CASCADE, distribution_requests/approved_by SET NULL, distribution_requests/created_by SET NULL. |
| `003_token_blacklist_user_id.sql` | Add user_id FK to token_blacklist | Adds `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`, creates indexes, cleans up orphaned records. |
| `004_agent_phone_unique.sql` | UNIQUE on agents(phone) | Deduplicates agents by phone (keeps oldest), adds partial unique index `WHERE phone != '' AND phone IS NOT NULL`. |
| `005_schema_migrations_tracking.sql` | Migration tracking table | Creates `schema_migrations` table, inserts records for 001-004. |

### 4.3 Seed Data

File: `server/src/schema.sql` (lines 260-324):

**Users (placeholder hashes, replaced by `seed.ts`)**:
- `manager` / display: 'أحمد محمد' / role: manager
- `agent` / display: 'الوكيل أحمد محمد' / role: agent
- `seller` / display: 'البائع عبدالرحمن العتيبي' / role: seller

**SIMs**: 7 records across 3 providers (Yemen Mobile 4, Sabafon 2, YOU 2), mixed statuses.

**Agents**: 4 records (1 linked to `agent` user, 3 standalone).

**Sellers**: 3 records (1 linked to `seller` user + agent_id, 2 standalone).

**Alerts**: 3 records (stock shortage, unauthorized access, report generated).

**Transactions**: 3 wholesale records.

**Operations**: 3 records (activate/recharge, mixed statuses).

**Inventories**: 3 operator records (yemen_mobile, you, sabafon).

**Duplicate identities**: 4 static records (before dynamic window-function approach).

**System settings**: 1 row (id=1 with defaults).

**Audit logs**: 3 records (security_alert, ai_analysis, normal_audit).

---

## 5. Authentication & Authorization Discovery

### 5.1 JWT Token Flow

**Token structure** (`middleware/auth.ts`):
- Algorithm: HS256
- Issuer: `yemen-telecom`
- Access token: 1 hour expiry (`JWT_SECRET`)
- Refresh token: 7 days expiry (`REFRESH_SECRET`)
- Payload: `{ id: number, username: string, role: string, iat, exp, iss }`

**Login flow** (`POST /api/auth/login`):
1. Validate body with `loginSchema` (Zod)
2. Query `SELECT * FROM users WHERE username = $1`
3. `bcrypt.compare(password, user.password_hash)` — 10 rounds
4. Check `user.status === 'active'`
5. Update `last_login = NOW()`
6. Sign access + refresh tokens
7. Return `{ token, refreshToken, user: { id, username, displayName, role, phone, region } }`

**Token verification** (`authenticateToken` middleware):
1. Extract `Bearer` token from Authorization header
2. `jwt.verify(token, JWT_SECRET, { issuer: 'yemen-telecom', algorithms: ['HS256'] })`
3. Check `isTokenBlacklisted(token)` — queries `token_blacklist` by SHA256 hash
4. Check `users.status = 'active'`
5. Attach `req.user = { id, username, role }`

**Refresh flow** (`POST /api/auth/refresh`):
1. Validate body with `refreshTokenSchema`
2. Check old refresh not blacklisted
3. Verify with `REFRESH_SECRET`
4. Blacklist old refresh token
5. Check user is still active
6. Sign new access + refresh tokens

**Logout flow** (`POST /api/auth/logout`):
1. Blacklist access token
2. Blacklist refresh token (from `X-Refresh-Token` header)

**Token blacklist**:
- Table: `token_blacklist` (token_hash VARCHAR(64) PRIMARY KEY, expires_at, user_id)
- Hash: `crypto.createHash('sha256').update(token).digest('hex')`
- Cleanup: hourly `DELETE FROM token_blacklist WHERE expires_at < NOW()`
- Function: `cleanup_expired_tokens()` PL/pgSQL

**Client-side token management** (`src/api/client.ts`):
- `loadTokens()` — async init from `tokenStorage` (Capacitor Prefs or localStorage)
- `setToken()` / `setRefreshToken()` — update memory + storage
- `clearTokens()` — purge both
- `refreshAccessToken()` — automatic on 401, with request queuing (`pendingRequests`)
- CSRF auto-retry on 403

### 5.2 RBAC Roles and Permissions

Three roles: `manager`, `agent`, `seller`.

| Route Group | Manager | Agent | Seller |
|-------------|---------|-------|--------|
| `/api/auth/*` | ✓ | ✓ | ✓ |
| `/api/users/password` | ✓ | ✓ | ✓ |
| `/api/users/profile` | ✓ | ✓ | ✓ |
| `/api/users/account` | ✓ | ✓ | ✓ |
| `/api/sims` | ✓ | ✓ | ✗ |
| `/api/agents` | ✓ | △ (GET only) | ✗ |
| `/api/sellers` | ✓ (all) | ✓ (own scope) | ✓ (self only) |
| `/api/customers` | ✓ | ✓ (own scope) | ✓ |
| `/api/operations` | ✓ | ✓ (own scope) | ✗ |
| `/api/inventories` | ✓ | ✓ | ✗ |
| `/api/alerts` | ✓ | ✗ | ✗ |
| `/api/admin/*` | ✓ | ✗ | ✗ |
| `/api/reports` | ✓ (all 4) | △ (seller-performance) | ✗ |
| `/api/distributions` | ✓ | ✓ (own scope) | ✗ |
| `/api/upload` | ✓ | ✓ | ✗ |
| `/api/stats` | ✓ | ✗ | ✗ |

Agent-scoped queries filter by `created_by = req.user.id` or via agent profile lookup.
Seller-scoped queries filter by `user_id = req.user.id`.

`requireRole(...roles)` is used with explicit role lists. The middleware returns 403 with "Insufficient permissions" if role not in the list.

### 5.3 CSRF Protection

**Pattern**: Double-submit cookie (stateless, no server-side session).

**Flow**:
1. Client fetches `GET /api/csrf-token` → receives `{ token, hash }` where `hash = HMAC-SHA256(CSRF_SECRET, token)`
2. Client stores both in memory
3. On each state-changing request (POST/PUT/DELETE), client sends:
   - `X-CSRF-Token: <token>`
   - `X-CSRF-Hash: <hash>`
4. Server recomputes `HMAC-SHA256(CSRF_SECRET, received_token)` and compares with `received_hash` using `crypto.timingSafeEqual`

**Skipped for**: GET/HEAD/OPTIONS, `/auth/login`, `/auth/refresh`, `/csrf-token`.

**Client auto-retry**: If a 403 response includes "CSRF" in error message, client re-fetches the CSRF token and retries once.

### 5.4 Rate Limiting

Four tiers using `express-rate-limit`:

| Tier | Window | Max | Applied To |
|------|--------|-----|------------|
| Auth login | 15 min | 10 | `POST /api/auth/login` |
| Auth refresh | 15 min | 20 | `POST /api/auth/refresh` |
| General API | 1 min | 100 | All `/api` routes |
| Write mutations | 1 min | 30 | POST/PUT/DELETE (non-auth) |

### 5.5 Input Validation (XSS Prevention)

All string inputs processed through Zod schemas with `stripHtml()`:
- `stripHtml(v)`: removes `<...>` tags and `<>` characters via regex
- String schema helper: `s(min, max)` — required stripped string
- Optional helper: `so(max)` — optional stripped string

Parameterized queries throughout — no raw string interpolation.

### 5.6 Password Policies

- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain digit
- bcrypt hash with 10 rounds
- Generated passwords via `crypto.randomBytes(4).toString('hex')` (8 hex chars)

---

## 6. External Integrations

### 6.1 Firebase

**Usage**: Image storage only (no Firestore, no Auth on server side).

**Server setup** (`server/src/firebase-admin.ts`):
- Lazy initialization pattern: `getFirebaseAdmin()` checks `initialized` flag
- Service account from env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_CLIENT_ID`, `FIREBASE_CLIENT_CERT_URL`, `FIREBASE_STORAGE_BUCKET`
- Private key: replaces `\n` with actual newlines
- Returns `admin` SDK instance
- `getBucket()`: returns `admin.storage().bucket()`

**Upload flow** (`server/src/routes/upload.ts`):
1. Multer with memory storage, 5MB limit
2. Extension + MIME type filter: jpeg/jpg/png/gif/webp
3. Magic byte validation (4 formats: JPEG `FFD8FF`, PNG `89504E47`, GIF `47494638`, WebP `52494646...57454250`)
4. Upload to Firebase Storage: `uploads/${timestamp}-${random}.ext`
5. Return signed URL (1 hour expiry)

**Client Firebase plugins** (Capacitor native):
- `@capacitor-firebase/authentication 8.3.0`
- `@capacitor-firebase/storage 8.3.0`

**Firebase config**:
- `firebase.json`: Hosting (dist/), Storage rules (`storage.rules`), Firestore rules + indexes
- `storage.rules`: auth required for all paths
- `firestore.rules`: auth required for all documents
- `firestore.indexes.json`: empty array `[]`

### 6.2 S3 Backup Storage

File: `server/src/backup-storage.ts`.

**Configuration** (all env vars):
- `BACKUP_S3_ENDPOINT`
- `BACKUP_S3_REGION` (default: `us-east-1`)
- `BACKUP_S3_ACCESS_KEY_ID`
- `BACKUP_S3_SECRET_ACCESS_KEY`
- `BACKUP_S3_BUCKET`

**Client**: AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner`).

**Features**:
- `forcePathStyle: true` (compatible with MinIO, Backblaze B2, Cloudflare R2)
- Prefix: `yemen-telecom-backups/`
- `isConfigured()`: checks all 4 required vars
- `uploadBackup(data)`: JSON stringify, PUT to S3, returns presigned GET URL (1h)
- `downloadBackup(filename)`: returns presigned URL (1h)

**Backup data** (13 tables, from `/api/admin/system/backup`):
```
users, agents, sellers, sims, alerts, transactions, operations,
inventories, audit_logs, system_settings, token_blacklist,
duplicate_identities, customers, distribution_requests
```

### 6.3 ngrok Tunnel

Files:
- `tunnel.js`: ngrok tunnel script (port 3000)
- `start-tunnel.ps1`: PowerShell download + tunnel script

Usage: `npm run tunnel` or `npm run tunnel:ps`. For HTTPS testing during development.

---

## 7. Mobile Architecture

### 7.1 Capacitor Configuration

File: `capacitor.config.ts`:

| Setting | Value |
|---------|-------|
| appId | `com.yemen.telecom` |
| appName | `يمن تيليكوم` |
| webDir | `dist` |
| androidScheme | `https` |
| cleartext | `false` |
| allowNavigation | `['yemen-telecom-api.onrender.com', 'yemen-telecom-1699.web.app']` |

Plugins: `CapacitorPreferences` (token storage), `StatusBar` (DARK style, #0a0e1a), `Keyboard` (resize body).

### 7.2 Android Build

Capacitor 8.4.1 Android build:
- `@capacitor/android: 8.4.1`
- `@capacitor/cli: 8.4.1`
- Build script: `npm run build:android` → `vite build && npx cap copy`
- Sync: `npx cap sync`

Android native plugins:
- `@capacitor/keyboard: 8.0.5`
- `@capacitor/preferences: ^8.0.1`
- `@capacitor/status-bar: ^8.0.1`
- `@capacitor-firebase/authentication: 8.3.0`
- `@capacitor-firebase/storage: 8.3.0`

### 7.3 Mobile-Specific Behavior

- API base URL auto-detection: Capacitor native → production URL (`https://yemen-telecom-api.onrender.com/api`)
- Token storage: Capacitor `Preferences` (encrypted) on native, `localStorage` on web
- Server CSP allows Capacitor origins (`capacitor://localhost`, `https://localhost`)
- CORS allows Capacitor origins

---

## 8. Deployment Architecture

### 8.1 Render Web Service

File: `render.yaml`:

| Setting | Value |
|---------|-------|
| Type | web |
| Name | yemen-telecom-api |
| Runtime | node |
| Region | oregon |
| Plan | free |
| Build | `npm install && npm run build` |
| Start | `npm start` |
| Health check | `GET /api/health` |
| Auto-deploy | yes (default) |

Environment variables: 30 vars (13 sync:false secrets, 17 with defaults).

### 8.2 Docker Multi-Stage Build

File: `Dockerfile`:

**Stage 1 — Frontend build** (`node:20-alpine`):
```
npm ci → vite build → /app/dist
```

**Stage 2 — Server build** (`node:20-alpine`):
```
npm ci → tsc --skipLibCheck → /app/server/dist
```

**Stage 3 — Runtime** (`node:20-alpine`, `appuser`):
```
Copies: dist, server/dist, server/node_modules, server/package.json, server/migrations
EXPOSE 4000
USER appuser
CMD: node server/dist/index.js
```

### 8.3 Health Check

`GET /api/health`:
- Queries `SELECT 1`
- Returns `{ status: 'ok', db: 'connected', timestamp }` with 200 on success
- Returns `{ status: 'degraded', db: 'disconnected', timestamp }` with 503 on failure

Configured in `render.yaml` as `healthCheckPath: /api/health`.

### 8.4 Environment Variables

**Required** (server fails to start without):
- `JWT_SECRET`, `REFRESH_SECRET`, `CSRF_SECRET`

**Database** (10 vars):
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_SSL_REJECT_UNAUTHORIZED`, `DB_SSL_CA_CERT`, `DB_FAMILY`
- `DB_MAX_CONNECTIONS`, `DB_SLOW_QUERY_MS`

**Firebase** (7 vars):
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_STORAGE_BUCKET`, `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_CLIENT_ID`, `FIREBASE_CLIENT_CERT_URL`

**Backup S3** (5 vars):
- `BACKUP_S3_ENDPOINT`, `BACKUP_S3_REGION`, `BACKUP_S3_ACCESS_KEY_ID`
- `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_S3_BUCKET`

**Other** (3 vars):
- `NODE_ENV`, `API_PORT`, `CORS_ORIGIN`

**Seed passwords** (3 optional vars):
- `SEED_PASSWORD_MANAGER`, `SEED_PASSWORD_AGENT`, `SEED_PASSWORD_SELLER`

---

## 9. Development Tooling

### 9.1 Scripts

**Root (`package.json`)**:
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite --port=3000 --host=0.0.0.0` | Frontend dev server |
| `server` | `tsx watch server/src/index.ts` | Backend dev with watch |
| `build` | `vite build` | Production frontend build |
| `build:android` | `vite build && npx cap copy` | Full Android build |
| `cap:sync` | `npx cap sync` | Capacitor sync |
| `db:seed` | `tsx server/src/seed.ts` | Database seeding |
| `tunnel` | `node tunnel.js` | ngrok HTTPS tunnel |
| `tunnel:ps` | `powershell -File start-tunnel.ps1` | ngrok via PowerShell |
| `test` | `vitest run` | All tests |
| `test:watch` | `vitest` | Watch mode |
| `test:coverage` | `vitest run --coverage` | Coverage report |
| `lint` | `tsc --noEmit` | Type check |
| `clean` | Remove dist/ + server.js | Cleanup |

**Server (`server/package.json`)**:
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `npx tsx watch src/index.ts` | Dev server with watch |
| `build` | `npx tsc --skipLibCheck` | TypeScript compile |
| `start` | `node dist/index.js` | Production start |
| `test` | `cd .. && npx vitest run` | Run tests from root |
| `init-db` | `npx tsx src/init-db.ts` | Database initialization |

### 9.2 ngrok Tunnel

- `tunnel.js`: programmatic ngrok setup on port 3000
- `start-tunnel.ps1`: PowerShell script to download ngrok + start tunnel
- Purpose: expose local dev server over HTTPS for mobile/Capacitor testing

### 9.3 Seed Process

File: `server/src/seed.ts`:
1. Reads and executes `schema.sql`
2. For each user (manager, agent, seller):
   - Checks `SEED_PASSWORD_{USER}` env var for custom password
   - Falls back to `crypto.randomBytes(16).toString('base64url')`
   - Validates password strength (uppercase + lowercase + digit, min 8)
   - Updates `password_hash` with bcrypt hash (10 rounds)
3. Refuses to run in `NODE_ENV=production`

### 9.4 Migration Runner

File: `server/src/init-db.ts`:
- Executes `schema.sql`
- Runs migrations from `server/migrations/` directory
- Creates tracking table `schema_migrations`

### 9.5 Test Configuration

File: `vitest.config.ts`:
- Environment: `jsdom`
- Setup: `src/__tests__/setup.ts`
- Includes: `src/**/*.test.{ts,tsx}`, `server/src/**/*.test.{ts,tsx}`
- Coverage: v8 provider, text + lcov reporters

**Frontend test files**: `src/__tests__/`:
- `auth.test.ts`, `csrf.test.ts`, `duplicate-api-calls.test.ts`
- `ocr.test.ts`, `seller.test.ts`, `simActivation.test.ts`
- `camera-preview.test.ts`, `token-storage-regression.test.ts`

**Backend test files**: `server/src/__tests__/`:
- `auth-integration.test.ts`, `auth-status-security.test.ts`
- `hardcoded-credentials.test.ts`, `sellers-idor-security.test.ts`
- `server-auth.test.ts`, `validation.test.ts`

### 9.6 TypeScript Configuration

**Frontend** (`tsconfig.json`):
- Target: ES2022
- Module: ESNext, bundler resolution
- JSX: react-jsx
- Paths: `@/*` → `./src/*`
- Strict: no (skipLibCheck: true, noEmit: true)
- Includes: `src/`
- Excludes: `public`, `node_modules`, `dist`, `src/__tests__`

**Backend** (`server/tsconfig.json`):
- Target: ES2020
- Module: commonjs, node resolution
- Strict: true
- Out: `./dist`
- Includes: `src/**/*`
- Excludes: `node_modules`, `dist`, `src/__tests__`, `src/init-db.ts`, `src/seed.ts`

---

## 10. Discovery Summary

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| SPA + REST API over SSR | Simple deployment (static + Express), easy Capacitor wrapping |
| State-based view switching vs router | Avoids router dependency, role-based gating via parent component |
| JWT stateless with refresh rotation | No server session storage, rotation limits reuse window |
| CSRF double-submit (stateless) | No server-side session needed, HMAC ensures integrity |
| Zod validation + stripHtml | Runtime type safety + XSS prevention at input boundary |
| Lazy Firebase Admin init | Only loads when upload endpoint is hit, saves memory |
| Token blacklist over short expiry | Allows immediate revocation without waiting for 1h expiry |
| In-memory stats cache (5 min) | Reduces dashboard query load on PostgreSQL |
| Ring buffer monitor (200 entries) | Lightweight client-side diagnostics without telemetry service |
| localStorage + Capacitor Prefs | Dual-platform token storage with encrypted option on mobile |
| S3-compatible (forcePathStyle) | Works with any S3-compatible provider (B2, R2, MinIO) |

### Technology Choices Rationale

| Choice | Why |
|--------|-----|
| Express over Fastify/NestJS | Minimal, well-known, sufficient for single-server deployment |
| pg Pool over ORM | Direct SQL control, no abstraction overhead, parameterized queries |
| Tailwind CSS over CSS-in-JS | Utility-first for rapid Arabic RTL UI, Vite plugin for JIT |
| Tesseract.js (client-side) | Offline ID scanning, no server-side OCR infra needed |
| motion over Framer Motion | Lighter weight animation library |
| d3 over Chart.js | More flexible for custom sales reports |
| Firebase Storage over S3 presigned | Mobile SDK integration, signed URLs for browser |
| Zod 4 over Joi/Yup | TypeScript-first, schema inference, async refinements |
| Helmet CSP with unsafe-inline | Required for Vite/Tailwind runtime — acknowledged technical debt |

### Known Gaps/Technical Debt

| Gap | Details | Impact |
|-----|---------|--------|
| No CI/CD pipeline | No GitHub Actions or equivalent configured | Manual deploys only |
| Firestore unused | `firestore.rules` and `firestore.indexes.json` exist but no code uses Firestore | Dead config |
| Firebase Auth unused (server) | Server uses custom JWT, not Firebase Auth tokens | Dual auth systems |
| CSP unsafe-inline | Vite + Tailwind require it, no nonce system implemented | XSS surface |
| No service worker source | `/sw.js` registered but no source visible | Unclear PWA behavior |
| No automated DB migration on deploy | `init-db.ts` exists but not wired into startup | Manual migration step |
| Token blacklist table growth | Cleanup runs hourly, but high-traffic periods could accumulate | Storage concern |
| No email/SMS delivery implementation | Settings exist for email/sms alerts but no sending code | Dead settings |
| localStorage for UI state | Role tab, manager view, dark mode persisted — persists between sessions indefinitely | Privacy/UX concern |
| No request ID tracing | No correlation IDs between client and server logs | Debugging difficulty |
| Test coverage unclear | Tests exist but no coverage enforcement in CI | Quality risk |
| Render plan on free tier | `render.yaml` specifies `plan: free` — limited resources | Performance risk in production |
| Server CSP hardcoded origins | `connect-src` defaulted to `'self'` only, CORS_ORIGIN controls CORS | SPA may fail to connect if API on different origin |
