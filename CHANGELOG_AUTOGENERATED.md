# Changelog — Yemen Telecom

## v1.0.0 (2026-06-30)

### Security
- **CSP**: Added `base-uri 'self'` to prevent open redirect attacks
- **Credentials**: Removed hardcoded `'postgres'` fallbacks for DB_USER/DB_PASSWORD in `db.ts`
- **Params**: Enforced `engine-strict=true` via `.npmrc` to prevent wrong Node.js versions

### Performance
- **Caching**: `index.html` now cached in memory at startup — removes `fs.readFileSync` on every GET /

### Database
- **Migration 006**: Wrapped in `BEGIN/COMMIT` for atomic execution
- **Migration 008**: Rewrote UNIQUE constraints as partial unique indexes to allow multiple empty-string values
- **Balance**: Added `SELECT ... FOR UPDATE` in seller balance update to prevent race conditions

### Build
- **Docker**: Added HEALTHCHECK instruction
- **engines**: Added to both `package.json` files (`"node": ">=20.0.0"`)
- **Dependencies**: Moved `@types/*` from `dependencies` to `devDependencies`

### Tooling
- **.nvmrc**: Created (Node 20)
- **.npmrc**: Created (`engine-strict=true`)
- **.editorconfig**: Created (2-space indent, UTF-8, LF)

### Fixes
- **Tests**: Updated IDOR security test mocks to share query implementation with transaction mock
