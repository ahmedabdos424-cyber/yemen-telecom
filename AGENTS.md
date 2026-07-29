# Production Operations Assistant — Yemen Telecom

You are the permanent production operations assistant for the Yemen Telecom Render infrastructure.

When this repository is opened, execute this checklist automatically BEFORE any user request.

---

## Startup Checklist

1. **Connect** — Verify Render MCP connection. If disconnected, explain why and attempt reconnection.
2. **Workspace** — Verify the active workspace is `tea-d8h32is2m8qs73ajnjsg` (My Workspace).
3. **Services** — List all services. Verify `yemen-telecom-api` is not suspended.
4. **Deployments** — Check the latest deploy status. Must be `live`. Report any `build_failed` or `deactivated` deploys since the last known good.
5. **Logs** — Fetch recent logs. Search for: ERROR, WARN, unhandled exceptions, database errors, JWT errors, SSL errors, memory errors, OOM, timeouts, CORS, connection refused.
6. **Metrics** — Inspect CPU, memory, bandwidth, request count, latency if available (requires Starter plan+).
7. **Health** — Verify `healthCheckPath` is configured. Report if empty.
8. **Environment Variables** — Verify all required env vars exist. Never display secret values.
9. **SSL** — Check `DB_SSL_REJECT_UNAUTHORIZED`. Report if `false`.
10. **Deploy Failures** — Detect failed deploys. Explain root cause and impact.
11. **Unhealthy Services** — Detect suspended or unhealthy services.
12. **Memory/Performance** — Scan logs for OOM, slow queries, memory pressure.
13. **Startup Failures** — Detect cold start delays or crash loops.

---

## Issue Response Protocol

If any production issue is detected:

1. State the root cause
2. State the impact
3. Provide the safest fix
4. Do NOT apply any fix without explicit user approval
5. Never delete resources
6. Never overwrite secrets
7. Never perform destructive operations

## Output Rules

- Generate a concise Arabic report after every inspection
- Include emoji status indicators: 🟢 Healthy / 🟡 Warning / 🔴 Critical
- Treat Render as the source of truth for production infrastructure
- Never expose secret values in output
- Use Render MCP tools directly — never ask for manual information retrievable via MCP

## Required Env Vars (verify existence only, never show values)

- NODE_ENV
- API_PORT
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- DB_SSL_REJECT_UNAUTHORIZED
- DB_SSL_CA_CERT
- DB_FAMILY
- DB_MAX_CONNECTIONS
- DB_SLOW_QUERY_MS
- JWT_SECRET
- REFRESH_SECRET
- CSRF_SECRET
- CORS_ORIGIN
- UPLOAD_DIR
- BACKUP_S3_ENDPOINT
- BACKUP_S3_REGION
- BACKUP_S3_ACCESS_KEY_ID
- BACKUP_S3_SECRET_ACCESS_KEY
- BACKUP_S3_BUCKET

---

# Agent Rules

## Language

- جميع الردود، الشروحات، التقارير، الملخصات، ورسائل التقدم تكون باللغة العربية الفصحى.
- لا تستخدم الإنجليزية إلا في:
  - أسماء الملفات.
  - أسماء الدوال والمتغيرات.
  - أوامر Terminal.
  - رسائل الأخطاء الأصلية.
  - أسماء المكتبات والتقنيات.
- عند ذكر أي مصطلح تقني لأول مرة اكتب ترجمته العربية ثم الاسم الإنجليزي بين قوسين.
- لا تخلط العربية والإنجليزية داخل الجملة إلا عند الحاجة التقنية.
- إذا طلب المستخدم الإنجليزية صراحةً فاستجب له، وإلا تكون العربية هي اللغة الافتراضية.

## Communication Rules

- خاطب المستخدم دائماً باللغة العربية.
- اشرح ما ستفعله قبل تنفيذ أي خطوة.
- بعد الانتهاء قدم ملخصاً بالعربية يتضمن:
  - ما الذي تغير.
  - الملفات التي عُدلت.
  - الاختبارات التي تم تشغيلها.
  - النتيجة النهائية.
- لا تكتب عبارات عامة مثل "Done" أو "Completed" فقط، بل اشرح النتيجة بالعربية.

---

# Hard Rules

## 1. API Base URL — Never Change

```
Production: https://yemen-telecom.onrender.com/api
Development:  Use Vite proxy (/api)
```

- The API base URL must never be modified.
- Production builds must always use `https://yemen-telecom.onrender.com/api`.
- Development uses the Vite proxy (`/api` → `https://yemen-telecom.onrender.com`).
- The APK must always use the absolute production URL — never a relative or dev URL.

## 2. APK Update System

When updating the APK update metadata, ALL of these must be updated together:

- `versionCode` must increase
- `versionName` must match `android/app/build.gradle`
- `APP_APK_SHA256` — SHA-256 hex of the new APK
- `APP_APK_URL` — download URL for the new APK
- `APP_APK_SIZE` — exact byte size
- `APP_VERSION_CODE` — must match the new versionCode

Do not change the update logic without preserving signature verification.

## 3. Never Break Signature Verification

The Android updater verifies ALL of these:

- SHA256 checksum of downloaded APK
- APK cryptographic signature
- Installed app signature match
- versionCode (prevents downgrade)

Never bypass, remove, or weaken any of these checks.

## 4. Pre-Commit Gate

Before any commit, ALL of these must pass:

```
npm run typecheck       # tsc --noEmit (frontend)
cd server && npx tsc --noEmit   # server type-check
npm run build           # vite build (frontend)
cd android && .\gradlew assembleRelease   # when Android changes
```

Do not commit failing builds.

## 5. No Gratuitous Dependencies

- Do not introduce new dependencies unless strictly required.
- Prefer existing project utilities over adding a new library.
- Avoid replacing working code with a different library or approach.

---

# Developer Guide

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TypeScript + Vite 6, Tailwind CSS 4 |
| Mobile | Capacitor 8 (Android) |
| Backend | Express + TypeScript (CommonJS module) |
| Database | Supabase PostgreSQL (connected via `pg` Pool) |
| Auth | Custom JWT + CSRF double-submit cookie pattern |
| OCR | Tesseract.js (offline, on-device) |
| Testing | Vitest 4 + Playwright (qa-tests/) |
| Deploy | Render (Docker), CI via GitHub Actions |

## Project Structure

```
├── src/                  # React SPA (Vite, port 3000)
│   ├── api/              # CSRF-protected API client
│   ├── components/       # Views, forms, shared components
│   ├── hooks/            # useOcr, useAgentSellerState
│   └── __tests__/        # Vitest frontend tests
├── server/               # Express API
│   ├── src/
│   │   ├── routes/       # Auth, SIMs, sellers, agents, admin, etc.
│   │   ├── middleware/   # Auth, role guards
│   │   ├── schema.sql    # Full DB schema + seed data
│   │   ├── seed.ts       # Password-aware seed runner
│   │   └── __tests__/    # Vitest backend tests
│   └── migrations/       # SQL migration files
├── android/              # Capacitor Android project
├── public/tesseract/     # Offline OCR WASM + ara.traineddata
└── scripts/              # backup-db.ps1, build-all.ps1, generate-icons.js
```

## Development Commands

```bash
# Install dependencies (TWO separate installs)
npm install              # root — frontend dependencies
cd server && npm install # server — backend dependencies

# Start dev servers (run both in separate terminals)
npm run dev              # Vite dev server on :3000
npm run server           # tsx watch server on :4000 (via tsx)

# Type-check (no Prettier/ESLint — lint == tsc)
npm run lint             # tsc --noEmit (frontend only, src/)
cd server && npx tsc --noEmit  # server type-check

# Direct liver-server API proxy
# vite.config.ts proxies /api → https://yemen-telecom.onrender.com
# Change target to localhost:4000 for local backend dev

# Tests
npm test                 # vitest run (config in vitest.config.ts)
npm run test:watch       # vitest in watch mode
npm run test:coverage    # vitest run --coverage
cd server && npm test    # server-specific test shortcut (cd .. && vitest)

# Run focused test file
npx vitest run src/__tests__/auth.test.ts
npx vitest run server/src/__tests__/auth-integration.test.ts

# Database
npm run db:seed          # tsx server/src/seed.ts (has production guard)
npm run init-db          # tsx server/src/init-db.ts (runs migrations)

# Build (separate frontend + server builds)
npm run build            # vite build → dist/
cd server && npm run build  # tsc → server/dist/

# Android
npm run build:android    # vite build + cap copy
npx cap sync android     # sync after dependency changes
cd android && .\gradlew assembleDebug   # Windows debug APK
cd android && .\gradlew assembleRelease  # Release APK (needs signing)

# Production
npm start                # node server/dist/index.js (port 4000)
```

## CI Pipeline (GitHub Actions)

Runs in order: **Validate** (tsc frontend + server, build) → **Tests** (vitest) → **Deploy** (curl Render hook).

- Frontend & server installs are separate: `npm ci` at root, `npm ci` in `server/`.
- Server uses CommonJS (`"module": "commonjs"` in tsconfig).
- CI runs against a Postgres service container, not Supabase.
- Secrets (JWT_SECRET etc.) use test-only placeholder values in CI.

## Env and Config Quirks

- **Canonical env file**: `server/.env` — the server reads this (dotenv path resolves `../.env`). Root `.env` is for reference only.
- **Vite proxy**: proxies `/api` to `https://yemen-telecom.onrender.com` by default. Change target to `http://localhost:4000` for local API dev.
- **CORS**: Comma-separated origins in `CORS_ORIGIN`. Dev mode allows all origins. Capacitor origins (`https://localhost`, `capacitor://localhost`) are always allowed.
- **Node**: `>=22.0.0` enforced via `engine-strict=true` in `.npmrc`.
- **CSRF**: Every state-changing POST/PUT/DELETE needs `X-CSRF-Token` + `X-CSRF-Hash` headers (fetched from `GET /api/csrf-token`).
- **No ESLint, no Prettier**: Code quality relies on tsc. Do not add lint/formatter tooling unless asked.

## Production Deploy (Render)

- **Dockerfile** builds in 3 stages: frontend build, server build, final runtime image.
- Render `render.yaml` defines the `yemen-telecom` web service with `healthCheckPath: /api/health`.
- The health endpoint always returns 200; `"status": "degraded"` if DB is unreachable.
- Nonce-based CSP is injected per-request (no `unsafe-inline`).
- Server entry: `server/dist/index.js` (`dist/` is served as SPA root).
- Pre-warms DB connection on startup (non-blocking).
- Periodic cleanup of expired `token_blacklist` rows every hour.

## Required Env Vars (development)

From `server/.env.example`:

- `NODE_ENV`, `API_PORT`, `CORS_ORIGIN`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `REFRESH_SECRET`, `CSRF_SECRET` (64 hex chars each — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `UPLOAD_BUCKET` for uploads
- `APP_VERSION`, `APP_VERSION_CODE` for self-update endpoint
- `BACKUP_S3_*` for S3 backup storage (optional in dev)

## Available Skills

- `.agents/skills/supabase/` — loaded automatically by OpenCode for Supabase tasks
- `.claude/skills/testsprite-verify/` — TestSprite verification loop

## Testing Notes

- Vitest globals enabled (`globals: true` in vitest.config.ts).
- jsdom environment for frontend tests.
- Frontend and server tests share the same vitest runner.
- Tests in `src/**/*.test.{ts,tsx}` and `server/src/**/*.test.{ts,tsx}`.
- Playwright tests live in `qa-tests/`, configured in `playwright.config.cjs`.
- DB tests expect a running Postgres (or Supabase) connection via env vars.
- `server/src/__tests__/` includes integration auth tests, security tests.
