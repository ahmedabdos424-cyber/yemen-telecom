# 🛡️ تقرير فحص توافق الإصدارات والبيئة الشامل — Yemen Telecom

> **التاريخ:** 2026-08-03 — **الحالة:** 🟡 توافق عام سليم مع ثلاث ملاحظات حرجة (AGP، multer، خيار Node)
> **خلاصة سريعة:** المكدس بأكمله مصطفّي فعلاً على **Node 22** (وليس Node 20)، وCapacitor 8 متوافق تماماً، ومخالف واحد من نوع "AGP غير بارق لـAPI 36" + تبعية `multer` قديمة.

---

## 1. ملخص القرارات الحاسمة

| القرار | الحكم | السبب |
|---|---|---|
| **Node 20 (مقترح المهمة)** | ❌ **مرفوض — ميت** | Node 20 انتهى دعمه (EOL) بتاريخ **2026-04-30**؛ لا يصح التوصية بالانتقال إليه |
| **Node 22** | ✅ **معتمد (حالياً)** | Maintenance LTS حتى **2027-04-30** — متوافق عبر `.nvmrc` / Dockerfile / CI / engines |
| **Node 24** | ⚠️ خيار ترقية مستقبلية | Active LTS (حتى 2026-10 ثم Maintenance حتى 2028-04) — مسار مرغوب لكنه تغيير أوسع |
| **compileSdk/targetSdk = 36** | ✅ صحيح لـ Capacitor 8 | مطلوب رسمياً في Capacitor 8 (minSdk 24 / compile 36 / target 36) |
| **AGP 8.9.1 + API 36** | 🟡 **عدم تطابق** | AGP 8.9 يدعم رسمياً حتى **API 35** — يجب رفع AGP إلى ≥8.11 |
| **multer 1.4.5-lts.1** | 🟡 **جنائز أمنية معروفة** | إصلاحاتها في 2.x — الترقية موصى بها |

---

## 1. مصفوفة الاختلالات والانتهاءات الحالية (مقابل الهدف)

### 1.1 النظام & Node.js

| الموقع | الحالي | الهدف/التوصية | الحالة |
|---|---|---|---|
| الروتاين المحلي | `node v24.18.1` / `npm 11.16.0` | Node 24 = Active LTS — سليم | ✅ |
| `engines.node` (root + server) | `>=22.0.0` | `>=22.0.0` (واضح، يتوافق مع النص) | ✅ |
| `engines.npm` | **غائب** | `"npm": ">=10.0.0"` — إضافة | 🟡 |
| `.nvmrc` | `22` | `22` | ✅ |
| `Dockerfile` (المراحل 3) | `node:22-alpine` | `node:22-alpine` بدل `latest` ✅ | ✅ |
| `render.yaml` | Docker env — لا `NODE_VERSION` | لا يحتاج (تحدده صورة Docker) — يوصى بتوثيقه في `render.yaml` | 🟡 اختياري |

### 1.2 Frontend (React + Vite + TS)

| المكتبة | المثبتة | الهدف | التوافق | الحالة |
|---|---|---|---|---|
| react / react-dom | 19.2.7 | 19.x | ✅ متوافق مع Vite 6 | ✅ |
| vite | `6.4.3` (مقبوض) | 6.x (الحالي) | ✅ | ✅ |
| typescript | 5.8.3 | 5.8.x | ✅ | ✅ |
| `@types/react` | ^19.2.17 | يوافق 19.2 | ✅ | ✅ |
| `@types/node` | ^22.14.0 | يوافق Node 22 | ✅ | ✅ |
| `@vitejs/plugin-react` | ^5.2.0 | 5.x (يدعم React 19) | ✅ | ✅ |
| tailwindcss / vite plugin | 4.3.1 (كلاهما) | توافق كامل | ✅ | ✅ |
| `@testing-library/react@16.3.2` | **extraneous (غير مسجل)** | يمكن إزالته (غير مستخدم في src) | 🟡 نظافة |

### 1.3 Capacitor / Mobile

| المكتبة | المثبتة | المتطلب | ✅ |
|---|---|---|---|
| `@capacitor/core` | **8.4.1** | كلها Major=8 | ✅ |
| `@capacitor/android` | **8.4.1** | كلها Major=8 | ✅ |
| `@capacitor/cli` | **8.4.1** | كلها Major=8 | ✅ |
| camera / filesystem / keyboard / preferences / status-bar | 8.x — منتظمة بميجر 8 | ✅ |
| **Node لـ Capacitor 8** | 22 → 24 | يدعم 22+ | ✅ |

### 4.4 Android SDK/Gradle (مخالفة الوحيدة الحرجة)

| المقطع | الحالي | التوصية/الهدف | الحالة |
|---|---|---|---|
| `compileSdkVersion` | 36 | 36 (متطلب Cap 8) | ✅ |
| `targetSdkVersion` | 36 | 36 | ✅ |
| `minSdkVersion` | 29 | ≥24 (Cap 8) — 29 أعلى بأمان | ✅ |
| **`com.android.tools.build:gradle`** | **8.9.1** | **≥8.11.1** (يدعم API 36) | 🟡 |
| Gradle wrapper | `9.0` | 9.0 (متوافق AGP ≥8.4) | ✅ |
| Java (source/target/CI) | 21 | 17–21 | ✅ |

### 5.5 Backend

| المكتبة | المثبتة | الحالة / ملاحظة |
|---|---|---|
| express | `4.22.2` (^4.21.0) | ✅ سليم؛ Express 5 اختياري |
| pg | `8.21.0` | ✅ متوافق Node 22 |
| jsonwebtoken | `9.0.3` | ✅ |
| bcryptjs | `2.4.3` | ✅ (ينفي الحاجة لبناء native) |
| helmet | 7.2.0 | ✅ |
| express-rate-limit | 7.5.1 | ✅ |
| cors / cookie-parser / dotenv / zod4 / supabase-js2 / aws-sdk | أحدث | ✅ |
| **`multer`** | **`1.4.5-lts.1` declared** | 🟡 **منذار DoS معروف ثابت في 2.x** — ترقية |
| TypeScript server | 5.8.x (`^5.6.0`) build ES2020/CJS | ✅ |

### 6.6 Docker / CI / Security

| المقطع | الحالة |
|---|---|
| Dockerfile: 3 مراحل `node:22-alpine` | ✅ |
| CI: Node **22** (validate/test/lint/android) + `postgres:17` service | ✅ |
| Sentry CLI releases (SENTRY_AUTH_TOKEN) | ✅ |
| `npm audit --audit-level=high \|\| true` (CI) | 🟡 يصار ولا يوقف — يكشف multer 1 |

---

## 2. مخاطر التغييرات الكاسرة (Breaking Change Risks)

1. **AGP 8.9.1 → 8.11+:** بلا مخاطر كاسرة؛ AGP 8.x متداخل مع Gradle 9.0، يتطلب JDK 17+ فقط (المشروع على 21). هو إصلاح للمخالفة لا ترقية كاملة.
2. **multer ^1 → ^2**: كسر معتدل — واجهة `multer(...)` نفسها، لكن بعض خيارات الإعداد الداخلية تغيّرت وتم إزالة السلوك الافتراضي `limits` الصارم؟ يتم اختباره عبر مسارات الرفع (`UPLOAD_DIR`) وتحليل الملفات. **لا يوجد Re Upload في مسار الدخول** — يلزم تشغيل اختبارات الملفات بعدها.
3. **Node 20 ↓ (مقترح ميت)**: لو تم اتباع اقتراح المهمة لكان انحداراً أمنياً — مرفوض.
4. **Node 24 ↑**: ترقية آمنة (Active LTS) لكنها تتطلب رفع Docker/CI/engines معاً وتُفعّل عريضة ambient؛ لا ضرورة اليوم — تحت 22 كفاية حتى أبريل 2027.

---

## 8. الأوامر والتعديلات الدقيقة المطلوبة

### أ) Android — إصلاح AGP لمطابقة API 36
**`android/build.gradle`** — السطر 10:
```gradle
-classpath 'com.android.tools.build:gradle:8.9.1'
+classpath 'com.android.tools.build:gradle:8.11.1'
```
(بلا ترقية Gradle wrapper — يبقى 9.0 متوافقاً مع 8.11: الحد الأدنى 8.4/المدعوم.)

### ب) Backend — ترقية multer
`server/package.json`:
```json
"multer": "^1.4.5-lts.1" → "multer": "^2.0.3"
```
ثم:
```bash
cd server && npm install
```
و إضافة `engines.npm` في `server/package.json`:
```json
"engines": { "node": ">=22.0.0", "npm": ">=10.0.0" }
```

### ج) Frontend — إضافة `engines.npm` + تنظيف extraneous
`package.json`:
```json
"engines": { "node": ">=22.0.0", "npm": ">=10.0.0" }
```
إزالة الحزمة غير المعلنة (لا يُستخدم `@testing-library/react` في أي ملف):
```bash
npm uninstall @testing-library/react   # بعد التأكد من عدم استخدامه (grep أظهر صفر نتائج)
```

### د) Render — توثيق Node (اختياري)
`render.yaml` (ضمن `envVars`):
```yaml
- key: NODE_VERSION
  value: "22"
```
(في Docker تحدد الـ Image الإصدار — هذا للأرشفة/المطابقة.)

### هـ) تحقق ختامي (Pre-Commit Gate)
```bash
npm run typecheck
cd server && npx tsc --noEmit
npm run build
cd android && .\gradlew assembleRelease   # بعد تعديل AGP
```

---

## 9. مرجع جدول الإصدارات الفعلية

| الحزمة | المشروع (engines/Docker) | Local | CI |
|---|---|---|---|
| Node.js | 22 (alpine/engines/.nvmrc) | 24.18.1 | 22 |
| npm | — | 11.16.0 | CI (bundled 22) |
| React | 19.2.8 | ✅ | ✅ |
| Vite | 6.4.3 | ✅ | ✅ |
| TypeScript | 5.8.3 / server 5.6 | ✅ | ✅ |
| Capacitor | 8.4.1 | ✅ | ✅ |
| AGP | 📌 **8.9.1 → يُرفع 8.11.1** | — | ✅ |
| Gradle | 9.0 | — | ✅ |
| Postgres (CI) | 17.0 service | — | postgres:17 |