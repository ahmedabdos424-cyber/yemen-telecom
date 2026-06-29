# Master Implementation Plan — Yemen Telecom

> Generated from source code ground truth analysis.
> Current state: Production deployment blocked by missing environment variables.

---

## P0 — Critical (blocking production deployment)

These items prevent the application from serving traffic in production. The health check currently returns 503 and the backend cannot connect to the database or Firebase.

| # | Item | Severity | Impact | Files Affected | Dependencies | Est. Hours | Order |
|---|------|----------|--------|----------------|--------------|------------|-------|
| 1 | Configure DB env vars in Render (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) | Critical | Backend cannot connect to PostgreSQL — every request fails with `db:disconnected`. Health check returns 503. | `src/config/database.ts`, `render.yaml` | None | 0.5 | 1 |
| 2 | Set Firebase Admin credentials in Render (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, etc.) | Critical | Image upload endpoints (SIM card photos) return 500. Firebase Admin SDK throws `APP_NOT_INITIALIZED`. | `src/config/firebase.ts`, `src/middleware/upload.ts` | None | 0.5 | 2 |
| 3 | Verify health check endpoint responds 200 | Critical | Render load balancer marks service as unhealthy and may restart it. No traffic routed until 200. | `src/routes/health.ts`, `render.yaml` (healthCheckPath) | #1 (DB must respond) | 0.5 | 3 |
| 4 | Set DB_SSL_REJECT_UNAUTHORIZED=true | Critical | Database connection sent over plain TLS without certificate validation — MITM risk on production data in transit. | `src/config/database.ts` | None (set in Render env vars) | 0.25 | 4 |
| 5 | Verify CORS_ORIGIN matches production domain | Critical | Cross-origin requests from production frontend rejected with 403. Users see blank screen on login. | `src/middleware/cors.ts`, `render.yaml` | None (set frontend URL) | 0.25 | 5 |

**Est. total P0: 2 hours**

---

## P1 — High (security & reliability)

These items address compliance gaps, operational visibility, and deployment safety.

| # | Item | Severity | Impact | Files Affected | Dependencies | Est. Hours | Order |
|---|------|----------|--------|----------------|--------------|------------|-------|
| 1 | Add `cleanup_expired_tokens()` function + scheduled cron job | High | Token blacklist table grows unbounded — 1.5M rows/month estimated. Query performance degrades, eventual OOM on free tier. | `src/db/migrations/006_cleanup_expired_tokens.sql`, `src/cron/cleanupTokens.ts`, `render.yaml` (cron job) | P0 #1 (DB connected) | 3 | 1 |
| 2 | Implement audit log writes (middleware for all POST/PUT/DELETE) | High | No record of who created/modified/deleted SIMs, users, or distributions. Compliance failure for telecom regulatory audit. | `src/middleware/audit.ts`, `src/db/migrations/007_audit_logs_fix.sql` (fix dead table), `src/routes/*.ts` | P0 #1 (DB connected) | 6 | 2 |
| 3 | Add HTTPS redirect + HSTS headers | High | Traffic served over HTTP if user types `http://`. HSTS missing means no browser-enforced TLS. | `src/middleware/security.ts` (Express), `render.yaml` (Render enforces HTTPS upstream) | None | 1 | 3 |
| 4 | Implement structured logging (winston/pino) | High | All logging uses `console.error()` — no levels, no JSON, no searchability. Debugging production issues requires guessing. | `src/config/logger.ts`, `src/middleware/requestLogger.ts`, all route files (replace console.error) | None | 3 | 4 |
| 5 | Add request ID tracking middleware | High | Cannot correlate log lines to a single request. Distributed debugging impossible without trace IDs. | `src/middleware/requestId.ts`, `src/config/logger.ts` | P1 #4 (structured logging) | 1 | 5 |
| 6 | Add CI/CD pipeline (GitHub Actions) | High | Every deploy requires manual `git push` + Render dashboard click. No automated tests run before deploy. No rollback automation. | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` | None | 4 | 6 |
| 7 | Set up external monitoring (healthchecks.io + Sentry) | High | Zero alerting if service goes down. No error tracking — crashes are invisible until users report them. | `src/config/sentry.ts`, `src/middleware/errorHandler.ts` | P1 #4 (structured logging) | 2 | 7 |

**Est. total P1: 20 hours**

---

## P2 — Medium (feature completion)

These items complete planned features already present in configuration or UI stubs.

| # | Item | Severity | Impact | Files Affected | Dependencies | Est. Hours | Order |
|---|------|----------|--------|----------------|--------------|------------|-------|
| 1 | Implement 2FA (already in settings config) | Medium | Users can't enable 2FA despite UI showing the option. Account security gap for privileged roles. | `src/routes/auth.ts`, `src/middleware/twoFactor.ts`, `src/config/settings.ts` | P0 #1, P1 #2 (audit) | 8 | 1 |
| 2 | Implement password expiry enforcement | Medium | Old passwords never expire. Stale credentials increase breach surface area. | `src/middleware/passwordExpiry.ts`, `src/db/migrations/008_password_expiry.sql` | P0 #1 | 3 | 2 |
| 3 | Add push notifications for distribution approvals (FCM) | Medium | Managers not notified when distribution needs approval. Delays of hours to days waiting for manual check. | `src/services/notification.ts`, `src/config/firebase.ts` (add FCM), `src/routes/distributions.ts` | P0 #2 (Firebase creds) | 6 | 3 |
| 4 | Add scheduled automated backups | Medium | No off-site backup of production database. Data loss scenario: 0 recovery path. | `src/cron/backup.ts`, `src/config/s3.ts` | P0 #1 (DB connected), backup S3 env vars | 4 | 4 |
| 5 | Complete PWA service worker (sw.js) | Medium | Frontend cached assets not served offline. "Add to home screen" prompt missing. | `public/sw.js`, `src/main.tsx` (register) | None | 2 | 5 |
| 6 | Add Firebase App Check | Medium | Firebase Storage endpoint accessible without attestation. No protection against unauthorized uploads. | `src/config/firebase.ts`, Firebase Console configuration | P0 #2 (Firebase creds) | 3 | 6 |
| 7 | Add Crashlytics + Performance Monitoring | Medium | No visibility into frontend crashes or slow screens. User complaints are the only signal. | `src/config/firebase.ts` (add Firebase Performance), `main.tsx` | P0 #2 (Firebase creds) | 2 | 7 |

**Est. total P2: 28 hours**

---

## P3 — Low (enhancements)

These items improve code quality, performance, and feature surface but are not production blockers.

| # | Item | Severity | Impact | Files Affected | Dependencies | Est. Hours | Order |
|---|------|----------|--------|----------------|--------------|------------|-------|
| 1 | Extract business logic into service layer | Low | Route handlers contain inline SQL and business logic. Hard to unit test, hard to reuse. | `src/services/*.ts`, `src/routes/*.ts` (refactor) | None | 20 | 1 |
| 2 | Add caching layer (Redis) | Low | Repeated identical queries hit Postgres every time. SIM list queries (most frequent) are uncached. | `src/config/redis.ts`, `src/middleware/cache.ts`, `src/routes/sims.ts` | P0 #1 | 8 | 2 |
| 3 | Add API versioning | Low | Breaking API changes affect all mobile/web clients simultaneously. No migration path. | `src/routes/v1/*.ts`, `src/app.ts` (mount prefix) | None | 4 | 3 |
| 4 | Add message queue for async OCR processing | Low | OCR blocks SIM creation request. User waits 5-15s for OCR result on each upload. | `src/queue/ocr.ts`, `src/config/queue.ts`, `src/services/ocr.ts` | P3 #2 (Redis for Bull/BullMQ) | 10 | 4 |
| 5 | Add Firebase Auth integration with Capacitor | Low | Users must sign in via browser. Native sign-in with biometrics unavailable on Android. | `android/app/src/main/java/...`, `src/plugins/firebaseAuth.ts` | P0 #2 (Firebase creds) | 6 | 5 |
| 6 | Add email/SMS integration | Low | No automated email or SMS sending. Password resets, notifications, 2FA codes all blocked. | `src/services/email.ts`, `src/services/sms.ts`, `src/config/smtp.ts` | None | 5 | 6 |
| 7 | Add iOS support via Capacitor | Low | iOS users cannot install the app. App Store distribution requires Apple Developer Program. | `ios/` directory, Capacitor iOS config | P2 #5 (PWA) | 8 | 7 |
| 8 | Add end-to-end tests | Low | No E2E test coverage. Regression risk on every deploy. | `tests/e2e/`, Playwright config | None | 16 | 8 |
| 9 | Add load test suite | Low | Unknown performance under load. No data for capacity planning or scaling decisions. | `tests/load/`, k6 script | None | 8 | 9 |

**Est. total P3: 85 hours**

---

## Summary

| Priority | Items | Est. Hours | Blocking Production? |
|----------|-------|------------|---------------------|
| P0 — Critical | 5 | 2 | ✅ Yes |
| P1 — High | 7 | 20 | ❌ No (but high risk) |
| P2 — Medium | 7 | 28 | ❌ No |
| P3 — Low | 9 | 85 | ❌ No |
| **Total** | **28** | **135** | |

## Sequencing Diagram

```
Week 1 (Go-live sprint)
  P0-1 → P0-2 → P0-3 → P0-4 → P0-5
       ↕
  P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6 → P1-7
          ↓
Week 2-3 (Feature complete)
  P2-1 → P2-2 → P2-3 → P2-4 → P2-5 → P2-6 → P2-7

Week 4+ (Enhancements)
  P3-1 → P3-2 → P3-3 → P3-4 → P3-5 → P3-6 → P3-7 → P3-8 → P3-9
```

## GO / NO-GO Checklist

| Check | Status | Notes |
|-------|--------|-------|
| DB env vars set in Render | ❌ | Must set all 5 |
| Firebase creds set in Render | ❌ | Must set all 7+ |
| Health check returns 200 | ❌ | Currently 503 |
| DB_SSL_REJECT_UNAUTHORIZED=true | ❌ | Currently unset/false |
| CORS_ORIGIN matches domain | ❌ | Must verify |
| Audit logging writes | ❌ | Dead table, no middleware |
| CI/CD pipeline | ❌ | Manual deploys only |
| External monitoring | ❌ | No alerting at all |
