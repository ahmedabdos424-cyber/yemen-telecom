# Project Gaps Analysis

## 1. Missing Features

- **No push notifications for distribution approvals** — approval flow exists but no notification mechanism
- **No real-time updates** — SIM status changes, inventory changes require manual refresh
- **No email/SMS integration** — `email_alerts_enabled` and `sms_alerts_enabled` config fields exist in `system_settings`, read/written by admin routes, but no actual sending implementation
- **No 2FA enforcement** — `two_fa_enabled`, `email_2fa_enabled`, `trusted_devices_enabled` config fields exist in `system_settings` (schema.sql:136-138), admin.ts reads/writes them, SettingsView UI exists, but no middleware enforces 2FA at login
- **No password expiry enforcement** — `password_expiry_90_days`, `password_no_reuse_5`, `password_special_required` config fields exist, but no middleware checks password age or enforces rotation
- **No audit log writes** — `audit_logs` table exists (schema.sql:124-132), admin.ts GET /audit-logs reads it, but no middleware or route handler inserts into it
- **No transaction writes** — `transactions` table exists (schema.sql:82-89), seeded with 3 rows, admin.ts GET /transactions reads it, but no route inserts new transactions
- **No duplicate_identities writes** — `duplicate_identities` table exists (schema.sql:164-173), seeded with 4 rows (schema.sql:311-316), admin.ts GET /duplicate-identities dynamically queries sellers via window function (admin.ts:99-143), but the table is never written to programmatically
- **No Firebase Auth integration** — `@capacitor-firebase/authentication` 8.3.0 installed in package.json, never imported in source
- **No Firebase Cloud Messaging** — not configured, no service worker messaging handler
- **No Firebase Cloud Functions** — not deployed
- **No Firebase App Check** — not configured
- **No Crashlytics** — not integrated
- **No Analytics** — not integrated
- **No CI/CD pipeline** — `.github/workflows/` contains ci.yml, android.yml, build.yml, security-scan.yml, test.yml, typecheck.yml, but no deployment workflow to Render or Firebase
- **No automated deployment** — no deploy-to-production workflow
- **No pre-commit hooks** — no husky/lint-staged
- **No end-to-end tests** — unit/integration tests exist (vitest), no E2E (Cypress/Playwright)
- **No load testing** — no k6/artillery
- **No monitoring/alerting** — `src/lib/monitor.ts` is an in-memory ring buffer (200 entries, redacts secrets), not persisted, lost on page refresh

## 2. Incomplete Features

- **OCR (`useOcr.ts`)**:
  - Arabic `ara.traineddata.gz` shipped in `public/tesseract/lang/` (13 KB compressed)
  - Tesseract.js configured with `workerPath`, `corePath`, `langPath` pointing to public assets
  - Client-side only — no fallback to server-side OCR
  - Otsu binarization + blur/dark detection implemented
  - 30s timeout, 2 retries
  - Accuracy on Arabic identity documents unverified in production
- **QR scanning** — `html5-qrcode` in package.json dependencies, not imported in any route file or component
- **PWA** — `public/sw.js` exists with cache-first strategy for static assets and stale-while-revalidate for other GET requests, registered in `src/main.tsx`, but no offline fallback page, no push notifications
- **2FA** — Settings UI (`SettingsView.tsx`) renders toggles, backend config schema (`updateSettingsSchema`) accepts fields, but no `passport-2fa` or TOTP library, no middleware enforcement
- **Password expiry** — Config fields exist in `system_settings`, backend reads/writes them, but no middleware in `middleware/auth.ts` checks password age on JWT authentication
- **Backup** — `POST /api/admin/system/backup` dumps all 14 tables to JSON and uploads to S3-compatible storage via presigned URLs (`backup-storage.ts`), but no scheduled/automated backup mechanism (no cron job)
- **Lockdown** — `POST /api/admin/system/lockdown` (admin.ts:239-260) toggles `maintenance_mode` and suspends sellers (`UPDATE sellers SET status = 'suspended'`), but does not suspend agents or user logins

## 3. Architecture Gaps

- **No service layer** — Business logic lives directly in route handlers (admin.ts:273 lines, sellers.ts:316 lines)
- **No caching layer** — No Redis or in-memory cache (stats endpoint has a basic 5-minute in-memory cache at index.ts:252-254, but nothing else)
- **No message queue** — No Bull/Redis queue for async operations like email/SMS/backup
- **No logging framework** — `console.error` used throughout all route handlers (15+ occurrences), no structured logging (winston/pino)
- **No request ID tracking** — No `x-request-id` correlation across logs
- **No structured error responses** — Inconsistent format: some endpoints return `{ error: string }`, some return `{ error: string, details: array }`, some return raw arrays
- **No API versioning** — All routes under `/api/` with no version prefix (`/api/v1/`)
- **No database migration rollback strategy** — 5 migration files are additive SQL only, no down migrations
- **No database read replicas** — Single pool, no read/write splitting
- **No database connection pooling tuning** — Fixed `max: 10` (db.ts:36), no dynamic scaling

## 4. Security Gaps

- **No HTTPS redirect** — No `https://` redirect middleware at Express level, relies entirely on Render infrastructure
- **No HSTS header** — Not set in Helmet CSP configuration (index.ts:50-72)
- **No request body size limiter** — `express.json({ limit: '1mb' })` at index.ts:98 limits JSON bodies, but no limit on URL-encoded bodies; only multer enforces per-upload limits
- **No SQL injection prevention audit** — Parameterized queries used consistently via `pg` library, but no automated tooling to verify
- **No rate limiting on distribution endpoints specifically** — Distribution approval (`PUT /:id/approve`) uses the general write rate limiter (30/min), no dedicated limit
- **No audit trail for sensitive operations** — No middleware logs mutations to `audit_logs` table (e.g., seller creation, SIM activation, distribution approval)
- **No session management beyond JWT** — No device fingerprinting, no refresh token rotation tracking (beyond blacklisting), no concurrent session limits
- **No brute force protection on login** — Rate limit at 10 per 15 minutes (`authLimiter`) and 20 per 15 minutes (`refreshLimiter`) is minimal

## 5. Technical Debt

- **`console.error` for logging** — All 13 route files use `console.error` for error handling, no structured logging
- **Magic strings for roles** — `'manager'`, `'agent'`, `'seller'` hardcoded across middleware, routes, and validation
- **Magic strings for statuses** — `'active'`, `'inactive'`, `'suspended'`, `'deleted'`, `'pending'`, `'approved'`, `'rejected'`, `'fulfilled'` hardcoded
- **Magic strings for providers** — `'Yemen Mobile'`, `'Sabafon'`, `'YOU'` hardcoded in validation.ts, schema.sql
- **No TypeScript strict mode** — Some files use `any` types extensively (admin.ts:121, 126; client.ts:214, 219, 223+)
- **Large route handler files** — `admin.ts`: 273 lines, `sellers.ts`: 316 lines, `sims.ts`: unknown
- **Inconsistent error response format** — Some return `{ error: string }`, some return raw message strings
- **Hardcoded Arabic strings in backend** — `'المركز الرئيسي'`, `'لم يسجل دخول بعد'`, `'العربية (المملكة العربية السعودية)'` in schema.sql and sellers.ts
- **No input sanitization beyond stripHtml** — `stripHtml` in validation.ts removes HTML tags; no NoSQL injection concerns (Postgres parameterized queries)

## 6. Dead Code

- **`@google/genai` in package.json** — Listed as dependency, not imported anywhere in source
- **Firestore config in firebase.json** — `firestore.rules`, `firestore.indexes.json` exist but no Firestore usage in code; Firestore is not initialized
- **firestore.rules** — Generic `auth.uid != null` rule, no Firestore database in use
- **tunnel.js** — Dev-only ngrok tunnel script (`node tunnel.js`), not harmful
- **Customers table `operations` key** — `GET /api/customers/:id` (customers.ts:57-80) queries `SELECT * FROM customers` then fetches `operations` separately and spreads into response as `operations` key, but code returns `{ ...result.rows[0], operations: ops.rows }` — field is named `operations` but code returns the full row with an `ops` key alias (misnamed in analysis: actually returns `operations` correctly at customers.ts:75)
- **Capacitor Firebase plugins** — `@capacitor-firebase/authentication` and `@capacitor-firebase/storage` installed (package.json) but never imported — the project uses `firebase-admin` server-side for storage, not client-side Firebase SDK
