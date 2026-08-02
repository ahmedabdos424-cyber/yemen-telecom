# تدقيق تكامل Sentry MCP — تقرير شامل

> تاريخ التدقيق: 2026-08-02
> المشروع: يمن تيليكوم (yemen-telecom)
> النطاق: الواجهة (React/Capacitor) + الخادم (Express) + اتصال قاعدة البيانات + النشر (Render) + Sentry MCP

---

## الملخص التنفيذي

| البند | الحالة |
|---|---|
| SDK الواجهة (`@sentry/react` 10.62.0) | 🟢 مثبت ومهيأ في الكود، لكن **معطّل في الإنتاج** (لا DSN) |
| SDK الخادم (`@sentry/node` + `profiling-node` 10.62.0) | 🟢 مثبت ومهيأ في الكود، لكن **معطّل في الإنتاج** (لا DSN) |
| ErrorBoundary وتقاطعات الأخطاء العامة | 🟢 موجودة وتغطي التدفقات الرئيسية |
| بيئة الإنتاج (Render) | 🔴 `SENTRY_DSN` و`VITE_SENTRY_DSN` غير مضبوطين |
| Sentry MCP | 🔴 غير مصادق عليه (401 invalid_token) |
| Source maps + Release tracking | 🟡 غائبة تماماً |
| ربط هوية المستخدم بالواجهة | 🟡 الدالة معرّفة لكن غير مستدعاة |
| تتبع استعلامات قاعدة البيانات | 🟡 يعتمد على الـ instrumentation المدمج (يتطلب تفعيل DSN) |

**الخلاصة: الكود جاهز بنسبة عالية (≈80%)، لكن Sentry معطّل فعلياً في الإنتاج بسبب غياب الـ DSN، ولا توجد source maps لقراءة الـ stack traces، وSentry MCP يحتاج مصادقة.**

---

## 1. التكوينات النشطة (الصحيحة) ✅

### أ. الواجهة (React / Capacitor)
- `src/lib/sentry.ts` — `initFrontendSentry()` مع:
  - `browserTracingIntegration()` (تتبع الأداء) ✅
  - `replayIntegration({ maskAllText: true, blockAllMedia: true })` (إعادة تشغيل الجلسة مع إخفاء البيانات) ✅
  - `tracesSampleRate: 0.2` / `replaysSessionSampleRate: 0.1` / `replaysOnErrorSampleRate: 1.0` ✅
  - فلتر `beforeSend` يتجاهل `ResizeObserver` / `NetworkError` / `ChunkLoadError` ✅
- `src/lib/monitor.ts` — `captureError()` يرسل لـ Sentry مع `tags.context`، مع **تنقيح البيانات الحساسة** (توكنات JWT، كلمات المرور) قبل التسجيل ✅
- التقاط `unhandledrejection` و`error` على مستوى `window` ✅
- `ErrorBoundary` مخصص يغطي 5 مواقع رئيسية في `src/App.tsx` (مدير، وكيل، تدفق البيع، الحالات العامة) ويلتقط عبر `captureError` ✅
- زر اختبار Sentry في `SettingsView.tsx` محصور بـ `import.meta.env.DEV` فقط ✅

### ب. الخادم (Node.js / Express)
- `server/src/sentry.ts` — `initSentry()` مع `nodeProfilingIntegration()` ونسب عينات حسب البيئة ✅
- `server/src/sentry-preload.ts` + `Dockerfile` — تهيئة Sentry **قبل** تحميل Express عبر `-r` ✅
- `server/src/index.ts:469` — `Sentry.setupExpressErrorHandler(app)` قبل المعالج العام ✅
- `server/src/index.ts:532-548` — التقاط `unhandledRejection` و`uncaughtException` مع `Sentry.captureException` والـ mechanism ✅
- `server/src/middleware/auth.ts:70` — `setSentryUser(req.user)` مع كل طلب مصادق (هوية + دور) ✅
- فلتر `beforeSend` يتجاهل `/api/health` ✅
- الاعتماديات: `@sentry/react` (root)، `@sentry/node` + `@sentry/profiling-node` (server) ✅
- `sentry-cli 3.6.2` مثبت على الجهاز ✅

### ج. الـ DSN في ملفات المثال فقط
- `.env.example:33-35` و`server/.env.example:22` تحتويان الـ DSN (قيمة عامة ليست سرية) ✅
- المشروع على Sentry: المنظمة `mliki-technique`، المشروع `yemen-telecom-api` (من رابط MCP) ✅

---

## 2. النواقص (Nawaqis) ❌

### 🔴 G1 — الـ DSN غير مضبوط في الإنتاج (الأخطر)
| الدليل | التفصيل |
|---|---|
| `server/.env` (الملف القانوني) | لا يحتوي `SENTRY_DSN` إطلاقاً |
| `render.yaml` | لا يوجد `SENTRY_DSN` ولا `VITE_SENTRY_DSN` في `envVars` |
| **الحزمة الحية** `assets/index-WF2UsW-r.js` | فحص فعلي: `ingest.de.sentry.io` = 0، `browserTracingIntegration` = 0، `replayIntegration` = 0 → **Vite حذف كود التهيئة عند البناء لأن `VITE_SENTRY_DSN` غير معرّف** |
| `captureException` موجود في الحزمة (3) | SDK مضمّن لكن `init` حُذف — `DSN` ثابت = `undefined` |

**الأثر**: صفر أخطاء واصلة لـ Sentry من الواجهة والخادم في الإنتاج. أي انهيار في تطبيق حقيقي (تسجيلات SIM، رفع الصور) يضيع دون أثر.

### 🔴 G2 — Sentry MCP غير مصادق عليه
- مكوّن في `~/.config/opencode/opencode.json` كخادم remote:
  `https://mcp.sentry.dev/mcp/mliki-technique/yemen-telecom-api`
- اختبار مباشر: `HTTP 401 invalid_token` مع `WWW-Authenticate: Bearer realm="OAuth"` → **يحتاج OAuth login** عبر opencode (`opencode mcp login` / إعادة المصادقة) — لذلك أدواته غير محمّلة في هذه الجلسة.
- لا يمكن جلب المشكلات الحالية (issues) أو حالة الإصدارات من Sentry عبر MCP حتى تصحيح ذلك.

### 🟡 G3 — هوية المستخدم في الواجهة غير مربوطة
- `setFrontendSentryUser()` معرّفة في `src/lib/sentry.ts:35` لكن **لا يوجد أي استدعاء لها** في كامل `src/` (grep: تعريف واحد فقط).
- الخادم يربط المستخدم (G-ok) لكن الواجهة لا — لذا أحداث الواجهة تصل بدون سياق مستخدم.

### 🟡 G4 — لا Source Maps إطلاقاً
- `vite.config.ts:15` → `sourcemap: false`
- `server/tsconfig.json:17` → `"sourceMap": false`
- **الأثر**: الـ stack traces في Sentry تصل مُصغّرة (minified) وغير مقروءة — لا إعادة توطين (symbolication).

### 🟡 G5 — لا Release Tracking ولا رفع خرائط في البناء
- لا `@sentry/vite-plugin` ولا `sentry-cli` في `package.json` scripts
- لا `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` في أي مكان (لا env، لا CI، لا render.yaml)
- لا خطوة في `.github/workflows` لإنشاء إصدار أو رفع source maps
- **الأثر**: لا ربط بين الأخطاء وإصدارات النشر (release health)؛ لا regression alerts.

### 🟡 G6 — تتبع قاعدة البيانات غير مفعّل
- `server/src/db.ts` يسجّل الاستعلامات البطيئة في `logger` فقط (لا `Sentry` breadcrumbs ولا transactions).
- SDK v10 يشمل تلقائياً `pg` instrumentation (عند تفعيل DSN) — لكن لا يوجد ربط صريح للاستعلامات البطيئة من `db.ts` بحدود Sentry.

### 🟡 G7 — لا ترانزاكشن صريحة للمسارات الحرجة
- المسارات الحساسة (تفعيل SIM، إنشاء عميل، تحويل المخزون) تعتمد على الـ auto-instrumentation العام فقط؛ لا `Sentry.startSpan` بأسماء عربية/إنجليزية محددة لتتبع زمن كل عملية في Sentry Performance.

---

## 3. خطوات الإصلاح — مقاطع كود دقيقة (100% جاهزية)

### الإصلاح 1 (حرج): ضبط DSN في الإنتاج
**1.1** أضف إلى `render.yaml` (قسم `envVars` الخاص بخدمة yemen-telecom):
```yaml
      - key: SENTRY_DSN
        value: https://e26574aa3569ad8263215c8c58a3be4b@o4511821570310144.ingest.de.sentry.io/4511821594034256
      - key: VITE_SENTRY_DSN
        value: https://e26574aa3569ad8263215c8c58a3be4b@o4511821570310144.ingest.de.sentry.io/4511821594034256
```
> الـ DSN ليس سرياً (معرّف عام) ويمكن وضعه مباشرة؛ يُفضل مع ذلك `sync: false` إن أردت ضبطه من لوحة Render.

**1.2** أضف إلى `server/.env` (محلياً):
```env
SENTRY_DSN=https://e26574aa3569ad8263215c8c58a3be4b@o4511821570310144.ingest.de.sentry.io/4511821594034256
```
**1.3** عند إعادة النشر، تحقق من سجل التشغيل: يجب ظهور `[SENTRY] Initialized` (بدل `SENTRY_DSN not set — Sentry disabled`).

### الإصلاح 2 (حرج): مصادقة Sentry MCP
- شغّل في الطرفية: `opencode mcp login Sentry` (أو احذف الخادم وأعد إضافته لفتح تدفق OAuth).
- بعد نجاح المصادقة أعد تشغيل الجلسة — ستظهر أدوات `sentry_*` (issues, projects, releases) ويمكن عندها جلب المشكلات الحالية وحالة الإصدارات.

### الإصلاح 3 (متوسط): ربط هوية المستخدم بالواجهة
في `src/hooks/useAuth.ts` — أضف الاستيراد، واربط عند استعادة الجلسة وتسجيل الدخول/الخروج:
```ts
import { setFrontendSentryUser } from '../lib/sentry';

// داخل useEffect بعد نجاح api.getMe() (أو refresh) — حيث يوجد savedToken:
if (user) {
  setFrontendSentryUser({ id: user.id ?? 0, username: user.username, role: user.role });
}

// داخل handleLogin بعد نجاح الدخول (داخل apply أو بعد result.user):
setFrontendSentryUser({ id: result.user.id ?? 0, username: result.user.displayName, role: userRole });

// داخل clearSession:
setFrontendSentryUser(null);
```
> تحقق من حقول `ApiMeResponse`/`ApiLoginResponse` في `src/api/types.ts` (`id`, `username`, `role`) واضبطها وفق ما هو موجود فعلياً.

### الإصلاح 4 (متوسط): تفعيل Source Maps + Release
**4.1** في `vite.config.ts`:
```ts
build: {
  target: 'es2022',
  sourcemap: 'hidden',          // خرائط بدون تعليقات في الحزمة
  // ...بقية الخيارات كما هي
}
```
**4.2** في `server/tsconfig.json`: `"sourceMap": true` (لقراءة الـ stack traces من جهة الخادم).
**4.3** أضف خطوة رفع في `.github/workflows` (بعد خطوة build في المرحلة "Deploy"):
```yaml
      - name: Create Sentry release & upload source maps
        if: env.SENTRY_AUTH_TOKEN != ''
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: mliki-technique
          SENTRY_PROJECT: yemen-telecom-api
        run: |
          npm i -D @sentry/cli
          RELEASE=$(npx sentry-cli releases propose-version)
          npx sentry-cli releases new "$RELEASE"
          npx sentry-cli releases set-commits --auto "$RELEASE"
          npx sentry-cli releases files "$RELEASE" upload-sourcemaps dist/assets --url-prefix "~/assets"
          npx sentry-cli releases finalize "$RELEASE"
```
**4.4** أنشئ `SENTRY_AUTH_TOKEN` من Sentry (Settings → Developer Settings → Auth Tokens — نطاق `project:releases` + `project:write`) وأضفه إلى GitHub Actions secrets و`render.yaml` (للمستقبل).

### الإصلاح 5 (اختياري): تتبّع الاستعلامات البطيئة في `server/src/db.ts`
```ts
import { Sentry } from './sentry';

// داخل دالة query() عند تجاوز العتبة:
if (duration > slowQueryThreshold) {
  logger.warn('[DB] Slow query', { text: text.substring(0, 120), duration, rows: res.rowCount });
  Sentry.addBreadcrumb({
    category: 'db.slow_query',
    message: text.substring(0, 120),
    level: 'warning',
    data: { duration_ms: duration },
  });
}
```

### الإصلاح 6 (اختياري): ترانزاكشن صريحة للمسارات الحرجة
في `server/src/routes/sims.ts` (أو أي مسار حرج):
```ts
import { Sentry } from '../sentry';

// داخل الـ handler بعد التحقق من المصادقة:
const span = Sentry.startInactiveSpan({ name: 'activate-sim', op: 'sim.activate' });
try {
  // ...المنطق الحالي...
} finally {
  span.end();
}
```

---

## 4. قائمة التحقق النهائية بعد التطبيق

- [ ] `render.yaml` يحوي `SENTRY_DSN` + `VITE_SENTRY_DSN` → إعادة نشر
- [ ] سجل تشغيل Render يظهر `[SENTRY] Initialized`
- [ ] الحزمة الحية تحتوي DSN و`browserTracingIntegration` (إعادة فحص `assets/index-*.js`)
- [ ] حدث اختباري من `SettingsView` (DEV) يصل لـ Sentry
- [ ] `setFrontendSentryUser` مستدعى في useAuth (دخول/خروج/استعادة)
- [ ] Sentry MCP مصادق عليه وأدواته محمّلة
- [ ] source maps مرفوعة وrelease جديد لكل نشر
- [ ] (اختياري) breadcrumbs للاستعلامات البطيئة + spans للمسارات الحرجة

---

## 5. ملاحظات أمنية
- الـ DSN قيمة عامة (غير سرية) — تظهر في المتصفح أصلاً.
- `SENTRY_AUTH_TOKEN` سرّ حقيقي — لا يظهر في أي تقرير، ويُدار عبر GitHub Secrets / Render env vars فقط.
- `replayIntegration` مفعّل مع `maskAllText` + `blockAllMedia` → لا تسريب للمحتوى النصي/الوسائط في إعادة تشغيل الجلسة.
- `beforeSend` يفلتر `/api/health` (خادم) و`ResizeObserver`/`NetworkError` (واجهة) — يمنع ضجيج الأخطاء الكاذبة.
