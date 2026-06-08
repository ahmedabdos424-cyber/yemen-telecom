# Changelog

## v1.0.0 (2026-06-08)

### Security
- **CSRF Protection**: Implemented double-submit cookie CSRF pattern for all state-changing requests (POST/PUT/DELETE)
- **Token Rotation**: Added refresh token system with rotation and blacklisting
- **Rate Limiting**: Login endpoint limited to 10 attempts per 15 minutes, API limited to 100 req/min
- **Helmet Security Headers**: Added CSP, X-Frame-Options, X-Content-Type-Options, and other security headers
- **SQL Injection Prevention**: Parametrized queries throughout all routes

### Seller Creation
- Fixed seller creation flow with duplicate detection and validation
- Added proper error handling and rollback on failure
- Seller SIM limit enforcement (max 10 per seller)

### OCR — Offline Support
- Complete offline Arabic OCR pipeline using Tesseract.js
- All assets bundled: 12 WASM variants + Arabic traineddata (1.6 MB)
- Zero CDN dependencies — works in airplane mode
- Worker singleton pattern: single Tesseract worker shared across entire app (~15MB heap)
- Image preprocessing: resize (1000px max) → grayscale → contrast 1.4× → JPEG 0.7
- Blur detection (Laplacian variance) and low-light detection before OCR recognition
- Post-processing: dedup, garbage-strip, Arabic-filter, minimum 2-word validation
- Progress modal with 7 real stages

### Camera & Android Improvements
- Camera permission handling with denial detection and Arabic error messages
- "فتح الإعدادات" button linking to Android app settings
- Camera resolution capped to 1280px for low-end device support
- Canvas memory cleanup on capture
- `getUserMedia` fallback to file input on failure

### SIM Allocation
- SIM allocation with proper locking and concurrent-safe updates
- Reserved SIM expiration after 24 hours
- Inventory tracking per agent/seller

### Production Hardening
- ProGuard rules configured for Capacitor WebView bridge
- Memory leak prevention (canvas disposal, stream cleanup)
- Error boundary wrapping all views
- Release APK (25.2 MB) and AAB (26.37 MB) with R8 optimization
- Works on Android 6.0+ (API 23), target API 35

### Infrastructure
- Migrated to Supabase PostgreSQL (from SQLite)
- Express server with compression, CORS, rate limiting
- Render deployment with IPv4-force and trust-proxy
- Seed system for initial admin user and test data
