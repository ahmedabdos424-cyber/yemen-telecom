# يمن تيليكوم — نظام إدارة التوزيع (Yemen Telecom Distribution Management System)

Full-stack SIM card distribution management system with offline Arabic OCR for identity card scanning.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 6 |
| Styling | Tailwind CSS 4 |
| Mobile | Capacitor 8 (Android) |
| Backend | Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Custom JWT (PostgreSQL-backed) |
| File Storage | Supabase Storage |
| OCR | Tesseract.js (offline, on-device) |
| Deploy | Render (server + web) |

## Project Structure

```
├── src/                # React frontend
│   ├── api/            # API client (CSRF-protected)
│   ├── components/     # Views, forms, shared components
│   ├── hooks/          # useOcr (offline OCR), useAgentSellerState
│   └── services/       # API/token storage wrappers
├── server/             # Express backend
│   └── src/
│       ├── routes/     # Auth, SIMs, sellers, agents, admin, reports, upload
│       └── db.ts       # Supabase connection
├── android/            # Capacitor Android project
├── public/tesseract/   # Offline OCR assets (WASM + Arabic traineddata)
└── scripts/            # Setup, tunnel
```

## Installation

```bash
git clone https://github.com/ahmedabdos424-cyber/yemen-telecom.git
cd yemen-telecom
npm install          # root — frontend deps
cd server && npm install  # server — backend deps (separate package.json)
```

## Environment Variables

Copy `.env.example` to `server/.env` and configure:

| Variable | Description |
|----------|-------------|
| `DB_HOST` | Supabase PostgreSQL host |
| `DB_PORT` | PostgreSQL port (5432) |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | JWT signing secret (≥32 chars in production) |
| `REFRESH_SECRET` | Refresh token secret (≥32 chars in production) |
| `CSRF_SECRET` | CSRF token secret (≥32 chars in production) |
| `BLACKLIST_HMAC_SECRET` | Token-blacklist HMAC key — **required, server refuses to start without it** |
| `RESET_CONFIRM_TOKEN` | Confirmation token for `POST /api/admin/reset` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) |
| `REDIS_URL` | Redis URL for distributed login lockout (optional — memory + DB fallback) |
| `APP_VERSION` / `APP_VERSION_CODE` | Must match `android/app/build.gradle` versionName/versionCode |
| `APP_APK_SHA256` / `APP_APK_SIZE` | APK integrity values verified client-side |
| `APP_APK_BUCKET` / `APP_APK_OBJECT` | Private bucket/object for per-request signed APK URLs (`APP_APK_URL` is fallback) |
| `BACKUP_S3_ENDPOINT` / `BACKUP_S3_REGION` / `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` / `BACKUP_S3_BUCKET` | S3-compatible backup storage |
| `BACKUP_ENCRYPTION_KEY` | Backup encryption key (required in production) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | FCM push notifications (optional) |
| `SUPABASE_URL` | Supabase project URL (image uploads) |
| `SUPABASE_ANON_KEY` | Supabase anon/publishable key (image uploads) |
| `UPLOAD_BUCKET` | Supabase Storage bucket for uploads |

Frontend env vars (prefix with `VITE_`):

| Variable | Description |
|----------|-------------|
| `VITE_PROXY_TARGET` | Dev/preview API proxy target (default: production) |
| `VITE_SENTRY_DSN` | Frontend Sentry DSN (optional) |
| `VITE_SENTRY_RELEASE` | Frontend release tag for Sentry (optional) |

## Development

```bash
# Start frontend dev server (port 3000)
npm run dev

# Start backend server (port 4000)
npm run server

# Seed database
npm run db:seed
```

## Android Build

### Prerequisites

- Android Studio (with SDK API 35)
- JDK 17+
- Android SDK build-tools

### Steps

```bash
# 1. Build frontend + sync to Android
npm run build:android

# 2. Open Android project in Android Studio
cd android
# Open android/ folder in Android Studio

# 3. Debug build (from Android Studio or CLI)
cd android
.\gradlew assembleDebug

# 4. Release build (requires signing config)
# Set env vars for signing:
$env:KEYSTORE_PASSWORD="your-password"
$env:KEYSTORE_ALIAS="your-alias"
$env:KEY_PASSWORD="your-key-password"
.\gradlew assembleRelease
```

Output:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## OCR Setup

OCR runs entirely offline using Tesseract.js. All assets are bundled:

```
public/tesseract/
├── js/
│   ├── worker.min.js          # Tesseract worker
│   ├── tesseract-core.wasm    # WASM core (basic)
│   ├── tesseract-core-simd*.wasm  # SIMD-optimized variants
│   └── tesseract-core-lstm*.wasm  # LSTM variants
└── lang/
    └── ara.traineddata.gz     # Arabic language data (1.6 MB)
```

OCR pipeline:
1. Camera capture (1280px max) → JPEG 0.7
2. Blur detection (Laplacian variance < 3 → reject)
3. Low-light detection (brightness < 40 → reject)
4. Image preprocessing (grayscale + contrast 1.4x)
5. Tesseract recognition (in Web Worker)
6. Post-processing (dedup, Arabic-filter, validate ≥ 2 words)

## Supabase Configuration

Database schema: `server/src/schema.sql`

Seed data: `server/src/seed.ts`

Key tables: `users`, `sellers`, `sims`, `agents`, `operations`, `inventories`, `alerts`, `token_blacklist`

## API Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/auth/login` | No | Login (5 attempts/15min + escalating lockout) |
| `POST /api/auth/refresh` | No (+CSRF) | Refresh token rotation (20/15min) |
| `POST /api/auth/logout` | JWT | Logout, revokes tokens + session |
| `GET /api/auth/me` | JWT | Current user profile + session checks |
| `GET /api/csrf-token` | No | CSRF token pair (30/min) |
| `GET /api/health` | No | Health check (always 200, `ok`/`degraded`) |
| `GET /api/stats` | Manager | Dashboard stats (cached 5 min) |
| `CRUD /api/sellers` | JWT (scoped) | Seller management + balance + password reset |
| `CRUD /api/agents` | Manager (+self-read) | Agent management |
| `CRUD /api/sims` | JWT (scoped) | SIM inventory + activate + agent→seller transfer |
| `GET/POST /api/operations` | JWT (scoped) | Activation/recharge log (idempotent) |
| `GET/PUT /api/inventories` | JWT / Manager | Stock overview + updates |
| `GET/POST /api/customers` | JWT (scoped) | Customer registry + search |
| `GET/POST/PUT /api/distributions` | Agent/Manager | Stock requests + approval |
| `GET /api/reports/*` | Manager/Agent (scoped) | daily-sales, performance, activations (paged, `X-Total-Count`) |
| `GET/DELETE /api/alerts` | Manager | Alerts (delete returns 404 when missing) |
| `POST/DELETE /api/notifications/device-token` | JWT (self) | FCM token register/unregister |
| `POST /api/upload/image(s)` | JWT | Image upload (magic bytes, 5MB, 413 on overflow) |
| `GET /api/upload/signed/:filename` | JWT (owner) | Fresh signed URL for owned documents |
| `PUT /api/users/*` | JWT (self) | Password, profile, preferences |
| `GET /api/app-version` | No | Public updater metadata (no-store, https-only APK) |
| `POST /api/app-update-installed` | No (+CSRF, 30/15min) | Install telemetry (deviceId required) |
| `CRUD /api/admin/*` | Manager | Batch SIMs, audit logs, settings, lockdown, identities |

## Security

- JWT access + refresh token rotation
- CSRF protection (HMAC-bound token pair, rotated on login)
- Rate limiting (login 5/15min + escalating username+IP lockout in memory, DB and Redis; refresh 20/15min; writes 30/min; API 100/min; transfers 10/min)
- Numeric `:id` params validated (400, never 500); unique conflicts return 409
- Helmet security headers + CSP
- Input validation on all routes
- ProGuard rules for Android release

## Contributing

1. Create a feature branch from `main`
2. Make changes with updated tests
3. Run `npm run lint` (tsc) and `npm run build`
4. Submit PR with changelog entry
