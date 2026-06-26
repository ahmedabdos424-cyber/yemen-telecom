# SECRET INVENTORY

**Project:** Yemen Telecom Distribution Management System
**Date:** 2026-06-25
**Method:** Source code analysis of tracked files

---

## Currently Tracked in Git (Risk Level)

| Secret | Location | In Git? | Risk |
|--------|----------|---------|------|
| DB_PASSWORD | `server/.env` (disk only) | ❌ Gitignored | LOW |
| JWT_SECRET | `server/.env` (disk only) | ❌ Gitignored | LOW |
| REFRESH_SECRET | `server/.env` (disk only) | ❌ Gitignored | LOW |
| CSRF_SECRET | `server/.env` (disk only) | ❌ Gitignored | LOW |
| FIREBASE_PROJECT_ID | `server/.env` (disk only) | ❌ Gitignored | LOW |
| FIREBASE_SERVICE_ACCOUNT_KEY | `server/.env` (disk only) | ❌ Gitignored | LOW |
| STORAGE_BUCKET | `server/.env` (disk only) | ❌ Gitignored | LOW |
| release.keystore | Root (disk only) | ❌ Gitignored | LOW |

## Missing (Blocking)

| Secret | Required Path | Status | Impact |
|--------|---------------|--------|--------|
| `google-services.json` | `android/app/google-services.json` | **MISSING** | Push notifications, FCM broken |

## Historical Leaks (Git History)

| Secret | Commit | File |
|--------|--------|------|
| DB_PASSWORD, JWT_SECRET, CSRF_SECRET, REFRESH_SECRET | `ae657ed` | Various audit markdown files |
| Same secrets | `d784c83` | Various audit markdown files |
| Firebase PEM private key | `ae657ed` | Audit files referencing `FIREBASE_PRIVATE_KEY` |

## Verification

| Check | Result |
|-------|--------|
| `git ls-files *.env` | Empty |
| `git ls-files *.keystore` | Empty |
| `git ls-files *.jks` | Empty |
| `git ls-files firebase-service-account.json` | Empty |
| `git ls-files google-services.json` | Empty |
