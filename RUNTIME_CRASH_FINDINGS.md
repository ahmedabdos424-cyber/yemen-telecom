# RUNTIME CRASH FINDINGS

## CRITICAL — Will Cause TypeError at Runtime

### 1. SellersView.tsx:80 — `sellers[0]` on empty array
**File:** `src/components/SellersView.tsx:80`
**Code:** `const selectedSeller = sellers.find((s) => s.id === selectedSellerId) || sellers[0];`
**Crash:** If `sellers` is an empty array, `sellers[0]` returns `undefined`. All subsequent lines use `selectedSeller.name`, `selectedSeller.id`, `selectedSeller.region`, `selectedSeller.status`, `selectedSeller.sales30Days`, `selectedSeller.salesGrowth`, `selectedSeller.simsCount`, `selectedSeller.activityRate`, `selectedSeller.phone` — any of these will throw `Cannot read properties of undefined`.
**Fix:** Guard: `|| sellers[0] || { name: '', id: '', region: '', status: 'active', sales30Days: 0, salesGrowth: 0, simsCount: 0, activityRate: 0, phone: '' }`

### 2. SIMsView.tsx:114-116 — Missing optional chaining
**File:** `src/components/SIMsView.tsx:114-116`
**Code:**
```ts
sim.iccid.toLowerCase().includes(token) || 
sim.owner.toLowerCase().includes(token) || 
sim.packageType.toLowerCase().includes(token)
```
**Crash:** If `iccid`, `owner`, or `packageType` is null/undefined in a SIM object, this throws `Cannot read properties of null/undefined`.
**Fix:** Use `sim.iccid?.toLowerCase().includes(token) ||` etc.

### 3. useAgentSellerState.ts:65 — Missing null guard on `simsCount`
**File:** `src/hooks/useAgentSellerState.ts:65`
**Code:** `return { ...s, ... simsCount: s.simsCount + count, ... }`
**Crash:** If `s.simsCount` is undefined (API data may not have this field for sellers), `undefined + number` = `NaN`.
**Fix:** `simsCount: (s.simsCount || 0) + count`

### 4. SellersView.tsx:84 — `sim.owner.includes()` without null guard
**File:** `src/components/SellersView.tsx:84`
**Code:** `(sim) => sim.owner.includes(selectedSeller.name)`
**Crash:** If `sim.owner` is undefined, calling `.includes()` throws TypeError.
**Fix:** `sim.owner?.includes(selectedSeller.name)`

### 5. useManagerState.ts:21 — `null as any` for SystemSettings
**File:** `src/hooks/useManagerState.ts:21`
**Code:** `useState<SystemSettings>(() => loadFromStorage('admin_settings', null as any))`
**Crash:** TypeScript believes `settings` is always `SystemSettings`, but it's `null` until first API load. Any code accessing `settings.someField` without `?.` will crash.
**Status:** Currently safe because line 67 uses `settings?.highRiskDuplicatesThreshold`. But fragile — any new code that accesses `settings.property` directly will crash.

---

## HIGH — State Updates on Unmounted Components

### Pervasive across ALL async hooks:
Every `.then(setState)` pattern calls `setState` after the component may have unmounted. React 19 warns about this.

**Files affected:**
- `src/hooks/useManagerState.ts` — lines 43-49 (every `.then(setXxx)`)
- `src/hooks/useAgentSellerState.ts` — lines 39, 54-61, 73-82, 104-108, 112-114, 122-124, 132-139
- `src/hooks/useOcr.ts` — probable async state updates
- `src/api/index.ts` — client-side interceptors

**Fix pattern:** Use `useRef(false)` mounted flag or AbortController.

**Impact:** Low in practice (React 19 silently ignores most unmounted state updates), but can cause memory leaks with large data.

---

## MEDIUM — Missing Loading/Empty/Error States

### 1. SellersView.tsx — No loading state
If `sellers` is empty AND still loading, renders "لا توجد عهدة شرائح مسجلة" which is misleading. Should distinguish between "loading" and "empty".

### 2. useManagerState.ts — Optimistic updates on API failure
Lines 87-96, 106-115: When `createSim` or `createAgent` fails in the `catch` block, a fake/optimistic entry is added to local state. This means failed API calls silently show data that doesn't exist on the server.

### 3. useAgentSellerState.ts handleAddSellerForAgent — Silent failure
Lines 47-49: If `createSeller` fails, the error is logged but the user sees no feedback (no toast, no error message).

---

## LOW — Edge Cases

### 1. SIMsView.tsx:128 — `text.split()` on null
`highlightMatches` has `if (!text) return ''` guard, so safe.

### 2. SellersView.tsx:95 — `selectedSeller.name` in callback
If `selectedSeller` is undefined, `submitAddBalance` will crash. Cascades from #1.

### 3. Type issues: `null as any` casts
- `useManagerState.ts:21` — discussed above
- Several `e.target.value as any` casts

### 4. useAgentSellerState.ts:150 — `sellers.find(s => s.username === username)` may return undefined
Then `selfSellerData` defaults, so safe.

---

## SUMMARY

| Severity | Count | Key Files |
|----------|-------|-----------|
| CRITICAL | 5 | SellersView.tsx, SIMsView.tsx, useAgentSellerState.ts, useManagerState.ts |
| HIGH | ~15 | All hooks files |
| MEDIUM | 3 | Various views |
| LOW | 4 | Various |
