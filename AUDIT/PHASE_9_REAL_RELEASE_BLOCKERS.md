# PHASE 9: REAL RELEASE BLOCKERS

**Date:** June 24, 2026
**Method:** Source code verification only. Only real, provable issues.

---

## BLOCKER (Must fix before release)

### B1: Secrets in Git History
- **File:** Git history (commit `d784c83`)
- **Line:** `APK_LOGIN_ROOT_CAUSE_ANALYSIS.md` (deleted file)
- **Proof:** `git log --all -p -S "sRPzEKEfR3uaeM" --oneline` returns `d784c83`
- **Impact:** Anyone with repo access can extract DB_PASSWORD, JWT_SECRET, REFRESH_SECRET, CSRF_SECRET, FIREBASE_PRIVATE_KEY
- **Fix:** Git history rewrite + force push + team re-clone + all secret rotation
- **Estimate:** 2-4 hours

### B2: Account Deletion Doesn't Blacklist Tokens
- **File:** `server/src/routes/users.ts:43`
- **Line:** `await query('DELETE FROM token_blacklist WHERE user_id = $1', [userId]);`
- **Proof:** After account deletion, existing JWTs remain valid until expiry. The code REMOVES blacklist entries instead of adding them.
- **Impact:** Deleted user can continue accessing the API with existing token
- **Fix:** Change `DELETE FROM` to `INSERT INTO` (blacklist all user's active tokens)
- **Estimate:** 30 minutes

---

## HIGH (Strongly recommended)

### H1: No LICENSE File
- **File:** Repository root
- **Proof:** No LICENSE file found
- **Impact:** Legal ambiguity — code has no license terms
- **Fix:** Add LICENSE file (MIT, Apache 2.0, etc.)
- **Estimate:** 5 minutes

### H2: No SECURITY.md
- **File:** Repository root
- **Proof:** No SECURITY.md found
- **Impact:** No vulnerability reporting process
- **Fix:** Add SECURITY.md with disclosure policy
- **Estimate:** 15 minutes

### H3: CI Doesn't Run Tests
- **File:** `.github/workflows/security-scan.yml`
- **Line:** No `npm test` step
- **Proof:** Workflow only runs `npm audit || true` and grep-based scanning
- **Impact:** Code changes can break tests without detection
- **Fix:** Add `npm test` and `npm run build` steps
- **Estimate:** 15 minutes

### H4: npm audit Failures Non-blocking
- **File:** `.github/workflows/security-scan.yml:26`
- **Line:** `run: npm audit --audit-level=high || true`
- **Proof:** `|| true` makes audit failures non-blocking
- **Impact:** Critical vulnerabilities won't fail the build
- **Fix:** Remove `|| true`
- **Estimate:** 1 minute

### H5: Auth Test Failures (Environmental)
- **File:** `src/__tests__/auth.test.ts:11`
- **Line:** `localStorage.clear()` — localStorage not available in jsdom
- **Proof:** 7 tests fail with `TypeError: Cannot read properties of undefined (reading 'clear')`
- **Impact:** Test suite reports failures
- **Fix:** Add localStorage mock to setup.ts
- **Estimate:** 15 minutes

---

## MEDIUM

### M1: No DB Check in Health Endpoint
- **File:** `server/src/index.ts:154-156`
- **Line:** Health check returns OK without DB verification
- **Proof:** `res.json({ status: 'ok', ... })` — no DB query
- **Impact:** Load balancer may route traffic to unhealthy instances
- **Fix:** Add DB ping to health check
- **Estimate:** 30 minutes

### M2: Audit Logs Table Never Written
- **File:** `server/src/schema.sql:124-132` (table exists), no INSERT anywhere in routes
- **Proof:** `grep -r "INSERT INTO audit_logs" server/src/` returns no results
- **Impact:** Audit log feature is non-functional
- **Fix:** Add audit logging middleware
- **Estimate:** 2-4 hours

### M3: Token Blacklist Cleanup Not Scheduled
- **File:** `server/src/schema.sql:245-250` (function exists)
- **Line:** `cleanup_expired_tokens()` function defined but never called
- **Proof:** No cron job or scheduled task calls this function
- **Impact:** token_blacklist table grows unbounded
- **Fix:** Set up pg_cron or external scheduler
- **Estimate:** 30 minutes

### M4: Distribution Approval No Stock Check
- **File:** `server/src/routes/distributions.ts:107-111`
- **Line:** `UPDATE inventories SET available=GREATEST(available-$1, 0)`
- **Proof:** Uses `GREATEST(..., 0)` to prevent negative, but doesn't check if `available >= count`
- **Impact:** Can over-distribute SIMs
- **Fix:** Add stock validation before approval
- **Estimate:** 30 minutes

### M5: Seller Deletion Not in Transaction
- **File:** `server/src/routes/sellers.ts:289-314`
- **Line:** 4 sequential `await query()` calls without `transaction()`
- **Proof:** No `import { transaction }` in sellers.ts, each query is independent
- **Impact:** Partial deletion on failure (user deactivated but SIMs not cleaned)
- **Fix:** Wrap in `transaction()` block
- **Estimate:** 30 minutes

### M6: CSP `unsafe-inline`
- **File:** `server/src/index.ts:59`
- **Line:** `scriptSrc: ["'self'", "'unsafe-inline'"]`
- **Proof:** Inline scripts allowed — XSS risk
- **Impact:** If XSS vulnerability exists, inline scripts can execute
- **Fix:** Implement nonce-based CSP (requires build-time integration)
- **Estimate:** 4-8 hours

---

## LOW

### L1: `!origin` in CORS
- **File:** `server/src/index.ts:81`
- **Line:** `if (!origin || isDev || ...)`
- **Proof:** Requests without Origin header (curl, server-to-server) bypass CORS
- **Impact:** Non-browser clients can bypass CORS (by design, but worth noting)
- **Fix:** Optionally reject no-origin requests in production
- **Estimate:** 15 minutes

### L2: Maintenance Mode Fail-Open
- **File:** `server/src/index.ts:170-180`
- **Line:** `catch { }` — empty catch on DB error
- **Proof:** If DB is unreachable, maintenance mode check fails silently, writes proceed
- **Impact:** During DB outage, maintenance mode is bypassed
- **Fix:** Fail-closed on DB error (return 503)
- **Estimate:** 5 minutes

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| BLOCKER | 2 | B1, B2 |
| HIGH | 5 | H1-H5 |
| MEDIUM | 6 | M1-M6 |
| LOW | 2 | L1-L2 |
