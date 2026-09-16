# AGENTS.md — Yemen Telecom

React 19 + Vite 6 frontend (`src/`, port 3000) + Express + TypeScript backend (`server/src/`, port 4000) + Capacitor 8 Android (`android/`). DB is Supabase PostgreSQL via `pg` Pool (`server/src/db.ts`). Single vitest runner covers both.

## Response language

- Default to Arabic; use English only for filenames, identifiers, terminal commands, original error text, and library names.

## Two-package layout (dual-tier)

The repo has **two independent `node_modules` trees** and **two TypeScript configs**. Never mix them up.

| Scope | Location | Module system | TS config | Build tool | Type-check command |
|-------|----------|--------------|-----------|------------|-------------------|
| Frontend | root `/` | ESM (`"type": "module"`) | `tsconfig.json` (target ES2022, bundler resolution) | Vite 6 | `npm run lint` (= `tsc --noEmit`, covers `src/` only) |
| Backend | `server/` | CommonJS (`server/tsconfig.json`) | `server/tsconfig.json` (target ES2020, node resolution) | `npx tsc` → `server/dist/` | `cd server && npx tsc --noEmit` |

### Root commands (frontend)

```bash
npm install                    # install frontend deps
npm run dev                    # Vite on :3000
npm run lint                   # frontend tsc (src/ only)
npm run build                  # vite build → dist/
npm run server                 # tsx watch server/src/index.ts on :4000 (convenience wrapper)
npm run test                   # vitest run (all frontend + backend tests)
npm run build:android          # vite build && npx cap copy (assets → android/)
npm run cap:sync               # npx cap sync (Android Gradle sync)
```

### Server commands (backend)

```bash
cd server && npm install       # install server deps (separate package.json)
cd server && npm run build     # npx tsc → server/dist/
cd server && npm run start     # node dist/index.js (production)
cd server && npm run init-db   # npx tsx src/init-db.ts (apply schema + migrations)
cd server && npm run db:seed   # cd .. && tsx server/src/seed.ts (delegates to root)
```

- No ESLint/Prettier anywhere — `npm run lint` is just `tsc --noEmit`. Do not add formatter tooling.
- Path alias: `@/` maps to `src/` (frontend only, via `tsconfig.json` paths + `vite.config.ts` resolve.alias).
- Node `>=24` enforced by `engine-strict=true` (`.npmrc`, `.nvmrc`). CI uses Node 24.

## Verify before commit

```bash
npm run lint                           # frontend tsc
cd server && npx tsc --noEmit          # server type-check (needs --skipLibCheck in CI)
npm run build                          # vite build → dist/
cd server && npm run build             # tsc → server/dist/
npx vitest run src/__tests__/auth.test.ts            # one frontend test
npx vitest run server/src/__tests__/auth-integration.test.ts  # one backend test
cd android && .\gradlew assembleRelease  # only when android/ changed (needs signing env)
```

- CI order: Validate (tsc + builds) → Docker build → Tests → E2E → Deploy hook.

## Test execution scopes

Single vitest config (`vitest.config.ts`) covers **both tiers**:

```bash
npx vitest run                          # run all tests (frontend + backend)
npx vitest run src/__tests__/            # frontend tests only
npx vitest run server/src/__tests__/     # backend tests only
npx vitest run auth.test.ts             # single file by name (matches any tier)
npx vitest --watch                      # watch mode (all tiers)
```

### Live PostgreSQL integration tests

Server tests that need a real DB use `describeLivePostgres()` from `server/src/__tests__/setup.ts`. These tests **skip gracefully** when DB env vars are absent (reported, not failed):

```bash
# Run with live Postgres (DB integration tests execute):
DB_HOST=localhost DB_USER=postgres DB_PASSWORD=postgres DB_NAME=yemen_telecom npx vitest run server/src/__tests__/

# Run without Postgres (DB integration tests skip):
npx vitest run server/src/__tests__/     # unit tests only, DB tests auto-skip
```

- Required env vars for live DB: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- CI provides these via Postgres 17 service container with placeholder secrets
- Locally: `docker compose up -d` starts Postgres 17 on :5432 (credentials: `postgres/postgres`, db `yemen_telecom`)

### Vitest setup files (loaded before every test)

- `src/__tests__/setup.ts` — mocks `localStorage` for jsdom environment
- `server/src/__tests__/setup.ts` — provides default secrets (`JWT_SECRET`, `REFRESH_SECRET`, `CSRF_SECRET`, `BLACKLIST_HMAC_SECRET`), exposes `hasLivePostgres()` / `describeLivePostgres()` helpers

## Database migration & schema invariant

```bash
npx tsx server/src/init-db.ts    # apply schema.sql + all migrations (idempotent)
npm run db:seed                  # seed demo accounts (refuses to run with NODE_ENV=production)
```

### How it works

1. `init-db.ts` runs `schema.sql` first (creates all tables with `IF NOT EXISTS`)
2. Then applies numbered migration files from `server/migrations/` in lexicographic order
3. Each migration is recorded in `schema_migrations` table — re-runs skip already-applied files

### Critical invariant: `operations` table is partitioned

- `schema.sql` creates `operations` as a plain table (for clean-slate installs)
- Migration `033_indexing_and_partitioning.sql` rebuilds it as **range-partitioned by `created_at`** (yearly partitions: `operations_2025`, `operations_2026`, `operations_2027`, `operations_default`)
- If you modify the `operations` schema, the partition rebuild in 033 must be re-run or your changes only affect the non-partitioned `schema.sql` copy
- Some migrations manage their own `BEGIN/COMMIT` — `init-db.ts` detects this and runs them unwrapped (re-wrapping breaks with "no transaction in progress")

### No down-migrations

Rollback is manual, forward-only-correcting. See `init-db.ts` header comments for the procedure, or `docs/security/ROLLBACK_GUIDE.md` for the RLS precedent (migration 025).

## Local database (docker-compose)

```bash
docker compose up -d            # Postgres 17 on :5432 + Redis 7 on :6379
npx tsx server/src/init-db.ts   # apply schema + migrations (idempotent)
npm run db:seed                 # seed demo accounts
```

- `docker-compose.yml` uses `postgres:17-alpine` and `redis:7-alpine` with volume persistence. Credentials: `postgres/postgres`, db `yemen_telecom`.

## Env startup invariants (server will not boot without these)

Canonical file: `server/.env` (both `server/src/index.ts` and `db.ts` load `../.env` via dotenv). Root `.env` is reference only.

**Mandatory secrets — server exits(1) on missing:**

| Variable | Purpose | How to generate |
|----------|---------|----------------|
| `JWT_SECRET` | Access token signing | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `REFRESH_SECRET` | Refresh token signing | same generator |
| `CSRF_SECRET` | CSRF HMAC binding | same generator |
| `BLACKLIST_HMAC_SECRET` | Token blacklist HMAC | same generator |

**Production-only hard gate:**

| Variable | Rule | Code location |
|----------|------|---------------|
| `DB_SSL_REJECT_UNAUTHORIZED` | Must be `true` in production | `server/src/db.ts:27` — refuses to start otherwise |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Required when `NODE_ENV=production` | `server/src/db.ts:18` |

**Port resolution:** `API_PORT` wins over Render-injected `PORT` (`server/src/index.ts:68`).

## API / proxy / auth (do not redesign)

- Prod API is `https://yemen-telecom.onrender.com/api` (`PROD_API` in `src/api/client.ts`). Dev uses relative `/api` via Vite proxy. Never change this.
- `vite.config.ts` proxies `/api` → production by default; override with `VITE_PROXY_TARGET=http://localhost:4000` for local backend dev or E2E (`vite preview` on :4173 in CI).
- Mutations (POST/PUT/DELETE) require `X-CSRF-Token` + `X-CSRF-Hash` from `GET /api/csrf-token`. Auth is custom JWT access + refresh rotation with `token_blacklist` cleanup hourly.
- Capacitor WebView origin is `https://localhost` with no local server — the client always uses the absolute prod URL there. `allowNavigation` is set in `capacitor.config.ts`.

## APK self-update (all must move together)

`android/app/build.gradle` (`versionCode 24`, `versionName "1.1.0"`) ↔ `render.yaml` `APP_*` keys ↔ `server/.env.example`:

- `APP_VERSION` / `APP_VERSION_CODE` must match `versionName` / `versionCode`; `versionCode` must increase.
- `APP_APK_SHA256` (uppercase hex) + `APP_APK_SIZE` (exact bytes) verified client-side — stale values show "ملف التحديث تالف".
- Prefer `APP_APK_BUCKET` + `APP_APK_OBJECT` (private `apk-releases` bucket, per-request 1h signed URL); `APP_APK_URL` is fallback only.
- Never bypass/weakens the updater checks: SHA256, APK signature, installed-signature match, anti-downgrade `versionCode`.

## Capacitor / Android build verification

```bash
npm run build:android            # vite build → dist/ then npx cap copy (copies web assets to android/)
npm run cap:sync                 # npx cap sync (syncs Gradle plugins + AndroidManifest)
cd android && .\gradlew assembleDebug    # debug APK (no signing config needed)
cd android && .\gradlew assembleRelease  # release APK (needs signing env vars)
```

- `build:android` runs `vite build` then `cap copy` — always rebuild frontend before copying; stale `dist/` breaks the APK silently.
- `cap:sync` is needed when Capacitor plugins change (new plugin added or version bumped). `cap copy` alone only updates web assets.
- `capacitor.config.ts`: `webDir: 'dist'` — Capacitor reads from Vite's build output. If `dist/` is missing or stale, the Android app will show a blank screen.
- Release signing: `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`, `KEY_PASSWORD` env vars (or `app/key.properties` file).
- ProGuard rules: `android/app/proguard-rules.pro` (minification enabled for release builds).

## E2E testing (Playwright)

- Two Playwright configs exist: **root** `playwright.config.ts` (dev, boots Vite on :5173) and **`e2e/playwright.config.ts`** (CI, consumes `E2E_BASE_URL`, no webServer). Always use `e2e/playwright.config.ts` for CI-equivalent runs.
- Local E2E sequence:
  ```bash
  docker compose up -d                                    # local Postgres
  npx tsx server/src/init-db.ts && npm run db:seed        # schema + seed
  cd server && npm run build && node dist/index.js &      # API on :4000
  cd .. && VITE_PROXY_TARGET=http://localhost:4000 npx vite preview --port 4173 &
  npx playwright test --config=e2e/playwright.config.ts   # run E2E
  ```
- Login credentials: `E2E_MANAGER_USER`/`E2E_MANAGER_PASS` etc. (default: seeded `manager`/`agent`/`seller`).

## Deploy (Render, Docker)

- `render.yaml` service `yemen-telecom`, `healthCheckPath: /api/health`. Dockerfile has 3 stages (frontend → server → runtime, non-root `appuser`, heap capped at 384MB). Production entry: `node server/dist/index.js`, serves `dist/` as SPA root.
- Deploy is automatic: push to `main` → CI → `deploy.yml` curls `RENDER_DEPLOY_HOOK_URL`. Never commit failing builds.
- Treat `render.yaml`/Render dashboard as source of truth for prod. Never print secret values; no destructive prod ops without explicit approval.

## Conventions

- No new dependencies unless strictly required; prefer existing utilities.
- Tests: vitest `globals: true`, jsdom; frontend `src/**/*.test.{ts,tsx}`, backend `server/src/**/*.test.{ts,tsx}`; E2E Playwright config is `e2e/playwright.config.ts` (not the root one).
- Server `tsconfig.json` excludes `src/__tests__/`, `src/init-db.ts`, `src/seed.ts` from compilation.
- Skills: `.agents/skills/supabase/` (auto-loaded for Supabase work).
