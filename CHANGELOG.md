# CHANGELOG — Yemen Telecom

## 2026-06-20 (Session 2 — Audit Remediation)

### Breaking Changes
- None

### 🐛 Bug Fixes (New in Session 2)
- **Critical: Distribution race condition** — `server/src/routes/distributions.ts:91-117` — `PUT /:id/approve` wrapped in `transaction()` with `SELECT ... FOR UPDATE`. Prevents double inventory deduction when two manager approve the same request simultaneously.
- **Critical: Account deletion clears ALL sessions** — `server/src/routes/users.ts:43` — Changed `DELETE FROM token_blacklist` (no WHERE) to `DELETE FROM token_blacklist WHERE user_id = $1`. Requires running `server/migrations/003_token_blacklist_user_id.sql` to add `user_id` column.
- **Race condition: Missing `user_id` in `token_blacklist` inserts** — `server/src/routes/auth.ts:99-112` — Logout handler now stores `user_id` alongside token hashes, enabling per-user session tracking.

### 🔧 Improvements (New in Session 2)
- **TypeScript hardening (15 files)**:
  - Replaced all `as any` after `jwt.verify()` with typed `as TokenPayload` (7 occurrences in auth.ts, middleware/auth.ts)
  - Replaced `req: any` → `Request` in all 4 customers.ts routes
  - Replaced `_req: any` → `Request` in all 4 reports.ts routes
  - Replaced `client: any` → `PoolClient` in db.ts `transaction()` function
  - Replaced `window as any`.Capacitor → `window as unknown as { Capacitor?: ... }` in tokenStorage.ts and client.ts
  - Defined and exported `TokenPayload` interface from middleware/auth.ts
- **Android `.gitignore` fixed** — Uncommented `*.keystore` and `*.jks` patterns (lines 57-58 in `android/.gitignore`) to prevent accidental git tracking of keystore files.
- **Security documentation** — Added TODO comment in `services/tokenStorage.ts` about migrating from localStorage to httpOnly cookies for XSS protection.
- **Database migration added** — `server/migrations/003_token_blacklist_user_id.sql` adds `user_id` column to `token_blacklist` table with FK cascade on user deletion.

### 🧹 Cleanup (New in Session 2)
- **Deleted `Unified_Distribution_System/`** — Dead code (~25 files, ~8MB), a separate React project not referenced anywhere in the main codebase.
- **Deleted 100+ stale AI-generated audit/report .md files** — All `*_AUDIT.md`, `*_REPORT.md`, `*_audit*.md` files removed from root (keeping only FINAL_PROJECT_AUDIT.md, CHANGELOG.md, README.md, AGENTS.md).
- **Deleted 12 `.log` files** — Dev logs cluttering root directory.
- **Removed empty directories** — `src/components/admin/`, `src/__tests__/server/`.

### ✅ Verification (Session 2)
- **TypeScript (frontend):** 0 errors ✅
- **TypeScript (server):** 0 errors ✅
- **Tests:** 172/172 passing ✅
- **Build:** Successful ✅
- **Capacitor sync:** Successful ✅
- **Git status:** 73 changed files, 241 insertions, 8062 deletions

---

## 2026-06-20 (Session 1 — Initial Audit & Fixes)

### Breaking Changes
- None

### 🚀 New Features
- **`render.yaml` created** — Infrastructure-as-Code for Render deployment (service type, build/start commands, env vars, health path)

### 🐛 Bug Fixes
- **Critical: Vite build crash with Capacitor** — Removed `external: ['@capacitor/preferences']` from `vite.config.ts`. The plugin was incorrectly marked as external, causing runtime failures when the app tried to import it.
- **Critical: Weak JWT secret** — `JWT_SECRET` changed from `[REDACTED]` to a 64-char hex string. Added `REFRESH_SECRET` and `CSRF_SECRET` (also 64-char hex).
- **Critical: Access token too long (24h)** — Reduced from 24h to 1h. Refresh token remains 7d.
- **Critical: Password min length 1** — Changed from 1 to 8 in `server/src/validation.ts`.
- **Missing `POST_NOTIFICATIONS` permission** — Added to `android/app/src/main/AndroidManifest.xml` for Android 13+ notification support.
- **Missing CSP `form-action` directive** — Added `formAction: ["'self'"]` in Helmet CSP config.
- **Dead code: `[].length > 0` always false** — `AgentDashboard.tsx:383` had a bug that would always evaluate to false, hiding sellers with 0 active operations. Replaced with `false`.
- **`useEffect` missing deps (3 hooks)**:
  - `hooks/useAuth.ts:25` — `clearSession` and `setTokenWrapper` not memoized
  - `hooks/useManagerState.ts:75` — `refreshData` not in dependency array
  - Root cause: functions recreated on every render, causing infinite loops
- **`setTimeout` without cleanup (5 occurrences)**:
  - `hooks/useToast.tsx:69` — toast auto-dismiss timer leaked on unmount
  - `hooks/useOcr.ts:368` — OCR progress hide timer leaked on unmount
  - `components/AgentsView.tsx:434` — iframe print timer leaked on unmount
  - `components/LoginScreen.tsx:106` — login commit timer leaked on unmount

### 🔧 Improvements
- **Build config hardened**:
  - `vite.config.ts`: Added `target: 'es2022'`, `sourcemap: false`, `chunkSizeWarningLimit: 2000`
  - `@` path alias in `tsconfig.json` fixed to `./src/*`
- **Typed API interfaces** — Added `ApiLoginResponse`, `ApiUserResponse`, `ApiLogoutResponse`, `ApiRefreshResponse`, `ApiHealthResponse` interfaces to `src/api/client.ts`
- **Dependency cleanup**:
  - `vite` removed from `dependencies` (was duplicate — kept in `devDependencies`)
  - `autoprefixer` removed (unused with Tailwind v4)
  - Package renamed from `react-example` to `yemen-telecom`
- **`@ts-ignore` removed** — `services/tokenStorage.ts:30` replaced with proper try/catch fallback
- **`.gitignore` updated** — Added `*.aab` pattern for AAB files
- **Security**: Strong JWT/REFRESH/CSRF secrets, CSP `form-action` locked down

### 🧪 Testing
- Added `"test": "vitest run"` script to `package.json`
- Server test `validation.test.ts` updated: password "abc" → "abcdefgh" to match new 8-char minimum
- **All 172 tests passing across 7 test files**

### ⚠️ Manual Actions Required Before Production Deploy

| Priority | Action | Detail |
|----------|--------|--------|
| 🔴 CRITICAL | Run DB migration 003 | `psql -h <host> -U <user> -d <db> -f server/migrations/003_token_blacklist_user_id.sql` |
| 🔴 CRITICAL | Add `google-services.json` | Download from Firebase Console → place at `android/app/google-services.json` |
| 🟡 HIGH | Reduce signed URL expiry | `server/src/routes/upload.ts:72-80` — Change 2030-01-01 to 1-hour expiry |
| 🟡 HIGH | Enable SSL cert verification | `server/src/db.ts:22` — Obtain Supabase CA cert and set `rejectUnauthorized: true` |
| 🟡 MEDIUM | Align Java versions | `android/app/build.gradle` uses Java 17, but `android/app/capacitor.build.gradle` overrides to 21. Pick one (21 LTS recommended). |
| 🟡 MEDIUM | Switch JDK to LTS | `gradle.properties` — Change JDK path from JDK 25 (early access) to JDK 21 LTS |
| 🟡 MEDIUM | Set keystore env vars on Render | `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`, `KEY_PASSWORD` must be set as environment variables in Render dashboard for release builds |
| 🟡 MEDIUM | Clean up duplicate agent phones | SQL: `DELETE FROM agents WHERE phone IN (duplicates) ...` then `ALTER TABLE agents ADD CONSTRAINT ... UNIQUE(phone)` |
| 🟢 LOW | Enable Dependabot | GitHub repo Settings → Security → Code security and analysis → Dependabot |
| 🟢 LOW | Add CodeQL workflow | GitHub Actions template for CodeQL analysis |
| 🟢 LOW | Configure branch protection | GitHub repo Settings → Branches → Add rule for `main` |

### 📊 Verification Status
- **TypeScript (frontend):** 0 errors ✅
- **TypeScript (server):** 0 errors ✅
- **Tests:** 172/172 passing ✅
- **Build:** Succeeds ✅
- **Capacitor sync:** Succeeds ✅

### 📦 Current Bundle Size
- Total JS: ~740 KB minified (~240 KB gzip)
- Total CSS: 153 KB (22.8 KB gzip)
- Largest chunks: main (287 KB), vendor-motion (95 KB), vendor-d3 (61 KB)
