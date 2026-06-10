# Play Store Readiness

**Date:** 2026-06-10  
**App:** Yemen Telecom (يمن تيليكوم)  
**Package:** `com.yemen.telecom`

---

## Versioning

| Field | Value | Status |
|-------|-------|--------|
| versionCode | 2 | ✅ Incremented correctly |
| versionName | 1.0.0 | ✅ Semantic version |
| targetSdkVersion | 36 (Android 16) | ✅ Latest |
| minSdkVersion | 24 (Android 7.0) | ✅ Covers 95%+ devices |

## Permissions

| Permission | Required | Justification |
|------------|----------|---------------|
| `android.permission.INTERNET` | ✅ Yes | API communication |
| `android.permission.CAMERA` | ✅ Yes | Identity card OCR scanning |
| Camera hardware feature | `required="false"` | ✅ Graceful fallback |

## App Signing

| Item | Status |
|------|--------|
| Release keystore | ✅ Referenced in `build.gradle` |
| Keystore via env vars | ✅ `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`, `KEY_PASSWORD` |
| Debug fallback | ✅ Falls back to debug signing if env vars missing |

## Adaptive Icons

### Current Status
⚠️ No adaptive icon configured.

### Recommendation
Create adaptive icon files:

```xml
<!-- android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml -->
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

Provide:
- `ic_launcher_background.xml` (solid color or simple gradient)
- `ic_launcher_foreground.xml` (app logo as vector)
- Legacy PNG icons in `mipmap-mdpi` through `mipmap-xxxhdpi`

## Google Play Requirements

### Privacy Policy
⚠️ **Required for Play Store submission**

The app collects:
- Camera images (for OCR — processed locally, not stored on server by default)
- User credentials (username/password — stored in server database)
- SIM/ICCID numbers (stored in server database)
- Location (region data for agent registration)

A privacy policy must be created and hosted at a public URL.

### Data Safety Section
Required disclosures in Google Play Console:
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Camera images | Yes | No | OCR identity card processing (local device) |
| Personal info (name, phone, ID) | Yes | No | SIM activation records |
| App usage | No | — | — |
| Device ID | No | — | — |

### Content Rating
Complete Google Play content rating questionnaire:
- Category: Business / Communication
- Rating target: Everyone

## Pre-Launch Checklist

- [ ] versionCode incremented for each release
- [ ] Adaptive icons created
- [ ] Privacy policy hosted at public URL
- [ ] Data safety section completed in Play Console
- [ ] App signing key securely stored (not in repo)
- [ ] Internal test track configured for alpha testing
- [ ] Test accounts created for QA
- [ ] Test on physical devices (API 29, 31, 34)

## Known Issues for Play Store Review

1. App name garbled in `capacitor.config.ts` — fix before submission
2. No `contentDescription` on icon buttons — may affect accessibility review
3. Camera permission rationale should be explained in app

## Build Artifacts for Upload

| Artifact | Path | Size |
|----------|------|------|
| AAB (recommended) | `android/app/build/outputs/bundle/release/app-release.aab` | 26.37 MB |
| APK (fallback) | `android/app/build/outputs/apk/release/app-release.apk` | 25.2 MB |

Upload **AAB** to Google Play Console. Google Play will optimize and sign the APK for each device configuration.
