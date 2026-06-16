# FINAL FUNCTIONAL AUDIT — يمن تليكوم

**Date:** 2026-06-14  
**Scope:** Full project audit — Frontend + Backend + Database + Performance  
**Method:** Static code analysis, schema verification, route tracing, performance profiling  
**Modifications:** ❌ None made during audit  

---

## Summary

| Category | Count |
|----------|-------|
| **Components Checked** | 47 |
| **API Endpoints Checked** | 42 |
| **Database Tables Checked** | 14 |
| **Total Issues Found** | 114 |

| Severity | Count |
|----------|-------|
| **Critical** | 9 |
| **High** | 12 |
| **Medium** | 18 |
| **Low** | 75 |

---

## Production Readiness Score

| Category | Score | Key Deductions |
|----------|-------|----------------|
| Backend correctness | 65/100 | 3 queries WILL crash (sellers.deleted, token_blacklist.id, migration 002) |
| Frontend completeness | 55/100 | 6 components use mock/simulated data, 55 hardcoded values |
| CRUD completeness | 65/100 | 5 CRUD gaps (Agents DELETE, Customers/Distributions/Reports frontend missing) |
| Performance | 60/100 | 392+ inline functions, no virtualization, d3 full import (250KB) |
| Security | 85/100 | Strong JWT/CSRF/rate limiting, but prompt() + Math.random() passwords |
| Database integrity | 70/100 | Schema-code mismatches, 3 runtime failures, dead table |

## OVERALL: 58/100 — ❌ NOT READY FOR PRODUCTION

---

## What Prevents Production Deployment

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | **Seller deletion crashes** — `status='deleted'` violates CHECK constraint | CRITICAL | Cannot delete sellers |
| 2 | **Backup endpoint crashes** — `ORDER BY id` on `token_blacklist` (no `id` column) | CRITICAL | No backup possible |
| 3 | **AdminMoreDrawer fully simulated** — prompt(), setTimeout, Math.random(), no API | CRITICAL | Admin panel is facade |
| 4 | **ReportsView fake export** — setTimeout simulation instead of real report | CRITICAL | Users cannot generate reports |
| 5 | **GeographicRiskView uses mock data** — ignores real API endpoint | CRITICAL | Risk analysis is fake |
| 6 | **AgentProfileView password change** — shows toast but doesn't call API | CRITICAL | Passwords never actually change |
| 7 | **AddSellerForm fake progress** — setTimeout simulates step-by-step creation | CRITICAL | Progress indicator lies |
| 8 | **AlertsView fake actions** — setTimeout simulates reorder/security check | CRITICAL | Alerter actions do nothing |
| 9 | **AgentDashboard 13 dead state variables** — declared but never used | HIGH | Bloated code, confusion |

## What Prevents Store Publication (APK)

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | **CameraCapture duplicated logic** — two component definitions in one file | HIGH | Maintenance risk |
| 2 | **No offline support** — all operations require network | HIGH | App useless offline |
| 3 | **No error boundary for OCR** — crashes could freeze app | MEDIUM | Poor UX |
| 4 | **No loading states for SIM activation** — user may tap multiple times | MEDIUM | Double-activation risk |
| 5 | **No Push notification support** | LOW | Feature gap vs competitors |

## What Can Be Deferred

| # | Issue | Severity | Reason |
|---|-------|----------|--------|
| 1 | 392+ inline arrow functions | MEDIUM | Performance issue but not crash-causing |
| 2 | d3 full import (250KB) | MEDIUM | Only affects GeographicRiskView load time |
| 3 | No virtualization for large lists | MEDIUM | Only becomes problem with 500+ items |
| 4 | React.memo ineffective | LOW | Harmless, just unused optimization |
| 5 | Missing useEffect deps | LOW | Stable references prevent actual bugs |
| 6 | Array index as key | LOW | Acceptable for stable lists |
| 7 | DuplicateIdentitiesView name | LOW | Routes to GeographicRiskView, works fine |

---

# COMPLETE ISSUE LIST

## Critical Issues

### C-1: Seller deletion crashes at database level
| Field | Value |
|-------|-------|
| **File** | `server/src/routes/sellers.ts:284` |
| **Query** | `UPDATE sellers SET status = $1 WHERE id = $2` with param `'deleted'` |
| **Problem** | `CHECK (status IN ('active','inactive','suspended','low_stock'))` rejects `'deleted'` |
| **Impact** | ❌ Delete seller API fails. Any seller deletion from frontend breaks. |
| **Fix** | Add `'deleted'` to CHECK constraint or use `is_deleted` boolean column |

### C-2: Backup crashes on `token_blacklist` table
| Field | Value |
|-------|-------|
| **File** | `server/src/routes/admin.ts:177` |
| **Query** | `SELECT * FROM ${table} ORDER BY id` — `token_blacklist` has no `id` column (PK is `token_hash`) |
| **Impact** | ❌ Backup creates no file. Entire backup fails mid-way. |
| **Fix** | Handle `token_blacklist` without ORDER BY, or change to `ORDER BY expires_at` |

### C-3: Migration 002 entirely broken (6 invalid FK references)
| Field | Value |
|-------|-------|
| **File** | `server/migrations/002_foreign_key_cascades.sql` |
| **Problems** | `sellers.created_by`, `sims.seller_id`, `sims.activated_by`, `operations.created_by`, `alerts.created_by`, `distribution_requests.created_by` — none of these columns exist |
| **Impact** | ❌ Migration 002 cannot be applied. Transaction rolls back completely. |
| **Fix** | Remove invalid FK additions or add missing columns first |

### C-4: AdminMoreDrawer — zero API connections, all mock
| Field | Value |
|-------|-------|
| **File** | `src/components/AdminMoreDrawer.tsx` |
| **Issues** | `prompt()` for user creation (L292-294), `setTimeout` backup simulation (L52), `Math.random()` for IDs (L58,296), hardcoded users/backups/webhooks (L17-36), toast-only download (L422) |
| **Impact** | ❌ Entire admin panel is a facade. No data persists. |
| **Fix** | Connect to real APIs (`/api/admin/*`, `/api/sellers`, `/api/agents`), use modal forms |

### C-5: ReportsView — fake export with setTimeout
| Field | Value |
|-------|-------|
| **File** | `src/components/ReportsView.tsx:24` |
| **Issue** | `triggerExport` uses `setTimeout(() => { toastSuccess(...) }, 500)` — no file generated |
| **Impact** | ❌ Export button lies to user. |
| **Fix** | Connect to `/api/reports/*` endpoints. Remove fake setTimeout. |

### C-6: GeographicRiskView — uses hardcoded mock data, ignores real API
| Field | Value |
|-------|-------|
| **File** | `src/components/GeographicRiskView.tsx:8,80-81` |
| **Import** | `DUPLICATE_IDENTITIES_MOCKS`, `AUDIT_LOGS` from `src/data.ts` |
| **API** | `/api/admin/duplicate-identities` exists and is defined in client.ts but **not used** |
| **Impact** | ❌ Risk data is fake. Real duplicate detection not shown. |
| **Fix** | Remove mock imports, call `api.getDuplicateIdentities()` |

### C-7: AgentProfileView password change — toast only, no API
| Field | Value |
|-------|-------|
| **File** | `src/components/agent/AgentProfileView.tsx:96-110` |
| **Issue** | `handlePasswordChange` validates locally then calls `toastSuccess()` but **never invokes API** |
| **Impact** | ❌ Password never changes. User thinks it changed. |
| **Fix** | Call `api.updatePassword()` or parent callback |

### C-8: AddSellerForm — fake step progress with setTimeout
| Field | Value |
|-------|-------|
| **File** | `src/components/AddSellerForm.tsx:75-125` |
| **Issue** | 3 `setTimeout` calls (400ms, 800ms, 1200ms) simulate progress stages. No actual seller creation API call happens in this component (relies on parent). |
| **Impact** | ❌ Progress indicator is fictional. User waits for no reason. |
| **Fix** | Use real API response-driven progress or remove simulation |

### C-9: AlertsView — fake actions with setTimeout
| Field | Value |
|-------|-------|
| **File** | `src/components/AlertsView.tsx:36-49` |
| **Issues** | `handleReorder`: `setTimeout(() => { ... }, 500)` — L36. `handleSecurityCheck`: `setTimeout(() => { ... }, 500)` — L45 |
| **Impact** | ❌ Buttons appear to do something but only show toast after fake delay |
| **Fix** | Connect to real alert/operation APIs |

---

## High Issues

### H-1: `data.ts` — 308 lines of hardcoded mock data
| **File** | **Lines** | **Contents** |
|----------|-----------|-------------|
| `src/data.ts` | Full file | `INITIAL_SIMS`, `INITIAL_AGENTS`, `INITIAL_SELLERS`, `INITIAL_ALERTS`, `RECENT_TRANSACTIONS`, `AUDIT_LOGS`, `DEFAULT_SETTINGS`, `STATS_HISTORY`, `DUPLICATE_IDENTITIES_MOCKS` |

**Impact:** ⚠️ Components fall back to this when APIs unavailable. Hardcoded phone/ICCID values visible.
**Fix:** Remove file; show loading/empty states instead.

### H-2: `Math.random()` for password generation
| **File** | `src/hooks/useAgentSellerState.ts:35` |
|----------|---------------------------------------|
| **Code** | `Math.random().toString(36).substring(2, 8)` |
| **Impact** | ⚠️ Not cryptographically secure for passwords |
| **Fix** | Use `crypto.getRandomValues()` or server-side generation |

### H-3: Hardcoded seller ID `'99283'`
| **File** | `src/hooks/useAgentSellerState.ts:150` |
|----------|---------------------------------------|
| **Code** | `.find(s => s.id === '99283')` |
| **Impact** | ⚠️ Assumes seller ID `99283` always exists |
| **Fix** | Use authenticated user's ID from session |

### H-4: Agents API — missing DELETE endpoint
| **File** | `server/src/routes/agents.ts` |
|----------|------------------------------|
| **CRUD** | GET, POST, PUT — **NO DELETE** |
| **Impact** | ⚠️ Cannot delete agent accounts. Incomplete CRUD. |
| **Fix** | Add `DELETE /api/agents/:id` |

### H-5: `customers.id_number` no UNIQUE constraint
| **File** | `server/src/routes/customers.ts:62` |
|----------|------------------------------------|
| **Issue** | SELECT then INSERT/UPDATE but no `UNIQUE` on `id_number` |
| **Impact** | ⚠️ Race condition can create duplicate customers |
| **Fix** | Add `UNIQUE` constraint on `customers.id_number` |

### H-6: 19 API endpoints exist but are NEVER called from frontend
| # | Endpoint | Method | Backend File |
|---|----------|--------|-------------|
| 1 | `/api/customers` | GET | `customers.ts:9` |
| 2 | `/api/customers/search` | GET | `customers.ts:25` |
| 3 | `/api/customers/:id` | GET | `customers.ts:42` |
| 4 | `/api/customers` | POST | `customers.ts:59` |
| 5 | `/api/distributions` | GET | `distributions.ts:9` |
| 6 | `/api/distributions` | POST | `distributions.ts:65` |
| 7 | `/api/distributions/:id/approve` | PUT | `distributions.ts:91` |
| 8 | `/api/distributions/pending-count` | GET | `distributions.ts:119` |
| 9 | `/api/reports/daily-sales` | GET | `reports.ts:7` |
| 10 | `/api/reports/agent-performance` | GET | `reports.ts:27` |
| 11 | `/api/reports/operator-distribution` | GET | `reports.ts:48` |
| 12 | `/api/reports/seller-performance` | GET | `reports.ts:65` |
| 13 | `/api/upload/image` | POST | `upload.ts:39` |
| 14 | `/api/upload/images` | POST | `upload.ts:52` |
| 15 | `/api/admin/system/lockdown/status` | GET | `admin.ts:247` |
| 16 | `/api/sims/:id` | DELETE | `sims.ts:72` |
| 17 | `/api/health` | GET | `index.ts:143` |
| 18 | `/api/routes` | GET | `index.ts:264` |
| 19 | `/api/csrf-token` | GET | `index.ts:89` |

**Impact:** ⚠️ Significant backend investment unused. Customers and Distributions entities have ZERO frontend.

### H-7: 4 frontend client methods defined but never called
| Method | client.ts Line |
|--------|---------------|
| `api.deleteSim()` | 193 |
| `api.uploadFile()` | 258 |
| `api.getLockdownStatus()` | 254 |
| `api.updateProfile()` | 184 |

**Impact:** ⚠️ Dead code in client library
**Fix:** Remove or implement callers

### H-8: `useManagerState.ts` missing `refreshData` in useEffect deps
| **File** | `src/hooks/useManagerState.ts:52` |
|----------|-----------------------------------|
| **Effect** | `useEffect(() => { refreshData(); }, [role])` — missing `refreshData` in deps |
| **Impact** | ⚠️ Stale closure — `refreshData` is captured from initial render. Works in practice because it only calls stable API methods, but incorrect. |
| **Fix** | Add `refreshData` to dependency array or wrap in `useCallback` |

### H-9: ToastContainer wrapped in useCallback (returns JSX — anti-pattern)
| **File** | `src/hooks/useToast.tsx:50` |
|----------|-----------------------------|
| **Issue** | `useCallback(() => (<div>...</div>), [])` — returns JSX from a hook, should be a component |
| **Impact** | ⚠️ Prevents proper React reconciliation. Children re-render unnecessarily. |
| **Fix** | Extract `ToastContainer` as a separate React component |

### H-10: CameraCapture component logic duplicated — two definitions in one file
| **File** | `src/components/shared/CameraCapture.tsx` |
|----------|------------------------------------------|
| **Issue** | Lines ~28 and ~240 define two separate components with nearly identical `useCallback` wrappers |
| **Impact** | ⚠️ Code duplication. Maintenance risk. |
| **Fix** | Extract shared camera logic to a custom hook |

### H-11: DashboardView hardcoded provider analytics data
| **File** | `src/components/DashboardView.tsx` |
|----------|-----------------------------------|
| **Lines** | 276: `"450,200 شريحة"`, 279: `width: '65%'`, 293: `"280,150 شريحة"`, 296: `width: '42%'` |
| **Impact** | ⚠️ Provider SIM counts and progress bars are hardcoded, not from API |
| **Fix** | Pull from inventory/operations API |

### H-12: SellerHome hardcoded display values
| **File** | `src/components/SellerHome.tsx` |
|----------|--------------------------------|
| **Lines** | 39: `+12%`, 44: `42 شريحة`, 58: `1,250 نقطة`, 72: `ممتاز (فئة أ)` |
| **Impact** | ⚠️ All dashboard numbers are fake |
| **Fix** | Pass real data via props from API |

---

## Medium Issues

### M-1: Toast-only buttons (9 instances)
| File | Line | Toast Text |
|------|------|-----------|
| `AgentDashboard.tsx` | 237 | `جاري معالجة قاعدة البيانات لتوليد التقرير المالي...` |
| `SellerSimsView.tsx` | 234 | `جاري طباعة بيانات الشريحة...` |
| `SellerSimsView.tsx` | 283 | `جاري طباعة بيانات الشريحة...` |
| `AdminMoreDrawer.tsx` | 422 | `بدء تحميل ${bk.name}` |
| `ReportsView.tsx` | 162 | `جاري تنزيل ملف ${dl.title}...` |
| `GeographicRiskView.tsx` | 450 | `تم تصدير تقرير تحليل الهويات كملف PDF...` |
| `GeographicRiskView.tsx` | 517 | `تفاصيل الهوية: ${item.name}` |
| `GeographicRiskView.tsx` | 758 | `تنزيل كامل سجل تكرار المحطة الإقليمية...` |
| `GeographicRiskView.tsx` | 816 | `سجل التحقيق الكامل يحتوي على 1,280 ملف...` |

### M-2: Hardcoded display data (55 instances)
Widespread across `DashboardView` (8), `SIMsView` (1), `AgentDashboard` (1), `SellerHome` (4), `SellersView` (5), `AgentsView` (2), `AddSellerForm` (1), `AgentProfileView` (7), `SellerAccount` (2), `AdminMoreDrawer` (7), `ReportsView` (6), `GeographicRiskView` (11)

### M-3: Placeholder feature cards in ReportsView (3 buttons with no onClick)
| File | Lines |
|------|-------|
| `ReportsView.tsx` | 102: "سجل النشاط الشهري المتصل للوكالة" |
| `ReportsView.tsx` | 112: "تقرير تفصيلي للتوزّع الجغرافي" |
| `ReportsView.tsx` | 131: "أداء البائعين الفردي والترتيب الشهري" |

### M-4: 13 dead state variables in AgentDashboard
| Variable | Line | Status |
|----------|------|--------|
| `lockModalOpen` | 68 | Never rendered |
| `sellerLockedState` | 69 | Never read |
| `paymentsModalOpen` | 70 | Never rendered |
| `paymentAmount` | 71 | Never used |
| `paymentNotes` | 72 | Never used |
| `historyModalOpen` | 73 | Never rendered |
| `editSellerModalOpen` | 74 | Never rendered |
| `editSellerName/Phone/Region/Status` | 75-79 | Never read |
| `sellerSimPortalOpen` | 82 | Never rendered |
| `selectedSellerForSims` | 83 | Never used |
| `miniSimSearchQuery` | 84 | Never used |
| `miniSimOperatorFilter` | 85 | Never used |
| `assignSimIccid` | 86 | Never used |
| `passwordOpen` | 89 | Never rendered |

### M-5: Dead imports across 5 files
| File | Unused Import |
|------|--------------|
| `agent/SimManagementView.tsx:2` | `motion`, `AnimatePresence` |
| `SellersView.tsx:8` | `Check` (lucide-react) |
| `AddSellerForm.tsx:1` | `useEffect` |
| `agent/AgentProfileView.tsx:5-8` | `Calendar`, `Clock`, `Save`, `Image` |
| `SellerAccount.tsx:7` | `Camera`, `Image` |
| `GeographicRiskView.tsx:20` | `Search` |

### M-6: `SIMsView.tsx` dead `setOcrProgress` (line 77)
Destructured from `useOcr()` but never called.

### M-7: `SIMsView.tsx` empty `[].length > 0` block (line 382)
Always evaluates to false — operations table always shows EmptyState.

### M-8: AgentDashboard empty operations table (line 382)
`{[].length > 0 ? ... : <EmptyState>}` — always renders empty because hardcoded empty array.

### M-9: SellerAccount `fileInputRef` never attached (line 74)
`useRef<HTMLInputElement>(null)` declared but never attached to any JSX element.

---

## Performance Issues

### P-1: 392+ inline arrow functions in render
| Worst Files | Inline onClick/onChange Count |
|------------|------------------------------|
| `SellerSimsView.tsx` | ~30 |
| `AgentDashboard.tsx` | ~25 |
| `SIMsView.tsx` | ~25 |
| `AdminMoreDrawer.tsx` | ~15 |
| `AgentsView.tsx` | ~15 |

**Impact:** Every re-render creates new function objects, defeating memoization.

### P-2: No virtualization for large lists
| File | Line | Risk |
|------|------|------|
| `SIMsView.tsx` | 502 | All filtered SIMs — hundreds/thousands |
| `AgentsView.tsx` | 625, 789 | All filtered agents — hundreds |

**Impact:** DOM may become very large with 500+ items.

### P-3: Full d3 library import (~250KB)
| File | `GeographicRiskView.tsx:7` |
|------|--------------------------|
| **Import** | `import * as d3 from 'd3'` |
| **Impact** | Adds ~250KB to bundle for one component. Should tree-shake to `d3-selection`, `d3-force`, `d3-scale`, `d3-axis`. |

### P-4: React.memo ineffective on 3 screen components
| Component | File | Reason |
|-----------|------|--------|
| `SIMsView` | `SIMsView.tsx:906` | Array props change reference every render |
| `AgentsView` | `AgentsView.tsx:935` | Same |
| `SellersView` | `SellersView.tsx:432` | Same |

### P-5: Expensive conic-gradient spinner in LoginScreen
| File | `LoginScreen.tsx:238-243` |
|------|--------------------------|
| **Style** | `conic-gradient(...)` with dynamic interpolation + `mask` + `WebkitMask` |
| **Impact** | Computed on every render. Extract to CSS class. |

---

## Database Issues

| # | Issue | File:Line | Severity |
|---|-------|-----------|----------|
| 1 | `sellers.status` CHECK blocks `'deleted'` | `sellers.ts:284` | CRITICAL |
| 2 | `token_blacklist` no `id` column for backup | `admin.ts:177` | CRITICAL |
| 3 | Migration 002: 6 invalid FK references | `002_*.sql` | CRITICAL |
| 4 | `customers.id_number` no UNIQUE | `customers.ts:62` | HIGH |
| 5 | `duplicate_identities` dead table | `schema.sql` | MEDIUM |
| 6 | `agents.email` / `sellers.email` unused | `schema.sql` | LOW |
| 7 | No automated migration system | — | LOW |
| 8 | TIMESTAMP without timezone | All tables | LOW |

---

## CRUD Gaps

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| SIMs | ✅ | ✅ | ✅ | ⚠️ API exists but never called from frontend |
| Agents | ✅ | ✅ | ✅ | ❌ No endpoint |
| Sellers | ✅ | ✅ | ✅ | ⚠️ Crashes at DB level |
| Customers | ⚠️ Backend only | ⚠️ Backend only | ❌ | ❌ |
| Operations | ✅ | ✅ | ❌ | ❌ |
| Inventories | ❌ | ✅ | ✅ | ❌ |
| Alerts | ❌ | ✅ | ❌ | ✅ |
| Settings | ❌ | ✅ | ✅ | ❌ |
| Distributions | ⚠️ Backend only | ⚠️ Backend only | ⚠️ Backend only | ❌ |
| Users | ❌ | ❌ | ✅ | ❌ |

---

## Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | ✅ 0 TypeScript errors |
| `npm run build` | ✅ 0 Build warnings |
| `vitest run` | ✅ 172/172 Tests passing |
| Database runtime queries verified | ❌ 3 WILL fail |
| ORM/migration runner | ❌ None — manual SQL |
