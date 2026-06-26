# Secret Rotation Checklist

**Date:** 2026-06-12
**Project:** Yemen Telecom SIM Management System
**Source file:** `server/.env`

---

## Rotation Required

| # | Variable | Current Status | Risk | Action |
|---|----------|---------------|------|--------|
| 1 | `DB_PASSWORD` | **LIVE** - Supabase password in plaintext | 🔴 Critical | Rotate in Supabase dashboard, update `.env` |
| 2 | `JWT_SECRET` | **LIVE** - `[REDACTED]` (weak, shared) | 🔴 Critical | Generate new 64-byte random hex |
| 3 | `REFRESH_SECRET` | **LIVE** - `[REDACTED]` (weak, shared) | 🔴 Critical | Generate new 64-byte random hex |
| 4 | `CSRF_SECRET` | **LIVE** - `[REDACTED]` (weak, shared) | 🔴 Critical | Generate new 64-byte random hex |
| 5 | `DB_HOST` | **LIVE** - Supabase pooler host exposed | 🟡 Warning | Rotate by creating new Supabase project OR restrict IP |
| 6 | `DB_USER` | **LIVE** - Supabase user with project ref exposed | 🟡 Warning | Rotate by creating new Supabase project OR restrict IP |
| 7 | `FIREBASE_STORAGE_BUCKET` | **LIVE** - Firebase project ID exposed | 🟢 Low | Bucket name is public by design; rotate if compromised |
| 8 | `FIREBASE_SERVICE_ACCOUNT_PATH` | Points to `../firebase-service-account.json` | 🟡 Warning | Verify file exists; rotate service account key in Firebase Console if exposed |

---

## Step-by-Step Rotation Procedure

### Step 1: Generate New Secrets

```bash
# Generate 64-byte hex strings (for JWT_SECRET, REFRESH_SECRET, CSRF_SECRET)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run this **separately** for each secret — all three must be different.

### Step 2: Rotate Supabase Database Password

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project `qxroquilskugfemzmrzp`
3. Navigate to **Project Settings > Database > Database Password**
4. Click **"Reset Database Password"**
5. Generate a strong password (use 32+ chars with mixed case, numbers, symbols)
6. Copy the new password immediately (it won't be shown again)

### Step 3: Update `server/.env`

Replace the following values:

```
DB_PASSWORD="<new-supabase-password>"
JWT_SECRET=<new-64-byte-hex-1>
REFRESH_SECRET=<new-64-byte-hex-2>
CSRF_SECRET=<new-64-byte-hex-3>
```

### Step 4: Create/Update `.env.example` (safe for git)

Create `server/.env.example` with **placeholder** values:

```
DB_HOST=your-supabase-pooler-host
DB_PORT=5432
DB_USER=your-supabase-user
DB_PASSWORD=your-supabase-password
DB_NAME=postgres
API_PORT=4000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
JWT_SECRET=generate-with-crypto-randomBytes
REFRESH_SECRET=generate-with-crypto-randomBytes
CSRF_SECRET=generate-with-crypto-randomBytes
NODE_ENV=development
```

### Step 5: Rotate Firebase Service Account (if compromised)

1. Go to [Firebase Console > Project Settings > Service Accounts](https://console.firebase.google.com)
2. Click **"Generate New Private Key"**
3. Save to `firebase-service-account.json`
4. Delete the old key

### Step 6: Update Production Environment (Render)

1. Go to Render dashboard > your service > Environment
2. Update all 4 secret values
3. Click "Save" — service auto-deploys

### Step 7: Invalidate All Active Sessions

After deployment, all existing JWT tokens will be invalid because the signing secret changed. This is **intended** — all users must re-login.

---

## Post-Rotation Verification

- [ ] Login with manager account works
- [ ] Login with agent account works
- [ ] Login with seller account works
- [ ] Token refresh works
- [ ] CSRF-protected endpoints succeed (POST/PUT/DELETE)
- [ ] OCR upload works
- [ ] Database queries return correct data
- [ ] Firebase storage upload/download works

---

## .env File Status

| Item | Status |
|------|--------|
| Live `.env` in project root | ⚠️ CONTAINS LIVE SECRETS — DO NOT COMMIT |
| `.env.example` exists | ❌ NOT FOUND — create one |
| `.env` in `.gitignore` | Must verify — should never be tracked |
| Production env vars in Render | Must be manually updated after rotation |
