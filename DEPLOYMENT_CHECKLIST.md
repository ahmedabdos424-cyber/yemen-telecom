# Deployment Checklist

Repository: `https://github.com/ahmedabdos424-cyber/yemen-telecom.git`
Release: `v1.0.0`
Date: 2026-06-08

---

## □ Git Commit Clean

- [x] `git status` shows only intended changes
- [x] No large binary files staged accidentally
- [x] All changes reviewed with `git diff --staged --stat`
- [x] `.env.example` updated if new vars added

## □ Secrets Removed

- [x] No `.env`, `.env.local`, `.env.production` in git tracking
- [x] No `*.jks`, `*.keystore` in git tracking
- [x] No `google-services.json` in git tracking
- [x] No `service-account.json` in git tracking
- [x] No hardcoded API keys or passwords in source code
- [x] `.gitignore` covers all sensitive files
- [x] `server/.env` exists on disk (not git-tracked)

## □ GitHub Push Ready

- [x] `CHANGELOG.md` generated and accurate
- [x] `README.md` rewritten with real documentation
- [x] Version tags consistent (`package.json` = `1.0.0`, Android = `1.0.0`)
- [x] Commit message follows conventional commits format
- [x] Tag name: `v1.0.0`
- [x] Remote configured: `origin → github.com/ahmedabdos424-cyber/yemen-telecom.git`
- [x] `.gitignore` cleaned (no duplicate sections)

## □ Supabase Verified

- [x] Schema applied: `server/src/schema.sql`
- [x] Seed data loaded: `npm run db:seed`
- [x] Connection string valid in `server/.env`
- [x] IPv4 force configured for connection pooling
- [x] Tables confirmed: users, sellers, sims, agents, operations, inventories, alerts, token_blacklist
- [x] Token blacklist cleanup function installed

## □ Render Verified

- [x] Server build works (`npm run build` on frontend only)
- [x] Environment variables configured in Render dashboard
- [x] Health endpoint (`/api/health`) returns `{ status: "ok" }`
- [x] CORS allows production origins (Firebase, Capacitor)
- [x] Trust proxy enabled for rate limiter behind Render reverse proxy
- [ ] Server runtime tested with Supabase connection (requires deployment)

## □ APK Tested

- [x] Release APK built: 25.2 MB
- [x] ProGuard (R8) minification enabled
- [x] No debug logs or debuggable flag in release build
- [x] Camera permission handling verified
- [x] OCR works offline (airplane mode tested)
- [ ] Manual test on physical Android device (API 29/31/34) — pending

## □ AAB Generated

- [x] Release AAB built: 26.37 MB
- [x] App signing configured in `build.gradle` (env var based)
- [x] versionCode: 2, versionName: 1.0.0
- [x] minSdk: 23 (Android 6.0), targetSdk: 35 (Android 15)
- [x] AAB ready for Google Play Console upload

## □ Backup Completed

- [ ] Git tag created (`v1.0.0`) — run after push
- [ ] `server/.env` backed up (contains Supabase credentials)
- [ ] `firebase-service-account.json` backed up
- [ ] `android/app/release.keystore` backed up (inaccessible without 3 env vars)
- [ ] Database backup via Supabase dashboard

---

## Pre-Deployment Runbook

### 1. Final Build Check
```powershell
npm run build
npm run lint     # Expected: 2 pre-existing TS errors (GeographicRiskView.tsx)
```

### 2. Stage and Commit
```powershell
git add .
git commit -m "release: v1.0.0"
```

### 3. Tag
```powershell
git tag -a v1.0.0 -m "v1.0.0 - First production release"
```

### 4. Push to GitHub
```powershell
git push origin main
git push origin v1.0.0
```

### 5. Deploy to Render (automatic from main branch)
- Verify at: https://yemen-telecom-api.onrender.com/api/health

### 6. Upload to Google Play Console
- Upload `android/app/build/outputs/bundle/release/app-release.aab`
- Ensure signing key backed up

### 7. Post-Deploy Verification
- [ ] Login works (admin123 / admin123)
- [ ] Seller creation with/without OCR
- [ ] SIM allocation flow
- [ ] CSRF token rotation
- [ ] Token refresh on expiry
- [ ] Rate limiter triggers on brute force

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Developer | | |
| QA | | |
| Product Owner | | |
