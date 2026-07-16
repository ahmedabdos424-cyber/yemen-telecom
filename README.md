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
npm install
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
| `JWT_SECRET` | JWT signing secret |
| `REFRESH_SECRET` | Refresh token secret |
| `CSRF_SECRET` | CSRF token secret |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) |
| `SUPABASE_URL` | Supabase project URL (image uploads) |
| `SUPABASE_ANON_KEY` | Supabase anon/publishable key (image uploads) |
| `UPLOAD_BUCKET` | Supabase Storage bucket for uploads |

Frontend env vars (prefix with `VITE_`):

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

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
| `POST /api/auth/login` | No | Login (rate-limited) |
| `POST /api/auth/refresh` | No | Refresh token |
| `GET /api/csrf-token` | No | CSRF token |
| `GET /api/health` | No | Health check |
| `GET /api/stats` | Manager | Dashboard stats |
| `CRUD /api/sellers` | JWT | Seller management |
| `CRUD /api/agents` | JWT | Agent management |
| `CRUD /api/sims` | JWT | SIM inventory |
| `CRUD /api/admin/*` | Admin | Admin functions |

## Security

- JWT access + refresh token rotation
- CSRF protection (double-submit cookie pattern)
- Rate limiting (login: 10/15min, API: 100/min)
- Helmet security headers + CSP
- Input validation on all routes
- ProGuard rules for Android release

## Contributing

1. Create a feature branch from `main`
2. Make changes with updated tests
3. Run `npm run lint` (tsc) and `npm run build`
4. Submit PR with changelog entry
