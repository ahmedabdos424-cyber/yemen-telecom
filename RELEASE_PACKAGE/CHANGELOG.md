# Changelog

## v1.0.0 — 2026-06-10 — First Production Release

### Security
- JWT issuer validation (`issuer: 'yemen-telecom'`) and algorithm enforcement (`HS256`)
- CSRF token protection on all state-changing requests (including logout)
- Three-tier rate limiting: auth (10/15min), refresh (20/15min), write (30/min), general (100/min)
- Helmet security headers with strict CSP
- XSS sanitization via `stripHtml()` on all Zod string fields
- Token blacklist with SHA-256 hashing and expiry cleanup
- Debug routes disabled in production
- `.env.example` with documentation

### Database
- 25 performance indexes (composite + single-column)
- Foreign key cascade rules (SET NULL / CASCADE)
- Migration files with `IF NOT EXISTS` safety

### Performance
- `React.memo` on all 3 list views (SIMsView, SellersView, AgentsView)
- `useMemo` + `useCallback` for filtered data and event handlers
- CSS `content-visibility: auto` with `contain: strict`
- Vite production optimizations: hidden sourcemap, manual chunking

### OCR
- Otsu binary thresholding preprocessing for Yemeni identity cards
- Confidence threshold filtering (< 60% → reject, < 40% → auto-retry)
- 30-second timeout with up to 2 automatic retries
- Blur and low-light detection
- Arabic word validation (2+ char Arabic words, ≥ 2 words for name)

### Android
- Production AndroidManifest with `largeHeap`, `hardwareAccelerated`
- Capacitor v8 integration with Firebase auth/storage plugins
- CapacitorPreferences for encrypted token storage
- Play Store readiness documentation
- APK (27.1 MB) and AAB (28.4 MB) artifacts

### UI/UX
- Accessible EmptyState component (`role="status"`, keyboard navigation)
- Skeleton loading states
- RTL support throughout (Arabic-first)
- Dark mode support
- Touch-friendly targets (> 44px)

### Testing
- 160 tests across 7 files (up from 0)
- Server validation: 67 tests (all Zod schemas)
- Server auth: 16 tests (JWT, bcrypt, CSRF, token blacklist)
- OCR: 36 tests (preprocessing, confidence, Otsu thresholding)
- Seller: 14 tests (data model, status transitions)
- SIM activation: 13 tests (ICCID, providers, phone format)
- Auth: 7 tests (token storage)
- CSRF: 7 tests (HMAC, hash verification)

### CI/CD
- GitHub Actions test workflow (Node 18/20 matrix)
- Security scan workflow (npm audit, secret grep, .gitignore check)
