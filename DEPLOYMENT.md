# Deployment Checklist — Yemen Telecom

## Pre-Deploy (Before Merge to main)

### Code Quality
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] Vitest passes all tests (`npx vitest run`)
- [ ] Playwright E2E passes (`npx playwright test`)
- [ ] No new `Math.random()` usage (grep audit)
- [ ] No hardcoded secrets (grep audit)
- [ ] New routes have proper auth middleware
- [ ] New DB queries use parameterized statements

### Database
- [ ] New migrations are wrapped in `BEGIN;`/`COMMIT;`
- [ ] Migrations use `IF NOT EXISTS` / `IF EXISTS` (safe to re-run)
- [ ] Rollback script exists for new migration
- [ ] No `DROP TABLE` without `IF EXISTS`
- [ ] No destructive data changes without backup

### Security
- [ ] New endpoints have rate limiting
- [ ] Input validation via Zod schemas
- [ ] CORS whitelist updated if new origins needed
- [ ] CSP headers reviewed
- [ ] No `console.log` with sensitive data
- [ ] Firebase Admin SDK credentials verified

### Frontend
- [ ] New components are lazy-loaded
- [ ] No new large dependencies (> 100KB)
- [ ] Bundle size increase < 20KB gzipped
- [ ] Error boundaries in place for new sections

---

## Deploy Process

### Step 1: CI Passes
```
CI workflow must pass ALL 6 jobs:
  ✓ validate (TS + build)
  ✓ test (Vitest, 50% coverage)
  ✓ lint (audit + secrets)
  ✓ load-test (k6)
  ✓ e2e (Playwright)
  ✓ testsprite (deployed app)
```

### Step 2: Merge to main
```
git checkout main
git merge --squash feature-branch
git push origin main
```

### Step 3: Monitor Deploy Workflow
- [ ] Deploy workflow triggered automatically
- [ ] Render deploy hook returns 200
- [ ] Health check passes within 5 minutes
- [ ] No Discord failure notification

### Step 4: Post-Deploy Verification
```bash
# Run smoke tests against production
node server/scripts/smoke-test.js https://yemen-telecom.onrender.com

# Verify critical endpoints manually
curl https://yemen-telecom.onrender.com/api/health
curl https://yemen-telecom.onrender.com/api/stats -H "Authorization: Bearer $TOKEN"

# Check Render dashboard for:
#   - No memory pressure (should stay under 400MB)
#   - No spike in error rate
#   - Response times stable
```

---

## Rollback Procedures

### Automatic Rollback (Health Check Fails)
The deploy workflow automatically triggers `RENDER_ROLLBACK_HOOK_URL` if the health check fails after deploy.

### Manual Rollback — Render Dashboard
1. Go to Render Dashboard → yemen-telecom-api → Events
2. Find the last successful deploy (before the broken one)
3. Click "Manual Deploy" → "Deploy previous commit"
4. Wait for health check to pass

### Manual Rollback — Git Revert
```bash
git checkout main
git revert HEAD --no-edit
git push origin main
# This triggers a new deploy automatically
```

### Database Rollback
If a migration caused issues:
```bash
# Connect to production database
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Run the rollback script for the problematic migration
# Example: rolling back migration 019
\i server/migrations/rollback/019_operations_operator_status_index_rollback.sql

# Verify schema is correct
SELECT * FROM schema_migrations ORDER BY version;
```

### Emergency: Maintenance Mode
```bash
# Via API (requires manager auth)
curl -X POST https://yemen-telecom.onrender.com/api/feature-flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "maintenance_mode", "enabled": true, "value": {"message": "Emergency maintenance"}}'

# To disable
curl -X POST https://yemen-telecom.onrender.com/api/feature-flags/maintenance_mode/toggle \
  -H "Authorization: Bearer $TOKEN"
```

---

## Post-Deploy Monitoring

### First 30 Minutes
- [ ] Health check endpoint responding
- [ ] No 5xx errors in logs
- [ ] Memory usage stable (< 400MB)
- [ ] DB connection pool healthy
- [ ] Auth flow working (login + token refresh)

### First 24 Hours
- [ ] Error rate < 1%
- [ ] P95 latency < 500ms
- [ ] No memory leaks (heap growing unbounded)
- [ ] All scheduled tasks running (if any)

### Ongoing
- [ ] Weekly dependency audit (`npm audit`)
- [ ] Monthly security scan (CodeQL)
- [ ] Quarterly disaster recovery test

---

## Environment Variables Checklist

### Must Exist in Render Dashboard
- [ ] `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- [ ] `DB_SSL_REJECT_UNAUTHORIZED=false`
- [ ] `JWT_SECRET`, `REFRESH_SECRET`, `CSRF_SECRET`
- [ ] `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`
- [ ] `CORS_ORIGIN` (includes production + staging origins)
- [ ] `NODE_ENV=production`

### Optional But Recommended
- [ ] `DB_MAX_CONNECTIONS=10`
- [ ] `DB_SLOW_QUERY_MS=500`
- [ ] `REDIS_URL` (for distributed caching)
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` (for OpenTelemetry)
- [ ] `SENTRY_DSN` (for error tracking)
