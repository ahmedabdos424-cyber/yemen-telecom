# Archived Components

**Date:** 2026-06-10  
**Project:** Yemen Telecom  
**Reason:** Reserved for future use — not deleted to preserve reference and backward compatibility.

---

## Archived Files

### 1. `src/services/firebase.ts`

| Field | Value |
|-------|-------|
| **Lines** | 39 |
| **Status** | 🔴 Not imported by any component |
| **Why unused** | Firebase auth and storage services were prepared but never wired into the app. The app uses a custom PostgreSQL + JWT auth system instead. |
| **How to restore** | Import `firebaseAuth` or `firebaseStorage` in any component. Set `VITE_FIREBASE_*` env vars. |

### 2. `src/firebase.ts`

| Field | Value |
|-------|-------|
| **Lines** | 42 |
| **Status** | 🔴 Only imported by the archived `services/firebase.ts` |
| **Why unused** | Firebase initialization module. Firestore import was commented out (was never used). Auth and storage exports are only consumed by the archived service file. |
| **How to restore** | Uncomment Firestore imports when needed. The Firebase app initializer still runs if env vars are present. |

### 3. `src/components/seller/SellerHomeView.tsx`

| Field | Value |
|-------|-------|
| **Lines** | 160 |
| **Status** | 🔴 Not imported by any component |
| **Why unused** | Duplicate of `src/components/SellerHome.tsx` (imported by `SellerDashboard.tsx`). The seller subdirectory version was abandoned during a refactor. |
| **Differences from active** | Uses `setActiveTab` prop instead of `onNavigate`. Accepts unused props (`sellerData`, `onActivateSim`, `darkMode`, `setDarkMode`). |
| **How to restore** | Switch import in `SellerDashboard.tsx` from `SellerHome.tsx` to `SellerHomeView.tsx`. |

### 4. `src/components/seller/SellerSimManagementView.tsx`

| Field | Value |
|-------|-------|
| **Lines** | 581 |
| **Status** | 🔴 Not imported by any component |
| **Why unused** | Duplicate of `src/components/SellerSimsView.tsx` (imported by `SellerDashboard.tsx`). Contains additional `alert()` calls and uses CSS class-based operator colors. |
| **Differences from active** | Has `alert()` on status changes. Uses operator CSS classes (`bg-op-ym-light`, `op-ym`) instead of inline colors. 182 more lines than active version. |
| **How to restore** | Switch import in `SellerDashboard.tsx` from `SellerSimsView.tsx` to `SellerSimManagementView.tsx`. |

---

## Archive Policy

- Archived files are **NOT** deleted
- Archived files are **NOT** imported by any active component
- Archived files are **NOT** included in builds (tree-shaken automatically)
- Archived files are kept for **reference and future use**
- Archived files are clearly marked with `ARCHIVED` banner comments

## Safe to Remove (if needed)

For a true cleanup in the future, these files can be deleted:
1. `src/components/seller/SellerHomeView.tsx`
2. `src/components/seller/SellerSimManagementView.tsx`

These are duplicates and have no unique functionality not present in their active counterparts.
