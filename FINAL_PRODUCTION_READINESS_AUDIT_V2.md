# التقرير النهائي للجاهزية الإنتاجية — V2
## Final Production Readiness Audit V2

**تاريخ التدقيق:** 2026-06-14  
**المنهجية:** قراءة كل سطر في الكود الفعلي — لا اعتماد على تقارير سابقة  
**الملفات المفحوصة:** 30+ ملفاً (جميع Routes, Schema, API Client, المكونات الحرجة, الإعدادات)

---

## 1. Production Blockers — المشاكل التي تمنع الإنتاج

### 1.1 Path Traversal (Download Backup)
| الحقل | القيمة |
|-------|--------|
| **الملف** | `server/src/routes/admin.ts` |
| **السطر** | 210 |
| **الكود** | `const filePath = path.join(backupDir, req.params.filename); res.download(filePath);` |
| **السبب** | `req.params.filename` غير منقى — يمكن إدخال `../../../etc/passwd` |
| **منع النشر** | ✅ **نعم** — ثغرة أمنية خطيرة تسمح بقراءة أي ملف |
| **الحل** | استبدال بـ `path.basename(req.params.filename)` + رفض أي `..` أو `/` |

### 1.2 AddSellerForm — عملية وهمية (setTimeout)
| الحقل | القيمة |
|-------|--------|
| **الملف** | `src/components/AddSellerForm.tsx` |
| **السطر** | 75–124 |
| **الكود** | `setTimeout(() => setProgressStage(50), 400); setTimeout(() => ... , 800); setTimeout(() => { onSellerAdded(...) }, 1200)` |
| **السبب** | ثلاث مراحل تقدم وهمية بمؤقتات ثابتة. لا يوجد استدعاء لـ `api.createSeller()` رغم أن function الـ API موجودة في `client.ts:204-206` |
| **منع النشر** | ✅ **نعم** — الميزة الأساسية لإضافة بائع لا تعمل |
| **الحل** | استدعاء `api.createSeller()` وإزالة `setTimeout` |

### 1.3 AddAgentView — لا API Call
| الحقل | القيمة |
|-------|--------|
| **الملف** | `src/components/AddAgentView.tsx` |
| **السطر** | 30–37 |
| **الكود** | `onAddAgent({ name, region, phone, ... }); toastSuccess(...);` — لا `api.createAgent()` ولا `fetch` |
| **السبب** | `onAddAgent` هو Prop Callback قد لا يفعل شيئاً. لا يوجد API call في المكون |
| **منع النشر** | ✅ **نعم** — إضافة وكيل لا تعمل |
| **الحل** | استدعاء `api.createAgent()` مباشرة أو ربط الـ callback بها في parent |

### 1.4 ActivateSimForm — تفعيل وهمي (setTimeout)
| الحقل | القيمة |
|-------|--------|
| **الملف** | `src/components/ActivateSimForm.tsx` |
| **السطر** | 106–120 |
| **الكود** | `setTimeout(() => { onSimActivated({...}); setSuccessMsg(...) }, 500)` |
| **السبب** | تأخير 500ms ثم callback. لا API call |
| **منع النشر** | ✅ **نعم** — تفعيل الشريحة لا يعمل |
| **الحل** | استدعاء `POST /api/operations` الحقيقي |

### 1.5 SellerAccount — تغيير كلمة المرور وهمي (setTimeout)
| الحقل | القيمة |
|-------|--------|
| **الملف** | `src/components/SellerAccount.tsx` |
| **السطر** | 111–119 |
| **الكود** | `setTimeout(() => { onPasswordChanged(newPassword); toastSuccess(...) }, 500)` |
| **السبب** | لا `api.updatePassword()` — فقط setTimeout محلي |
| **منع النشر** | ✅ **نعم** — تغيير كلمة المرور لا يعمل |
| **الحل** | استدعاء `api.updatePassword(idNumberEntry, newPassword)` |

### 1.6 AgentProfileView — تغيير كلمة المرور بدون API
| الحقل | القيمة |
|-------|--------|
| **الملف** | `src/components/agent/AgentProfileView.tsx` |
| **السطر** | 103 |
| **الكود** | `toastSuccess('تم تغيير كلمة المرور بنجاح'); setPasswordModalOpen(false);` |
| **السبب** | مجرد toast — لا API call, لا setTimeout, لا fetch |
| **منع النشر** | ✅ **نعم** — كلمة المرور لا تتغير أبداً |
| **الحل** | استدعاء `api.updatePassword(currentPassword, newPassword)` |

### 1.7 AdminMoreDrawer — إدارة مستخدمين وبيانات وهمية بالكامل
| الحقل | القيمة |
|-------|--------|
| **الملف** | `src/components/AdminMoreDrawer.tsx` |
| **السطر** | 17–31, 42–67, 287–317 |
| **الكود** | `simulatedUsers` (مصفوفة hardcoded), `backupsList` (2 عنصر hardcoded), `setTimeout` للنسخ الاحتياطي, `prompt()` لإضافة مستخدمين |
| **السبب** | **جميع الميزات في هذا المكون وهمية بالكامل** — لا API واحد |
| **منع النشر** | ✅ **نعم** — إدارة المستخدمين والنسخ الاحتياطي لا تعمل |
| **الحل** | ربط جميع الميزات بـ API حقيقي أو إزالتها |

### 1.8 LoginScreen — Role Detection على المتصفح
| الحقل | القيمة |
|-------|--------|
| **الملف** | `src/components/LoginScreen.tsx` |
| **السطر** | 37–42 |
| **الكود** | `function detectRole(username) { if (username === 'manager') return 'manager'; if (username === 'agent') return 'agent'; return 'seller' }` |
| **السبب** | الدور يُقرر من اسم المستخدم local وليس من استجابة السيرفر |
| **منع النشر** | ✅ **نعم** — أي مستخدم يكتب "manager" يرى واجهة المدير |
| **الحل** | حذف `detectRole()` والاعتماد على `user.role` من استجابة `/auth/login` |

### 1.9 `@capacitor/preferences` في devDependencies
| الحقل | القيمة |
|-------|--------|
| **الملف** | `package.json` |
| **السطر** | 45 |
| **الكود** | `"@capacitor/preferences": "^8.0.1"` في `devDependencies` |
| **السبب** | يُستخدم في runtime (`tokenStorage.ts:31`) عبر `await import('@capacitor/preferences')`. إذا لم تُثبّت devDependencies في بيئة الإنتاج، سينهار import ويتحول إلى localStorage |
| **منع النشر** | ✅ **نعم** — التوكن قد لا يُخزن بشكل آمن |
| **الحل** | نقل إلى `dependencies` |

### 1.10 Missing Android Plugins (StatusBar, Keyboard)
| الحقل | القيمة |
|-------|--------|
| **الملف** | `node_modules/@capacitor/` |
| **السطر** | — |
| **الكود** | `@capacitor/status-bar`, `@capacitor/keyboard`, `@capacitor/biometric` — غير مثبتة |
| **السبب** | `capacitor.config.ts` لا يحتوي تكويناً لهذه الـ plugins. لوحة المفاتيح قد تغطي الحقول في Android |
| **منع النشر** | ✅ **نعم** — تجربة المستخدم سيئة (keyboard يغطي الحقول) |
| **الحل** | `npm install @capacitor/status-bar @capacitor/keyboard && npx cap sync` |

### 1.11 Customers Query — دائماً يعيد عمليات فارغة
| الحقل | القيمة |
|-------|--------|
| **الملف** | `server/src/routes/customers.ts` |
| **السطر** | 48–50 |
| **الكود** | `const ops = await query('SELECT * FROM operations WHERE customer_name = $1 ORDER BY id DESC LIMIT 50', [result.rows[0].full_name])` |
| **السبب** | عمود `operations.customer_name` لا يُملأ أبداً — لا INSERT ولا UPDATE يكتب فيه. `createOperationSchema` لا يقبل `customer_name` |
| **منع النشر** | ❌ **لا تمنع بشكل كامل** — لكن الميزة معطلة |
| **الحل** | إزالة الاستعلام أو إضافة customer_name إلى `createOperationSchema` و `INSERT INTO operations` |

---

## 2. Security Issues

### 2.1 JWT/CSRF Secrets — Hardcoded Weak Strings
| الحقل | القيمة |
|-------|--------|
| **الملف** | `server/.env` |
| **السطر** | 8, 10, 11 |
| **الكود** | `JWT_SECRET=[REDACTED]` / `CSRF_SECRET=[REDACTED]` / `REFRESH_SECRET=[REDACTED]` |
| **الخطورة** | CRITICAL — مفاتيح تخمينية في ملف `.env` على git |
| **التأثير** | يمكن تزوير JWT tokens والوصول إلى النظام |
| **الحل** | مفاتيح عشوائية 64 char + حقنها كـ Environment Variables في بيئة الإنتاج فقط |

### 2.2 Firebase Service Account على القرص
| الحقل | القيمة |
|-------|--------|
| **الملف** | `firebase-service-account.json` |
| **السطر** | الملف بأكمله |
| **الكود** | `-----BEGIN PRIVATE KEY-----\n...` [REDACTED] |
| **الخطورة** | HIGH — مفتاح Firebase حقيقي على القرص |
| **التأثير** | إذا اخترق الجهاز، يمكن الوصول إلى Firebase |
| **الحل** | إزالة الملف والاعتماد على Environment Variables |

### 2.3 JWT_SECRET Empty String Fallback في Production
| الحقل | القيمة |
|-------|--------|
| **الملف** | `server/src/middleware/auth.ts` |
| **السطر** | 10 |
| **الكود** | `const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? crypto.randomBytes(64).toString('hex') : '')` |
| **الخطورة** | MEDIUM — في الإنتاج إذا فُقد `JWT_SECRET`، القيمة `''` |
| **التأثير** | أي JWT موقع بـ `''` سيكون مقبولاً |
| **الحل** | إزالة fallback وإجهاض التشغيل إذا كانت المفاتيح فارغة |

### 2.4 CSRF متطبق
| الحقل | القيمة |
|-------|--------|
| **الملف** | `server/src/index.ts:89-109` |
| **الخطورة** | ✅ **آمن** — جميع POST/PUT/DELETE تتطلب CSRF token + hash |
| **ملاحظة** | `GET /api/csrf-token` غير مصادق — أي شخص يمكنه الحصول على CSRF token |

### 2.5 Rate Limiting
| الحقل | القيمة |
|-------|--------|
| **الملف** | `server/src/index.ts:112-140` |
| **الخطورة** | ✅ **جيد** — 10/15min للـ auth, 100/min للـ API, 30/min للـ write |

### 2.6 SQL Injection
| الحقل | القيمة |
|-------|--------|
| **التحقق** | ✅ **جميع الاستعلامات تستخدم parameterized queries** `$1, $2` |
| **استثناء** | `admin.ts:178` — `SELECT * FROM ${table}` لكن `table` من مصفوفة hardcoded، لا user input |

### 2.7 File Upload بدون صلاحيات
| الحقل | القيمة |
|-------|--------|
| **الملف** | `server/src/routes/upload.ts:39,52` |
| **الخطورة** | LOW — أي مستخدم مصادق يمكنه رفع صور |
| **الحل** | إضافة `requireRole('manager', 'agent')` |

---

## 3. Android Readiness

### 3.1 Capacitor Plugins

| Plugin | موجود؟ | مطلوب لـ |
|--------|--------|----------|
| `@capacitor/android` | ✅ نعم (v8.4.0) | تشغيل Android |
| `@capacitor/cli` | ✅ نعم (v8.4.0) | أدوات CLI |
| `@capacitor/core` | ✅ نعم (v8.4.0) | أساسي |
| `@capacitor/preferences` | ✅ (في devDependencies — خطأ) | تخزين مشفر |
| `@capacitor/status-bar` | ❌ **مفقود** | التحكم بشريط الحالة |
| `@capacitor/keyboard` | ❌ **مفقود** | إخفاء لوحة المفاتيح تلقائياً |
| `@capacitor/biometric` | ❌ **مفقود** | بصمة الإصبع |

### 3.2 AndroidManifest.xml

| الإذن | موجود؟ |
|-------|--------|
| `INTERNET` | ✅ |
| `CAMERA` | ✅ |
| `ACCESS_NETWORK_STATE` | ✅ |
| `USE_BIOMETRIC` | ❌ **مفقود** |
| `POST_NOTIFICATIONS` | ❌ **مفقود** |
| `READ_MEDIA_IMAGES` (API 33+) | ❌ **مفقود** |

### 3.3 APK/AAB Build
| الحقل | القيمة |
|-------|--------|
| **ملفات APK/AAB** | ✅ موجودة في `android/app/build/outputs/` |
| **minSdkVersion** | 24 (Android 7.0) — ✅ مقبول |
| **targetSdkVersion** | 36 (Android 16) — ✅ حديث |
| **versionCode** | 3 |
| **Play Store Requirements** | ❌ **مطلوب targetSdkVersion ≥ 33** (موجود 36 ✅) + سياسة الخصوصية + تصريح BIOMETRIC مفقود |

---

## 4. Functional Audit — الأزرار والواجهات

### 4.1 Admin/Manager Interface

| الميزة | الحالة | التفاصيل |
|--------|--------|----------|
| إدارة المستخدمين | ❌ **وهمي** | `simulatedUsers` hardcoded + `prompt()` (`AdminMoreDrawer.tsx:21-26,291-298`) |
| النسخ الاحتياطي | ❌ **وهمي** | `setTimeout` + progress bar + أسماء ملفات random (`AdminMoreDrawer.tsx:42-67`) |
| إدارة المشغلين | ❌ **وهمي** | بيانات hardcoded (`AdminMoreDrawer.tsx:362-366`) |
| إدارة المستودعات | ❌ **وهمي** | بيانات hardcoded (`AdminMoreDrawer.tsx:383-394`) |
| صحة الخوادم | ❌ **وهمي** | 100% hardcoded (`AdminMoreDrawer.tsx:166`) |
| سجلات التدقيق | ❌ **وهمي** | 7 سطور hardcoded (`AdminMoreDrawer.tsx:326-334`) |
| الصلاحيات والأدوار | ❌ **وهمي** | hardcoded + read-only checkboxes |
| التكامل API | ❌ **وهمي** | webhooks hardcoded مع toggle محلي |
| مركز الدعم | ❌ **وهمي** | أرقام هواتف hardcoded |
| التقارير | ❌ **وهمي** | بيانات hardcoded + `setTimeout` للتصدير (`ReportsView.tsx:16-27`) |
| المخاطر الجغرافية | ❌ **وهمي** | `DUPLICATE_IDENTITIES_MOCKS` من `data.ts` |
| التنبيهات | ⚠️ **جزئي** | `handleReorder` و `handleSecurityCheck` يستخدمان `setTimeout` (`AlertsView.tsx:36,45`) |

### 4.2 Agent Interface

| الميزة | الحالة | التفاصيل |
|--------|--------|----------|
| إضافة بائع | ❌ **وهمي** | `setTimeout` لا API (`AddSellerForm.tsx:75-124`) |
| إضافة وكيل | ❌ **لا API** | `onAddAgent` callback فقط (`AddAgentView.tsx:30-37`) |
| تغيير كلمة المرور | ❌ **وهمي** | toast فقط (`AgentProfileView.tsx:103`) |
| تحويل شرائح | ⚠️ **setTimeout** | `AgentDashboard.tsx:150` — `setTimeout` + `onTransferSims` callback |

### 4.3 Seller Interface

| الميزة | الحالة | التفاصيل |
|--------|--------|----------|
| تفعيل شريحة | ❌ **وهمي** | `setTimeout` 500ms (`ActivateSimForm.tsx:106-120`) |
| تغيير كلمة المرور | ❌ **وهمي** | `setTimeout` 500ms (`SellerAccount.tsx:111-119`) |
| تحديث كلمة المرور (داشبورد) | ⚠️ **API call لكن currentPassword فارغ** | `api.updatePassword('', newPassword)` — السيرفر يرفضها بـ Zod |

### 4.4 ملخص الأزرار الميتة والعمليات الوهمية

| # | المكون | الوظيفة | ملف:سطر |
|---|--------|---------|---------|
| 1 | AddSellerForm | إضافة بائع (setTimeout) | `AddSellerForm.tsx:75-124` |
| 2 | AddAgentView | إضافة وكيل (لا API) | `AddAgentView.tsx:30-37` |
| 3 | ActivateSimForm | تفعيل شريحة (setTimeout) | `ActivateSimForm.tsx:106-120` |
| 4 | SellerAccount | تغيير كلمة المرور (setTimeout) | `SellerAccount.tsx:111-119` |
| 5 | AgentProfileView | تغيير كلمة المرور (لا API) | `AgentProfileView.tsx:103` |
| 6 | AdminMoreDrawer | نسخ احتياطي (setTimeout) | `AdminMoreDrawer.tsx:48-67` |
| 7 | AdminMoreDrawer | إضافة مستخدم (prompt) | `AdminMoreDrawer.tsx:291-298` |
| 8 | AdminMoreDrawer | تنزيل نسخة (toast) | `AdminMoreDrawer.tsx:422` |
| 9 | ReportsView | تصدير تقرير (setTimeout) | `ReportsView.tsx:24` |
| 10 | AlertsView | معالجة تنبيه (setTimeout) | `AlertsView.tsx:36,45` |
| 11 | AgentDashboard | تحويل شرائح (setTimeout) | `AgentDashboard.tsx:150` |

---

## 5. Database Audit

### 5.1 Foreign Keys
| العلاقة | الحالة |
|---------|--------|
| `agents.user_id` → `users(id)` | ✅ صحيح |
| `sellers.user_id` → `users(id)` | ✅ صحيح |
| `sellers.agent_id` → `agents(id)` | ✅ صحيح |
| `sims.assigned_to` → `sellers(id)` | ✅ صحيح |
| `customers.activated_by` → `sellers(id)` | ✅ صحيح |
| `distribution_requests.*` → متعدد | ✅ جميعها صحيحة |

### 5.2 CHECK Constraints
| الجدول | الحالة |
|--------|--------|
| `users.role` — `IN ('manager','agent','seller')` | ✅ متطابق مع الكود |
| `agents.status` — `IN ('active','inactive')` | ✅ متطابق |
| `sellers.status` — `IN ('active','inactive','suspended','low_stock','deleted')` | ✅ تم إصلاحها (مضاف 'deleted') |
| `sims.status` — `IN ('available','sold','reserved','inactive','suspended')` | ✅ متطابق |

### 5.3 Runtime Crash Possibilities
| # | الملف:سطر | المشكلة | الخطورة |
|---|-----------|---------|---------|
| 1 | `customers.ts:49` | `WHERE customer_name = $1` على `operations` — customer_name دائماً NULL | **HIGH** (ميزة معطلة) |
| 2 | `reports.ts:13` | `COUNT(DISTINCT customer_name)` — دائماً 0 | **MEDIUM** |
| 3 | `schema.sql:233-234` | `cleanup_expired_tokens()` لا يُستدعى أبداً | **LOW** (leak) |

### 5.4 Missing Tables
لا يوجد جدول `orders` (طلبات الشراء). العمليات الحالية (`operations`) تسجل فقط التنشيط وإعادة الشحن ولكن ليس لها تدفق أمر شراء.

### 5.5 Unused Columns
| الجدول | الأعمدة | السبب |
|--------|---------|-------|
| `users` | `email` | لا يُقرأ أو يُكتب في أي route |
| `agents` | `email` | لا يُقرأ أو يُكتب |
| `sellers` | `email` | لا يُقرأ أو يُكتب |
| `sims` | `contract_image` | لا يُقرأ أو يُكتب |
| `sims` | `customer_name` | لا يُقرأ أو يُكتب |
| `sims` | `customer_id` | لا يُقرأ أو يُكتب |
| `operations` | `customer_name` | يُقرأ (ولكن دائماً NULL) |
| `operations` | `customer_id` | لا يُكتب |
| `operations` | `contract_image` | لا يُكتب |

---

## 6. API Audit

### 6.1 Zod Validation Coverage
| الملف | النسبة | التفاصيل |
|-------|--------|----------|
| `auth.ts` | 2/4 (50%) | login + refresh ✅, logout + me ❌ (GET, مقبول) |
| `sims.ts` | 3/4 (75%) | create + update ✅, delete ❌ (فقط params) |
| `agents.ts` | 2/3 (67%) | create + update ✅, get ❌ (GET, مقبول) |
| `sellers.ts` | 3/6 (50%) | create + update + balance ✅, delete + reset-password + get ❌ |
| `operations.ts` | 1/2 (50%) | create ✅, get ❌ (GET, مقبول) |
| `admin.ts` | 1/9 (11%) | updateSettings ✅, باقي 8 بدون (معظمها GET) |
| `users.ts` | 2/2 (100%) | ✅ |
| `customers.ts` | 1/4 (25%) | create ✅, 3 GET بدون |
| `distributions.ts` | 2/4 (50%) | create + approve ✅, 2 GET بدون |
| `reports.ts` | 0/4 (0%) | جميعها GET — بدون validation |
| **الإجمالي** | **~50%** | 20/40 مع validation |

### 6.2 Missing CRUD Operations

| الكيان | Create | Read All | Read One | Update | Delete |
|--------|--------|----------|----------|--------|--------|
| SIMs | ✅ POST / | ✅ GET / | ❌ GET /:id | ✅ PUT /:id | ✅ DELETE /:id |
| Agents | ✅ POST / | ✅ GET / | ❌ GET /:id | ✅ PUT /:id | ❌ DELETE /:id |
| Sellers | ✅ POST / | ✅ GET / | ❌ GET /:id | ✅ PUT /:id | ✅ DELETE /:id |
| Operations | ✅ POST / | ✅ GET / | ❌ GET /:id | ❌ PUT /:id | ❌ DELETE /:id |
| Inventories | ❌ POST / | ✅ GET / | ❌ GET /:id | ✅ PUT / | ❌ DELETE /:id |
| Alerts | ❌ POST / | ✅ GET / | ❌ GET /:id | ❌ PUT /:id | ✅ DELETE /:id |
| Customers | ✅ POST / | ✅ GET / | ✅ GET /:id | ❌ PUT /:id | ❌ DELETE /:id |
| Distributions | ✅ POST / | ✅ GET / | ❌ GET /:id | ✅ PUT /:id/approve | ❌ DELETE /:id |
| Users (admin) | ❌ POST / | ❌ GET / | ❌ GET /:id | ✅ PUT /password | ❌ DELETE /:id |

### 6.3 Unused API Endpoints (موجودة في السيرفر ولكن غير مستخدمة في الواجهة)

| # | الـ Endpoint | الملف | 
|---|-------------|-------|
| 1–4 | Customers الـ 4 endpoints | `customers.ts` |
| 5–8 | Distributions الـ 4 endpoints | `distributions.ts` |
| 9–12 | Reports الـ 4 endpoints | `reports.ts` |
| 13 | `DELETE /sims/:id` | `sims.ts:72` (defined in client.ts but never called) |
| 14 | `PUT /users/profile` | `users.ts:32` (defined in client.ts but never called) |
| 15 | `GET /operations` | `operations.ts:9` |
| 16 | `GET /inventories` | `inventories.ts:8` |
| 17 | `GET /admin/system/lockdown/status` | `admin.ts:248` |
| **المجموع** | **17 Endpoint** | |

---

## 7. Final Score

### Production Readiness: **30/100**

| الفئة | العدد | الخصم |
|-------|-------|-------|
| 11 Production Blockers (تمنع النشر) | 11 | -70 |
| النقاط الإيجابية (API Client جيد, Auth, Rate Limiting) | — | +0 |
| **الناتج** | | **30/100** |

### جدول المشاكل حسب الخطورة

| المستوى | العدد | الوصف |
|---------|-------|-------|
| **Critical** | 11 | تمنع النشر على Google Play |
| **High** | 4 | قد تسبب مشاكل في الإنتاج |
| **Medium** | 5 | تؤثر على الجودة والتجربة |
| **Low** | 8 | تحسينات مستقبلية |
| **الإجمالي** | **28** | |

---

## 8. الحكم النهائي

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   READY FOR GOOGLE PLAY = ❌ NO                                      ║
║                                                                      ║
║   الأسباب الرئيسية (11 Critical):                                    ║
║                                                                      ║
║   1. Path Traversal — ثغرة أمنية تسمح بقراءة أي ملف (admin.ts:210)   ║
║   2. إضافة بائع — عملية وهمية (setTimeout, لا API)                   ║
║   3. إضافة وكيل — لا API call                                        ║
║   4. تفعيل شريحة — عملية وهمية (setTimeout, لا API)                  ║
║   5. تغيير كلمة المرور (بائع) — عملية وهمية (setTimeout, لا API)     ║
║   6. تغيير كلمة المرور (وكيل) — toast فقط, لا API                    ║
║   7. AdminMoreDrawer — 8 ميزات إدارية وهمية بالكامل                  ║
║   8. Role Detection — أي شخص يكتب "manager" يرى واجهة المدير          ║
║   9. @capacitor/preferences في devDependencies — سينكسر APK          ║
║  10. Missing Android plugins (StatusBar, Keyboard)                   ║
║  11. JWT/CSRF secrets ضعيفة وقابلة للتخمين                           ║
║                                                                      ║
║   الوقت المقدر للإصلاح: 7-10 أيام عمل لفريق مطور واحد               ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```
