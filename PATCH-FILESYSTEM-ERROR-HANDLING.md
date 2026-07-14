# Patch: FileSystem.list Error Handling — Replace `orDie` with Proper Error Types

## Root Cause

`FileSystem.list` at `node-D3DySoXZ.js:185426` uses `exports_Effect.orDie` on three filesystem operations:

```
L185407: fs52.realPath(absolute2).pipe(exports_Effect.orDie)
L185428: fs52.stat(target2.real).pipe(exports_Effect.orDie)
L185431: fs52.readDirectoryEntries(target2.real).pipe(exports_Effect.orDie, ...)
```

`orDie` converts **any** `FileSystemError` (ENOENT, EACCES, EPERM, ENOTDIR, EMFILE) into an **untagged defect** → caught by `errorLayer` at L511610 → HTTP 500 with `"Unexpected server error"`.

The renderer (`main-Do1GNfcH.js:77662-77672`) catches this as `e2.message` → shows `"فشل سرد الملفات"` toast.

## Design

### Error Type: `FileSystemListError`

A plain object with `_tag: "FileSystemListError"` that `catchTag` can match:

```js
{ _tag: "FileSystemListError", code: "ENOENT", path: "/foo", operation: "stat", cause: <original error> }
```

### Mapping: errno → HTTP Status

| errno      | Service Error Code | HTTP Status | HttpApiError          |
|------------|--------------------|-------------|-----------------------|
| ENOENT     | `"ENOENT"`        | 404         | `NotFound`            |
| EACCES     | `"EACCES"`        | 403         | `Forbidden`           |
| EPERM      | `"EACCES"`        | 403         | `Forbidden`           |
| ENOTDIR    | `"ENOTDIR"`       | 400         | `BadRequest`          |
| EMFILE     | `"UNKNOWN"`       | 500         | `InternalServerError` |
| EINVAL     | `"UNKNOWN"`       | 500         | `InternalServerError` |
| other      | `"UNKNOWN"`       | 500         | `InternalServerError` |

### Layers Changed

1. **`resolve62` (L185407)**: Replace `orDie` on `realPath` → `catchReason("PlatformError", ...)` 
2. **`FileSystem.list` (L185428)**: Replace `orDie` on `stat` → `catchReason("PlatformError", ...)`
3. **`FileSystem.list` (L185431)**: Replace `orDie` on `readDirectoryEntries` → `catchTag("FileSystemError", ...)`
4. **`list4` handler (L509442)**: Add `.pipe(catchTag("FileSystemListError", ...))` → convert to `HttpApiError`
5. **`FileSystem.read` (L185418, L185422)**: Same treatment for `orDie` on `stat` and `readFile`

### Not Changed (genuine programming defects kept as `die`)

- L185405-185406: `die("Path escapes the location")` — input validation
- L185408-185409: `die("Path escapes the location")` — symlink escape
- L185429-185430: `die("Path is not a directory")` — type mismatch
- L185419-185420: `die("Path is not a file")` — type mismatch

---

## Before/After

### 1. resolve62 — L185403–185411

**Before** (`node-D3DySoXZ.js:185407`):
```js
const real4 = yield* fs52.realPath(absolute2).pipe(exports_Effect.orDie);
```

**After**:
```js
const real4 = yield* fs52.realPath(absolute2).pipe(
    exports_Effect.catchReason("PlatformError", "NotFound", (err) => {
        console.error("[resolve62] realPath ENOENT", absolute2);
        return exports_Effect.fail({ _tag: "FileSystemListError", code: "ENOENT", path: absolute2, operation: "resolve-realign", cause: err });
    }),
    exports_Effect.catchReason("PlatformError", "PermissionDenied", (err) => {
        console.error("[resolve62] realPath EACCES/EPERM", absolute2);
        return exports_Effect.fail({ _tag: "FileSystemListError", code: "EACCES", path: absolute2, operation: "resolve-realign", cause: err });
    }),
    exports_Effect.catchReason("PlatformError", "BadResource", (err) => {
        console.error("[resolve62] realPath ENOTDIR", absolute2);
        return exports_Effect.fail({ _tag: "FileSystemListError", code: "ENOTDIR", path: absolute2, operation: "resolve-realign", cause: err });
    }),
    exports_Effect.catch((err) => {
        console.error("[resolve62] realPath unexpected", absolute2, err);
        return exports_Effect.die(err);
    })
);
```

### 2. FileSystem.list stat — L185428

**Before**:
```js
const info22 = yield* fs52.stat(target2.real).pipe(exports_Effect.orDie);
```

**After**:
```js
const info22 = yield* fs52.stat(target2.real).pipe(
    exports_Effect.catchReason("PlatformError", "NotFound", (err) => {
        console.error("[FileSystem.list] stat ENOENT", target2.real);
        return exports_Effect.fail({ _tag: "FileSystemListError", code: "ENOENT", path: target2.real, operation: "stat", cause: err });
    }),
    exports_Effect.catchReason("PlatformError", "PermissionDenied", (err) => {
        console.error("[FileSystem.list] stat EACCES/EPERM", target2.real);
        return exports_Effect.fail({ _tag: "FileSystemListError", code: "EACCES", path: target2.real, operation: "stat", cause: err });
    }),
    exports_Effect.catchReason("PlatformError", "BadResource", (err) => {
        console.error("[FileSystem.list] stat ENOTDIR", target2.real);
        return exports_Effect.fail({ _tag: "FileSystemListError", code: "ENOTDIR", path: target2.real, operation: "stat", cause: err });
    }),
    exports_Effect.catch((err) => {
        console.error("[FileSystem.list] stat unexpected", target2.real, err);
        return exports_Effect.die(err);
    })
);
```

### 3. FileSystem.list readDirectoryEntries — L185431

**Before**:
```js
return yield* fs52.readDirectoryEntries(target2.real).pipe(exports_Effect.orDie, exports_Effect.map(...));
```

**After**:
```js
return yield* fs52.readDirectoryEntries(target2.real).pipe(
    exports_Effect.catchTag("FileSystemError", (err) => {
        const code = err?.cause?.code;
        console.error("[FileSystem.list] readdir", code || "UNKNOWN", target2.real);
        if (code === "ENOENT")
            return exports_Effect.fail({ _tag: "FileSystemListError", code: "ENOENT", path: target2.real, operation: "readdir", cause: err });
        if (code === "EACCES" || code === "EPERM")
            return exports_Effect.fail({ _tag: "FileSystemListError", code: "EACCES", path: target2.real, operation: "readdir", cause: err });
        if (code === "ENOTDIR")
            return exports_Effect.fail({ _tag: "FileSystemListError", code: "ENOTDIR", path: target2.real, operation: "readdir", cause: err });
        return exports_Effect.die(err);
    }),
    exports_Effect.map((items2) => items2.flatMap((item2) => {
        if (item2.type !== "file" && item2.type !== "directory")
            return [];
        const absolute2 = path79__default.join(target2.absolute, item2.name);
        const relative22 = path79__default.relative(target2.directory, absolute2);
        return [
            Entry7.make({
                path: RelativePath.make(relative22 + (item2.type === "directory" ? path79__default.sep : "")),
                type: item2.type
            })
        ];
    }).sort((a4, b22) => a4.type === b22.type ? a4.path.localeCompare(b22.path) : a4.type === "directory" ? -1 : 1))
);
```

### 4. list4 HTTP handler — L509440–509461

**Before**:
```js
const list4 = exports_Effect.fn("FileHttpApi.list")(function* (ctx) {
    (yield* context5).directory;
    return yield* filesystem2(exports_Effect.gen(function* () {
        // ... fs16.list(...).map(...)
    }));
});
```

**After**:
```js
const list4 = exports_Effect.fn("FileHttpApi.list")(function* (ctx) {
    (yield* context5).directory;
    return yield* filesystem2(exports_Effect.gen(function* () {
        // ... unchanged ...
    })).pipe(
        exports_Effect.catchTag("FileSystemListError", (err) => {
            switch (err.code) {
                case "ENOENT":
                    return exports_Effect.fail(new exports_HttpApiError.NotFound({}));
                case "EACCES":
                case "EPERM":
                    return exports_Effect.fail(new exports_HttpApiError.Forbidden({}));
                case "ENOTDIR":
                    return exports_Effect.fail(new exports_HttpApiError.BadRequest({}));
                default:
                    return exports_Effect.fail(new exports_HttpApiError.InternalServerError({}));
            }
        })
    );
});
```

### 5. FileSystem.read — L185416–185424 (bonus)

**Before**:
```js
read: exports_Effect.fn("FileSystem.read")(function* (input) {
    const target2 = yield* resolve62(input.path);
    const info22 = yield* fs52.stat(target2.real).pipe(exports_Effect.orDie);
    if (info22.type !== "File")
        return yield* exports_Effect.die(new Error("Path is not a file"));
    return {
        content: yield* fs52.readFile(target2.real).pipe(exports_Effect.orDie),
        mime: FSUtil.mimeType(target2.real)
    };
}),
```

**After**:
```js
read: exports_Effect.fn("FileSystem.read")(function* (input) {
    const target2 = yield* resolve62(input.path);
    const info22 = yield* fs52.stat(target2.real).pipe(
        exports_Effect.catchReason("PlatformError", "NotFound", (err) => {
            console.error("[FileSystem.read] stat ENOENT", target2.real);
            return exports_Effect.fail({ _tag: "FileSystemListError", code: "ENOENT", path: target2.real, operation: "stat", cause: err });
        }),
        exports_Effect.catchReason("PlatformError", "PermissionDenied", (err) => {
            console.error("[FileSystem.read] stat EACCES/EPERM", target2.real);
            return exports_Effect.fail({ _tag: "FileSystemListError", code: "EACCES", path: target2.real, operation: "stat", cause: err });
        }),
        exports_Effect.catchReason("PlatformError", "BadResource", (err) => {
            console.error("[FileSystem.read] stat ENOTDIR", target2.real);
            return exports_Effect.fail({ _tag: "FileSystemListError", code: "ENOTDIR", path: target2.real, operation: "stat", cause: err });
        }),
        exports_Effect.catch((err) => {
            console.error("[FileSystem.read] stat unexpected", target2.real, err);
            return exports_Effect.die(err);
        })
    );
    if (info22.type !== "File")
        return yield* exports_Effect.die(new Error("Path is not a file"));
    return {
        content: yield* fs52.readFile(target2.real).pipe(
            exports_Effect.catchReason("PlatformError", "NotFound", (err) => {
                console.error("[FileSystem.read] readFile ENOENT", target2.real);
                return exports_Effect.fail({ _tag: "FileSystemListError", code: "ENOENT", path: target2.real, operation: "readFile", cause: err });
            }),
            exports_Effect.catchReason("PlatformError", "PermissionDenied", (err) => {
                console.error("[FileSystem.read] readFile EACCES/EPERM", target2.real);
                return exports_Effect.fail({ _tag: "FileSystemListError", code: "EACCES", path: target2.real, operation: "readFile", cause: err });
            }),
            exports_Effect.catch((err) => {
                console.error("[FileSystem.read] readFile unexpected", target2.real, err);
                return exports_Effect.die(err);
            })
        ),
        mime: FSUtil.mimeType(target2.real)
    };
}),
```

---

## Verification Tests

See `PATCH-FILESYSTEM-ERROR-HANDLING.test.js` for:
- Mock-based test of `FileSystemListError` creation for each errno
- Test that `catchTag("FileSystemListError")` + switch maps to correct `HttpApiError`
- Test that `orDie` → `die` path is unchanged for programming defects
- Test that logging includes path, code, operation, and cause
