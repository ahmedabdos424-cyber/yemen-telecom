# 🔄 التحديثات اللحظية (Realtime) — WebSocket Gateway

> **المهمة 5** في خارطة الطريق — يغلق فجوة `docs/gaps/project-gaps.md`:
> *"No real-time updates — SIM status changes, inventory changes require manual refresh"*

---

## 1. البروتوكول

| البند | القيمة |
|-------|--------|
| المسار | `/ws` (أي مسار آخر يُدمَّر الاتصال فوراً) |
| نقطة الإنتاج | `wss://yemen-telecom.onrender.com/ws` |
| التطوير | `ws://<dev-host>/ws` — عبر بروكسي Vite (`vite.config.ts` → `/ws`) |
| أول رسالة إلزامية | `{ "type": "auth", "token": "<JWT>" }` — الـ token في الرسالة، **ليس** في URL |
| مهلة المصادقة | 10 ثوانٍ → إغلاق `4002 auth_timeout` |
| الرفض | `4001` + رسالة `auth_error` (توقّف فورياً) |
| النجاح | رسالة `{ "type": "auth_ok" }` |
| Heartbeat | ping من الخادم كل 30 ثانية؛ pong مطلوب وإلا يُقتل الاتصال |
| الحجم الأقصى | 8192 بايت لكل رسالة |
| بعد المصادقة | أي رسائل أخرى تُتجاهل بصمت |

## 2. الأحداث المذاعة

التنسيق: `{ "type": string, "at": ISO-8601, ...حقول إضافية }`
(حقل `at` يُملأ تلقائياً من الخادم عند البث إن لم يُمرَّر)

| الحدث | المحتوى | المستلمون | الموقع |
|-------|---------|-----------|--------|
| `sim.created` | `id, iccid, phone, operator, status` | الكل | `routes/sims.ts` (POST) |
| `sim.updated` | `id, iccid, status, action` | الكل | `routes/sims.ts` (PATCH/تفعيل) |
| `sim.batch_updated` | `request_id, agent_id, operator, count, status` | الكل | `routes/sims.ts` (تحويل دفعة) |
| `sim.deleted` | `id` | الكل | `routes/sims.ts` (DELETE) |
| `seller.created` | `id, name, agent_id` | الكل | `routes/sellers.ts` (POST) |
| `seller.updated` | `id, status, action` | الكل | `routes/sellers.ts` (PATCH الحالة/الرصيد) |
| `seller.deleted` | `id` | الكل | `routes/sellers.ts` (DELETE) |
| `distribution.created` | `id, request_id, agent_id, operator, count, status` | **المديرون فقط** | `routes/distributions.ts` (POST) |
| `distribution.updated` | `id, status, action` | الكل | `routes/distributions.ts` (الموافقة/الرفض) |
| `inventory.updated` | `action, operators` | الكل | `routes/inventories.ts` (PUT) |
| `alert.created` | `id, severity, message, ...` | الكل | `services/alerts.service.ts` (createAlert) |

## 3. عميل الواجهة (`src/services/realtime.ts`)

- الاتصال التلقائي عند تسجيل الدخول (بعد معرفة الدور) من `src/App.tsx`.
- **إعادة اتصال** بفاصل مضاعف 2 ثانية → 30 ثانية كحد أقصى.
- عند `auth_error` يتوقف نهائياً (لا يعيد المحاولة) — تسليم الجلسة لتدفق انتهاء الصلاحية المعتاد.
- الأحداث تُوزَّع على التطبيق عبر CustomEvent:
  - `tele:realtime-event` — بيانات الحدث الخام
  - `tele:realtime-status` — حالة الاتصال (`connected` / `reconnecting` / `closed`)
- على استقبال الأحداث يحدّث `App.tsx` بيانات المدير (`refreshData`) أو الوكيل/البائع (`refreshRoleData`)، ويعرض إشعاراً فورياً للتنبيهات (`alert.created`).
- الـ token يُحتفظ به في الذاكرة فقط — لا يُوضع في URL ولا يُسجَّل.

## 4. المعمارية (الخادم — `server/src/services/realtime.service.ts`)

- `createRealtimeGateway(server, deps)` — نمط **factory**: بوابة معزولة على خادم HTTP موجود (وضع `noServer`). الاختبارات تنشئ مثيلات مستقلة بحقن `resolveUser` مزيّف.
- `attachRealtimeServer(server)` — يُستدعى مرة في `server/src/index.ts` بعد `app.listen`، يحفظ البوابة النشطة.
- أدوات بث عامة: `broadcastEvent`, `broadcastToRoles`, `broadcastToUserIds`, `realtimeStats`.
- المصادقة موحّدة مع Express عبر `resolveTokenUser` في `server/src/middleware/auth.ts` (JWT + قائمة حظر + جلسة نشطة + مستخدمي DEMO).

## 5. المراقبة

- `GET /api/cache-stats` (غير الإنتاج): يتضمن `realtime: { total, authenticated }`.
- `GET /api/admin/monitoring` (مدير): يتضمن `realtime: { total, authenticated }`.

## 6. الاختبارات

- `server/src/__tests__/realtime.service.test.ts` — 8 حالات: مهلة مصادقة 4002، رفض 4001 (رسالة غير auth / token باطل)، نجاح المصادقة، بث شامل، فلترة الدور، فلترة المستخدم، تجاهل الرسائل بعد المصادقة.
- `src/__tests__/realtime.test.ts` — 6 حالات: عميل الواجهة (auth أول رسالة، فك التشفير، إعادة الاتصال، التوقف عند auth_error).
- ملاحظة: الاختبارات تُشغَّل من جذر المستودع (لا من `server/`).
