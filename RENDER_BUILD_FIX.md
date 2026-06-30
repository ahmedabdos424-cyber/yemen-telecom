# Render Build Fix Report

**Date**: 2026-06-29
**Author**: Production Operations Assistant
**Commit**: (working tree, to be committed)

---

## Root Cause

`NODE_ENV=production` (set by Render env vars) → `npm install` skips `devDependencies` → `@types/express`, `@types/bcryptjs`, `@types/multer`, `@types/cors`, `@types/jsonwebtoken`, `@types/node`, `@types/pg` not installed → TypeScript cannot find declaration files → build fails with ~50 TS errors.

The primary error cascade:
1. `TS7016: Could not find a declaration file for module 'express'`
2. `AuthRequest extends Request` — but `Request` is unresolvable → `AuthRequest` loses `body`, `query`, `params`, `file`, `files`
3. `TS2339: Property 'body' does not exist on type 'AuthRequest'` (and similar for all inherited Request properties)
4. `TS2503: Cannot find namespace 'Express'` (Express.Multer.File)

## Fix Applied

**File**: `server/package.json`

Moved all `@types/*` packages from `devDependencies` to `dependencies`:

- `@types/express` — Express.Request interface (AuthRequest base type)
- `@types/bcryptjs` — bcryptjs type declarations
- `@types/multer` — Express.Multer.File, req.file/req.files types
- `@types/cors` — CORS middleware types
- `@types/jsonwebtoken` — JWT sign/verify types
- `@types/node` — Node.js built-in types
- `@types/pg` — PostgreSQL client types

These are declaration-only packages (`.d.ts` files). They have zero runtime impact — no code is shipped to production. They are only needed because `npm install` with `NODE_ENV=production` skips devDependencies.

## Verification

| Check | Status |
|-------|--------|
| `npx tsc --skipLibCheck` (server) | ✅ 0 errors |
| `npx tsc --noEmit` (server) | ✅ 0 errors |
| `npm run build` (frontend, Vite) | ✅ Built in 11.86s |
| `npx vitest run` (all tests) | ✅ 293/293 passed (15 files) |

## Build Log Comparison

### Before (Render deploy dep-d910trugvqtc739tg5ag)
```
src/routes/reports.ts(1,43): error TS7016: Could not find a declaration file for module 'express'
src/routes/sellers.ts(41,26): error TS2339: Property 'query' does not exist on type 'AuthRequest'
src/routes/upload.ts(34,39): error TS2503: Cannot find namespace 'Express'
... ~50 TypeScript errors
BUILD FAILURE: Exit code 2
```

### After (local verification)
```
> npx tsc --skipLibCheck
(no output — clean exit code 0)
> npx tsc --noEmit
(no output — clean exit code 0)
```

## AuthRequest Design

`server/src/middleware/auth.ts:16-18` — `AuthRequest extends Request` is correct by design. All properties (`body`, `query`, `params`, `file`, `files`) are inherited from `Express.Request`. The only addition is `user?: { id: number; username: string; role: string }`. The TS2339 errors were false positives caused by missing `@types/express`.

## Next Step

Commit and push the change to trigger a Render auto-deploy. The fix requires only:
- `server/package.json` change (move 7 packages)
- `server/package-lock.json` regeneration (already done by `npm install`)
