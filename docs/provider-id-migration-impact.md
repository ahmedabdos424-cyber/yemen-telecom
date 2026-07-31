# Provider_ID Migration — Impact Report

**تاريخ الفحص:** 2026-07-31
**الحالة:** فحص قراءة فقط — لا تغييرات قاطعة تم تطبيقها
**الهدف:** الإنتاج انتقل من `provider VARCHAR(50)` إلى نمط مرجعي `provider_id INTEGER -> providers(id)`. يوثّق هذا الملف أثر المزامنة على الكود دون تنفيذ التغيير.

---

## 1. الوضع الفعلي في الإنتاج (فُحص مباشرة)

| الجدول | الصفوف | provider_id مكتمل | provider نصي | ملاحظة |
|---|---|---|---|---|
| `providers` | 3 | — | — | yemen_mobile(1), sabafon(2), you(3) |
| `sims` | 28 | **13** | 28 | **15 صفاً بلا provider_id** |
| `transactions` | 18 | 18 | 18 | مكتمل |
| `inventories` | 3 | 3 | — | مكتمل |
| `operations` | 6 | **4** | — | **2 صفاً بلا provider_id** |
| `distribution_requests` | 4 | 4 | — | مكتمل |

- المفتاح الأجنبي: `FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL` في الجداول الخمسة.
- الفهارس: `015_add_provider_id_indexes.sql` طُبّق في الإنتاج.
- المصدر: `server/migrations/009_normalize_providers.sql` (منفّذ في الإنتاج في 2026-07-03).
- **خلل ترحيل**: صفوف `sims` (15) و`operations` (2) بقيت بلا `provider_id` — إعادة تشغيل UPDATE الربط مطلوبة عند التبديل.
- **انحراف إضافي**: الإنتاج طبق migrations `011, 014-019` غير الموجودة محلياً؛ `026_identity_risk_actions.sql` موجود محلياً لكنه **غير مسجّل** في `schema_migrations` بالإنتاج (الجداول أُنشئت بمسار آخر).

## 2. أثر الكود — الخادم (`server/src`)

| الملف | السطر | الاستخدام | مطلوب للتغيير |
|---|---|---|---|
| `routes/sims.ts` | 44, 47-49 | INSERT — يكتب `provider` نصي | ✅ كتابة |
| `routes/sims.ts` | 72, 77-78 | UPDATE — يكتب `provider` نصي | ✅ كتابة |
| `validation.ts` | 59, 68 | zod enum صارم `['Yemen Mobile','Sabafon','YOU']` | ✅ تحويل إلى provider_id |
| `routes/reports.ts` | 61-62 | `GROUP BY provider` | ✅ JOIN مع providers |
| `routes/admin.ts` | 88, 91 | قراءة تقارير `provider` | ✅ JOIN |
| `index.ts` | 373-385 | إحصاءات لوحة التحكم `GROUP BY provider` | ✅ JOIN |
| `__tests__/validation.test.ts` | 161-199 | اختبارات enum النصي | ✅ تحديث |

## 3. أثر الكود — الواجهة (`src`)

| الملف | الاستخدام | مطلوب للتغيير |
|---|---|---|
| `types.ts` | 15, 101 — `SimProvider` union + `toOperator()` | ✅ |
| `api/types.ts` | 54, 69, 78, 284 — أنواع API | ✅ |
| `hooks/useAgentSellerState.ts` | 81 — إرسال `provider` نصي عند بيع شريحة | ✅ كتابة |
| `components/SIMsView.tsx` | إضافة/تعديل/استيراد CSV — إرسال `provider` نصي | ✅ كتابة |
| `components/DashboardView.tsx` | عرض إحصاءات بـ `provider` نصي | ✅ قراءة |
| `components/OperatorLogo.tsx` | خريطة شعارات بالنصي | ⚠️ قابلية استمرار (تعيين slug) |

## 4. استراتيجية التبديل الموصى بها

1. **إبقاء التوافق**: `provider_id` قابل للإلغاء (NULL) والعمود النصي ما زال موجوداً — لا كسر فوري.
2. **المرحلة 1 (البيانات)**: إعادة تشغيل UPDATE الربط لصفوف `sims` و`operations` الناقصة.
3. **المرحلة 2 (الخادم)**: قراءة JOIN أولاً (reports/admin/index) ثم كتابة (sims.ts) مع التحقق بـ `provider_id` بدل enum النصي.
4. **المرحلة 3 (الواجهة)**: نقل الأنواع والنماذج إلى `provider_id` مع خريطة slug → شعار.
5. **التقدير**: **Moderate** — 3-4 جلسات عمل، لا تغييرات قاطعة فورية مطلوبة، ولا يوجد كسر زمني عاجل.

## 5. المراجع

- الهجرة المنشئة: `server/migrations/009_normalize_providers.sql`
- فهارس provider_id: `server/migrations/015_add_provider_id_indexes.sql` (غير موجودة محلياً)
- الجدول المرجعي في `schema.sql`: قسم `-- Providers (production: telecom operators)`
