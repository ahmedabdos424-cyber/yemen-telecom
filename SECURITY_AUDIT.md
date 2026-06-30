# SECURITY AUDIT — Yemen Telecom

## Critical

### SEC-001: DB_SSL_REJECT_UNAUTHORIZED=false in Production .env
- **File:** `server/.env`
- **Evidence:** `DB_SSL_REJECT_UNAUTHORIZED=false`
- **Root Cause:** Disables TLS certificate validation for Supabase connection
- **Risk:** Man-in-the-middle attack on all database traffic
- **Fix:** Set to `true` and ensure proper CA cert

### SEC-002: Hardcoded DB Credential Fallbacks
- **File:** `server/src/db.ts:34-35`
- **Evidence:** `safeEnv('DB_USER') || process.env.DB_USER || 'postgres'`
- **Risk:** Falls back to 'postgres' if env vars unset
- **Fix:** Remove default fallbacks; fail if not set

### SEC-003: Production Secrets in Git History
- **File:** `backups/config-20260629-001148/server.env`, `backups/config-20260629-001148/root.env`
- **Evidence:** Firebase RSA private key, DB password, JWT_SECRET, REFRESH_SECRET, CSRF_SECRET
- **Risk:** Anyone with repo access has production credentials
- **Fix:** `git filter-branch` to purge; rotate all secrets

### SEC-004: CSP Missing base-uri
- **File:** `server/src/index.ts` CSP config
- **Evidence:** No `base-uri` directive in Content-Security-Policy
- **Risk:** Open redirect via injected `<base>` tags
- **Fix:** Add `base-uri 'self'`

## High

### SEC-005: fs.readFileSync on Every GET /
- **File:** `server/src/index.ts:123-135`
- **Evidence:** Reads `dist/index.html` from disk on every request
- **Risk:** 1-5ms I/O per request, no cache
- **Fix:** Cache in memory after first read

### SEC-006: Log Files Present in Git
- **File:** `server/srv.log`, `server/stderr.log`, `server/server-term.log`
- **Evidence:** Server log files not in .gitignore
- **Risk:** Accidental exposure of request data
- **Fix:** Add to .gitignore; use git rm --cached

### SEC-007: No .nvmrc / Node Version Mismatch
- **Evidence:** Docker uses node:22-alpine, CI uses 20
- **Risk:** Behavioral differences between environments
- **Fix:** Add .nvmrc with node 20; align Docker

### SEC-008: Unnecessary require() in try-catch
- **File:** `server/src/index.ts:319`
- **Evidence:** `const fs = require('fs');` inside try-catch at top-level
- **Risk:** fs is already imported via ES module import
- **Fix:** Remove duplicate require

## Medium

### SEC-009: No Upload Rate Limiting
- **File:** `server/src/routes/upload.ts`
- **Evidence:** No rate limiter on file upload endpoint
- **Risk:** DoS via large file uploads

### SEC-010: Zod Schema Duplication (camelCase/snake_case)
- **File:** `server/src/validation.ts`
- **Evidence:** Both `store_name` and `storeName`, `id_number` and `idNumber` accepted
- **Risk:** Increased attack surface
- **Fix:** Normalize on input

## Security Score: 74/100
