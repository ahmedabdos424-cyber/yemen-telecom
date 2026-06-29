# RC-1 Final Production Sprint — Phase 1: Certification Gap Fixes

**Date:** 2026-06-29  
**Status:** ✅ COMPLETE  

## Overview
Addressed all 4 remaining gaps identified during Production Certification that warranted a "minor risk" rating.

## Gaps Fixed

| # | Gap | Severity | Fix | File |
|---|-----|----------|-----|------|
| 1 | Unbounded `Map` cache (no max size / no eviction) | 🔴 Medium | Added `MAX_CACHE_SIZE=1000` + insertion-order LRU eviction via `keyOrder` array. Oldest entry deleted on overflow. All existing TTL/lazy-expiry preserved. | `server/src/cache.ts` |
| 2 | `vendor-react` missing from `manualChunks` | 🟡 Low | Added `'vendor-react': ['react', 'react-dom', 'react-router-dom']` to Rollup `manualChunks`. Produces stable 49KB chunk. | `vite.config.ts` |
| 3 | Server source maps exposed in production (50 `.map` files) | 🟡 Low | Set `"sourceMap": false` and `"declarationMap": false` in `server/tsconfig.json`. Rebuilt dist: 0 `.map` files. | `server/tsconfig.json` |
| 4 | Missing `autoFocus` on login username field | 🟡 Low | Added `autoFocus` attribute to `<input ref={usernameRef}>` in LoginScreen. User immediately sees keyboard on login page. | `src/components/LoginScreen.tsx` |

## Validation

| Check | Result |
|-------|--------|
| Frontend build (`npm run build`) | ✅ 2738 modules, new `vendor-react` chunk (49KB) |
| TypeScript (`npx tsc --noEmit`) | ✅ 0 errors |
| Server build (`server/tsconfig.json`) | ✅ 0 `.map` files emitted |
| All tests (`npm run test`) | ✅ **293/293 passed** (15 test files) |

## Bundle Impact
- Main `index-*.js` bundle: **326 KB → 285 KB** (−12.6%)
- New `vendor-react-*.js` chunk at **49 KB** (gzip: 17 KB)
- Number of chunks before/after: 33 → 34

## Next
Proceed to **Phase 2**: Security Review
