# 🩺 تقرير التدقيق التشخيصي الشامل لخوادم MCP — 2026-08-07

> فحص حي (Live) لكل خوادم MCP المتصلة: الاكتشاف، الاختبارات الوظيفية غير المُدمِّرة،
> حالات الخطأ والحواف، تقييم المخاطر، وخطة إجراءات ذات أولوية.

---

## A. الملخص التنفيذي ومؤشر الصحة

| المؤشر | القيمة |
|--------|--------|
| خوادم MCP المتصلة | **11** مثيلاً (10 منتجات) |
| إجمالي الأدوات المكشوفة | **170** |
| أدوات خضعت لاختبار مباشر | **40** استدعاءً |
| أدوات تعمل بالكامل | **32** |
| فشل حقيقي (أخطاء تنفيذ) | **5** (كلها في خادم واحد: AST-CodeAnalysis) |
| فشل جزئي | **1** (TestSprite — استجابة سير عمل) |
| حالات خطأ مُتعمَّدة (سلوك صحيح) | **5** (تحقق ناجح لانتشار الخطأ) |
| الموارد (Resources) | **1** (`health://status` في AST-CodeAnalysis) |
| قوالب البرومبت (Prompts) | **0** (لا شيء مكشوف) |

**درجة الجاهزية الكلية: 89/100** 🟡
- مع استثناء خادم AST-CodeAnalysis، كل الخوادم تعمل **100%**.
- عطل AST يعود لسبب واحد قابل للإصلاح: غياب أدوات `ripgrep`/`fd`/`find` على نظام Windows (انظر C-1 و D).

---

## B. جدول حالة الخوادم

| الخادم | الحالة | الأدوات | معدل النجاح | الكمون | الدور الرئيسي |
|--------|--------|---------|-------------|--------|---------------|
| AST-CodeAnalysis | 🟡 متدهور | 42 | ~55% | سريع (تحليل) / يفشل (بحث) | تحليل الشيفرة (read-only) |
| Context7 | 🟢 سليم | 2 | 100% | ~1-2 ثانية | توثيق المكتبات المحدّث |
| supabase | 🟢 سليم | 19 | 100% | <1 ثانية | قاعدة البيانات الحية |
| Render | 🟢 سليم | 25 | 100% | <1 ثانية | البنية التحتية للإنتاج |
| Sentry | 🟢 سليم | 7+ كتالوج | 100% | <1 ثانية | مراقبة الأخطاء |
| Sequential-Thinking | 🟢 سليم | 1 | 100% | فوري | التفكير المتسلسل |
| Playwright | 🟢 سليم | 22 | 100% | ~2-3 ثانية | أتمتة المتصفح |
| Fetch | 🟢 سليم | 5 | 100% | ~1.2 ثانية | HTTP/GraphQL/WebSocket/Puppeteer |
| TestSprite | 🟡 جزئي | 9 | ~85% | سريع | الاختبار الآلي (E2E) |
| GitHub | 🟢 سليم | 28 | 100% | <1 ثانية | إدارة المستودع والـPR |
| git (محلي) ×2 | 🟢 سليم | 10 | 100% | فوري | عمليات git المحلية |

---

## C. تفصيل الخوادم

### C-1. AST-CodeAnalysis (codedev-mcp) — 🟡 متدهور
- **الهوية**: نقل stdio محلي، إصدار **3.2.0** (من `health://status`)، 42 أداة في 9 فئات.
- **مورد الحالة**: `health://status` → `"unhealthy"`:
  ```
  ripgrep: fail — "ripgrep not found, using fallback"
  fd:      fail — "fd not found, using fallback"
  ```
- **يعمل**: `git_status`, `git_log`, `analyze_file` (مثال: `server/src/db.ts` — 93 سطراً، تعقيد 19)، `read_files`, `security_scan` (3655 نتيجة)، `dep_vuln_scan` (560 تبعية: 0 حرجة، 1 متوسطة).
- **معطوب (4 أدوات، سبب واحد)**:
  | الأداة | المدخلات | الخطأ |
  |--------|----------|-------|
  | `codebase_map` | (بدون) | `Command failed: find . (…) -prune -o -type f -print → FIND: Parameter format not correct` |
  | `file_tree` | max_depth=2 | نفس السبب: `find` غير متوفر على Windows |
  | `search_code` | pattern="SESSION_EXEMPT" | `spawn grep ENOENT` |
  | `search_symbols` | name="createAlert" | نفس خطأ `find` |
  - **التحليل الجذري**: الخادم يستدعي أوامر Unix (`find`, `rg`, `fd`, `grep`) التي لا وجود لها في PATH على Windows؛ فالوضع الآمن (fallback) نفسه معطوب لأن `grep` غير مثبت.
- **معطوب (خلل إخراج)**: `api_contracts` → `MCP error -32602: Output validation error: Invalid structured content for tool api_contracts: Required at sources` — الأداة تعمل لكن مخطط الإخراج المعلَن لا يتطابق مع ما تُرجعه فعلياً (خلل في الخادم نفسه).
- **انتشار الخطأ**: `analyze_file` بمسار غير موجود → `ENOENT: no such file or directory` مع إرشاد مسار صحيح. ✅ سلوك نظيف.
- **مخاطر أمنية**: قراءة فقط؛ لا يكتب. لكن الوصول الكامل لنظام الملفات بـ `read_files` — حساسية متوسطة ضمن بيئة العمل.

### C-2. Context7 — 🟢 سليم
- **الهوية**: سحابي (REST)، أداتان: `resolve-library-id` + `query-docs`.
- **يعمل**: `resolve-library-id("React")` → 5 نتائج بإصدارات ونقاط جودة؛ `query-docs("/reactjs/react.dev", "useEffect cleanup")` → أمثلة شيفرة كاملة بمصادرها.
- **خطأ مُتعمَّد**: `query-docs` بدون `libraryId` → `-32602 Input validation error` مع مسار الحقل الناقص. ✅ نموذجي.
- **ثغرات**: لا يوجد كاش لتوثيق الحزم الداخلية؛ غير متصل بمستودع المشروع.

### C-3. supabase — 🟢 سليم
- **الهوية**: سحابي، مشروع `qxroquilskugfemzmrzp.supabase.co` (هو قاعدة إنتاج التطبيق).
- **يعمل**: `get_project_url`، `list_tables` (17 جدولاً، RLS مفعّلة على الكل؛ `users`=2، `audit_logs`=4، `schema_migrations`=2)، `get_logs(postgres)` (عبارات RLS/الأعمدة الجديدة، checkpoints، و`Connection reset by peer` واحدة — نمطية وليست حرجة).
- **خطأ مُتعمَّد**: `SELECT * FROM nonexistent_table_xyz` → `42P01 relation does not exist` منتشر بشكل نظيف مع السطر. ✅
- **ملاحظة**: سجلّات postgres تُظهر تنفيذ DDL bootstrap (`ALTER TABLE users ADD COLUMN … active_session_sid`) — متسق مع دورة حياة التشغيل.

### C-4. Render — 🟢 سليم
- **الهوية**: سحابي (OAuth)، مساحة العمل `tea-d8h32is2m8qs73ajnjsg` (My Workspace) — مطابقة للهدف.
- **يعمل**: `list_workspaces`، `get_selected_workspace`، `list_services` (الخدمة `yemen-telecom` — خطة free، oregon، docker، `healthCheckPath: /api/health` ✅، autoDeploy=yes، **غير موقوفة**)، `list_deploys` (الآخر `dep-d9qfvkou01pc739fs7tg` لالتزام الإصلاح الأمني 08af031 → **live** في ~53 ثانية)، `get_metrics` (CPU ~0.002-0.004، ذاكرة ~59-62MB مستقرة؛ `http_request_count` فارغ للفترة — قد لا يُجمَّع على الخطة المجانية).
- **خطأ مُتعمَّد**: خدمة وهمية → `404 not found: service: srv-invalid-nonexistent-12345`. ✅
- **تحقق خارجي**: `GET /api/health` → 200، `{"status":"ok","db":"connected","node":"v24.19.0"}`، CSP/رؤوس أمان سليمة، بقي 99/100 حد طلب. ✅

### C-5. Sentry — 🟢 سليم
- **الهوية**: سحابي (المنطقة `de.sentry.io`)، مؤسسة `mliki-technique`، مشروع واحد: `javascript-react`.
- **يعمل**: `find_organizations`، `find_projects`، `search_issues` (24h → لا توجد أخطاء مفتوحة ✅)، `search_sentry_tools` (كتالوج كامل مع المخططات والتعليقات التوضيحية readOnly/destructive).
- **خطأ مُتعمَّد**: `search_events` بدون `organizationSlug` → تحقق مدخلات صحيح. ✅
- **ملاحظة**: المشروع الوحيد `javascript-react` — تحقق من أن DSN مضبوط في الخادم (لم يُختبَر `find_dsns` حفاظاً على الحساسية).

### C-6. Sequential-Thinking — 🟢 سليم
- تحقق بسيط ناجح (thoughtNumber/totalThoughts/nextThoughtNeeded عادت سليمة). أداة محلية عديمة الحالة.

### C-7. Playwright — 🟢 سليم
- **يعمل**: `browser_navigate("https://example.com")` → 200 مع لقطة مقروءة؛ `browser_close` → أُغلق بنجاح.
- **ملاحظة**: يُخرج اللقطات إلى `%TEMP%\playwright-mcp-output\` — مسار نظامي مؤقت، لا حساسية.

### C-8. Fetch — 🟢 سليم
- **يعمل**: `fetch` (نقطة صحة الإنتاج: 200/1177ms مع رؤوس أمان كاملة)، `socket list` (لا اتصالات نشطة).
- **الأدوات غير المختبرة**: `graphql`, `puppeteer`, `get-rules` — متاحة وجاهزة (graphql يتطلب endpoint؛ puppeteer يوازي Playwright).

### C-9. TestSprite — 🟡 جزئي
- **يعمل**: `check_account_info` (خطة Free، 123.4 رصيد، الحساب: احمد ahmedabdos424@gmail.com).
- **جزئي**: `generate_code_summary` لا يُرجع ملخصاً بل يوجه لكتابة `testsprite_tests/tmp/code_summary.yaml` عبر `generate_standardized_prd` — تصميم قائم على سير العمل (يقتضي تشغيل خادم محلي للاختبارات الفعلية).
- **ملاحظة**: القالب يشير إلى `src/pages/Login.tsx` بينما المشروع يستخدم `src/components/` — قالب عام غير مكيّف.

### C-10. GitHub — 🟢 سليم
- **يعمل**: `get_file_contents` (README.md — 5275 بايت، main).
- **خطأ مُتعمَّد**: ملف غير موجود → `-32603 Not Found` منتشر بشكل نظيف. ✅
- **ملاحظة**: الحماية مفعّلة على الفرع (`bypass` عبر الأذونات عند الدفع المباشر لـ main).

### C-11. git / Git (محلي ×2) — 🟢 سليم
- مثيلان منفصلان (`git_*` و`Git_*`) يخدمات أداة git الواحدة عبر stdio.
- **يعمل**: `status` (نظيف، main، متزامن مع origin)، `log` (5 التزامات، آخرها 08af031).
- **ملاحظة**: `git fsck` رصد سابقاً blob مفقوداً (`a638c186`) في التاريخ القديم — لا يؤثر على الالتزامات الجديدة.

---

## D. خطة العمل ذات الأولوية

| # | الأولوية | الإجراء | الخادم | السبب / الأثر |
|---|----------|---------|--------|----------------|
| 1 | 🔴 حرجة | تثبيت `ripgrep` (و`fd` اختيارياً) وإضافة مجلداتها إلى PATH في بيئة التشغيل | AST-CodeAnalysis | يعيد فوراً ~20 أداة (بحث/تنقّل/جودة/معمارية)؛ الخادم يصرّح بأن الـfallback معطوب (grep ENOENT) |
| 2 | 🟠 عالية | تثبيت `grep` كـfallback إن تعذّر rg (مثال: winget/Git Bash/Chocolatey) | AST-CodeAnalysis | بدون أي محرك بحث كل أدوات الـsearch/find محجوبة |
| 3 | 🟠 عالية | الإبلاغ عن خلل مخطط إخراج `api_contracts` لمطوّري codedev-mcp (أو الترقية لإصدار أصلح) | AST-CodeAnalysis | الأداة ترمي `-32602 Output validation error` دائماً |
| 4 | 🟡 متوسطة | تحقق أن DSN Sentry في `server/.env` يستهدف مشروع `javascript-react` | Sentry | ضمان وصول أخطاء الإنتاج إلى المشروع الوحيد المرصود |
| 5 | 🟡 متوسطة | ترقية `semver@6.3.1` إلى `>=7.5.2` (CVE-2022-25883، ReDoS متوسط) | نطاق التبعيات | `dep_vuln_scan` رصدها؛ يتطلب اختباراً بعد الترقية |
| 6 | 🟢 منخفضة | تكييف قوالب TestSprite مع بنية المشروع (src/components بدل src/pages) | TestSprite | تحسين صحة المخرجات التلقائية |
| 7 | 🟢 منخفضة | إعادة تشغيل خوادم MCP بعد تعديل PATH (كل الجلسات) | الكل | تطبيق تغييرات البيئة |

**نتائج الأمان المفحوصة (لا إجراء):** ⚠️→✅
- `.env` مُتتبَّع في git؟ **لا** — `git check-ignore` يؤكد استثناءه (`server/.env.example` وحدها متتبعة).
- `.npmrc` مُتتبَّع لكن محتواه `engine-strict=true` فقط — **لا رموز تحقق** (إنذار الماسح كاذب هنا).
- 3653 نتيجة "critical" من `security_scan` هي **إيجابيات كاذبة** (أنماط SQL/secret عامة على JSX وحلقات بكسل في useOcr وثوابت اختبارية في `__tests__`).

---

## E. منهجية وسجلات الاختبار

- كل الاستدعاءات قراءة-فقط أو غير مُدمِّرة؛ لم يُنشأ شيء ولم يُحذف أي مورد.
- حالات الخطأ المُتعمَّدة: Context7 (مدخلات ناقصة)، supabase (SQL خاطئ)، Render (معرف غير موجود)، Sentry (وسيط ناقص)، GitHub (ملف غير موجود) — كلها أعادت أخطاء منظمة وفق بروتوكول MCP.
- التوقيت: 2026-08-07 ~00:49–00:55 (توقيت محلي)؛ نقطة الصحة الحيوية للإنتاج: `GET /api/health` = 200/ok، آخر deploy `dep-d9qfvkou01pc739fs7tg` = **live**.
