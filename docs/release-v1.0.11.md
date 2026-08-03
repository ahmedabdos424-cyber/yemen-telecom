# 📦 Release v1.0.11 — إصلاح زمن الاستيقاظ البارد (Cold-Start Latency)

> **الحالة:** 🟢 مُنشّر حياً (Live) — **التاريخ:** 2026-08-03
> **الإصدار:** 1.0.11 (versionCode 16) — **الخدمة:** yemen-telecom (Render, خطة free)

---

## 1. ملخص الإصدار

يعالج هذا الإصدار جذرياً مشكلة **"تعذر الاتصال بالخادم"** في أول محاولة دخول بعد فتح التطبيق، الناتجة عن زمن استيقاظ خدمة Render المجانية (Cold Start ≥ 25.5 ثانية، قد يصل إلى 60+ ثانية) متجاوزاً مهلات الطلب السابقة.

**السبب الجذري** (مثبت بالاختبار الحي): الخدمة تنام بعد ~15 دقيقة خمول؛ أول طلب بعد الاستيقاظ يستغرق 25+ ثانية (تدفئة اتصال DB + ضمانات schema)، وبإضافة تأخير شبكة اليمن يتجاوز مهلة 60 ثانية في v1.0.10 فيفشل الدخول.

---

## 2. التغييرات التقنية

### 2.1 إقلاع حاجب (Blocking Boot) — `src/App.tsx`
- `ensureServerIsAwake().finally(() => setServerAwake(true))` عند فتح التطبيق.
- **لا يُعرض أي محتوى** (لا شاشة دخول) قبل تأكيد استيقاظ الخادم.
- شاشة انتظار كاملة: «الرجاء الانتظار قليلاً... يتم الآن تجهيز النظام للعمل...» بدل خطأ شبكة فوري.

### 2.2 إيقاظ استباقي صبور — `src/api/client.ts`
- `ensureServerIsAwake()`: حلقة `/api/health` حتى `200 OK`، بتراجع تصاعدي (2s→4s→8s→16s→30s كحد أقصى) حتى مهلة إجمالية 90 ثانية.
- `waitForServerAwake()`: حاجز قابل للانتظار يستخدمه تسجيل الدخول (مؤكد فوراً بعد الإقلاع).

### 2.3 اعتراض الدخول — `src/hooks/useAuth.ts`
- `await waitForServerAwake()` في بداية `handleLogin` — يستحيل إرسال طلب الدخول قبل استيقاظ الخادم.

### 2.4 سياسة إعادة المحاولة الصبورة — `src/api/client.ts`
| المعامل | القيمة |
|---------|--------|
| `REQUEST_TIMEOUT_MS` | **180 ثانية** (3 دقائق) |
| إعادة المحاولات | **5** (6 محاولات إجمالاً) |
| الفاصل بين المحاولات | **15 ثانية** |

**الصبر الكلي الأقصى:** حاجز 90s + (6 × 180s) + (5 × 15s) ≈ **20.75 دقيقة**.

---

## 3. بيانات البناء والتوزيع

| الحقل | القيمة |
|-------|--------|
| الملف | `android\app\build\outputs\apk\release\app-release.apk` |
| الحجم | 29,065,161 بايت (~27.7 MB) |
| SHA-256 | `5FC150722D2075B61F184CA28FAC048E4130F7A580F9098DFD07BA0E30BBD4E6` |
| التوقيع | CN=Yemen Telecom (مؤكد بـ apksigner، digest `b469cced...`) |
| Release GitHub | `apk-v1.0.11` (id 363992411) — الأصل `YemenTelecom.apk` |
| رابط التحميل | `https://github.com/ahmedabdos424-cyber/yemen-telecom/releases/download/apk-v1.0.11/YemenTelecom.apk` |

### متغيرات بيئة Render المحدّثة (معاً — وفق قاعدة تحديث الـ APK)
`APP_VERSION=1.0.11` · `APP_VERSION_CODE=16` · `APP_APK_URL` (أعلاه) · `APP_APK_SHA256` (أعلاه) · `APP_APK_SIZE=29065161` · `APP_UPDATE_NOTES="إصلاح جذري لمشكلة تعذر الاتصال: الانتظار حتى استيقاظ الخادم قبل الدخول|مهلة أطول ومحاولات إضافية للشبكات البطيئة"`

### النشرات
- **كود الإصلاح:** `f753aff` "fix(mobile): blocking boot warm-up + aggressive retry policy (v1.0.11)" → dep `dep-d9o1r4rb9ksc73btip2g` **live** 🟢
- **متغيرات البيئة:** dep `dep-d9o1qu5aeets73csoelg` (سبقها) — الحالة: deactivated لاحقاً بتغيير النشر الجديد (طبيعي).

---

## 4. التحقق (Verification)

| الفحص | النتيجة |
|-------|---------|
| `GET /api/app-version` | ✅ `200` — `version: "1.0.11"`, `versionCode: 16`, `sha256` و`size` مطابقان تماماً للـ APK المحلي |
| `HEAD` رابط الـ APK | ✅ `200` — `content-length: 29065161`, `content-type: application/vnd.android.package-archive` |
| `GET /api/health` | ✅ `200` — `status: ok`, `db: connected` |
| الاختبار الحي `POST /api/auth/login` (بيانات اختبار) | ✅ `401` متوقع — الخادم يستجيب، CORS `https://localhost` مسموح |
| الفحوصات | ✅ `npm run lint` نظيف · `npm test` **296/296** · `assembleRelease` BUILD SUCCESSFUL |

---

## 5. سلوك التحديث التلقائي للعملاء الحاليين

- `useAppUpdate.ts:21` يقارن `info.versionCode > APP_VERSION_CODE`:
  - **v1.0.8 (13)** و **v1.0.9 (14)** و **v1.0.10 (15)** → كلها < 16 → **يظهر prompt التحديث فور فتح التطبيق**.
- التحديث إرشادي (`required: false`) — يظهر بطلب تحقق الشهادة SHA-256 والتوقيع قبل التثبيت (لم تُضعف أي ضوابط تحقق).
- عند التثبيت يُسجَّل عبر `POST /api/app-update-installed` (إحصائيات بالذاكرة: `GET /api/app-update-stats`).

---

## 6. الخطوات التالية الموصى بها

1. **ترقية الخطة من free إلى Starter** — الحل الدائم الوحيد (لا نوم → لا Cold Start إطلاقاً).
2. **مراقب UptimeRobot** كل 5 دقائق على `/api/health` — يمنع النوم غالباً بلا تكلفة.
3. متابعة `GET /api/app-update-stats` لقياس نسبة تبني العملاء للإصدار 1.0.11.

---

## 7. المراجع

- `docs/connection-issue-diagnosis.md` — التشخيص الكامل للسبب الجذري.
- `src/api/client.ts` (سطر 19، 25، 35، 84-120) · `src/App.tsx` (سطر 276-306) · `src/hooks/useAuth.ts` (سطر 80) · `src/hooks/useAppUpdate.ts` (سطر 21) · `server/src/routes/app-update.ts`.
