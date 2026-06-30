# ROOT CAUSE ANALYSIS — Production vs Repository Differences

## Summary

Three production issues were traced to two independent root causes. The CSP issue was partially
deployed (only `script-src` fixed, `style-src` `'unsafe-inline'` remains for React compatibility).

---

## Issue 1 — Login Returns HTTP 500

### Root Cause

**Migration 006 was never applied to the production database.**

### Evidence

The login handler (`server/src/routes/auth.ts:41`) runs after failed password:

```sql
UPDATE users SET failed_attempts = COALESCE(failed_attempts, 0) + 1 WHERE id = $1
```

The `users` table in production was created from `schema.sql` which defines the table WITHOUT
`failed_attempts` and `locked_until` columns:

```
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(200) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(200) DEFAULT '',
  region VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
  -- NO failed_attempts column
  -- NO locked_until column
);
```

Migration `server/migrations/006_account_lockout.sql` adds these columns:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
```

However, `server/src/init-db.ts` refuses to run in production:

```js
if (process.env.NODE_ENV === 'production') {
    logger.error('[INIT-DB] Refusing to run database initialization in production.');
    process.exit(1);
}
```

### Error Chain

1. Client sends `POST /api/auth/login` with valid JSON body
2. `bcrypt.compare(password, user.password_hash)` returns `false` (placeholder hash)
3. Handler executes `UPDATE users SET failed_attempts = COALESCE(failed_attempts, 0) + 1`
4. PostgreSQL throws: `column "failed_attempts" of relation "users" does not exist`
5. Catch block returns `500 {"error":"Internal server error"}`
6. Error is NOT logged because `NODE_ENV=production` suppresses the error log

### Impact

**ALL** login attempts fail with 500 regardless of credentials. Zero users can authenticate.

---

## Issue 2 — SPA Returns HTTP 404

### Root Cause

**Render service is configured as `env: node` with `rootDir: server`. The frontend is never built.**

### Evidence

- Render service type: `node` (not `docker`)
- Root directory: `server/`
- Build command: `npm install && npm run build` (runs in `server/`)
- Server's `npm run build` executes: `npx tsc` (compiles TypeScript only)
- Frontend `vite build` is NEVER executed
- No `dist/` directory is ever created
- `express.static('dist')` can't find `index.html`
- `app.get('/', ...)` handler (added in Sprint 2 to inject nonce) doesn't exist at deployed commit

### Deployed Commit

The live deploy (`dep-d91gs78js32c739d2qe0`) runs commit `d00a228` which:
- Has `express.static('dist', { maxAge: '1y', ... })` — but no frontend build
- Has NO `app.get('/', ...)` handler (no nonce injection either)

### Impact

`GET https://yemen-telecom-api.onrender.com/` returns 404.
The SPA is completely inaccessible via the Render URL.

---

## Issue 3 — CSP Contains `'unsafe-inline'`

### Assessment: **WARNING — Partially expected**

The production CSP header:
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```

- `script-src` does NOT contain `'unsafe-inline'` ✅ (Sprint 2 fix IS deployed)
- `style-src` DOES contain `'unsafe-inline'` ⚠️ (expected — React + Tailwind need inline styles)
- Nonce-based CSP was added in a later commit NOT yet deployed

The deployed commit `d00a228` sets:
```js
scriptSrc: ["'self'"],                                              // no unsafe-inline
styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],  // required for React
```

### Impact

Low. `style-src` `'unsafe-inline'` is required for React/Tailwind inline styles.
The nonce-based CSP (which covers both scripts and styles) is a future enhancement.

---

## Underlying Infrastructure Issue

The `render.yaml` declares `env: docker` with a multi-stage Dockerfile, but the actual
Render service was created manually as `env: node` with `rootDir: server`.

The Dockerfile builds the full stack (frontend + backend), but the Node service type ignores it.

This mismatch is the root cause of BOTH the SPA 404 AND the lack of frontend builds.

---

## Proposed Fix Plan

| Issue | Fix | Risk |
|-------|-----|------|
| Login 500 | Run migration SQL against production DB (idempotent `ADD COLUMN IF NOT EXISTS`) | None — `IF NOT EXISTS` is safe |
| SPA 404 | Switch Render service to Docker (`env: docker`) OR add frontend build step | Low — Dockerfile already exists and works |
| CSP | Deploy latest code with nonce-based CSP to cover style-src | Low — already verified locally |

---

## Deployment Mismatch Summary

| Aspect | Local Repository | Production (Render) |
|--------|-----------------|-------------------|
| HEAD commit | `32acdbe` | `d00a228` |
| Service type | Docker (Dockerfile) | Node (rootDir: server) |
| Frontend | Built via `vite build` | NEVER built |
| CSP | Nonce-based | `'unsafe-inline'` in style-src only |
| `failed_attempts` column | In schema.sql | MISSING |
| `locked_until` column | In schema.sql | MISSING |
| DB migrations | Run by `init-db.ts` | NEVER run (production guard) |
