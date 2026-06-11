# Deployment Checklist

## Pre-Deployment
- [x] All 160 tests passing
- [x] TypeScript zero errors (frontend + server)
- [x] Production build: 2711 modules, 0 warnings
- [x] Android APK + AAB built successfully
- [x] Capacitor sync completed
- [x] Git audit passed (no secrets tracked)

## Environment Variables Required
| Variable | Source |
|---|---|
| `JWT_SECRET` | Generate with `crypto.randomBytes(64).toString('hex')` |
| `REFRESH_SECRET` | Generate separately |
| `CSRF_SECRET` | Generate separately |
| `DB_HOST` | Supabase connection pooler host |
| `DB_USER` | Supabase project user |
| `DB_PASSWORD` | Supabase project password |

## Database
- [ ] Run `server/migrations/001_performance_indexes.sql`
- [ ] Run `server/migrations/002_foreign_key_cascades.sql`
- [ ] Verify Supabase connection

## Android Play Store
- [ ] Create keystore: `keytool -genkey -v -keystore release.keystore -alias yemen-telecom`
- [ ] Set env vars: `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`, `KEY_PASSWORD`
- [ ] Build signed release: `./gradlew bundleRelease`
- [ ] Upload `app-release.aab` to Google Play Console
- [ ] Complete Data Safety section
- [ ] Host privacy policy
- [ ] Set up in-app updates

## Server Deployment (Render)
- [ ] Set environment variables in Render dashboard
- [ ] Deploy `server/` directory
- [ ] Verify health endpoint: `GET /api/health`
- [ ] Enable auto-deploy from `main` branch

## Post-Deployment
- [ ] Rotate Supabase credentials in production
- [ ] Verify login flow end-to-end
- [ ] Verify OCR scanning on physical device
- [ ] Monitor error logs for 24 hours
