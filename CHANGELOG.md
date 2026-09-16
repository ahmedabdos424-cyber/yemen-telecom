# Changelog

All notable changes to the Yemen Telecom SIM Management System are documented in this file.

## [1.1.0] — 2026-09-16

### Security & integrity audit remediation (P0/P1)

### Fixed
- Database drift: `schema.sql` synced with all migrations (049 drift-repair + 050 integrity-links); partition rebuild preserves `occurred_at`
- Document authorization: exact object-name ownership check instead of partial match
- Operations integrity: `customer_row_id` FK + atomic SIM scope verification with advisory-lock idempotency
- Lockdown restores exact pre-lockdown seller states (transactional); identity block/unblock transactional with session revocation
- Demo session exemption is now dev-only; agent delete returns SIMs to the admin pool; seller delete zeroes counters
- Stats cache key moved under the `report:` prefix; missing invalidations added (distributions, inventories, batch)
- WebSocket broadcasts scoped to managers + owning agent/seller; alerts to managers only
- Redis wired for distributed login lockout (memory + DB fallback intact)

### Added
- Unified report pagination: `?page&limit` with `X-Total-Count` on all reports and admin transactions
- Numeric `:id` validation (400) on every parameterized route; unique conflicts return 409
- Client error mapping: oversized uploads → 413, malformed JSON → 400
- P0/J/P2/P3 hermetic regression suites (`p0-fixes`, `j-robustness`, `j-p3` test files)

### Infrastructure
- Node 24 (`.nvmrc`, engines, Docker, CI); PostgreSQL 17 with 37 migrations (latest: `050_integrity_links.sql`)
- 75 route registrations; 6 CI workflows (android, ci, codeql-analysis, deploy, docker-verify, opencode)
- Version 1.1.0 / versionCode 24 (package.json, `build.gradle`, `render.yaml` `APP_*` in sync)

## [1.0.0] — 2026-06-29

### Production Release — Certified

### Added
- Complete SIM lifecycle management (create, activate, suspend, reassign)
- Multi-role access control: Admin, Agent, Seller with granular permissions
- Real-time dashboard with operator-wise stats and revenue breakdown
- Arabic RTL UI with IBM Plex Sans Arabic throughout
- Camera-based OCR for SIM ICCID scanning
- Secure authentication with JWT + refresh token rotation
- CSRF protection with double-submit cookie pattern
- Account lockout after 5 failed login attempts (15 min lock)
- Rate limiting (4 tiers: auth, general, upload, admin)
- Token blacklisting with SHA-256 hashing and hourly cleanup
- File upload validation (magic bytes + extension + size limits)
- Admin monitoring dashboard with toggle
- System lockdown capability
- PostgreSQL backup to S3-compatible storage
- Audit logging for all admin operations
- Comprehensive input validation via Zod schemas
- Helmet security headers with strict CSP
- Production Android signing with apksigner verification

### Changed
- Dashboard UI: hardcoded operator cards replaced with live `/api/stats` data
- Server compression: added `Vary: Accept-Encoding` header
- Static assets: `maxAge: 1y` with `immutable` flag for cache optimization
- All CI workflows unified to Node 20
- Server TypeScript: migrated all `@types/*` to devDependencies

### Fixed
- Render configuration: changed from `env: node` to `env: docker` with correct Dockerfile path
- Root package.json: added missing `start` script
- Android signing: replaced debug cert with production keystore (SHA-256 verified)
- TypeScript compilation: `--skipLibCheck` added across all CI workflows
- Build pipeline: split monolithic server build into named steps
- Unused imports removed across frontend codebase
- Environment files: all secrets replaced with placeholder values

### Security
- Account lockout after 5 failed logins (configurable via `system_settings`)
- SQL injection: all queries parameterized via `pg` Pool
- XSS prevention: Zod `stripHtml`, no `dangerouslySetInnerHTML`
- CSRF: double-submit pattern with `timingSafeEqual` comparison
- Token rotation: old refresh tokens blacklisted on refresh
- Logger redaction: passwords, tokens, secrets masked in logs
- Android: `android:allowBackup="false"`, `android:usesCleartextTraffic="false"`

### Infrastructure
- Dockerfile ready for Render Docker runtime deployment
- PostgreSQL 17 with 6 migrations (latest: `006_account_lockout.sql`)
- CI: 6 workflow files (android, build, ci, security-scan, test, typecheck)
- Render: Health endpoint `/api/health`, free Oregon tier
- 55 API routes registered with role-based middleware
