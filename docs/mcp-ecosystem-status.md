# MCP Ecosystem Status Report — Yemen Telecom

**التاريخ**: 2026-08-03 (ليلاً)
**البيئة**: Windows PowerShell 5.1 · Node v24.18.1 · Python 3.11.9 · Git 2.55.0
**الغرض**: تهيئة Git MCP Server + فحص صحة شامل لجميع خوادم MCP في النظام البيئي.

---

## 📊 Summary Table

| MCP Server Name | Status | Key Tools Loaded | Remarks / Issues |
| :--- | :---: | :--- | :--- |
| **git** *(جديد — أُضيف في هذه الجلسة)* | 🟢 Active | `git_status`, `git_diff`, `git_diff_staged`, `git_diff_unstaged`, `git_commit`, `git_add`, `git_reset`, `git_log`, `git_create_branch`, `git_checkout`, `git_show`, `git_branch` (12 أداة) | أُصلح عدم توافق إصدار `mcp` SDK (2.0.0 → 1.29.0). يتطلب إعادة تشغيل opencode ليُحمَّل في الجلسة. |
| **GitHub** | 🟢 Active | قراءة/كتابة ملفات، commits، PRs، issues، branches | يعمل بالـ PAT الحالي (يُقرأ من بيئة التشغيل `GITHUB_PERSONAL_ACCESS_TOKEN`). التحقق: جلب `package.json` من `ahmedabdos424-cyber/yemen-telecom` بنجاح. |
| **supabase** | 🟢 Active | SQL, migrations, types, logs, storage, functions | متصل بالمشروع `qxroquilskugfemzmrzp`. التحقق: `get_project_url` ناجح. |
| **Sentry** | 🟢 Active | Issues, events, traces, projects, Seer | متصل (OAuth). التحقق: org `mliki-technique` (region `de.sentry.io`). |
| **Context7** | 🟢 Active | استرجاع توثيقات المكتبات | التحقق: بحث Express أعاد 5 نتائج موثوقة. |
| **Filesystem** | 🟢 Active | قراءة/كتابة/بحث/تحريك ملفات | مقيّد بـ `C:\Dev\yemen-telecom` فقط. التحقق: `list_allowed_directories` ناجح. |
| **Playwright** | 🟢 Active | متصفح كامل (navigate, snapshot, click, network...) | الخادم والمتصفح يعملان؛ DNS في بيئة التحقق محجوب لمواقع خارجية (`ERR_NAME_NOT_RESOLVED` لـ example.com) لكن الاتصال بـ localhost ناجح سابقاً. |
| **TestSprite** | 🟢 Active *(مُحدَّث)* | bootstrap, test plans, generate & execute, PRD, dashboard | أُضيف `API_KEY` (يبدأ بـ `sk-user-`) في `environment` بتعريف الخادم — التحقق: `testsprite doctor` → **All checks passed** (user `c4385438-...`). يُفعَّل بعد إعادة تشغيل opencode. |
| **Memory** | 🟡 Degraded | knowledge graph (entities, relations, observations) | كل استدعاءات القراءة تفشل بخطأ JSON داخلي متكرر ("Expected property name or '}' in JSON at position 1"). لا إصلاح محلي معروف — يُراقب. |
| **Render** | 🟢 Active *(مُحدَّث)* | services, deploys, logs, metrics, env vars, postgres | أُستبدل API key بمفتاح جديد صالح — التحقق عبر REST `api.render.com/v1/services` → `200 OK`. يُفعَّل بعد إعادة تشغيل opencode. |
| **Chrome-DevTools** | 🔴 Down | DOM, screenshot, network, performance | لا متصفح قيد التشغيل + سياسة المنظمة تحجب الملف الشخصي الافتراضي (`DevToolsActivePort` غير موجود). استخدم Playwright بدلاً منه. |
| **Docker** | 🔴 Down | containers, images, exec, logs, stats | `connect ENOENT //./pipe/docker_engine` — محرك Docker Desktop غير مشغّل. |
| **Netlify** | 🔴 Auth Needed | deploys, env vars, forms, projects | `NetlifyUnauthError` — نفّذ `netlify login`. |
| **AST-CodeAnalysis** | 🟢 Active | 42 أداة (search, analysis, git, quality, security, architecture) | متاح في الجلسة خارج opencode.json. التحقق: `git_log` ناجح. |
| **Security-Scanner** | 🟢 Active | 55 فحصاً (runtime, SAST, config, dependency, report) | متاح في الجلسة. التحقق: `scanner_list_checks` ناجح. |
| **Fetch** | 🟢 Active | HTTP, GraphQL, Puppeteer, WebSocket | متاح في الجلسة. التحقق: `get-rules` ناجح. |
| **Sequential-Thinking** | 🟢 Active | تفكير متسلسل (مدمج، بدون شبكة) | يعمل دائماً. |

> ملاحظة: الخوادم AST-CodeAnalysis / Security-Scanner / Fetch / Sequential-Thinking / Chrome-DevTools / Docker / Memory / Netlify تظهر في الجلسة لكنها **غير معرّفة في `~/.config/opencode/opencode.json`** — مصدرها أدوات أخرى (إعدادات خارجية/افتراضية). أُدرجت للاكتمال.

---

## 🛠️ Git MCP Deployment Details

### الإعداد
- **الموقع**: `~/.config/opencode/opencode.json` (إعداد عام — لا يوجد إعداد مشروع في `C:\Dev\yemen-telecom`).
- **التعريف المضاف**:
  ```json
  "git": {
    "type": "local",
    "command": ["python", "-m", "mcp_server_git"],
    "enabled": true,
    "timeout": 30000
  }
  ```
- **الحزمة**: `mcp-server-git` (PyPI) v2026.7.10 — الخادم الرسمي من نموذج MCP المرجعي.
- ⚠️ **تحذير أمان**: حزمة npm باسم `mcp-server-git` هي **طُعم بحث أمني (canary/npx-confusion)** — لا تُستخدم إطلاقاً.

### الإصلاح المطبق (عدم توافق إصدارات)
- العَرَض: `AttributeError: 'Server' object has no attribute 'list_tools'`.
- السبب: `mcp-server-git` يتطلب `mcp>=1.0.0` بينما كان المثبّت `mcp 2.0.0` (أُزيل فيه واجهة `list_tools` القديمة).
- الحل: `pip install "mcp>=1.0.0,<2"` → المثبّت الآن **mcp 1.29.0** (متوافق).
- التحقق بعد الإصلاح: `initialize` → `serverInfo: mcp-git v1.29.0` ✓ · `tools/list` → 12 أداة ✓ · `git_status` على `C:\Dev\yemen-telecom` → `On branch main, up to date with 'origin/main', working tree clean` ✓

### ربط المستودع (Repository Binding)
- الخادم يستقبل `repo_path` كوسيط لكل أداة (لا ربط ثابت) — يعمل من أي مجلد.
- الربط المرجعي للمشروع: `C:\Dev\yemen-telecom` (روت الـ git repo — `origin` → `ahmedabdos424-cyber/yemen-telecom`, فرع `main`).

### الأدوات الجاهزة (12)
| أداة | الوظيفة |
| :--- | :--- |
| `git_status` | حالة شجرة العمل |
| `git_diff` / `git_diff_staged` / `git_diff_unstaged` | الفروقات بين فروع/commits والمرحّلة وغير المرحّلة |
| `git_log` | سجل الـ commits (مع فلاتر زمنية) |
| `git_show` | محتوى commit محدد |
| `git_branch` | قائمة الفروع (local/remote/all) |
| `git_create_branch` / `git_checkout` | إنشاء/تبديل الفروع |
| `git_add` / `git_reset` | staging |
| `git_commit` | تسجيل الالتزامات |

---

## ⚠️ Action Required (Nawaqis & Fixes)

| # | الخادم | الإجراء المطلوب |
| :---: | :--- | :--- |
| 1 | **الكل** | أعد تشغيل opencode (`quit` ثم فتح من جديد) حتى يُحمَّل خادم `git` الجديد وتظهر أدواته في الجلسة. |
| 2 | ~~Render~~ | ✅ **تم**: مفتاح جديد صالح (تحقق REST `200 OK`) — أُدرج في `opencode.json`. لا حاجة لإجراء. |
| 3 | ~~TestSprite~~ | ✅ **تم**: مفتاح `sk-user-...` أُدرج في `environment.API_KEY` — التحقق: `testsprite doctor` = All checks passed. لا حاجة لإجراء. |
| 4 | **Netlify** | نفّذ: `npm i -g netlify-cli` ثم `netlify login` (يعتمد على OAuth في المتصفح). |
| 5 | **Docker** | شغّل Docker Desktop (الخدمة `com.docker.service`) ثم أعد المحاولة — الأنبوب `//./pipe/docker_engine` ظهر مغلقاً. |
| 6 | **Chrome-DevTools** | إما بدء Chrome بملف شخصي افتراضي (لتفعيل المنفذ 9222 بترخيص MCP)، أو الاستمرار بـ **Playwright** (المعتمد حالياً في المشروع). |
| 7 | **Memory** | لا يوجد إصلاح معروف محلياً — أعد محاولة القراءة بعد إعادة تشغيل opencode؛ إن استمر الخطأ راجع تكوين الخادم. |
| 8 | **GitHub** | يعمل حالياً — تأكد عند تغيير الـ PAT من تحديث متغير البيئة `GITHUB_PERSONAL_ACCESS_TOKEN` قبل تشغيل opencode (و`$env:GITHUB_TOKEN` لأوامر `gh`). |

### ملاحظات تشغيلية
- **لا تظهر أي قيم سرية** في هذا التقرير (لا PAT ولا مفاتيح Render/TestSprite).
- **🔒 تخزين المفاتيح (مُحدَّث)**: لم تعد القيم الحرفية في `opencode.json` — نُقلت إلى متغيرات بيئة على مستوى المستخدم (`HKCU\Environment`): `RENDER_API_KEY` و`TESTSPRITE_API_KEY`، ويقرأها الإعداد عبر `{env:...}`. هذا يسمح بمشاركة ملف الإعداد بأمان دون تسريب المفاتيح.
- توقيتات المهلة الحالية: local = 10–30 ثانية، remote = 10–30 ثانية — مناسبة.
- التراجع عن تغيير `mcp` SDK إن لزم: `pip install mcp==2.0.0` (لكن هذا سيكسر خادم git مجدداً — يُفضل إبقاء 1.29.0 ما دام `mcp-server-git` قيد الاستخدام).
