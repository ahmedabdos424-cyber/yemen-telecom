# Changelog

All notable changes to the Yemen Telecom SIM Management System are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] - 2026-07-14 (build 3 / versionCode 3) — FINAL RELEASE

### Fixed
- **Critical (web):** CORS middleware threw `Not allowed by CORS` for the app's own origin on
  ES-module/CSS asset requests, returning HTTP 500 on every bundle and rendering a blank page.
  Now returns `callback(null, false)` so same-origin assets load (200). (commit `212eefe`)
- **Runtime API host:** replaced dead `yemen-telecom-api.onrender.com` with live
  `yemen-telecom.onrender.com` across web client, Capacitor config, and Android network security
  config. (commit `044e0c6`)

### Security
- Parameterized SQL throughout (no string concatenation) — no SQL injection surface.
- Row-level security enabled on all 16 public tables with 16 policies.
- Helmet headers (HSTS, nosniff, SAMEORIGIN, CSP nonce, referrer-policy), CSRF on mutations.
- Production signing keystore RSA-4096 / SHA384withRSA; secrets never committed.

## [1.0.0-rc] - earlier internal builds
- Manager/agent/seller RBAC, SIM inventory, sales, reports, biometric, camera scan, notifications.
- Arabic RTL UI, dark mode.
- PostgreSQL schema with migrations ledger, RLS, audit logging.

## [Unreleased]
- Google Play Integrity API integration (recommended hardening).
- Hosted privacy-policy URL.
