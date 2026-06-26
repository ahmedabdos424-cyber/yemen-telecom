# TYPESCRIPT AUDIT

**Audit date:** 2026-06-21  
**Scope:** `src/`, `server/src/`, tsconfig files — source only.

---

## 1. Configuration Posture

| File | strict | noEmit | include/exclude |
|------|--------|--------|-----------------|
| `tsconfig.json` (frontend) | **false** (default) | true | `src` only; **excludes `src/__tests__`** |
| `server/tsconfig.json` | **true** | false | excludes tests, seed |
| Lint script | `tsc --noEmit` | frontend non-strict only | |

**Impact:** Frontend has weak compile-time safety. Tests not typechecked by root tsc.

---

## 2. `any` Usage Inventory

### Frontend (~90 occurrences, 18 files)

| File | Count | Pattern |
|------|-------|---------|
| `api/client.ts` | 36 | `request<any>`, `request<any[]>`, `(data: any)` on CRUD |
| `GeographicRiskView.tsx` | 32 | D3 drag/simulation, `(window as any)` |
| `SimManagementView.tsx` | 8 | `(sim.status as any)` for non-enum statuses |
| `SellerSimsView.tsx` | 7 | Status casts |
| `useManagerState.ts` | 3 | `useState<any>({})`, `(identities: any[])` |
| `AdminMoreDrawer.tsx` | 4 | `(log: any)` |
| 8+ components | 1 each | `catch (err: any)` |

### Backend (~17 occurrences, 10 files)

| File | Usage |
|------|-------|
| `db.ts` | `params?: any[]`, pool config cast |
| `helpers.ts` | `params: any[]`, query param casts |
| `index.ts` | `(app as any)._router`, stats cache `any` |
| Route mappers | `mapSeller(row: any)`, `paginatedQuery<any>` |
| `auth.ts`, routes | `catch (err: any)` |

---

## 3. Unsafe Casts

| Location | Cast | Risk |
|----------|------|------|
| `useAuth.ts:7,77` | `localStorage.getItem('tele_role') as Role` | Invalid role strings pass silently |
| `useAuth.ts:46` | No cast on getMe role comparison | OK |
| `api/client.ts:12` | Capacitor window cast | Acceptable |
| `tokenStorage.ts:35` | `@ts-ignore` on dynamic import | Suppresses module resolution errors |
| `server/index.ts:105-106` | CSRF headers `as string` | Guarded by falsy check |
| `server/helpers.ts:5-6` | `req.query.page as string` | NaN possible in pagination |
| `server/routes/customers.ts:26` | `req.query.q as string` | Undefined query cast |
| `SimManagementView.tsx` | `'allocated' as any` | Masks enum mismatch with DB |

---

## 4. Type Mismatches: Frontend ↔ API ↔ DB

### SIM types

| Field | `types.ts` | API/DB | Gap |
|-------|------------|--------|-----|
| `id` | `string` | `number` (SERIAL) | Split — client uses number in updateSim |
| `dateAdded` | camelCase | `date_added` | No mapper on sims route |
| `packageType` | camelCase | `package_type` | Create may drop field |
| `status` | 5 enum values | UI uses `allocated`, `damaged` | Requires `as any` |

### Agent types

| Field | `types.ts` | API response |
|-------|------------|--------------|
| `sellersCount` | camelCase | `sellers_count` raw row |
| `simsCount` | camelCase | `sims_count` raw row |

### Seller types
- `mapSeller()` on server camelCases response — **best aligned** entity

### Missing frontend types
- `Customer` — no interface in `types.ts`
- `DistributionRequest` — no interface
- `StatsResponse` — dashboard untyped
- `DuplicateIdentity` — consumed as `any[]`

### Auth types
- `ApiLoginResponse.user.role: string` — cast to `Role` without runtime validation (zod/io-ts would help)

---

## 5. API Client Typing

**Typed (good):**
- `ApiLoginResponse`, `ApiMeResponse`, `ApiBackupResponse`, `ApiLockdownResponse`, `ApiResetPasswordResponse`

**Untyped (`any`):**
~30 methods: getSims, createSim, updateSim, getAgents, createAgent, getSellers, createSeller, getOperations, createOperation, getInventories, updateInventory, getAlerts, resolveAlert, getSettings, updateSettings, getCustomers, createCustomer, getDistributions, createDistribution, approveDistribution, getReports*, uploadFile, getStats, etc.

---

## 6. Generics & Interfaces

### Well-typed areas
- `server/src/validation.ts` — Zod infers input types
- `server/src/middleware/auth.ts` — `AuthRequest`, `TokenPayload` interfaces
- `src/types.ts` — Core domain interfaces (SIM, Agent, Seller, Operation, etc.)

### Weak areas
- No shared package between frontend/backend DTOs
- No OpenAPI/generated types
- Hooks store `any[]` from API as typed arrays — **false confidence**

---

## 7. Test Type Safety

- `src/__tests__/**` excluded from frontend tsconfig
- OCR tests duplicate functions instead of importing from `useOcr.ts` — **drift risk without type checking connection**
- Server tests import validation schemas directly ✓

---

## 8. Recommendations

| Priority | Action |
|----------|--------|
| P1 | Type `api/client.ts` methods with shared interfaces |
| P1 | Add DB→API mappers for sims and agents (like sellers) |
| P1 | Extend `SimStatus` or normalize statuses server-side |
| P2 | Enable `strict: true` on frontend incrementally |
| P2 | Include tests in typecheck or separate strict tsconfig |
| P2 | Add runtime role validation (zod) on login response |
| P3 | Replace `@ts-ignore` with typed dynamic import |
| P3 | Replace `catch (err: any)` with `unknown` + narrowing |

---

## 9. Metrics

| Metric | Value |
|--------|-------|
| Frontend `any` occurrences | ~90 |
| Backend `any` occurrences | ~17 |
| Frontend `as any` casts | ~33 |
| Files with `catch (err: any)` | 17 |
| API methods returning typed response | ~5 of ~35 |
| Frontend strict mode | Off |
| Backend strict mode | On |

**TypeScript maturity score:** 45/100

---

*End of TYPESCRIPT_AUDIT.md*
