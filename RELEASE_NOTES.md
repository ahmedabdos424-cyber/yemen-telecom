# Release Notes
## Yemen Telecom v1.0.0 (Build 3)

### What's New

- Initial production release
- SIM card management and activation
- Agent and seller management
- Customer database with OCR support
- Distribution request workflow
- Real-time alerts and notifications
- Geographic risk analysis
- Comprehensive reporting dashboard
- Arabic RTL support
- Dark mode support
- Biometric authentication
- Offline-capable design

### Technical Details

- **Package**: com.yemen.telecom
- **Version**: 1.0.0 (Code: 3)
- **Min SDK**: 24 (Android 7.0 Nougat)
- **Target SDK**: 36 (Android 16)
- **Size**: ~25MB (APK), ~27MB (AAB)
- **Architecture**: arm64-v8a, armeabi-v7a, x86, x86_64

### Permissions

- INTERNET — API communication
- CAMERA — OCR and document scanning
- NETWORK_STATE — Connection detection
- BIOMETRIC — Secure login
- POST_NOTIFICATIONS — Alerts

### Security

- JWT authentication with refresh tokens
- CSRF protection (HMAC-SHA256)
- TLS encryption (no cleartext traffic)
- ProGuard code obfuscation
- Network security config

### Known Issues

- None reported

### Support

- Email: support@yemen-telecom.ye
- Backend: https://yemen-telecom.onrender.com
