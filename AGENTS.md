# Yemen Telecom — Agent Guide

## Repo Layout

```
├── src/                  # Frontend (React + Vite + TS, port 3000)
│   ├── components/       # Pages, shared components (~54 .tsx files)
│   ├── hooks/            # useAuth, useManagerState, useAgentSellerState
│   ├── api/client.ts     # Fetch wrapper, CSRF, token refresh
│   └── services/         # tokenStorage (Capacitor Preferences + localStorage fallback)
├── server/src/           # Backend (Express + TS, port 4000)
│   ├── routes/           # 14 files: auth, sims, agents, sellers, operations, alerts, admin, upload, users, customers, distributions, reports, inventories, feature-flags
│   ├── middleware/        # auth.ts, circuit-breaker.ts, bulkhead.ts, retry.ts, maintenance.ts, metrics.ts
│   ├── index.ts          # App setup, rate limiters (9), CSP, CORS, migrations, startup
│   ├── db.ts             # pg Pool (max=8, idle=20s), query(), transaction() helper
│   ├── validation.ts     # 16 Zod schemas, stripHtml() XSS prevention
│   ├── logger.ts         # Structured JSON, 8 secret-redaction patterns
│   ├── migrations/       # 022 *.sql auto-applied on startup (sorted by filename)
│   └── __tests__/        # Backend unit tests (Vitest)
├── android/              # Capacitor Android project (compileSdk 36, minSdk 24)
├── qa-tests/             # Playwright E2E certification suite
├── .github/workflows/    # 6 workflows: ci, deploy, android, docker-verify, codeql, testsprite
├── .testsprite/          # TestSprite test artifacts and results
├── Dockerfile            # 3-stage build: frontend-build → server-build → final Alpine (SHA-pinned)
└── render.yaml           # Render web service config (Docker, oregon, free plan)
```

Everything runs from root `package.json`. Server has its own `server/package.json`.

## Essential Commands

```bash
# Full local dev (two terminals)
npm run server            # Backend on port 4000 (tsx watch)
npm run dev               # Frontend on port 3000 (Vite)

# TypeScript check both layers (THEY ARE INDEPENDENT)
npx tsc --noEmit          # Frontend only (ESNext/bundler/tsconfig.json)
cd server && npx tsc --noEmit && cd ..   # Backend only (ES2020/commonjs/server/tsconfig.json)

# Tests (776 tests, 41 files, ~15s)
npx vitest run

# Playwright E2E (60 tests, needs both servers running)
npx playwright test qa-tests/e2e-final-certification.spec.cjs

# TestSprite
testsprite test run --all --project ae188b56-e8c8-47ae-98f0-bb0d01f6b385 --target-url https://yementelecom1.netlify.app --wait --timeout 600

# Builds
npm run build              # Frontend (Vite → dist/, ~7.5s)
cd server && npx tsc && cd ..  # Backend (TS → server/dist/)
npm run build:android      # Frontend + capacitor copy

# Android (requires JAVA_HOME pointing to JDK 21+)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-25.0.3.9-hotspot"
cd android; .\gradlew.bat assembleRelease --no-daemon    # APK (~1.5min)
cd android; .\gradlew.bat bundleRelease --no-daemon      # AAB
```

## Critical Quirks

- **Two TypeScript configs**: Frontend (`tsconfig.json`) targets ESNext/bundler/moduleResolution. Server (`server/tsconfig.json`) targets ES2020/commonjs/node. They are independent — running `tsc` from root only checks frontend.
- **`npm run lint` is `tsc --noEmit`**, not ESLint. ESLint config exists but is minimal (bans `Math.random()` in server code).
- **Backend process lifecycle**: `npm run server` via bash tool gets killed by `ChildProcess.kill` on tool-end. Use `Start-Process -WindowStyle Hidden -FilePath "powershell" -ArgumentList "cd <root>; $env:NODE_OPTIONS='--max-old-space-size=512'; npx tsx server/src/index.ts"` to keep it alive through Playwright runs.
- **Rate limiter ordering** (`server/src/index.ts`): All `app.use('/api/...', someLimiter)` calls must come BEFORE the route `app.use('/api/...', routes)` declarations or they never fire. This has been a repeated gotcha.
- **CORS**: `isDev` only activates when `NODE_ENV === 'development'` (exact string). Falls back to `CORS_ORIGIN` env var or localhost:3000 + web.app. Origin check is permissive to Capacitor `capacitor://` and `https://localhost`.
- **Migrations**: Auto-applied from `server/migrations/` on startup. Sorted by filename. Failed migrations log and retry (not silently marked done). All migrations must have `BEGIN;`/`COMMIT;` wrapping. No rollback scripts exist.
- **Auth flow**: JWT (HS256, 1h) + refresh token (7d, rotation) + CSRF (HMAC-SHA256, `crypto.timingSafeEqual`). Refresh token accepted from `req.body` intentionally (Capacitor mobile clients can't set httpOnly cookies). Login lockout after 5 failed attempts (15 min).
- **Backend needs both backend and frontend running for full Playwright suite.**
- **DB**: External Supabase PostgreSQL. `DB_SSL_REJECT_UNAUTHORIZED=false` is accepted risk. Pool config at `server/src/db.ts` (max=8, idle=20s, connTimeout=10s, stmtTimeout=15s). 22 migrations (001-022). 83 CREATE INDEX statements.
- **Manager credentials**: `manager` / `Admin@123` (dev/test only — reset utility at `server/src/reset-password.ts` uses `MANAGER_DEFAULT_PASSWORD` env var).
- **Android build requires JDK 21+**: Gradle 9.0 fails with JDK 17. Set `$env:JAVA_HOME` to JDK 21+ before building. System has JDK 25 at `C:\Program Files\Eclipse Adoptium\jdk-25.0.3.9-hotspot`.
- **Server npm audit**: 8 moderate vulnerabilities via firebase-admin (uuid, gaxios, google-gax transitive). Accepted risk — fixing requires breaking firebase-admin upgrade.

## Testing

- **Vitest**: Config in root `vitest.config.ts`. Runs both frontend (`src/__tests__/`) and backend (`server/src/__tests__/`) tests. 776 tests, 41 files, ~15s. No special setup needed.
- **Playwright E2E**: Config in `playwright.config.cjs`. Single spec: `qa-tests/e2e-final-certification.spec.cjs` — 60 tests across 12 sections (health, auth, CRUD, responsive, RTL, error handling, etc.). Manager login test uses `manager` / `Admin@123`. Expects frontend on :3000 and backend on :4000.
- **Both layers expect `NODE_ENV=production` or unset for correct CORS behavior.** Set explicitly when starting for E2E.
- **Coverage threshold**: 50% minimum for branches and lines, enforced in CI.

## Security Patterns (don't break these)

| Pattern | Location | Why |
|---------|----------|-----|
| CSRF nonce + `crypto.timingSafeEqual` | `index.ts` | Constant-time comparison prevents timing attacks |
| JWT `algorithms: ['HS256']` | `middleware/auth.ts:60` | Prevents algorithm confusion |
| CSP with nonce, no `unsafe-inline` | `index.ts:121-138` | XSS mitigation (per-request nonce) |
| Upload magic byte validation | `routes/upload.ts` | Beyond MIME + extension check |
| Token blacklist on logout/refresh | `routes/auth.ts` | Refresh token rotation + revocation |
| Agent-scoped queries for SIMs/agents | `routes/sims.ts`, `routes/agents.ts` | Prevents IDOR (agents see only own scope) |
| 98 parameterized queries | All route files | No SQL injection via string concatenation |
| Logger redacts secrets | `logger.ts:14-15` | 8 regex patterns, dual-layer redaction |
| 16 Zod schemas | `validation.ts` | Input validation + XSS stripping |
| 9 rate limiters | `index.ts` | Auth, refresh, write, delete, upload, admin, general |

## Android (Capacitor)

- App ID: `com.yemen.telecom`. SDK: 24 (min) / 36 (compile/target). AGP 8.9.1. Gradle 9.0.
- Release signing via env vars (`KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`, `KEY_PASSWORD`).
- Falls back to debug signing if env vars not set (with warning).
- CI builds APK + AAB on push to main + tags `v*`.
- ProGuard enabled with `minifyEnabled true` + `shrinkResources true`.
- `network_security_config.xml` restricts cleartext traffic. `allowBackup=false`.
- 5 Capacitor plugins: Firebase Auth, Firebase Storage, Keyboard, Preferences, StatusBar.
- `google-services.json` is gitignored.

## Infrastructure

- **Render**: `yemen-telecom-api` web service (Docker, oregon, free plan). Health check: `/api/health`. Auto-deploy disabled. Secret env vars synced via Dashboard (not in repo).
- **Docker**: 3-stage build (node:22.14.0-alpine, SHA-pinned). `ENV NODE_ENV=production`. Non-root `appuser`. `HEALTHCHECK` with wget. Production deps only (dev pruned after build). `--max-old-space-size=512`.
- **CI/CD**: 6 workflows — CI (validate→test→lint→load-test→e2e→testsprite), Deploy (with rollback), Android (APK+AAB), Docker verify (Trivy scan), CodeQL (weekly), TestSprite.
- **Health endpoints**: `/health`, `/readiness`, `/liveness`, `/api/health` (full with DB, memory, uptime).

## Existing Render Ops Checklist

When doing production checks (Render MCP available):
1. Verify Render MCP connection; workspace `tea-d8h32is2m8qs73ajnjsg`
2. List services; confirm `yemen-telecom-api` not suspended
3. Check latest deploy status (`live`)
4. Fetch recent logs for ERROR/WARN/OOM/timeouts/CORS/connection refused
5. Verify health check path (`/api/health`)
6. Check env vars exist (never display secret values)
7. Report `DB_SSL_REJECT_UNAUTHORIZED=false` if still set
8. Detect failed deploys, suspended services, memory pressure, cold start issues

Report findings in concise Arabic with 🟢/🟡/🔴. Never apply fixes without approval. Never delete resources or overwrite secrets.
