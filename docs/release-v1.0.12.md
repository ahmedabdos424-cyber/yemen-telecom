# 📦 Release v1.0.12 — إدارة الشاشات بالدفعات + الرقم التسلسلي ICCID في سجل التفعيلات

> **الحالة:** 🟢 مُنشّر حياً (Live) — **التاريخ:** 2026-08-04
> **الإصدار:** 1.0.12 (versionCode 17) — **الخدمة:** yemen-telecom (Render, خطة free)

---

## 1. ملخص الإصدار

يتضمن هذا الإصدار تحسينات وظيفية على واجهة إدارة الشاشات وموثوقية سجل التفعيلات:

1. **إضافة الدفعات موحّدة** — إزالة الإضافة اليدوية المفردة وتوحيد عملية الإضافة عبر مودال دفعة واحدة (إدخال الأرقام بفواصل + نطاقات)، مع تحسين حالة التحقق والحدود.
2. **الرقم التسلسلي ICCID** — يُحفظ الآن في سجل العمليات عند التفعيل ويُعرض في تقارير التفعيلات (البحث/التفاصيل)، بعد أن كان مفقوداً.
3. **تقارير التفعيلات** — عرض معلومات البطاقة (الرقم، النوع، ICCID، المفوّض، الحالة) في بطاقات واضحة مع عارض صور محسّن.

---

## 2. التغييرات التقنية

### 2.1 استمرار ICCID في سجل العمليات — الخادم
- `server/migrations/031_add_operations_iccid.sql` — إضافة عمود `iccid` إلى `bundle_operations` (مطبّق على Supabase عبر supabase MCP).
- `server/src/routes/operations.ts` — تمرير `iccid` عند تسجيل عملية التفعيل.
- `server/src/routes/reports.ts` — إرجاع `iccid` مع الأعمدة المنتقاة للتقارير.
- `server/src/validation.ts` — قبول `iccid` الاختياري.
- `server/src/schema.sql` — تحديث مرجع الـ schema ليتضمن العمود.

### 2.2 الواجهة — مُدارة بالدفعات
- `src/components/AddSimModal.tsx` — تبسيط مودال الدفعة: إدخال أرقام متعدد/نطاقات + تحقق من عدد النتائج قبل الحفظ.
- `src/components/SIMsView.tsx` — إزالة مسار الإضافة اليدوية المفردة والاكتفاء بمودال الدفعة الموحّد.
- `src/components/ReportsView.tsx` — بطاقات تفاصيل البطاقة + عرض `iccid` + عارض صور محسّن.
- `src/api/types.ts` — حقول النوع الجديدة.
- `src/hooks/useAgentSellerState.ts` — تحديث مرجع نوع العملية.

### 2.3 مزامنة الإصدار داخل التطبيق
- `src/version.ts` → `APP_VERSION = '1.0.12'` , `APP_VERSION_CODE = 17` (مطابقان لـ `android/app/build.gradle`).
- `android/app/build.gradle` → `versionCode 17`, `versionName "1.0.12"`.

---

## 3. بيانات البناء والتوزيع

| الحقل | القيمة |
|-------|--------|
| الملف المحلي | `release\yemen-telecom-v1.0.12.apk` |
| الحجم | 29,080,401 بايت (~27.7 MB) |
| SHA-256 | `f2543c6189db9fff5d6b0b647f67850a944a2133653dc3317bef8dd255a220e7` |
| التوقيع | CN=Yemen Telecom (مؤكد بـ apksigner — v2 scheme) |
| Release GitHub | `apk-v1.0.12` — الأصل `YemenTelecom.apk` (id 500886622) |
| رابط التحميل | `https://github.com/ahmedabdos424-cyber/yemen-telecom/releases/download/apk-v1.0.12/YemenTelecom.apk` |

### متغيرات بيئة Render المحدّثة (معاً — وفق قاعدة تحديث الـ APK)
`APP_VERSION=1.0.12` · `APP_VERSION_CODE=17` · `APP_APK_URL` (أعلاه) · `APP_APK_SHA256` (أعلاه) · `APP_APK_SIZE=29080401` · `APP_UPDATE_NOTES="تحسينات واجهة إدارة الشاشات وإضافة الدفعات|سجل التفعيلات يعرض الرقم التسلسلي ICCID|بطاقات تقارير حديثة وعارض صور محسّن"`

### النشرات
- **الكود (الميزة):** `2f1d427` "persist ICCID in operations log..." → dep `dep-d9olo5j7uimc739mf840` live ثم deactivated (طبيعي بنشر أحدث).
- **رفع الإصدار:** `58cc6de` "bump Android version to 1.0.12 (versionCode 17)..." → dep `dep-d9omev8ae00c73atc5a0` **live** 🟢.
- **متغيرات البيئة:** أول محاولة `dep-d9omm2gae00c73atqp4g` ظهرت live لكن النسخة بدأت بقيم قديمة (ملاحظة توقيت Render) → أُعيد تطبيق المتغيرات فجرّت `dep-d9omurss728c73fg7ea0` **live** 🟢 بنجاح مؤكد.

---

## 4. التحقق (Verification)

| الفحص | النتيجة |
|-------|---------|
| `GET /api/app-version` | ✅ `200` — `version: "1.0.12"`, `versionCode: 17`, `sha256` و`size` مطابقان تماماً لمرفق GitHub والـ APK المحلي |
| `HEAD` رابط الـ APK | ✅ `200` — `content-length: 29080401`, `content-type: application/vnd.android.package-archive` |
| `GET /api/health` | ✅ `200` — `status: ok`, `db: connected` |
| digest GitHub | ✅ `sha256:f2543c6189db9fff...220e7` مطابق ذاتياً (تأكيد سيرفر GitHub) |
| الفحوصات | ✅ `tsc` نظيف · `npm run build` ناجح · `gradlew assembleRelease` BUILD SUCCESSFUL · apksigner v2 |

---

## 5. سلوك التحديث التلقائي للعملاء الحاليين

- `useAppUpdate.ts:21` يقارن `info.versionCode > APP_VERSION_CODE`:
  - **v1.0.8 (13)** … **v1.0.11 (16)** → كلها < 17 → **يظهر prompt التحديث فور فتح التطبيق**.
- التحديث إرشادي (`required: false`) — يظهر بطلب تحقق SHA-256 والتوقيع قبل التثبيت (لم تُضعف أي ضوابط: SHA256 + توقيع APK + مطابقة توقيع التطبيق + منع الرجوع للخلف).
- عند التثبيت يُسجَّل عبر `POST /api/app-update-installed` (إحصائيات بالذاكرة: `GET /api/app-update-stats`).

---

## 6. الخطوات التالية الموصى بها

1. متابعة `GET /api/app-update-stats` لقياس تبني الإصدار 1.0.12.
2. ترقية الخطة من free إلى Starter (الحل الدائم للنوم/البرد) + مراقب `/api/health`.
3. رصد سجلات Render (`ERROR|WARN|timeout`) بعد الانتشار لتأكيد استقرار التقارير مع ICCID.

---

## 7. المراجع

- `docs/release-v1.0.11.md` — الإصدار السابق (Cold-Start Latency Fix).
- `server/migrations/031_add_operations_iccid.sql` · `server/src/routes/operations.ts` · `src/components/AddSimModal.tsx` · `src/components/SIMsView.tsx` · `src/components/ReportsView.tsx` · `src/version.ts`.