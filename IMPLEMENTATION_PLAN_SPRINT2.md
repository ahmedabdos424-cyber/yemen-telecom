# Implementation Plan — Sprint 2 (P1 High)

**Project:** Yemen Telecom SIM Management System v1.0.0  
**Date:** 2026-06-30  
**Phase 3 Deliverable — Sprint 2**

---

## Overview

Sprint 2 addresses all 6 remaining P1-High issues. P1-03 (`allowedHosts`) was already resolved as QW-03 in Sprint 1.

| ID | Issue | Severity | Effort | Type | Status |
|---|---|---|---|---|---|
| P1-01 | `skipLibCheck: true` in both tsconfigs | 🟡 P1 | S (2-4h) | Quality | ✅ Complete |
| P1-02 | CSP `'unsafe-inline'` on style-src | 🟡 P1 | M (8-12h) | Security | ✅ Complete |
| P1-04 | 8 VARCHAR columns storing dates as strings | 🟡 P1 | M (8-12h) | Database | ✅ SQL created, ⚠️ NOT applied |
| P1-05 | 9 tables missing `updated_at` | 🟡 P1 | M (4-6h) | Database | ✅ SQL created, ⚠️ NOT applied |
| P1-06 | 4 missing UNIQUE constraints | 🟡 P1 | S (2-3h) | Database | ✅ SQL created, ⚠️ NOT applied |
| P1-07 | Inconsistent provider/operator casing | 🟡 P1 | S (3-5h) | Database | ✅ SQL created, ⚠️ NOT applied |

---

## P1-01: Remove skipLibCheck

### Problem
`skipLibCheck: true` in `tsconfig.json:12`, `server/tsconfig.json:11`, and `--skipLibCheck` CLI flag in `server/package.json:7`. Masks type incompatibilities between @types packages and their libraries.

### Solution
Remove `skipLibCheck: true` from both tsconfigs and the `--skipLibCheck` CLI flag. Fix any type errors that surface.

### Files Modified
| File | Change |
|---|---|
| `tsconfig.json:12` | Remove `skipLibCheck: true`, add `"types": ["node"]` |
| `server/tsconfig.json:11` | Remove `skipLibCheck: true`, add `"types": ["node"]` |
| `server/package.json:7` | Remove `--skipLibCheck` flag |
| `Dockerfile:13` | Remove `--skipLibCheck` flag |

### Verification
- ✅ `npx tsc --noEmit` passes on frontend (0 errors)
- ✅ `cd server && npx tsc --noEmit` passes on server (0 errors)
- ✅ `npx vitest run` passes (293/293)

### Key Detail
Added `"types": ["node"]` to both tsconfigs to prevent TypeScript from auto-including all `@types/*` packages in `node_modules`. This avoids type errors from irrelevant transitive packages (e.g. `@types/request` referencing tough-cookie v5 types incompatible with v6, `@types/d3-*` referencing DOM APIs not available in Node's `lib: ["ES2020"]`).

---

## P1-02: CSP `'unsafe-inline'` Removal

### Problem
`style-src` includes `'unsafe-inline'` in Helmet CSP config. Required by Tailwind v4 inline `<style>` block and motion animation library's programmatic style creation.

### Solution
Nonce-based CSP strategy — disable Helmet CSP, set header manually per-request:
1. **Nonce middleware** (`server/src/index.ts:77-95`): generates `crypto.randomBytes(16).toString('base64')` per request, stored in `res.locals.cspNonce`
2. **Manual CSP header**: `script-src 'self' 'nonce-{random}'`, `style-src 'self' 'nonce-{random}' https://fonts.googleapis.com`
3. **Custom `GET /` handler** (`server/src/index.ts:126-148`): reads built `dist/index.html`, injects `nonce` attribute into `<style>` block, adds `document.createElement` patching script for dynamic styles
4. **Fonts**: `font-src 'self' https://fonts.gstatic.com`, `style-src` includes `https://fonts.googleapis.com`

### Complexity Note
Tailwind CSS v4 generates styles at build time. The inline `<style>` in `dist/index.html` gets `nonce="{nonce}"` via string replacement. Motion library creates `<style>` elements at runtime — patched via `document.createElement` monkey-patching injected as a nonced inline script.

### Files Modified
| File | Change |
|---|---|
| `server/src/index.ts` | Added `import fs`, disabled Helmet CSP, added nonce middleware, custom HTML serving with nonce injection |

### Verification
- ✅ CSP header: **zero** `'unsafe-inline'` occurrences
- ✅ All styles render correctly (nonce-based)
- ✅ All animations work (document.createElement patch)
- ✅ No CSP violations
- ✅ TypeScript check: 0 errors

---

## P1-04: Date VARCHAR → TIMESTAMP Migration

### Problem
8 columns across 6 tables store timestamps as localized Arabic strings instead of TIMESTAMP. Makes date filtering, sorting, and timezone handling impossible in SQL.

### Affected Columns
`sellers.creation_date VARCHAR(20)`, `sellers.last_login VARCHAR(100)`, `sims.date_added VARCHAR(20)`, `alerts.time VARCHAR(50)`, `transactions.relative_time VARCHAR(50)`, `operations.date VARCHAR(20)`, `operations.time VARCHAR(50)`, `audit_logs.time VARCHAR(50)`

### Solution
1. Create migration `007_date_varchar_to_timestamp.sql`:
   - Add new TIMESTAMP columns
   - Parse existing Arabic/date strings to timestamps (best-effort, default to NULL)
   - Drop old VARCHAR columns
   - Rename new columns to original names
2. Update seed data in `seed.sql` to use proper timestamps
3. Update all backend routes that query these columns
4. Update TypeScript interfaces

### Verification
- Migration applies successfully
- Existing data is preserved where parsable
- All queries using these columns work correctly
- Tests pass

---

## P1-05: Add `updated_at` to 9 Tables

### Solution
Create migration `008_add_updated_at.sql` that adds `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` to 9 tables + auto-update trigger function.

### Verification
- Migration applies
- UPDATE operations auto-set `updated_at`
- All queries remain compatible

---

## P1-06: Add UNIQUE Constraints

### Solution
1. Check for existing duplicates in `sellers.id_number`, `users.email`, `agents.email`, `sellers.email`
2. If duplicates exist, keep the most recent record
3. Add UNIQUE constraints via migration `009_add_unique_constraints.sql`

### Verification
- Constraints added
- Inserting duplicates returns error
- No data loss

---

## P1-07: Normalize Provider/Operator Casing

### Solution
1. Create `providers` lookup table
2. Normalize existing data to consistent casing
3. Add foreign key constraints
4. Update application code to use lookup table

### Verification
- All providers use consistent casing
- Lookup table has correct entries
- Foreign keys enforced

---

## Execution Order (Actual)

```
1. P1-01     Remove skipLibCheck        ✅ Complete — 0 errors both TS
2. P1-02     CSP nonce implementation   ✅ Complete — unsafe-inline removed
3. P1-05     Add updated_at             ✅ SQL created, NOT applied
4. P1-06     Add UNIQUE constraints     ✅ SQL created, NOT applied
5. P1-07     Provider normalization     ✅ SQL created, NOT applied
6. P1-04     Date VARCHAR migration     ✅ SQL created, NOT applied
```

---

## Rollback Strategy

| Issue | Rollback Action | Risk | Status |
|---|---|---|---|
| P1-01 | Add back `skipLibCheck` + `--skipLibCheck` flag | Low | Not needed — working |
| P1-02 | Revert `server/src/index.ts` to Helmet CSP with `'unsafe-inline'` | None | Not needed — working |
| P1-04 | `ROLLBACK` migration 010 | High — data loss if run | NOT applied |
| P1-05 | `ROLLBACK` migration 007 | Low | NOT applied |
| P1-06 | `ROLLBACK` migration 008 | Low | NOT applied |
| P1-07 | `ROLLBACK` migration 009 | Low | NOT applied |
