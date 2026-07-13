# Yemen Telecom — Agent Guide

## Repo Layout

```
├── src/                  # Frontend (React + Vite + TS, port 3000)
│   ├── components/       # Pages, shared components
│   ├── hooks/            # useAuth, useManagerState, useAgentSellerState
│   ├── api/client.ts     # Fetch wrapper, CSRF, token refresh
│   └── services/         # tokenStorage (Capacitor Preferences + localStorage fallback)
├── server/src/           # Backend (Express + TS, port 4000)
│   ├── routes/           # One file per resource: auth, sims, agents, sellers, ...
│   ├── middleware/auth.ts # JWT verify (HS256), requireRole, token blacklist
│   ├── index.ts          # App setup, rate limiters, CSP, CORS, migrations, startup
│   ├── db.ts             # pg Pool, query(), transaction() helper
│   ├── migrations/       # *.sql auto-applied on startup (by filename order)
│   └── __tests__/        # Backend unit tests (Vitest)
├── android/              # Capacitor Android project
├── qa-tests/             # Playwright E2E certification suite
├── .github/workflows/    # 6 workflows: ci, deploy, android, docker-verify, codeql, testsprite
├── .testsprite/          # TestSprite test artifacts and results
├── .claude/skills/       # TestSprite agent skills (verify, onboard)
├── Dockerfile            # 3-stage build: frontend-build → server-build → final Alpine
└── render.yaml           # Render web service config (Docker, oregon, free plan)
```

Everything runs from root `package.json`. Server has its own `server/package.json`.

## Essential Commands

```bash
# Full local dev (two terminals)
npm run server            # Backend on port 4000 (tsx watch)
npm run dev               # Frontend on port 3000 (Vite)

# TypeScript check both layers
npx tsc --noEmit          # Frontend
cd server && npx tsc --noEmit && cd ..   # Backend

# Tests
npx vitest run                          # Unit: 294 tests, 15 files, ~6s
npx playwright test qa-tests/e2e-final-certification.spec.cjs   # E2E: 60 tests, ~4min

# TestSprite
testsprite --version                    # Check CLI version (0.3.0)
testsprite auth status                  # Verify authentication
testsprite test list --project ae188b56-e8c8-47ae-98f0-bb0d01f6b385  # List tests
testsprite test run <test-id> --target-url https://yementelecom1.netlify.app --wait --timeout 180  # Run test
testsprite test run --all --project ae188b56-e8c8-47ae-98f0-bb0d01f6b385 --target-url https://yementelecom1.netlify.app --wait --timeout 600  # Run all

# Builds
npm run build              # Frontend (Vite → dist/)
cd server && npx tsc && cd ..  # Backend (TS → server/dist/)
npm run build:android      # Frontend + capacitor copy
```

## Critical Quirks

- **Backend process lifecycle**: `npm run server` via bash tool gets killed by `ChildProcess.kill` on tool-end. Use `Start-Process -WindowStyle Hidden -FilePath "powershell" -ArgumentList "cd <root>; `$env:NODE_OPTIONS='--max-old-space-size=512'; npx tsx server/src/index.ts"` to keep it alive through Playwright runs.
- **Rate limiter ordering** (`server/src/index.ts`): All `app.use('/api/...', someLimiter)` calls must come BEFORE the route `app.use('/api/...', routes)` declarations or they never fire. This has been a repeated gotcha.
- **CORS**: `isDev` only activates when `NODE_ENV === 'development'` (exact string). Falls back to `CORS_ORIGIN` env var or localhost:3000 + web.app. Origin check is permissive to Capacitor `capacitor://` and `https://localhost`.
- **Migrations**: Auto-applied from `server/migrations/` on startup. Sorted by filename. Failed migrations log and retry (not silently marked done). All migrations must have `BEGIN;`/`COMMIT;` wrapping. No rollback scripts exist.
- **Auth flow**: JWT (HS256, 1h) + refresh token (7d, rotation) + CSRF (HMAC-SHA256, `crypto.timingSafeEqual`). Refresh token accepted from `req.body` intentionally (Capacitor mobile clients can't set httpOnly cookies). Login lockout after 5 failed attempts (15 min).
- **Backend needs both backend and frontend running for full Playwright suite.**
- **DB**: External Supabase PostgreSQL. `DB_SSL_REJECT_UNAUTHORIZED=false` is accepted risk. Pool config at `server/src/db.ts`. Migrations 001-013 applied.
- **Manager credentials**: `manager` / `Admin@123` (dev/test only — reset utility at `server/src/reset-password.ts` uses `MANAGER_DEFAULT_PASSWORD` env var).

## Testing

- **Vitest**: Config in root `vitest.config.ts`. Runs both frontend (`src/__tests__/`) and backend (`server/src/__tests__/`) tests. No special setup needed.
- **Playwright E2E**: Config in `playwright.config.ts`. Single spec: `qa-tests/e2e-final-certification.spec.cjs` — 60 tests across 12 sections (health, auth, CRUD, responsive, RTL, error handling, etc.). Manager login test uses `manager` / `Admin@123`. Expects frontend on :3000 and backend on :4000.
- **Both layers expect `NODE_ENV=production` or unset for correct CORS behavior.** Set explicitly when starting for E2E.

## Security Patterns (don't break these)

| Pattern | Location | Why |
|---------|----------|-----|
| CSRF nonce + `crypto.timingSafeEqual` | `index.ts:166-182` | Constant-time comparison prevents timing attacks |
| JWT `algorithms: ['HS256']` | `middleware/auth.ts:59` | Prevents algorithm confusion |
| CSP with nonce, no `unsafe-inline` | `index.ts:78-95` | XSS mitigation |
| Upload magic byte validation | `routes/upload.ts:55-57` | Beyond MIME + extension check |
| Token blacklist on logout/refresh | `routes/auth.ts:86-89,122-125` | Refresh token rotation + revocation |
| Agent-scoped queries for SIMs/agents | `routes/sims.ts:34-37`, `routes/agents.ts:16` | Prevents IDOR (agents see only own scope) |
| Parameterized queries everywhere | All route files | No SQL injection via string concatenation |
| Logger redacts secrets | `logger.ts:3-15` | Passwords, tokens, keys scrubbed from output |

## Android (Capacitor)

- App ID: `com.yemen.telecom`. SDK: 24 (min) / 36 (target). AGP 8.9.1.
- Release signing via env vars (`KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`, `KEY_PASSWORD`).
- CI builds APK + AAB on push to main + tags `v*`.
- Custom `network_security_config.xml` restricts cleartext traffic. `config.xml` Cordova CSP allows `*` (required for webview API calls).
- `google-services.json` is gitignored (uncommented in `android/.gitignore`).

## Infrastructure

- **Render**: `yemen-telecom-api` web service (Docker, oregon, free plan). Health check: `/api/health`. Auto-deploy disabled. Secret env vars synced via Dashboard (not in repo).
- **Docker**: Multi-stage (node:22-alpine). `ENV NODE_ENV=production`. Non-root `appuser`. `HEALTHCHECK` with wget. Production deps only (dev pruned after build).
- **CI/CD**: 5 workflows — CI (lint+test), Deploy, Android (APK+AAB), Docker verify, CodeQL. No Gradle cache in Android CI.

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
