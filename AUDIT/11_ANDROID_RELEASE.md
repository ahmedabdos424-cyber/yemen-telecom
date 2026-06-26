# تقرير إصدار أندرويد - Android Release Report

## حالة الإصدار الحالية
- ✅ assembleRelease: نجح (توقيع debug مؤقت)
- ✅ bundleRelease: نجح (توقيع debug مؤقت)
- ❌ APK موقع بالتوقيع المناسب: غير متاح (key env vars غير موجودة)

## المطلوب لإصدار Play Store
1. **Keystore**: إنشاء keystore جديد للإنتاج:
   ```
   keytool -genkey -v -keystore release.keystore -alias yemen-telecom
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **key.properties**: إنشاء الملف `android/key.properties`:
   ```
   storePassword=your-store-password
   keyPassword=your-key-password
   keyAlias=yemen-telecom
   storeFile=release.keystore
   ```
3. **google-services.json**: تنزيل من Firebase Console → Project Settings
4. **متغيرات البيئة** (بديل عن key.properties):
   - KEYSTORE_PATH=absolute/path/to/release.keystore
   - KEYSTORE_PASSWORD=...
   - KEYSTORE_ALIAS=...
   - KEY_PASSWORD=...

## إجراءات ما قبل النشر
- اختبار APK: `jarsigner -verify -verbose -certs app-release.apk`
- اختبار AAB: استخدام bundletool أو Play Console
- رفع versionCode للإصدار التالي (3 → 4)
- إضافة google-services.json للميزات المتقدمة

## APK الذي تم بناؤه سابقًا
- yemen-telecom-release.apk: 27.2 MB (توقيع debug)
- yemen-telecom.aab: 28.5 MB (توقيع debug)
