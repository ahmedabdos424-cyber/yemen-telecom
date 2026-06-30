# Deployment Checklist — Yemen Telecom

## Pre-Deployment

### Secrets (Render Dashboard)
- [ ] Generate new `JWT_SECRET` (64 hex chars: `openssl rand -hex 32`)
- [ ] Generate new `REFRESH_SECRET` (64 hex chars)
- [ ] Generate new `CSRF_SECRET` (64 hex chars)
- [ ] Generate new `DB_PASSWORD` (Supabase dashboard)
- [ ] Generate new Firebase service account key (GCP Console → IAM → Service Accounts)
- [ ] Generate new `BACKUP_S3_*` credentials
- [ ] Update ALL secrets in Render dashboard
- [ ] Set `DB_SSL_REJECT_UNAUTHORIZED=true`
- [ ] Verify old secrets still work for 24h rollback window

### Database
- [ ] Run all pending migrations on production DB
- [ ] Verify migration 004: no duplicate agent phones
- [ ] Verify migration 008: no duplicate ID numbers/emails
- [ ] Create DOWN scripts for all 10 migrations
- [ ] Create CONCURRENTLY indexes for production (avoid locking)

### Application
- [ ] Verify `NODE_ENV=production` set in Render dashboard
- [ ] Verify `CORS_ORIGIN` points to production domain
- [ ] Verify `PORT=4000` matches Dockerfile EXPOSE
- [ ] Build Docker image locally and test
- [ ] Run full test suite: `npm test`
- [ ] Run frontend build: `npm run build`
- [ ] Run server build: `cd server && npx tsc`

### Docker
- [ ] Build: `docker build -t yemen-telecom .`
- [ ] Run: `docker run -p 4000:4000 yemen-telecom`
- [ ] Verify health: `curl http://localhost:4000/api/health`
- [ ] Verify non-root: `docker run --user=appuser yemen-telecom whoami`

## Deployment

### GitHub
- [ ] Commit all changes to `main` branch
- [ ] Verify CI passes (all 293 tests)
- [ ] Run `git log --oneline --all --graph` to verify branch state
- [ ] Push to `origin/main`
- [ ] Monitor CI pipeline completion

### Render
- [ ] Deploy via Render dashboard or webhook
- [ ] Monitor build logs for errors
- [ ] Verify health endpoint returns 200
- [ ] Verify database connection (health check includes DB status)
- [ ] Test login flow with test credentials
