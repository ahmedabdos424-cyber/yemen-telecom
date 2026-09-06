# AGENTS.md — Yemen Telecom

React 19 + Vite 6 frontend (`src/`, port 3000) + Express + TypeScript backend (`server/src/`, port 4000) + Capacitor 8 Android (`android/`). DB is Supabase PostgreSQL via `pg` Pool (`server/src/db.ts`). Single vitest runner covers both.

## Response language

- Default to Arabic; use English only for filenames, identifiers, terminal commands, original error text, and library names.

## Install / run (two separate installs)

```bash
npm install              # root — frontend deps
cd server && npm install # server — backend deps (separate package.json)
npm run dev              # Vite on :3000 (frontend)
npm run server           # tsx watch server/src/index.ts on :4000
```

- Root is ESM (`"type": "module"`); server is CommonJS (`server/tsconfig.json`). Keep it that way.
- Node `>=24` enforced by `engine-strict=true` (`.npmrc`, `.nvmrc`). CI uses Node 24.
- No ESLint/Prettier — `npm run lint` is `tsc --noEmit`. Do not add formatter tooling.

## Verify before commit

```bash
npm run lint                    # frontend tsc (covers src/ only per tsconfig include)
cd server && npx tsc --noEmit   # server type-check (needs --skipLibCheck in CI)
npm run build                   # vite build → dist/
cd server && npm run build      # tsc → server/dist/
npx vitest run src/__tests__/auth.test.ts            # one frontend test
npx vitest run server/src/__tests__/auth-integration.test.ts  # one backend test
cd android && .\gradlew assembleRelease  # only when android/ changed (needs signing env)
```

- CI order: Validate (tsc + builds) → Docker build → Tests → E2E → Deploy hook. CI runs Postgres 17 service container with placeholder secrets, not Supabase.

## Env quirks (verified in code)

- Canonical file is `server/.env` — both `server/src/index.ts` and `db.ts` load `../.env`. Root `.env` is reference only.
- Server exits(1) without `JWT_SECRET`, `REFRESH_SECRET`, `CSRF_SECRET`, `BLACKLIST_HMAC_SECRET`. Generate 64-hex-char values: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
- `DB_SSL_REJECT_UNAUTHORIZED` must be `true` in production — `db.ts` refuses to start otherwise. Never set it `false` in prod.
- Port: `API_PORT` wins over Render-injected `PORT` (`server/src/index.ts`).

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

## Database

- Schema: `server/src/schema.sql`; migrations in `server/migrations/` applied by `npx tsx server/src/init-db.ts` (tracks `schema_migrations`; some files manage their own `BEGIN/COMMIT` — do not re-wrap).
- `npm run db:seed` (`tsx server/src/seed.ts`) refuses to run with `NODE_ENV=production`. Seed passwords via `SEED_PASSWORD_MANAGER/AGENT/SELLER` (must match `(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}`) or random ones are generated.
- DB tests need a live Postgres via `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` env vars.

## Deploy (Render, Docker)

- `render.yaml` service `yemen-telecom`, `healthCheckPath: /api/health`. Dockerfile has 3 stages (frontend → server → runtime, non-root `appuser`, heap capped at 384MB). Production entry: `node server/dist/index.js`, serves `dist/` as SPA root.
- Deploy is automatic: push to `main` → CI → `deploy.yml` curls `RENDER_DEPLOY_HOOK_URL`. Never commit failing builds.
- Treat `render.yaml`/Render dashboard as source of truth for prod. Never print secret values; no destructive prod ops without explicit approval.

## Conventions

- No new dependencies unless strictly required; prefer existing utilities.
- Tests: vitest `globals: true`, jsdom; frontend `src/**/*.test.{ts,tsx}`, backend `server/src/**/*.test.{ts,tsx}`; E2E Playwright config is `e2e/playwright.config.ts` (not the root one).
- Skills: `.agents/skills/supabase/` (auto-loaded for Supabase work), `.claude/skills/testsprite-verify/` (run relevant TestSprite tests before reporting a fix done).
