# Security Audit — yemen-telecom

## Authentication
| Control | Status | Source |
|---------|--------|--------|
| JWT with algorithm whitelist (HS256) | ✅ | auth.ts:121, middleware/auth.ts:56 |
| Issuer validation | ✅ | auth.ts, middleware/auth.ts:55 |
| Refresh token rotation | ✅ | auth.ts:80-84 (blacklist old, issue new) |
| Token blacklist on logout | ✅ | auth.ts:113-116 |
| Token reuse detection | ✅ | middleware/auth.ts:58-61 |
| bcrypt password hashing (cost 10) | ✅ | auth.ts:63,119 |
| Login status check (active/inactive) | ✅ | auth.ts:38-40,86-88 |
| Password complexity (8+ chars, 3/4 rules) | ✅ | validation.ts:41-45 |

## Network Security
| Control | Status | Source |
|---------|--------|--------|
| Helmet (15 HTTP headers) | ✅ | index.ts:54 |
| CSP (unsafe-eval removed) | ✅ | index.ts:57 |
| CORS (origin validated) | ✅ | index.ts:22-31 |
| Rate limiting (4 tiers) | ✅ | index.ts:39-49 |
| CSRF (timingSafeEqual) | ✅ | index.ts:110-113 |

## Data Security
| Control | Status | Source |
|---------|--------|--------|
| Parameterized SQL (all queries) | ✅ | All route files |
| Transaction support | ✅ | db.ts:43 |
| Upload validation (magic bytes) | ✅ | upload.ts:6-19 |
| XSS prevention (Zod HTML stripping) | ✅ | validation.ts |
| No hardcoded passwords in schema | ✅ | schema.sql, seed.ts |
| Seed guard in production | ✅ | seed.ts:12-15 |
| Per-user seed passwords via env vars | ✅ | seed.ts:19-38 |

## Authorization
| Control | Status | Source |
|---------|--------|--------|
| Role-based access (manager/agent/seller) | ✅ | requireRole() middleware |
| Ownership checks on seller mutations | ✅ | sellers.ts:195,232,262,296 |
| Report scoping (agent → own sellers) | ✅ | reports.ts:67-77 |
| Operation scoping (agent → own sellers) | ✅ | operations.ts:17-19 |
| Maintenance mode (blocks mutations) | ✅ | index.ts:170-180 |

## Secrets Hygiene
| Control | Status |
|---------|--------|
| .env files in .gitignore | ✅ |
| render.yaml uses sync:false for secrets | ✅ |
| No committed credentials in source | ✅ |
| release.keystore in .gitignore | ✅ |

## Android Security
| Control | Status |
|---------|--------|
| App ID: com.yemen.telecom | ✅ |
| ProGuard R8 enabled | ✅ |
| Signing via env vars | ✅ |
| google-services.json | ❌ MISSING |
| release.keystore in VCS | ⚠️ Present |

## Remaining Issues
| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| Math.random() for upload filenames | LOW | upload.ts:35 | Predictable filename |
| Static /uploads public (no auth) | LOW | index.ts:94 | Deliberate (avatars) |
| CSP unsafe-inline retained | LOW | index.ts:57 | Vite requirement |
| Token cleanup unscheduled | LOW | db.ts:67-72 | Unbounded blacklist table |
| google-services.json missing | MEDIUM | android/app/ | No Firebase push/phone auth |
