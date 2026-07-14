# Deployment Guide
## Yemen Telecom Distribution System — Google Play

### Prerequisites

1. **Google Play Developer Account** ($25 one-time fee)
2. **Release Keystore** (`android/app/release.keystore`)
3. **key.properties** configured with signing credentials
4. **Production Backend** running at `https://yemen-telecom.onrender.com`

### Step 1: Build Release AAB

```bash
cd android
./gradlew.bat clean bundleRelease --no-daemon
```

### Step 2: Generate Play Store Listing

Go to Google Play Console → Create App

- **App Name**: Yemen Telecom
- **Package Name**: com.yemen.telecom
- **Default Language**: Arabic (YE)
- **App Type**: App
- **Free**: Yes

### Step 3: Upload AAB

1. Go to Production → Create New Release
2. Upload `android/app/build/outputs/bundle/release/app-release.aab`
3. Add release notes
4. Review and roll out

### Step 4: Store Listing

- **Short Description**: نظام إدارة الشرائح والعملاء للشركة اليمنية للاتصالات
- **Full Description**: [See RELEASE_NOTES.md]
- **Category**: Business
- **Content Rating**: Everyone
- **Privacy Policy**: [Required URL]

### Step 5: Content Rating

Complete IARC content rating questionnaire:
- No violence, no sexual content, no gambling
- Rating: Everyone

### Step 6: Target Audience

- **Primary Audience**: Adults (18+)
- **Secondary Audience**: Business users

### Step 7: Data Safety

Collects:
- Name (for user accounts)
- Email (for authentication)
- App activity (for logs)
- Device IDs (for analytics)

Does NOT share data with third parties.

### Step 8: Review

- App review typically takes 1-7 days
- Ensure all store listing requirements are met
- Test on real devices before submission

### Production URLs

| Service | URL |
|---------|-----|
| Backend API | https://yemen-telecom.onrender.com |
| Frontend | https://yementelecom1.netlify.app |
| Health Check | https://yemen-telecom.onrender.com/api/health |

### Version Information

| Property | Value |
|----------|-------|
| Version Name | 1.0.0 |
| Version Code | 3 |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 36 (Android 16) |
| Compile SDK | 36 |

### Build Artifacts

| File | Size | SHA256 |
|------|------|--------|
| app-release.apk | 25.2MB | 3774b623d1d5419616b579da35facd7e2aa7e72a05f51162cffa465dbe85fb04 |
| app-release.aab | 26.5MB | 2447f9d1adde6b24271d7b662ec8956476eff982fe15ab40e3287385b722ce5d |
