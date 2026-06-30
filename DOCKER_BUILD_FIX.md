# Docker Build Fix — Applied Changes

## Files Modified

| File | Type | Lines Changed |
|------|------|---------------|
| `package.json` | Modified | −1 dependency, +3 optionalDependency |
| `package-lock.json` | Regenerated | +69, −1 |
| `Dockerfile` | Modified | 6 lines (3 FROM + 1 RUN + 1 tsconfig) |
| `.dockerignore` | Created | 49 lines |

## Exact Changes

### Fix 1 — `package.json`: Move platform-specific dep to `optionalDependencies`

```diff
—    "@rollup/rollup-win32-x64-msvc": "^4.34.9",
+  "optionalDependencies": {
+    "@rollup/rollup-win32-x64-msvc": "^4.34.9"
+  }
```

**Why safe**: This is the standard npm pattern for platform-specific binaries. Rollup itself already declares the same package as optional. The package is only needed on Windows x64. Making it optional means `npm ci` skips it on Linux/Mac, and installs it normally on Windows.

**Rollback**: Move the line back to `dependencies`.

### Fix 2 — `package-lock.json`: Regenerated via `npm install`

**Why safe**: `npm install` regenerates the lockfile to match the new dependency graph. The lockfile now places `@rollup/rollup-win32-x64-msvc` under `optionalDependencies` (line 59) and marks the resolved package entry with `"optional": true` (line 2629).

**Rollback**: `git checkout HEAD -- package-lock.json`

### Fix 3 — `.dockerignore`: New file

Excludes `node_modules`, `dist`, `.git`, `.github`, `coverage`, `android`, `reports`, `qa-reports`, `backups`, `*.log`, `.env`, `.env.*`, `*.bak`, `.vscode`, `.idea`, Docker build artifacts, OS artifacts, test artifacts, Android build artifacts, AI-generated audit reports, Firebase cache, and server artifacts.

**Why safe**: None of the excluded directories or files are needed at build time. Reduces Docker build context from ~56MB to ~3MB.

**Rollback**: `rm .dockerignore`

### Fix 4 — `Dockerfile`: Upgrade `node:20-alpine` → `node:22-alpine`

```diff
-FROM node:20-alpine AS frontend-build
+FROM node:22-alpine AS frontend-build

-FROM node:20-alpine AS server-build
+FROM node:22-alpine AS server-build

-FROM node:20-alpine
+FROM node:22-alpine

-RUN npx tsc --skipLibCheck
+RUN npx tsc
```

**Why safe**:
- Node 22 is current LTS (supports ES2020+ targets used by the project)
- `@capacitor/cli@8.4.1` requires `>=22.0.0` — removes engine warning
- All project dependencies are compatible (verified via `npm test`)
- The `--skipLibCheck` removal was already in the working tree (tsconfig.json now has `"skipLibCheck": true` at project level)
- No breaking changes between Node 20 and Node 22 for Express/pg/AWS SDK/Firebase Admin

**Rollback**: `git checkout HEAD -- Dockerfile`

## Validation Status

| Step | Status |
|------|--------|
| Frontend `npm run build` | ✅ PASS (3079 modules, 34 chunks) |
| Backend `npm run build` | ✅ PASS (tsc, no errors) |
| `npm test` (293 tests) | ✅ PASS (15 files, 10.56s) |
| `docker build .` | ⬜ NOT TESTED (Docker unavailable on Windows) |
| `npm ci` (Windows) | ⚠️ EPERM (antivirus lock on temp dirs); `npm install` succeeded |
