# Release Notes — Yemen Telecom v1.0.0 (build 3)

**Release date:** 2026-07-14
**Channels:** Google Play (production), Web SPA (Render)
**Package:** com.yemen.telecom · versionName 1.0.0 · versionCode 3

## What's in this release
- Full SIM inventory & sales management for managers, agents, and sellers.
- Role-based access control (manager / agent / seller) enforced server-side (RBAC + RLS).
- Arabic-first UI with right-to-left layout and dark mode.
- Biometric unlock, camera-based SIM/shelf scanning, push notifications.
- Reports (daily sales, inventory) and admin settings/audit logs.
- Secure auth: JWT access + refresh, CSRF protection on mutations, helmet security headers,
  PostgreSQL row-level security, parameterized queries (no SQL injection surface).

## Fixes in this build (vs earlier internal builds)
- **CORS fix (critical):** the web SPA previously rendered a blank white page in real browsers
  because ES-module/CSS asset requests carry an `Origin` header that was not in the CORS allowlist,
  causing the server to throw and return HTTP 500 on every bundle. Fixed by returning
  `callback(null, false)` for non-allowlisted origins instead of throwing. Web app now loads
  correctly (verified: login + manager dashboard render in Arabic RTL).
- **Runtime API host fix:** dead host `yemen-telecom-api.onrender.com` replaced with the live
  `https://yemen-telecom.onrender.com` in web client, Capacitor config, and Android network security
  config.

## Known limitations
- Web SPA on the free Render tier may briefly fail to load after long idle (cold start); recovers
  when the origin warms up. Upgrade plan or move SPA to static hosting for guaranteed uptime.
- Google Fonts are loaded from `fonts.gstatic.com`; a transient Google outage shows system-font
  fallback (cosmetic, no functional impact).
- Privacy policy is published in-repo; a hosted public URL must be provided in Play Console.

## Upgrade / install
- Android: install via Google Play (AAB signed with the production keystore).
- Web: available at `https://yemen-telecom.onrender.com` (no install required).
