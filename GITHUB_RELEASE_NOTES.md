# GitHub Release Notes — v1.0.0

**Repository:** https://github.com/ahmedabdos424-cyber/yemen-telecom  
**Tag:** v1.0.0  
**Commit:** ae657ed

---

## Version

**v1.0.0** — First Production Release

---

## Features

### 🔹 Offline Arabic OCR
- Tesseract.js WASM engine bundled locally (14 assets, ~46 MB)
- No CDN dependencies — fully offline
- Arabic language traineddata (`ara.traineddata.gz`)
- Blur and dark image detection
- Smart image preprocessing (grayscale, contrast, denoise)
- OCR progress tracking with stages

### 🔹 SIM Activation
- Multi-step activation form with OCR auto-fill
- Camera capture for identity card
- Offline OCR with progress bar
- ICCID input with camera shortcut
- RTL-optimized layout

### 🔹 Seller Management
- Seller creation with password
- Seller list with search, filter, and sort
- SIM allocation and transfer
- Seller info popup with actions (edit, delete, disable, reset password)
- Confirm modals for destructive actions

### 🔹 Agent Dashboard
- Role-based views (manager / agent)
- Multi-tab layout (Home, Sellers, SIMs)
- Operator inventory tracking (Yemen Mobile, YOU, Sabafon)
- Quick actions for SIM activation and seller management
- Responsive stat cards

### 🔹 Profile & Settings
- Agent and Seller profile pages
- Dark mode toggle
- Password change
- Logout with confirmation
- Camera icon overlay for profile photo

### 🔹 Android Compatibility
- minSdkVersion: 24 (Android 7.0)
- targetSdkVersion: 36 (Android 16)
- Capacitor native plugins
- Camera and Internet permissions
- ProGuard minification enabled

### 🔹 Supabase PostgreSQL Backend
- SSL-enabled connection pool
- Transaction support
- Startup validation
- Environment-variable-only configuration
- CORS configured for Capacitor

### 🔹 Security
- Full security audit completed
- Git history secret scan (no leaked credentials)
- Environment variables gitignored
- No build artifacts tracked
- No keystore files committed

### 🔹 UI/UX Improvements
- RTL support across all screens
- Dark mode preserved
- Responsive mobile layouts
- Clean page titles without descriptive text
- Progress bars visible only during submission
- Password eye icon RTL-optimized

---

## Release Assets

| Asset | Path | Size |
|-------|------|------|
| APK | `android/app/build/outputs/apk/release/app-release.apk` | 26.4 MB |
| AAB | `android/app/build/outputs/bundle/release/app-release.aab` | 27.6 MB |

---

## Installation

1. Download `app-release.apk` from releases
2. Enable "Install from unknown sources" on Android
3. Open APK to install
4. Login with agent or seller credentials

For Google Play distribution, upload `app-release.aab` to Play Console.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full changelog.
