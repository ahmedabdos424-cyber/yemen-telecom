# Security Audit — Yemen Telecom
**Date:** 2026-06-30
**Engineer:** Senior Security Engineer Review
**Status:** Complete

---

## Summary

| Category | Status |
|----------|--------|
| JWT Authentication | ✅ HS256, issuer validation, blacklist support |
| CSRF Protection | ✅ HMAC-SHA256 dual-token, timing-safe comparison |
| CSP | ✅ Nonce-based (per-request), strict directives |
| CORS | ✅ Configurable via CORS_ORIGIN env var |
| Rate Limiting | ✅ 4 tiers (auth, refresh, write, general) |
| SQL Injection | ✅ All queries parameterized |
| XSS Prevention | ✅ Zod stripHtml on all string inputs |
| Password Hashing | ✅ bcrypt (10 rounds) |
| Input Validation | ✅ Zod schemas on all endpoints |
| RBAC | ✅ 3 roles with requireRole() middleware |
| IDOR | ✅ Agent scoping on seller routes |
| Cookie Security | ✅ httpOnly, secure, sameSite strict |
| Helmet | ✅ All headers enabled |
| Upload Validation | ✅ Magic byte + MIME type + size limit |
| Account Lockout | ✅ Configurable threshold, 15min lock |
| Token Blacklist | ✅ SHA-256 hashed, periodic cleanup |
| Graceful Shutdown | ✅ SIGTERM/SIGINT handlers |
| Secrets in Git | 🔴 CRITICAL — Live secrets in git history |
| Weak Auto-Passwords | 🔴 32-bit entropy (8 hex chars) |
| DB SSL verification | 🟡 Allowed to be disabled in production |
| No ESLint | 🟡 Code quality enforcement missing |
| Mock data in bundle | 🟡 No separation from production code |

---

## 🔴 Critical

### SEC-001: Live production secrets in git history (accessible)
**ID:** SEC-001  
**Severity:** 🔴 Critical  
**Evidence:** 
- Commit `1f212a3` added `backups/config-20260629-001148/server.env` and `root.env`
- Files contain: `DB_PASSWORD`, `JWT_SECRET`, `REFRESH_SECRET`, `CSRF_SECRET`, `FIREBASE_PRIVATE_KEY` (full RSA key)
- Firebase: `firebase-admin-sa@yemen-telecom-1699.iam.gserviceaccount.com` — project `yemen-telecom-1699`
- Supabase: `db.qxroquilskugfemzmrzp.supabase.co` — project ref
- Two different DB passwords: `uTCymyTz1M5tJKfb` and `sRPzEKEfR3uaeM#`
- JWT_SECRET: `de641af851b92094edb251cb10ad1dbb260ebb4f6955c5607a619c44e3b9f079`
- REFRESH_SECRET: `51be9abbf216d2b895b63ef0f665f0f98effb2186005543d1140c087266cdfef`
- CSRF_SECRET: `3d17e0edbe38a7fa847b4ad54fa1ef17e42f8fa32fce727e4172b2cd7e2ce681`
- Any user with repo access: `git checkout 1f212a3` retrieves all secrets
- Branches `production-deploy-*` also contain the leaked files:
**Root cause:** Backup directory with `.env` files was committed. Subsequent commits removed tracking (`git rm --cached`) but history remains.  
**Impact:** Full database access, JWT signing, CSRF bypass, Firebase Storage access, Firebase Auth admin access.  
**Fix:** See SECURITY_ROTATION_PLAN.md for step-by-step secret rotation.  
**Risk:** Active exploitation possible if repo is public or shared.  
**Effort:** 30 minutes to rotate all secrets. Full git purge requires force-push coordination.

### SEC-002: Weak auto-generated passwords (32-bit entropy)
**ID:** SEC-002  
**Severity:** 🔴 Critical  
**Files:** 
- `server/src/routes/agents.ts` line 41: `password || crypto.randomBytes(4).toString('hex')`
- `server/src/routes/sellers.ts` line 126: `password || crypto.randomBytes(4).toString('hex')`
- `server/src/routes/sellers.ts` (reset-password): Same pattern
**Evidence:** `crypto.randomBytes(4)` = 4 bytes = 32 bits = 8 hex chars = 4,294,967,296 possibilities. At 1B guesses/sec (GPU cracking), this is broken in ~4 seconds.
**Root cause:** Developer used 4 bytes thinking it was sufficient.  
**Impact:** Agent and seller accounts can be brute-forced if username is known.  
**Fix:** Use `crypto.randomBytes(16).toString('hex')` (128 bits, 32 chars) or a full 16-char alphanumeric from `crypto.randomUUID()`.  
**Risk:** High for seller accounts (public-facing).  
**Effort:** 10 minutes.

### SEC-003: Firebase private key compromised
**ID:** SEC-003  
**Severity:** 🔴 Critical  
**Evidence:** Full RSA 2048-bit private key PEM for `firebase-admin-sa@yemen-telecom-1699.iam.gserviceaccount.com` embedded in `server.env` in commit history.  
**Impact:** Attacker with this key can:
- Upload/download any file in Firebase Storage
- Read/write Firestore data
- Mint custom Firebase Auth tokens (create user sessions)
- Full Firebase Admin access  
**Fix:** Immediately revoke the service account key in GCP Console → IAM → Service Accounts → Keys. Generate new key. Update Render env vars.  
**Risk:** Critical. Active exploitation likely if repo is public.  
**Effort:** 15 minutes.

---

## 🟡 High

### SEC-004: DB_SSL_REJECT_UNAUTHORIZED allowed false in production
**ID:** SEC-004  
**Severity:** 🟡 High  
**File:** `server/src/db.ts` lines 20-24  
**Evidence:**
```typescript
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
```
The code allows disabling SSL certificate verification. While a warning is logged:
```typescript
logger.warn('[DB] DB_SSL_REJECT_UNAUTHORIZED is false — SSL cert not verified');
```
The code does not prevent this setting in production.  
**Root cause:** Developer flexibility for self-signed certs.  
**Impact:** MITM attack on database connection. An attacker on the network can intercept or modify all database traffic.  
**Fix:** Hard-code `rejectUnauthorized: true` in production, or fail to start if set to false.  
**Effort:** 5 minutes.

### SEC-005: No rate limit on password reset endpoint
**ID:** SEC-005  
**Severity:** 🟡 High  
**File:** `server/src/routes/sellers.ts` — `/api/sellers/:id/reset-password`  
**Evidence:** The password reset endpoint has no dedicated rate limiter. It falls under the general API limiter (100/min) which is too permissive for a security-sensitive operation.  
**Impact:** An attacker could mass-reset seller passwords via enumeration, causing denial of service.  
**Fix:** Add a dedicated rate limiter: 5 per 15 minutes per user.  
**Effort:** 15 minutes.

### SEC-006: Backup endpoint exports password hashes
**ID:** SEC-006  
**Severity:** 🟡 High  
**File:** `server/src/routes/admin.ts` — `/api/admin/system/backup`  
**Evidence:** Backup exports `SELECT * FROM users` including `password_hash`. Backup files are stored in S3 with signed URLs (1-hour expiry).  
**Impact:** Anyone with the signed URL (or S3 read access) can retrieve all password hashes.  
**Fix:** Add `password_hash` to an exclusion list in the backup query.  
**Effort:** 10 minutes.

### SEC-007: No 2FA despite database schema having columns
**ID:** SEC-007  
**Severity:** 🟡 Medium  
**File:** `server/src/schema.sql` — `system_settings` table has `two_fa_enabled` and `email_2fa_enabled` columns  
**Evidence:** Columns exist in schema but no code implements 2FA.  
**Impact:** Accounts have only single-factor password protection.  
**Fix:** Implement TOTP or email-based 2FA. Requires significant effort.  
**Effort:** 3-5 days.

### SEC-008: Refresh token not bound to user agent/IP
**ID:** SEC-008  
**Severity:** 🟡 Medium  
**File:** `server/src/routes/auth.ts`  
**Evidence:** Refresh tokens are not bound to the device/user-agent. Token rotation (old is blacklisted, new is issued) provides some protection but no fingerprinting.  
**Impact:** If a refresh token is stolen, it can be used from any device.  
**Fix:** Store device fingerprint hash alongside refresh token.  
**Effort:** 2 hours.

### SEC-009: Test secrets hardcoded in CI
**ID:** SEC-009  
**Severity:** 🟢 Low  
**File:** `.github/workflows/docker-verify.yml`  
**Evidence:** Firebase and DB test values are hardcoded in the workflow YAML. While these appear to be fake/test values, embedding them in YAML sets a bad precedent.  
**Impact:** Low — test values only.  
**Fix:** Use GitHub secrets for test credentials.  
**Effort:** 10 minutes.

---

## ✅ Already Fixed

| Issue | Fix | File |
|-------|-----|------|
| CSP missing `base-uri` | Added `base-uri 'self'` to CSP header | `server/src/index.ts` |
| Hardcoded DB credential fallbacks | Removed `'postgres'` fallbacks | `server/src/db.ts` |
| Migration 006 unguarded | Wrapped in BEGIN/COMMIT | `server/migrations/006_account_lockout.sql` |
| Migration 008 UNIQUE constraint | Rewritten as partial unique indexes | `server/migrations/008_add_unique_constraints.sql` |
| Balance update race condition | Added `SELECT ... FOR UPDATE` | `server/src/routes/sellers.ts` |

---

## 7. Attack Surface Summary

| Attack Vector | Protected? | Notes |
|--------------|------------|-------|
| SQL Injection | ✅ Yes | All queries parameterized with `$1` |
| XSS (Reflected) | ✅ Yes | CSP + Zod stripHtml |
| XSS (Stored) | ✅ Yes | Input validation + output encoding + CSP |
| CSRF | ✅ Yes | HMAC-SHA256 dual-token |
| MITM (Web) | ✅ Yes | HTTPS required |
| MITM (DB) | 🟡 Conditional | SSL verification configurable |
| Session Hijacking | ✅ Yes | httpOnly + secure + sameSite strict |
| Brute Force Login | ✅ Yes | Rate limiting + account lockout |
| Password Reset Abuse | 🔴 No | No per-endpoint rate limiter |
| IDOR | ✅ Yes | Agent scoping (sellers) |
| Path Traversal | ✅ Yes | `path.basename` + `includes('..')` check |
| SSRF | 🟡 Not tested | No external URL fetching from user input |
| Prototype Pollution | 🟡 Not tested | Express JSON parser is generally safe |
| Command Injection | ✅ Yes | No exec/spawn from user input |
| Clickjacking | ✅ Yes | Helmet frameguard + CSP frame-ancestors |
| Open Redirect | ✅ Yes | base-uri CSP directive (recently added) |
| Mass Assignment | ✅ Yes | Zod validation whitelists fields |
