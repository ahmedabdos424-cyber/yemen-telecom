# UI/UX Improvements

**Date:** 2026-06-10

---

## Current UI State

### Strengths ✅
- Full RTL support (Arabic-first)
- Dark mode with CSS variables
- Responsive mobile-first layouts (Tailwind)
- Lazy-loaded views
- Loading skeletons
- Confirm dialogs for destructive actions
- Progress indicators for OCR and submissions

### Areas for Improvement

## 1. Accessibility (a11y)

### Current Issues
- No `aria-*` attributes on interactive elements
- No `tabIndex` management for keyboard navigation
- Some text uses `text-[10px]` which may be too small
- No focus indicators on custom buttons
- No screen reader announcements for dynamic content

### Applied Improvements

None — these require UI changes which are out of scope for this phase.

### Documented Recommendations

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Missing aria-labels | MEDIUM | Add `aria-label` on icon buttons (Camera, ⋮ menu, X close) |
| Small font sizes | LOW | Increase `text-[9px]` and `text-[10px]` to minimum `text-[11px]` |
| Keyboard navigation | LOW | Add `tabIndex` to modal content, focus trap in modals |
| Focus indicators | LOW | Ensure all interactive elements have visible `:focus-visible` styles |
| Screen reader | LOW | Add `role="status"` and `aria-live="polite"` for progress updates |

## 2. Empty State Improvements

### Current Behavior
Empty lists show nothing or a blank area.

### Recommendations
Add empty state components for:
```tsx
// Pattern for empty states
<div className="flex flex-col items-center justify-center py-12 text-slate-500">
  <Inbox size={48} className="mb-3 opacity-50" />
  <p className="text-sm font-medium">لا توجد بيانات</p>
  <p className="text-xs mt-1">لم يتم إضافة أي عناصر بعد</p>
</div>
```

Affected views:
- `SellerListView` — empty seller list
- `SIMsView` — empty SIM list
- `AlertsView` — empty alerts list
- `AgentsView` — empty agents list

## 3. Toast Notifications

### Current Behavior
Uses `alert()` for success/error messages.

### Recommendation
Replace `alert()` with a toast notification system using `motion` (already in deps):

```tsx
// Toast component pattern
const Toast = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl text-sm font-bold shadow-2xl ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}
  >
    {message}
  </motion.div>
);
```

Files using `alert()`:
| File | Line | Message |
|------|------|---------|
| `AgentDashboard.tsx` | 111, 133-136, 152 | Various success/error messages |
| `SellerListView.tsx` | Various | Delete/disable confirmations |
| `ActivateSimForm.tsx` | Various | OCR/save status |
| `AddSellerForm.tsx` | Various | Creation status |
| `SellerDashboard.tsx` | Various | Operations status |

## 4. RTL Consistency

### Current Issues
- `left: 0.625rem` in CSS (`.input-camera-btn`) — ✅ Fixed to `inset-inline-start`
- Search icon at `right-3` in RTL inputs — acceptable for RTL convention
- All pages use `dir="rtl"` — ✅ Consistent

## 5. Dark Mode Consistency

### Current Issues
- Most components use CSS variable-based slate colors — ✅
- A few hardcoded colors remain in `SellerAccount.tsx` (line 373: `bg-[#b90e1a]`) — LOW priority

## Summary

| Area | Status | Priority |
|------|--------|----------|
| RTL support | ✅ PASS | — |
| Dark mode | ✅ PASS (minor exceptions) | LOW |
| Empty states | ⚠️ Missing | MEDIUM |
| Toast notifications | ⚠️ `alert()` used | MEDIUM |
| Accessibility | ⚠️ Missing aria | MEDIUM |
| Keyboard navigation | ⚠️ Missing | LOW |
| Small fonts | ⚠️ Below 11px | LOW |
