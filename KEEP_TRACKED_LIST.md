# KEEP TRACKED LIST

**Auditor:** Principal Git Engineer
**Date:** 2026-06-30
**Repository:** yemen-telecom
**Scope:** Files that MUST remain tracked in Git

---

## Executive Summary

**28 files** MUST remain tracked in Git. These are Android resources and PWA icons that are required for application builds.

---

## Keep Tracked List (28 files)

### Android Resources (26 files)

These files are Android resources that are required for Android builds. Do NOT remove them.

```
android/app/src/main/res/drawable-land-hdpi/splash.png
android/app/src/main/res/drawable-land-mdpi/splash.png
android/app/src/main/res/drawable-land-xhdpi/splash.png
android/app/src/main/res/drawable-land-xxhdpi/splash.png
android/app/src/main/res/drawable-land-xxxhdpi/splash.png
android/app/src/main/res/drawable-port-hdpi/splash.png
android/app/src/main/res/drawable-port-mdpi/splash.png
android/app/src/main/res/drawable-port-xhdpi/splash.png
android/app/src/main/res/drawable-port-xxhdpi/splash.png
android/app/src/main/res/drawable-port-xxxhdpi/splash.png
android/app/src/main/res/drawable/splash.png
android/app/src/main/res/mipmap-hdpi/ic_launcher.png
android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-mdpi/ic_launcher.png
android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
```

---

### PWA Icons (2 files)

These files are PWA icons that are required for PWA installation. Do NOT remove them.

```
public/icon-192.png
public/icon-512.png
```

---

## Why These Files MUST Remain Tracked

### Android Resources

These 26 files are Android resources that:
1. Are required for Android builds
2. Are required for Android APK generation
3. Are required for Play Store submission
4. Are required for Android app installation
5. Are required for Android app updates

If these files are removed from Git tracking:
- Android builds will fail
- Android APK generation will fail
- Play Store submission will fail
- Android app installation will fail
- Android app updates will fail

---

### PWA Icons

These 2 files are PWA icons that:
1. Are required for PWA installation
2. Are required for PWA manifest
3. Are required for PWA icons
4. Are required for PWA updates

If these files are removed from Git tracking:
- PWA installation will fail
- PWA manifest will be invalid
- PWA icons will be missing
- PWA updates will fail

---

## Cross-Platform Compatibility

| Platform | Status | Impact if Removed |
|----------|--------|-------------------|
| Windows | N/A | None |
| Linux | N/A | None |
| macOS | N/A | None |
| Docker | N/A | None |
| Render | N/A | None |
| Netlify | N/A | None |
| GitHub Actions | N/A | None |
| Android | REQUIRED | Android builds will fail |
| Capacitor | REQUIRED | Capacitor builds will fail |
| PWA | REQUIRED | PWA installation will fail |

---

## Conclusion

**28 files** MUST remain tracked in Git. These are Android resources and PWA icons that are required for application builds. Do NOT remove them.

**Risk if Removed:** HIGH - Android builds, Capacitor builds, and PWA installation will fail.
