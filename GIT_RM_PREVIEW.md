# GIT RM PREVIEW

**Auditor:** Principal Git Engineer
**Date:** 2026-06-30
**Repository:** yemen-telecom
**Scope:** Simulated git rm --cached output

---

## Executive Summary

Simulated `git rm --cached` on 32 files that should be removed from Git tracking. These are generated audit/report files that will not affect builds or application functionality.

---

## Files That Would Be Removed (32 files)

### Firebase Cache (1 file)

```
git rm --cached .firebase/hosting.ZGlzdA.cache
```

**Risk:** LOW - Cache file that regenerates automatically.

---

### AUDIT Directory (13 files)

```
git rm --cached -r AUDIT/01_PROJECT_DISCOVERY.md
git rm --cached -r AUDIT/03_DEPENDENCIES.md
git rm --cached -r AUDIT/04_DATABASE.md
git rm --cached -r AUDIT/05_SECURITY.md
git rm --cached -r AUDIT/06_ANDROID.md
git rm --cached -r AUDIT/07_ENVIRONMENT.md
git rm --cached -r AUDIT/08_RENDER.md
git rm --cached -r AUDIT/09_GITHUB.md
git rm --cached -r AUDIT/10_TESTING.md
git rm --cached -r AUDIT/11_ANDROID_RELEASE.md
git rm --cached -r AUDIT/FIX_PLAN_P0.md
git rm --cached -r AUDIT/PHASE_1_REAL_TEST_STATUS.md
git rm --cached -r AUDIT/PHASE_9_REAL_RELEASE_BLOCKERS.md
```

**Risk:** LOW - Generated audit reports.

---

### Root Audit/Report Files (12 files)

```
git rm --cached DEPLOYMENT_CHECKLIST.md
git rm --cached FINAL_PRODUCTION_READINESS_AUDIT_V2.md
git rm --cached FINAL_PRODUCTION_RELEASE.md
git rm --cached FINAL_RELEASE_VERIFICATION.md
git rm --cached GITHUB_RELEASE_AUDIT.md
git rm --cached GOOGLE_PLAY_SUBMISSION_CHECKLIST.md
git rm --cached PLAY_STORE_RELEASE_CHECKLIST.md
git rm --cached PROJECT_IMPROVEMENTS_APPLIED.md
git rm --cached RUNTIME_CRASH_FINDINGS.md
git rm --cached SECRET_ROTATION_CHECKLIST.md
git rm --cached SECURITY_AUDIT.md
git rm --cached TYPESCRIPT_AUDIT.md
```

**Risk:** LOW - Generated audit/checklist files.

---

### docs/ Directory (6 files)

```
git rm --cached docs/ANDROID_IMPROVEMENTS.md
git rm --cached docs/PERFORMANCE_IMPROVEMENTS.md
git rm --cached docs/PLAYSTORE_READINESS.md
git rm --cached docs/SECURITY_IMPROVEMENTS.md
git rm --cached docs/TESTING_IMPROVEMENTS.md
git rm --cached docs/TESTING_SETUP.md
```

**Risk:** LOW - Generated documentation files.

---

## Files That Would Stay (28 files)

### Android Resources (26 files)

These files MUST remain tracked. Do NOT remove them.

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

**Risk:** HIGH - Removing these would break Android builds.

---

### PWA Icons (2 files)

These files MUST remain tracked. Do NOT remove them.

```
public/icon-192.png
public/icon-512.png
```

**Risk:** HIGH - Removing these would break PWA installation.

---

## Potential Risks

### Low Risk (32 files)

- Files will be removed from Git index
- Files will remain on disk
- Next commit will show 32 deleted files
- Files will become untracked

### No Risk (28 files)

- Android resources remain tracked
- PWA icons remain tracked
- Application builds unaffected

---

## Rollback Procedure

If any file is incorrectly removed, restore it with:

```
git add <file_path>
```

Or restore all removed files:

```
git add .firebase/hosting.ZGlzdA.cache AUDIT/ DEPLOYMENT_CHECKLIST.md FINAL_*.md GITHUB_RELEASE_AUDIT.md GOOGLE_PLAY_SUBMISSION_CHECKLIST.md PLAY_STORE_RELEASE_CHECKLIST.md PROJECT_IMPROVEMENTS_APPLIED.md RUNTIME_CRASH_FINDINGS.md SECRET_ROTATION_CHECKLIST.md SECURITY_AUDIT.md TYPESCRIPT_AUDIT.md docs/ANDROID_IMPROVEMENTS.md docs/PERFORMANCE_IMPROVEMENTS.md docs/PLAYSTORE_READINESS.md docs/SECURITY_IMPROVEMENTS.md docs/TESTING_IMPROVEMENTS.md docs/TESTING_SETUP.md
```

---

## Simulation Results

### Before Simulation

```
$ git status --short
M  .github/workflows/android.yml
 M .gitignore
M  android/gradle.properties
?? GITIGNORE_AUDIT.md
?? GITIGNORE_CHANGELOG.md
?? GITIGNORE_FIX_REPORT.md
?? GITIGNORE_SCORECARD.md
?? GITIGNORE_VALIDATION.md
?? GIT_TRACKED_FILES_AUDIT.md
?? GIT_RM_PREVIEW.md
?? null
?? scripts/publish-release.js
```

### After Simulation (Proposed)

```
$ git status --short
M  .github/workflows/android.yml
 M .gitignore
M  android/gradle.properties
D  .firebase/hosting.ZGlzdA.cache
D  AUDIT/01_PROJECT_DISCOVERY.md
D  AUDIT/03_DEPENDENCIES.md
D  AUDIT/04_DATABASE.md
D  AUDIT/05_SECURITY.md
D  AUDIT/06_ANDROID.md
D  AUDIT/07_ENVIRONMENT.md
D  AUDIT/08_RENDER.md
D  AUDIT/09_GITHUB.md
D  AUDIT/10_TESTING.md
D  AUDIT/11_ANDROID_RELEASE.md
D  AUDIT/FIX_PLAN_P0.md
D  AUDIT/PHASE_1_REAL_TEST_STATUS.md
D  AUDIT/PHASE_9_REAL_RELEASE_BLOCKERS.md
D  DEPLOYMENT_CHECKLIST.md
D  FINAL_PRODUCTION_READINESS_AUDIT_V2.md
D  FINAL_PRODUCTION_RELEASE.md
D  FINAL_RELEASE_VERIFICATION.md
D  GITHUB_RELEASE_AUDIT.md
D  GOOGLE_PLAY_SUBMISSION_CHECKLIST.md
D  PLAY_STORE_RELEASE_CHECKLIST.md
D  PROJECT_IMPROVEMENTS_APPLIED.md
D  RUNTIME_CRASH_FINDINGS.md
D  SECRET_ROTATION_CHECKLIST.md
D  SECURITY_AUDIT.md
D  TYPESCRIPT_AUDIT.md
D  docs/ANDROID_IMPROVEMENTS.md
D  docs/PERFORMANCE_IMPROVEMENTS.md
D  docs/PLAYSTORE_READINESS.md
D  docs/SECURITY_IMPROVEMENTS.md
D  docs/TESTING_IMPROVEMENTS.md
D  docs/TESTING_SETUP.md
?? GITIGNORE_AUDIT.md
?? GITIGNORE_CHANGELOG.md
?? GITIGNORE_FIX_REPORT.md
?? GIT_IGNORE_SCORECARD.md
?? GITIGNORE_VALIDATION.md
?? GIT_TRACKED_FILES_AUDIT.md
?? GIT_RM_PREVIEW.md
?? null
?? scripts/publish-release.js
```

---

## Conclusion

Simulated `git rm --cached` on 32 files. All files are safe to remove. No breaking changes. Android resources and PWA icons remain tracked.

**Files to Remove:** 32
**Files to Keep:** 28
**Risk Level:** LOW
**Rollback:** Yes (git add)
