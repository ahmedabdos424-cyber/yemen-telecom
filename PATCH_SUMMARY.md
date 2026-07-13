# PATCH SUMMARY — FileSystem Error Handling

## Files Changed

**Target**: `out/main/chunks/node-D3DySoXZ.js` (OpenCode Desktop v1.17.13)

---

## Patch 1: `resolve62` — realPath error handling

| | |
|---|---|
| **Location** | L185407 |
| **Before** | `yield* fs52.realPath(absolute2).pipe(exports_Effect.orDie)` |
| **After** | `yield* fs52.realPath(absolute2).pipe(catchReason("PlatformError", ...), catch(... → die))` |
| **Reason** | `realPath` fails on ENOENT (deleted path), EACCES (permission denied), ENOTDIR (invalid path). These are operational, not programming defects. |
| **Risk** | Low — only affects error path, not success path |
| **Regression Risk** | None — `catch` fallback preserves `die` for unexpected errors |

## Patch 2: `FileSystem.read` — stat + readFile error handling

| | |
|---|---|
| **Location** | L185418 (stat), L185422 (readFile) |
| **Before** | `yield* fs52.stat(target2.real).pipe(exports_Effect.orDie)` + `yield* fs52.readFile(target2.real).pipe(exports_Effect.orDie)` |
| **After** | `catchReason` → `fail(FileSystemListError)` for known errno values; `catch` → `die` for unexpected |
| **Reason** | Same as Patch 1 — stat/readFile can fail operationally |
| **Risk** | Low |
| **Regression Risk** | None |

## Patch 3: `FileSystem.list` — stat + readDirectoryEntries error handling

| | |
|---|---|
| **Location** | L185428 (stat), L185431 (readDirectoryEntries) |
| **Before** | `yield* fs52.stat(target2.real).pipe(exports_Effect.orDie)` + `yield* fs52.readDirectoryEntries(target2.real).pipe(exports_Effect.orDie, ...)` |
| **After** | `catchReason("PlatformError", ...)` for stat; `catchTag("FileSystemError", ...)` with errno switch for readdir |
| **Reason** | **Root cause of the bug** — stat/readdir failures (EACCES, ENOENT, EPERM, ENOTDIR) were converted to defects → HTTP 500 |
| **Risk** | Low — only error path changed |
| **Regression Risk** | None for success path |

## Patch 4: `list4` HTTP handler — error → HttpApiError conversion

| | |
|---|---|
| **Location** | L509536 |
| **Before** | `return yield* filesystem2(...)` — no error handler; any service error → errorLayer → HTTP 500 |
| **After** | `.pipe(catchTag("FileSystemListError", (err) => { switch(err.code) { ... } }))` |
| **Reason** | Converts `FileSystemListError` to proper `HttpApiError` instances (NotFound=404, Forbidden=403, BadRequest=400, InternalServerError=500) |
| **Risk** | Low — only affects error responses |
| **Regression Risk** | None — HttpApiError is `HttpServerError`, bypasses errorLayer |

## Error Code Mapping

| errno | FileSystemListError.code | HttpApiError | HTTP Status |
|-------|------------------------|--------------|-------------|
| ENOENT | "ENOENT" | `NotFound` | **404** |
| EACCES | "EACCES" | `Forbidden` | **403** |
| EPERM | "EACCES" | `Forbidden` | **403** |
| ENOTDIR | "ENOTDIR" | `BadRequest` | **400** |
| EMFILE | `die` (defect) | `InternalServerError` | **500** |
| EINVAL | `die` (defect) | `InternalServerError` | **500** |
| Unknown | `die` (defect) | `InternalServerError` | **500** |

## Programming Defects Preserved (unchanged)

These remain as `die` because they represent logic errors, not runtime conditions:

- `die(new Error("Path escapes the location"))` — input validation / symlink escape
- `die(new Error("Path is not a directory"))` — type mismatch
- `die(new Error("Path is not a file"))` — type mismatch

## Remaining Operational `orDie` in FileSystem Service

These still need fixing (next iteration):

| Line | Operation | Impact |
|------|-----------|--------|
| L185192 | `ripgrep.find(...).pipe(orDie)` | Init scan failure → defect → no file search |
| L185196 | `stat(target2).pipe(orDie)` in `glob` | Permission error → defect → glob fails |
| L185205 | `ripgrep.glob(...).pipe(map, orDie)` | Glob error → defect |
| L185209 | `stat(target2).pipe(orDie)` in `grep` | Permission error → defect → grep fails |
| L185223 | `ripgrep.grep(...).pipe(map, orDie)` | Grep error → defect |
| L185402 | `realPath(location2.directory).pipe(orDie)` | Deleted workspace → defect → all FS ops fail |

## Verification

- ✅ 40/40 unit tests pass
- ✅ errorLayer correctly skips HttpServerError (HttpApiError bypasses 500 fallback)
- ✅ All 4 HttpApiError types present (NotFound, Forbidden, BadRequest, InternalServerError)
- ✅ Programming defects preserved (die for path escape, type mismatch)
- ✅ Logging includes path, code, operation, and cause
