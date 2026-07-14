# Release Signing Guide
## Yemen Telecom Distribution System

### Overview

Release builds are signed with a 4096-bit RSA keystore (JKS format) valid for 100 years.

### Keystore Details

| Property | Value |
|----------|-------|
| File | `android/app/release.keystore` |
| Type | JKS |
| Alias | `yemen-telecom-release` |
| Algorithm | RSA 4096-bit |
| Signature | SHA384withRSA |
| Validity | 2026-07-14 to 2126-06-20 (100 years) |
| Owner | CN=Yemen Telecom, OU=Development, O=Yemen Telecom, L=Sana'a, ST=Aden, C=YE |

### Configuration

Signing credentials are stored in `android/key.properties` (gitignored):

```properties
storePassword=<from key.properties>
keyPassword=<from key.properties>
keyAlias=yemen-telecom-release
storeFile=release.keystore
```

### Environment Variables (CI/CD)

For CI/CD, set these environment variables:

```bash
KEYSTORE_PATH=android/app/release.keystore
KEYSTORE_PASSWORD=<password>
KEYSTORE_ALIAS=yemen-telecom-release
KEY_PASSWORD=<password>
```

### Building Release APK

```bash
cd android
./gradlew.bat assembleRelease --no-daemon
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### Building Release AAB

```bash
cd android
./gradlew.bat bundleRelease --no-daemon
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Verifying Signing

```bash
# Verify APK
apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk

# Verify zipalign
zipalign -c -v 4 android/app/build/outputs/apk/release/app-release.apk
```

### Security Notes

- **NEVER** commit `key.properties` or `release.keystore` to version control
- **NEVER** share keystore passwords in plain text
- Store backup of `release.keystore` in a secure location (e.g., password manager)
- If keystore is lost, you CANNOT update your app on Google Play
- The keystore is backed up as `release.keystore.old` (previous debug keystore)
