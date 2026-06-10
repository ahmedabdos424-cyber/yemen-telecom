# Android Improvements — Yemen Telecom v1.0.0

## Build Configuration

| Setting | Value |
|---------|-------|
| applicationId | `com.yemen.telecom` |
| minSdkVersion | 24 (Android 7.0) |
| targetSdkVersion | 36 (Android 16) |
| versionCode | 2 |
| versionName | `1.0.0` |
| APK size | ~25.2 MB |
| AAB size | ~26.37 MB |
| minification | R8/ProGuard enabled |

## Changes Applied

### AndroidManifest.xml
- Added `android:largeHeap="true"` — prevents OOM on large OCR WASM files
- Added `android:hardwareAccelerated="true"` — smoother WebView rendering
- Added `ACCESS_NETWORK_STATE` permission — proper offline detection
- Added `ACCESS_WIFI_STATE` permission — network quality assessment
- Added `READ_EXTERNAL_STORAGE` (maxSdkVersion=32) — backward-compatible file access

### capacitor.config.ts
- Removed unused `FirebaseAuthentication` plugin config
- Added `CapacitorPreferences` plugin config for encrypted token storage

## Android Compatibility

| Android Version | Status | Notes |
|----------------|--------|-------|
| 7.0 (API 24) | ✅ | minSdk — covers 95%+ |
| 12 (API 31) | ✅ | Fully tested |
| 13 (API 33) | ✅ | Scoped storage handled |
| 14 (API 34) | ✅ | |
| 15 (API 35) | ✅ | |
| 16 (API 36) | ✅ | targetSdk |

## Recommendations

- Add adaptive icons (`mipmap-anydpi-v26/ic_launcher.xml`)
- Implement Play Core in-app updates
- Add WebView hardware overlay optimization in MainActivity
