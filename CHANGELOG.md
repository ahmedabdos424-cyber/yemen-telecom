# Changelog

All notable changes to the Yemen Telecom SIM Management System are documented in this file.

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
