# P1-02: CSP Nonce Implementation Plan

## Problem
`style-src` includes `'unsafe-inline'` in Helmet CSP. Required by:
1. Inline `<style>` block in `index.html:20-34`
2. Dynamic `<style>` elements created by motion animation library
3. Tailwind CSS v4 build-time style generation

## Solution
Replace `'unsafe-inline'` with per-request nonce:
1. Generate a unique nonce per HTTP request
2. Set CSP header with `nonce-${nonce}` instead of `'unsafe-inline'`
3. Inject nonce into the `<style>` tag when serving index.html
4. Patch `document.createElement` to propagate nonce to dynamic style elements
5. Add nonce to `script-src` for the patching script

## Files Modified
| File | Change |
|---|---|
| `server/src/index.ts` | Add `fs` import, disable Helmet CSP, add nonce middleware, custom HTML serving |

## Verification
1. Server TS check passes
2. Frontend build passes 
3. All tests pass
4. CSP header contains `nonce-` instead of `'unsafe-inline'`
5. Styles render correctly in browser

## Rollback
Revert `server/src/index.ts` changes — restore `'unsafe-inline'` and `express.static('dist')`
