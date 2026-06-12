# Google Play Store Release Checklist

**Date:** 2026-06-12
**Project:** Yemen Telecom SIM Management System
**Package:** com.yemen.telecom

---

## ✅ App Content

| # | Item | Status | Details |
|---|------|--------|---------|
| 1 | App name (Arabic) | ✅ DONE | "يمن تيليكوم" |
| 2 | App name (English) | ⚠️ NEEDED | Provide English name like "Yemen Telecom" |
| 3 | Short description (80 char) | ⚠️ NEEDED | Max 80 characters in Arabic + English |
| 4 | Full description (4000 char) | ⚠️ NEEDED | Max 4000 characters in Arabic + English |
| 5 | App category | ⚠️ NEEDED | Suggested: "Business" or "Productivity" |
| 6 | Tags | ⚠️ NEEDED | e.g., "SIM card management, telecom, Yemen" |

---

## ✅ App Icons & Graphics

| # | Item | Status | Details |
|---|------|--------|---------|
| 7 | App icon (512x512 PNG) | ✅ DONE | Adaptive icon configured in mipmap-* directories |
| 8 | Adaptive icon (foreground + background) | ✅ DONE | XML in mipmap-anydpi-v26, foreground in drawable-v24 |
| 9 | Feature graphic (1024x500 PNG) | ❌ MISSING | Required for Play Store listing |
| 10 | Phone screenshots (2–8, 1080x1920+ ) | ❌ MISSING | At least 2 screenshots required |
| 11 | Tablet screenshots (2–8, 1080x1920+) | ❌ MISSING | Recommended but not mandatory |
| 12 | Promo video (optional) | ❌ NOT PLANNED | Optional YouTube video |

---

## ✅ Store Listing

| # | Item | Status | Details |
|---|------|--------|---------|
| 13 | Privacy policy URL | ❌ MISSING | **REQUIRED** — must host a privacy policy page |
| 14 | Website URL | ⚠️ NEEDED | e.g., `https://yemen-telecom-1699.web.app` |
| 15 | Email address | ⚠️ NEEDED | Developer contact email |
| 16 | Phone number | ❌ OPTIONAL | Not required |
| 17 | Credit/Debit card support | ⚠️ NEEDED | If using Play Console payments |

---

## ✅ App Configuration

| # | Item | Status | Details |
|---|------|--------|---------|
| 18 | Content rating questionnaire | ❌ PENDING | Must complete in Play Console |
| 19 | Target age group | ⚠️ NEEDED | Suggested: "18+" (telecom management) |
| 20 | Data safety section | ❌ PENDING | **REQUIRED** — declare data collection practices |
| 21 | In-app purchases | ✅ NONE | App has no purchases |
| 22 | Ads declaration | ✅ NONE | App has no ads |
| 23 | Government restrictions | ⚠️ NEEDED | If targeting Yemen market specifically |

---

## ✅ Android Technical Requirements

| # | Item | Status | Details |
|---|------|--------|---------|
| 24 | AAB uploaded | ❌ PENDING | App bundle ready at `RELEASE_PACKAGE/app-release.aab` |
| 25 | Production keystore | ❌ MISSING | Debug-signed currently (see ANDROID_SIGNING_REPORT.md) |
| 26 | Google Play App Signing | ⚠️ PENDING | Enroll during first upload |
| 27 | minSdk compliance (24 = Android 7.0) | ✅ PASS | Current minSdk = 24 |
| 28 | targetSdk compliance (36 = Android 16) | ✅ PASS | Current targetSdk = 36 |
| 29 | 64-bit architecture support | ⚠️ VERIFY | Check APK includes arm64-v8a |
| 30 | APK size < 200MB | ✅ PASS | Current APK = 27.1MB |
| 31 | Permissions declared properly | ✅ PASS | INTERNET, CAMERA, NETWORK_STATE, WIFI_STATE, READ_EXTERNAL_STORAGE (maxSdk 32) |
| 32 | Google Play Store Developer account | ⚠️ PENDING | Requires $25 one-time fee |
| 33 | Content Distribution Agreement | ⚠️ PENDING | Must accept in Play Console |

---

## ✅ Privacy Policy Requirements

A privacy policy is **REQUIRED** if the app:
- Collects personal data (names, phone numbers, ID numbers ✅)
- Uses camera (OCR scanning ✅)
- Uses network/device state

### Minimum Privacy Policy Content:
1. What data is collected (name, phone, ID number, SIM data, photos)
2. How data is used (SIM distribution, identity verification)
3. Data storage and security (Supabase, Firebase, encrypted)
4. Data sharing (none with third parties)
5. User rights (access, correction, deletion)
6. Contact information
7. Effective date

### Suggested Hosting Options:
- GitHub Pages (free, static)
- Firebase Hosting (`https://yemen-telecom-1699.web.app/privacy`)
- Netlify (free tier)

---

## ✅ Data Safety Section (Required Declarations)

| Data Type | Collected | Purpose | Shared |
|-----------|-----------|---------|--------|
| Name | ✅ Yes | Account creation, SIM registration | No |
| Phone number | ✅ Yes | Account contact, SIM registration | No |
| National ID number | ✅ Yes | SIM registration (Yemeni regulation) | No |
| Photos / Camera images | ✅ Yes | OCR identity card scanning | No |
| Device state | ✅ Yes | Camera permission check | No |
| Network state | ✅ Yes | Connection status | No |
| Location | ❌ No | — | — |
| Financial data | ❌ No | — | — |

---

## Summary

| Category | Done | Missing | Total |
|----------|------|---------|-------|
| App Content | 1 | 5 | 6 |
| Icons & Graphics | 3 | 3 | 6 |
| Store Listing | 0 | 4 | 4 |
| App Configuration | 3 | 3 | 6 |
| Technical | 4 | 4 | 8 |
| Privacy Policy | 0 | 1 | 1 |
| **Total** | **11** | **20** | **31** |

> **Note:** Privacy policy and screenshots are **hard blockers** — Google will reject the submission without them.
