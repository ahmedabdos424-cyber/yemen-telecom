# Deployment Checklist

## Pre-Deployment

### Environment Variables — Render Dashboard
- [ ] NODE_ENV = `production`
- [ ] API_PORT = `4000`
- [ ] DB_HOST — Supabase host
- [ ] DB_PORT = `5432`
- [ ] DB_USER — Supabase user
- [ ] DB_PASSWORD — Supabase password
- [ ] DB_NAME = `postgres`
- [ ] JWT_SECRET — 64-char hex (`crypto.randomBytes(32).toString('hex')`)
- [ ] REFRESH_SECRET — 64-char hex (different from JWT_SECRET)
- [ ] CSRF_SECRET — 64-char hex (different from both)
- [ ] CORS_ORIGIN — Comma-separated allowed origins incl. Firebase host
- [ ] FIREBASE_PROJECT_ID
- [ ] FIREBASE_PRIVATE_KEY — Full private key with `\n` for newlines
- [ ] FIREBASE_CLIENT_EMAIL
- [ ] FIREBASE_STORAGE_BUCKET
- [ ] FIREBASE_PRIVATE_KEY_ID
- [ ] FIREBASE_CLIENT_ID
- [ ] FIREBASE_CLIENT_CERT_URL
- [ ] BACKUP_S3_ENDPOINT — S3-compatible endpoint
- [ ] BACKUP_S3_REGION — e.g. `us-east-1`
- [ ] BACKUP_S3_ACCESS_KEY_ID
- [ ] BACKUP_S3_SECRET_ACCESS_KEY
- [ ] BACKUP_S3_BUCKET

### Android Release Build
- [ ] `google-services.json` placed at `android/app/google-services.json`
- [ ] `KEYSTORE_PASSWORD` env var set in CI/GitHub Secrets
- [ ] `KEYSTORE_ALIAS` env var set
- [ ] `KEY_PASSWORD` env var set
- [ ] Release keystore accessible (NOT in repo — use secure vault)
- [ ] versionCode and versionName updated in `android/app/build.gradle`
- [ ] Run `npm run build:android` and verify APK/AAB builds

### Firebase
- [ ] Firebase project `yemen-telecom-1699` exists
- [ ] Firebase Admin SDK service account has Storage admin role
- [ ] Firebase Storage bucket created and accessible
- [ ] Firebase Authentication enabled (if using phone auth)

### Supabase
- [ ] Database migrations up to date (run `npx tsx server/src/init-db.ts`)
- [ ] Supabase PITR (Point-in-Time Recovery) enabled (Pro plan)
- [ ] Database password rotated from default

## Deployment Steps

1. **Commit and push to main branch**
   - `git add render.yaml` (ensure deployment config is tracked)
   - `git commit -m "chore: update deployment config"`
   - `git push origin main`

2. **Render auto-deploy** (if enabled) or manual deploy
   - Go to Render Dashboard → yemen-telecom-api → Manual Deploy → Deploy latest commit
   - Monitor build logs for errors

3. **Verify health endpoint**
   - `curl https://yemen-telecom-api.onrender.com/api/health`
   - Expected: `{ "status": "ok", "environment": "production", ... }`

4. **Verify login**
   - `curl -X POST https://yemen-telecom-api.onrender.com/api/auth/login -H 'Content-Type: application/json' -d '{"username":"manager","password":"<SEED_PASSWORD_MANAGER>"}'`
   - Expected: 200 with JWT token

5. **Verify image upload**
   - Login first to get token
   - `curl -X POST https://yemen-telecom-api.onrender.com/api/upload/image -H 'Authorization: Bearer <TOKEN>' -F 'image=@test.jpg'`
   - Expected: 200 with Firebase Storage URL

6. **Verify backup**
   - Login as manager
   - `curl -X POST https://yemen-telecom-api.onrender.com/api/admin/system/backup -H 'Authorization: Bearer <TOKEN>'`
   - Expected: 200 with S3 download URL

## Post-Deployment

- [ ] Verify uptime monitoring alerts configured
- [ ] Run `npm test` — all tests pass
- [ ] Smoke test all CRUD operations via frontend
- [ ] Verify CSP headers: `curl -I https://yemen-telecom-api.onrender.com/ | grep content-security-policy`
- [ ] Verify CSRF token endpoint works: `curl https://yemen-telecom-api.onrender.com/api/csrf-token`
- [ ] Verify rate limiting: rapid requests to `/api/auth/login` return 429
- [ ] Remove local `server/.env` file (secrets are in Render Dashboard now)
- [ ] Confirm `render.yaml` is committed and pushed
