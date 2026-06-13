# Play Store Release Audit

**Date:** 2026-06-12
**Project:** Yemen Telecom SIM Management System
**Package:** `com.yemen.telecom`
**Version:** 1.0.0 (versionCode: 3)

---

## 1. Android Signing Audit

| Check | Status | Details |
|-------|--------|---------|
| Keystore file exists | ✅ | `android/app/release.keystore` |
| Keystore password known | ❌ | Tried `android`, `changeit` — both rejected |
| KEYSTORE_PASSWORD env var | ❌ | Not set |
| KEYSTORE_ALIAS env var | ❌ | Not set |
| KEY_PASSWORD env var | ❌ | Not set |
| Current signing type | ❌ **DEBUG** | Falls back to `~/.android/debug.keystore` (PKCS12, alias: `androiddebugkey`) |
| Production signing active | ❌ | All builds are debug-signed |

### Keystore Details
- **Debug keystore:** `~/.android/debug.keystore` (PKCS12, created 2026-06-03)
- **Debug alias:** `androiddebugkey`
- **Debug fingerprint (SHA-256):** `4E:88:30:96:89:29:AC:8A:CB:3E:0C:52:37:A8:DA:D0:BF:88:3E:D4:01:A8:97:CF:EB:2E:4C:F9:76:D7:EF:52`
- **Release keystore:** `android/app/release.keystore` (password unknown — may be corrupted or default from Capacitor)

### Action Required
1. Generate a **new** production keystore:
   ```bash
   keytool -genkey -v -keystore release.keystore -alias yemen-telecom \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Set env vars permanently:
   ```powershell
   $env:KEYSTORE_PASSWORD = "<password>"
   $env:KEYSTORE_ALIAS = "yemen-telecom"
   $env:KEY_PASSWORD = "<password>"
   ```
3. Rebuild with `gradlew clean bundleRelease`
4. Enroll in **Play App Signing** (Google manages the signing key)

---

## 2. Google Play Readiness

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | App name (Arabic) | ✅ | `يمن تيليكوم` in Capacitor config |
| 2 | App name (English) | ✅ | `Yemen Telecom` in `strings.xml` |
| 3 | Privacy policy URL | ❌ **MISSING** | **REQUIRED** for Play Store — must host a privacy page |
| 4 | Data safety section | ❌ **NOT DONE** | Must declare data collection (name, phone, ID, photos) |
| 5 | Content rating | ❌ **NOT DONE** | Must complete questionnaire in Play Console |
| 6 | Phone screenshots (2-8) | ❌ **MISSING** | Minimum 2 screenshots (1080×1920+) required |
| 7 | Tablet screenshots | ❌ **MISSING** | Recommended for tablet support |
| 8 | Feature graphic (1024×500) | ❌ **MISSING** | Required for store listing |
| 9 | App icon (512×512 PNG) | ✅ | Present in `public/icon-512.png` |
| 10 | Adaptive icon | ✅ | `mipmap-anydpi-v26/ic_launcher.xml` + foreground/background |
| 11 | Target SDK | ✅ | targetSdk = 36 (Android 16) |
| 12 | minSdk | ✅ | minSdk = 24 (Android 7.0) — covers 97%+ of devices |
| 13 | Short description (80 char) | ❌ **MISSING** | Arabic + English required |
| 14 | Full description (4000 char) | ❌ **MISSING** | Arabic + English required |
| 15 | Category | ❌ **NOT SET** | Suggested: "Business" or "Productivity" |
| 16 | Developer email | ❌ **NEEDED** | Required for store listing |
| 17 | Website URL | ❌ **NEEDED** | e.g., `https://yemen-telecom-1699.web.app` |

---

## 3. AndroidManifest.xml Audit

### Declared Permissions

| Permission | Used? | Required? | Policy Compliance |
|------------|-------|-----------|-------------------|
| `INTERNET` | ✅ Yes — API calls | ✅ Required | ✅ Standard |
| `CAMERA` | ✅ Yes — OCR scanning | ⚠️ `required="false"` | ✅ Best practice |
| `ACCESS_NETWORK_STATE` | ✅ Yes — offline detection | ✅ Required | ✅ Standard |
| `ACCESS_WIFI_STATE` | ✅ Yes — network diagnostics | ✅ Required | ✅ Standard |
| `READ_EXTERNAL_STORAGE` | ✅ Yes — camera photos | ⚠️ `maxSdkVersion="32"` | ✅ Correct (scoped storage after Android 13) |

### Camera Features

| Feature | Required | Notes |
|---------|----------|-------|
| `android.hardware.camera` | `false` | App works on devices without camera |
| `android.hardware.camera.autofocus` | `false` | Graceful fallback |

### Policy Review

| Policy | Status | Notes |
|--------|--------|-------|
| Permissions match functionality | ✅ | All permissions are used by the app (OCR, API, offline) |
| Camera declared as optional | ✅ | `required="false"` — Play Store policy compliant |
| Storage permission scoped correctly | ✅ | `maxSdkVersion="32"` — no storage access on Android 13+ |
| RTL support | ✅ | `android:supportsRtl="true"` |
| `largeHeap` | ✅ | Accommodates Tesseract WASM memory usage |
| `hardwareAccelerated` | ✅ | Smooth WebView rendering |
| Splash screen | ✅ | `AppTheme.NoActionBarLaunch` with `core-splashscreen` |
| Backup | ⚠️ | `android:allowBackup="true"` — consider `allowBackup="false"` or `fullBackupContent` for GDPR |

### Recommendation
- Change `android:allowBackup="true"` → `android:allowBackup="false"` to prevent sensitive data leakage

---

## 4. App Size Audit

| Artifact | Size | Google Play Limit | Status |
|----------|------|-------------------|--------|
| APK | 27,151,178 bytes (27.1 MB) | 200 MB | ✅ Well under limit |
| AAB | 28,376,790 bytes (28.4 MB) | 200 MB | ✅ Well under limit |

### Size Breakdown (APK content)

Estimated breakdown:
- WebView assets (React bundle): ~3.5 MB (JS + CSS + HTML)
- Tesseract WASM cores: ~8.5 MB (6 WASM variants × ~1.4 MB each)
- Arabic trained data: ~4.2 MB (compressed: `ara.traineddata.gz`)
- Android native libraries: ~6 MB (Capacitor plugins, Firebase, OkHttp)
- Icons & resources: ~1 MB
- ProGuard/R8 stripped code: ~4 MB

### Reduction Suggestions

| # | Suggestion | Estimated Saving | Effort | Impact |
|---|-----------|-----------------|--------|--------|
| 1 | **Remove unused WASM variants** — keep only `tesseract-core-simd.wasm` + `tesseract-core.wasm` | ~6 MB | Low | Drop LSTM/relaxed SIMD support (minor) |
| 2 | **Enable Android Bundle splits** — AAB already handles this, but APK can use `splits { abi }` | ~4 MB | Low | Smaller per-device APK |
| 3 | **Move Tesseract assets to on-demand download** — download `ara.traineddata.gz` on first launch | ~4.2 MB | Medium | Requires network on first use |
| 4 | **Enable WebP for PNG assets** — convert mipmap PNGs to WebP | ~0.3 MB | Low | Smaller icons |
| 5 | **Verify R8 rules** — check ProGuard mapping for unused classes | ~1 MB | Medium | Requires ProGuard mapping analysis |
| 6 | **Lazy-load heavy dependencies** — d3.js (61 KB) could be dynamic import | ~0 (code only) | Low | Splits JS bundle further |

**Target with all optimizations:** ~17 MB APK / ~18 MB AAB

---

## 5. Security Audit

### Authentication

| Check | Status | Details |
|-------|--------|---------|
| JWT signing algorithm | ✅ | HS256 (enforced) |
| JWT issuer validation | ✅ | `issuer: 'yemen-telecom'` |
| JWT expiry | ✅ | 24 hours |
| Refresh token expiry | ✅ | 7 days |
| Refresh token rotation | ✅ | New refresh token issued on `/refresh` |
| Token blacklist | ✅ | SHA-256 hashed, DB-backed with expiry cleanup |
| Password hashing | ✅ | bcryptjs (salt rounds: default 10) |
| User lockout | ❌ | No brute-force account lockout mechanism |

### Secrets

| Secret | Location | Current Status | Risk |
|--------|----------|---------------|------|
| `JWT_SECRET` | `server/.env` | `yemen-telecom-jwt-secret-2026` (weak, shared) | 🔴 CRITICAL |
| `REFRESH_SECRET` | `server/.env` | `yemen-telecom-refresh-secret-2026` (weak, shared) | 🔴 CRITICAL |
| `CSRF_SECRET` | `server/.env` | `yemen-telecom-csrf-secret-2026` (weak, shared) | 🔴 CRITICAL |
| `DB_PASSWORD` | `server/.env` | Live Supabase password in plaintext | 🔴 CRITICAL |
| `DB_HOST` | `server/.env` | Supabase pooler host exposed | 🟡 WARNING |
| `DB_USER` | `server/.env` | Supabase user with project ref | 🟡 WARNING |

### Security Middleware

| Check | Status | Details |
|-------|--------|---------|
| Helmet | ✅ | Strict CSP, HSTS (15,552,000s), XSS, frame protection |
| CORS | ✅ | Whitelist of allowed origins + credentials: true |
| Rate limiting (auth) | ✅ | 10 requests per 15 minutes per IP |
| Rate limiting (refresh) | ✅ | 20 requests per 15 minutes per IP |
| Rate limiting (write) | ✅ | 30 requests per minute per IP |
| Rate limiting (general) | ✅ | 100 requests per minute per IP — ✅ Verified in headers (`x-ratelimit-limit: 100`) |
| CSRF protection | ✅ | HMAC-SHA256 token+hash on POST/PUT/DELETE (except login/refresh) |
| XSS sanitization | ✅ | `stripHtml()` on all Zod string fields |
| Trust proxy | ✅ | For Render reverse proxy |
| Debug routes disabled | ✅ | Production blocks debug endpoints |
| Production env validation | ✅ | Exits if JWT_SECRET/REFRESH_SECRET/CSRF_SECRET missing |

### OCR Assets Security

| Asset | Status | Notes |
|-------|--------|-------|
| Tesseract WASM cores | ✅ | 6 variants served from `/tesseract/js/` — local, not CDN |
| Arabic trained data | ✅ | `ara.traineddata.gz` — local, not fetched remotely |
| Worker JS | ✅ | `worker.min.js` — local bundle |
| Offline capability | ✅ | All OCR assets bundled in `dist/public/` |
| Core path | ⚠️ | Points to `/tesseract/js/` — ensure no directory traversal |

---

## 6. Render Production Audit

| Check | Status | Details |
|-------|--------|---------|
| Service URL | ✅ | `https://yemen-telecom-api.onrender.com` |
| Health endpoint | ✅ | `{"status":"ok","environment":"production"}` |
| Uptime | ✅ | 59 seconds (cold start) |
| Security headers | ✅ | Helmet headers present: CSP, HSTS, XSS, frame protection |
| Rate limiting headers | ✅ | `x-ratelimit-limit: 100`, `x-ratelimit-remaining: 98` |
| Environment mode | ✅ | `production` |
| CORS configuration | ✅ | Whitelist includes Firebase + Capacitor origins |
| Database connection | ✅ | Supabase via `pooler.supabase.com` (SSL enabled) |
| Supabase config | ✅ | Connection pooling active, SSL configured |
| GitHub auto-deploy | ✅ | Connected to `main` branch |
| Latest commit | ✅ | `3b8335e` pushed and deployed |

### Render Environment Variables Status

| Variable | Set? | Notes |
|----------|------|-------|
| `JWT_SECRET` | ⚠️ Needs rotation | Currently uses weak dev value |
| `REFRESH_SECRET` | ⚠️ Needs rotation | Currently uses weak dev value |
| `CSRF_SECRET` | ⚠️ Needs rotation | Currently uses weak dev value |
| `DB_PASSWORD` | ⚠️ Needs rotation | Live Supabase password |
| `DB_HOST` | ✅ | points to Supabase pooler |
| `DB_USER` | ✅ | Supabase user |
| `DB_NAME` | ✅ | `postgres` |
| `API_PORT` | ✅ | `4000` |
| `CORS_ORIGIN` | ✅ | Includes all required origins |
| `NODE_ENV` | ✅ | `production` |

---

## 7. GitHub Release Audit

| Check | Status | Details |
|-------|--------|---------|
| Git tag | ✅ | `v1.0.0` — "First production release" |
| CHANGELOG | ✅ | Comprehensive: Security, Database, Performance, OCR, Android, UI/UX, Testing, CI/CD |
| GitHub Release created | ❌ | No formal GitHub Release with release notes |
| Release notes published | ❌ | Tag exists but no release artifacts on GitHub |
| Latest commit pushed | ✅ | `3b8335e` on `origin/main` |
| Branch | ✅ | `main` only |
| Release Package | ✅ | `RELEASE_PACKAGE/` with 12 files |

### CHANGELOG Coverage

| Category | Status |
|----------|--------|
| Security (JWT, CSRF, rate limiting, Helmet) | ✅ Documented |
| Database (indexes, FKs, migrations) | ✅ Documented |
| Performance (React.memo, useMemo, Vite optimizations) | ✅ Documented |
| OCR (Otsu, confidence, timeout, Arabic extraction) | ✅ Documented |
| Android (Capacitor, plugins, build config) | ✅ Documented |
| UI/UX (RTL, skeleton, touch targets, accessiblity) | ✅ Documented |
| Testing (160 tests across 7 files) | ✅ Documented |
| CI/CD (GitHub Actions workflows) | ✅ Documented |

---

## Audit Score Summary

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| 1. Android Signing | 20% | 10% | 2.0% |
| 2. Play Store Readiness | 30% | 35% | 10.5% |
| 3. AndroidManifest Policy | 10% | 90% | 9.0% |
| 4. App Size | 10% | 90% | 9.0% |
| 5. Security | 15% | 65% | 9.8% |
| 6. Render Production | 10% | 80% | 8.0% |
| 7. GitHub Release | 5% | 80% | 4.0% |
| **Total** | **100%** | | **52.3%** |

### Breakdown by Criticality

| Category | Score | Critical Issues |
|----------|-------|-----------------|
| 🔴 Critical | **0/3** | ❌ Production keystore, ❌ Privacy policy, ❌ Secrets rotation |
| 🟡 Warning | **4/5** | ✅ Screenshots missing, Feature graphic missing, Data safety, Content rating |
| 🟢 Advisory | **12/14** | Minor improvements possible |

---

## Remaining Blockers for Play Store

### 🔴 Critical (Hard Blocks)

| # | Blocker | Why |
|---|---------|-----|
| 1 | **Debug-signed AAB** | Google Play rejects debug-signed apps |
| 2 | **No privacy policy** | Required for any app collecting personal data (name, ID, phone, photos) |
| 3 | **Live secrets in `server/.env`** | Must rotate JWT_SECRET, REFRESH_SECRET, CSRF_SECRET, DB_PASSWORD |
| 4 | **No Play Store developer account** | Requires $25 registration + app submission |

### 🟡 Required (Will Be Rejected Without)

| # | Gap | Details |
|---|-----|---------|
| 5 | No screenshots (phone) | Minimum 2 required (1080×1920+) |
| 6 | No feature graphic | 1024×500 required for store listing |
| 7 | Data safety section not filled | Must declare data collection |
| 8 | Content rating not completed | Must fill questionnaire |
| 9 | No app description | Short (80) + full (4000) in Arabic + English |
| 10 | No developer contact email | Required for store listing |

### 🟡 Should Fix Before Release

| # | Issue | Recommendation |
|---|-------|---------------|
| 11 | DB migrations not applied to production | Run `001` + `002` on Supabase |
| 12 | `android:allowBackup="true"` | Set to `false` to prevent data leakage |
| 13 | Minor WASM bloat (8.5 MB unused variants) | Trim to 2 variants |

---

### Icon Assets Verification

| Density | Foreground | Round | Adaptive XML |
|---------|-----------|-------|-------------|
| mdpi (48×48) | ✅ | ✅ | — |
| hdpi (72×72) | ✅ | ✅ | — |
| xhdpi (96×96) | ✅ | ✅ | — |
| xxhdpi (144×144) | ✅ | ✅ | — |
| xxxhdpi (192×192) | ✅ | ✅ | — |
| anydpi-v26 | — | — | ✅ `ic_launcher.xml` + `ic_launcher_round.xml` |
| Foreground drawable | ✅ `drawable-v24/ic_launcher_foreground.xml` |
| Background color | ✅ `#0F172A` (dark navy) |

---

## Final Verdict

```
READY FOR PLAY STORE = NO
```

**Overall readiness: 52.3%**

### Scorecard

```
▓▓▓▓▓░░░░░░░░░░░░░  52.3%
▲                    ▲
│                    └── Remaining: Privacy policy, signing, screenshots,
│                        feature graphic, data safety, content rating,
│                        secrets rotation, Play Store account
└── Ready: App icons, adaptive icons, security middleware,
    Render health, CHANGELOG, Android SDK compliance,
    permissions, app size, Capacitor config
```

### What's Ready (52.3%)
- ✅ App icons and adaptive icons
- ✅ Android SDK compliance (minSdk 24, targetSdk 36)
- ✅ Permissions properly declared with `maxSdkVersion` and `required="false"`
- ✅ App size well under Google Play limit (27 MB vs 200 MB)
- ✅ Security middleware fully functional (JWT, CSRF, rate limiting, Helmet)
- ✅ Render production healthy with correct headers
- ✅ CHANGELOG comprehensive
- ✅ TypeScript/build/tests all passing
- ✅ APK + AAB generated successfully

### What's Missing (47.7%)
- ❌ **Critical:** Production keystore and signing
- ❌ **Critical:** Privacy policy URL
- ❌ **Critical:** Secret rotation (all 4 secrets)
- ❌ **Required:** Screenshots, feature graphic
- ❌ **Required:** Data safety section
- ❌ **Required:** Content rating
- ❌ **Required:** App descriptions (short + full)
- ❌ **Required:** Developer account registration
- ❌ **Advisory:** WASM size optimization
- ❌ **Advisory:** `allowBackup` hardening
- ❌ **Advisory:** DB migration execution

### Quickest Path to GO

| Step | Effort | Impact |
|------|--------|--------|
| 1. Generate keystore + rebuild signed AAB | 30 min | +20% |
| 2. Host privacy policy on Firebase/GitHub Pages | 1 hour | +15% |
| 3. Rotate all secrets + update Render env vars | 30 min | +10% |
| 4. Take 2 screenshots + create feature graphic | 1 hour | +10% |
| 5. Register Play Store account ($25) | 30 min | +10% |
| 6. Fill data safety + content rating | 30 min | +5% |
| **Total to reach 90%+** | **~4 hours** | |

---

*Generated by Play Store Release Audit — 2026-06-12*
