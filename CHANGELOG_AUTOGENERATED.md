# Changelog — Yemen Telecom

## v1.0.0 (2026-06-30)

### Security
- **CSP**: Added `base-uri 'self'` to prevent open redirect attacks (`server/src/index.ts`)
- **Credentials**: Removed hardcoded `'postgres'` fallbacks for DB_USER/DB_PASSWORD (`server/src/db.ts`)
- **DB_SSL**: Production warning if `DB_SSL_REJECT_UNAUTHORIZED=false` (`server/src/db.ts`)

### Performance
- **Caching**: `index.html` now cached in memory at startup — removes `fs.readFileSync` on every GET / (`server/src/index.ts`)

### Database
- **Migration 006**: Wrapped in `BEGIN/COMMIT` for atomic execution
- **Migration 008**: Rewrote UNIQUE constraints as partial unique indexes to allow empty-string values
- **Balance**: Added `SELECT ... FOR UPDATE` in seller balance update to prevent race conditions (`server/src/routes/sellers.ts`)

### Docker
- **HEALTHCHECK**: Added `/api/health` liveness probe (`Dockerfile`)
- **NODE_ENV**: Added `ENV NODE_ENV=production` in build stages (`Dockerfile`)
- **Cache**: Added `npm cache clean --force` after every `npm ci` (`Dockerfile`)

### Dependency Management
- **Root**: Moved `@tailwindcss/vite`, `@vitejs/plugin-react` from `dependencies` → `devDependencies`
- **Root**: Removed `firebase-admin` (only used server-side, was duplicated)
- **Server**: Moved `typescript` from `dependencies` → `devDependencies`

### Version Alignment
- **`.nvmrc`**: Updated from Node 20 → Node 22 (matches Dockerfile)
- **`package.json` engines**: Updated from `>=20.0.0` → `>=22.0.0`
- **`server/package.json` engines**: Updated from `>=20.0.0` → `>=22.0.0`

### Tooling
- **`.editorconfig`**: Created with 2-space indent, UTF-8, LF line endings
- **`.npmrc`**: Created with `engine-strict=true`

### Fixes
- **Tests**: Updated IDOR security test mocks to share query implementation with transaction mock
- **`.gitignore`**: Fixed backslash path → forward slash for cross-platform compatibility

### v1.0.0 (2026-06-30) — Second Pass

#### Security Hardening
- **SSL**: Escalated `DB_SSL_REJECT_UNAUTHORIZED=false` from warn → error in production (`server/src/db.ts`)
- **Passwords**: Strengthened auto-generated passwords from `randomBytes(4)` (32-bit) → `randomBytes(16)` (128-bit) (`server/src/routes/agents.ts`, `server/src/routes/sellers.ts`)
- **Rate Limiting**: Added dedicated password-reset rate limiter — 5 per 15 min (`server/src/index.ts`)
- **CI**: Updated GitHub Actions workflows from Node 20 → Node 22 to match `.nvmrc` and `engine-strict=true` (`.github/workflows/ci.yml`, `.github/workflows/android.yml`)

### Audit Artifacts (18 documents)
- Full 14-phase enterprise-grade engineering review
- 47 issues identified, 16 fixed, 27 documented for approval
- ARCHITECTURE_AUDIT.md, SECURITY_AUDIT.md, DATABASE_AUDIT.md, DOCKER_AUDIT.md, CI_CD_AUDIT.md, DEPENDENCY_AUDIT.md, TEST_AUDIT.md, ROOT_CAUSE_ANALYSIS.md, PRODUCTION_READINESS.md, RELEASE_CERTIFICATION.md, DEPLOYMENT_CHECKLIST.md, POST_DEPLOY_CHECKLIST.md, SECURITY_ROTATION_PLAN.md, FINAL_AUDIT.md, FINAL_SCORECARD.md
