# Docker Build Failure — Root Cause Analysis

## Root Cause

The Docker build failed at `frontend-build` stage, step `RUN npm ci`, with **EBADPLATFORM** for `@rollup/rollup-win32-x64-msvc@4.34.9`.

## Evidence

### 1. `package.json` — forced platform-specific dependency

**File**: `package.json`, lines removed from `dependencies`:

```json
"@rollup/rollup-win32-x64-msvc": "^4.34.9"
```

This package is declared at the project root under `dependencies`, making it **mandatory on every platform**.

### 2. Platform constraint

`@rollup/rollup-win32-x64-msvc@4.34.9` declares:

```json
{ "os": ["win32"], "cpu": ["x64"] }
```

On Linux (Docker Alpine), `npm ci` evaluates the platform constraint and refuses to install a Windows-only binary, throwing:

```
EBADPLATFORM @rollup/rollup-win32-x64-msvc@4.34.9:
  wanted {"os":"win32","cpu":"x64"}
  (current: {"os":"linux","cpu":"x64"})
```

### 3. Rollup's own dependency is already optional

Rollup (v4.60.4) already ships `@rollup/rollup-win32-x64-msvc@4.60.4` as an `optionalDependency` inside `node_modules/rollup`:

**Lockfile evidence** (`package-lock.json:8305`):

```json
"optionalDependencies": {
  "@rollup/rollup-win32-x64-msvc": "4.60.4"
}
```

The project's additional resolution at version 4.34.9 (a different semver range) was placed in `dependencies` instead of `optionalDependencies`, overriding npm's normal platform-conditional behavior.

## Affected Files

| File | Change |
|------|--------|
| `package.json` | `@rollup/rollup-win32-x64-msvc` in `dependencies` (blocker) |
| `Dockerfile` | `node:20-alpine` (non-blocking engine warning) |
| (missing) `.dockerignore` | Not present (quality issue) |

## Why Linux Failed, Windows Succeeded

| Aspect | Windows (Dev) | Linux (Docker/Render) |
|--------|---------------|-----------------------|
| Platform | win32, x64 | linux, x64 |
| `@rollup/rollup-win32-x64-msvc` install? | ✅ Matches platform | ❌ Platform mismatch |
| Dependency category | `dependencies` (forced) | `dependencies` (forced) |
| Result | Installs successfully | EBADPLATFORM → build fail |

## Secondary Issue (non-blocking, warning only)

`@capacitor/cli@8.4.1` requires `node >=22.0.0`. The Dockerfile used `node:20-alpine`, producing:

```
EBADENGINE @capacitor/cli@8.4.1: required {"node":">=22.0.0"} (current: v20.20.2)
```

This is a warning only — Capacitor is not invoked during the Docker build.

## Impact

- Docker service `yemen-telecom` on Render **never successfully deployed**
- Only Node service `yemen-telecom-api` is live (commit `d00a228`)
- Frontend SPA is not served → blank page on `https://yemen-telecom.onrender.com`

## Why It Wasn't Caught

- All development occurs on Windows, where the package installs normally
- No Linux CI pipeline (GitHub Actions workflows were deleted — see `git status`)
- No Docker-based local testing
