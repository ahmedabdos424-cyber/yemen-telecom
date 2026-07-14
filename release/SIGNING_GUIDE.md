# Signing Guide — Yemen Telecom Android Release

## Keystore (production)

- **File:** `android/app/release.keystore` (git-ignored, NOT in repo)
- **Key algorithm:** RSA **4096-bit**, signature **SHA384withRSA**
- **Key alias:** `release`
- **Validity:** 2026-06-14 → 2126-06-20 (100 years)
- **Subject DN:** `CN=Yemen Telecom, OU=Development, O=Yemen Telecom, L=Sana'a, ST=Aden, C=YE`
- **Certificate SHA-256 fingerprint:**
  `10:80:2B:FC:0A:D5:89:3F:9D:6A:C1:08:7C:E0:01:6C:4D:30:79:23:FB:CC:E7:B7:D9:74:3F:55:72:76:6E:AB`

## How the build reads the key

`android/app/build.gradle` reads signing from environment variables (never hardcoded):

| Env Var | Purpose |
|---|---|
| `KEYSTORE_PATH` | Absolute path to `release.keystore` |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEYSTORE_ALIAS` | Key alias (`release`) |
| `KEY_PASSWORD` | Key password |

Fallback: if env vars are absent, Gradle uses the debug key (build still succeeds but is NOT publishable).

## Reproduce a signed release build

```powershell
# 1. ensure keystore env vars are exported (do NOT commit them)
$env:KEYSTORE_PATH = "C:\Users\Ahmed\Desktop\yemen-telecom\android\app\release.keystore"
$env:KEYSTORE_PASSWORD = "***"
$env:KEYSTORE_ALIAS   = "release"
$env:KEY_PASSWORD     = "***"

# 2. clean, sync web assets, build signed APK + AAB
cd C:\Users\Ahmed\Desktop\yemen-telecom
npm run build
npx cap sync android
cd android
.\gradlew clean assembleRelease bundleRelease
```

Outputs:
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## Verify signature

```powershell
apksigner verify --verbose release/yemen-telecom-release.apk
zipalign -c -v 4 release/yemen-telecom-release.apk
jarsigner -verify -verbose release/yemen-telecom-release.aab
```

Expected: `Verifies` = true, v2 scheme present, 1 signer, cert SHA-256 = `10802BFC...6EAB`.

## Security rules

- The keystore and passwords are **never** committed (`.gitignore` excludes `*.keystore`, `key.properties`, `.env.keystore`).
- Git history was scanned: no keystore, password, or `key.properties` has ever been committed.
- Store the keystore OFFLINE (encrypted backup). **Loss = permanent inability to update the app on Google Play.**
