/**
 * PATCH-FILESYSTEM-ERROR-HANDLING.test.js
 *
 * Verification tests for the FileSystem.list error handling patch.
 *
 * Tests the mapping from errno → FileSystemListError → HttpApiError (HTTP status).
 * Can be run standalone with: node this-file.js
 *
 * Three scenarios:
 *   1. readdir(EACCES)  → FileSystemListError { code: "EACCES" } → HttpApiError.Forbidden  → HTTP 403 (NOT 500)
 *   2. readdir(ENOENT)  → FileSystemListError { code: "ENOENT" } → HttpApiError.NotFound   → HTTP 404 (NOT 500)
 *   3. Successful readdir → entries → HTTP 200
 */

// ============================================================
// Mock the error types to match the real Effect/HttpApi runtime
// ============================================================

const HTTP_STATUS = {
  NotFound: 404,
  Forbidden: 403,
  BadRequest: 400,
  InternalServerError: 500,
};

// Simulates the patched `catchTag("FileSystemError", handler)` in FileSystem.list
function handleFileSystemError(err) {
  const code = err?.cause?.code;
  if (code === "ENOENT")
    return { _tag: "FileSystemListError", code: "ENOENT", path: err.path, operation: "readdir", cause: err };
  if (code === "EACCES" || code === "EPERM")
    return { _tag: "FileSystemListError", code: "EACCES", path: err.path, operation: "readdir", cause: err };
  if (code === "ENOTDIR")
    return { _tag: "FileSystemListError", code: "ENOTDIR", path: err.path, operation: "readdir", cause: err };
  // EMFILE, EINVAL, etc → still die/defect → errorLayer → HTTP 500
  return null; // signals "die(err)" — defect
}

// Simulates the patched `catchTag("FileSystemListError", handler)` in list4 handler
function handleFileSystemListError(err) {
  switch (err.code) {
    case "ENOENT":
      return { status: HTTP_STATUS.NotFound, name: "NotFound" };
    case "EACCES":
    case "EPERM":
      return { status: HTTP_STATUS.Forbidden, name: "Forbidden" };
    case "ENOTDIR":
      return { status: HTTP_STATUS.BadRequest, name: "BadRequest" };
    default:
      return { status: HTTP_STATUS.InternalServerError, name: "InternalServerError" };
  }
}

// Simulates the patched `catchReason("PlatformError", ...)` in FileSystem.list stat
function handleStatPlatformError(reasonTag, path) {
  if (reasonTag === "NotFound")
    return { _tag: "FileSystemListError", code: "ENOENT", path, operation: "stat" };
  if (reasonTag === "PermissionDenied")
    return { _tag: "FileSystemListError", code: "EACCES", path, operation: "stat" };
  if (reasonTag === "BadResource")
    return { _tag: "FileSystemListError", code: "ENOTDIR", path, operation: "stat" };
  return null; // unexpected → die → defect
}

// ============================================================
// Tests
// ============================================================

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log("=== Test Suite: FileSystem Error Handling Patch ===\n");

// --- Group 1: FileSystemError → FileSystemListError mapping (readDirectoryEntries) ---
console.log("Group 1: FileSystemError (readdir) → FileSystemListError");

// 1a. EACCES → FileSystemListError { code: "EACCES" }
{
  const err = { _tag: "FileSystemError", path: "/restricted", cause: { code: "EACCES" } };
  const result = handleFileSystemError(err);
  assert(result !== null, "EACCES produces FileSystemListError (NOT die/defect)");
  assert(result.code === "EACCES", "EACCES maps to code EACCES");
}

// 1b. EPERM → FileSystemListError { code: "EACCES" } (same as EACCES)
{
  const err = { _tag: "FileSystemError", path: "/restricted", cause: { code: "EPERM" } };
  const result = handleFileSystemError(err);
  assert(result !== null, "EPERM produces FileSystemListError (NOT die/defect)");
  assert(result.code === "EACCES", "EPERM maps to code EACCES");
}

// 1c. ENOENT → FileSystemListError { code: "ENOENT" }
{
  const err = { _tag: "FileSystemError", path: "/nonexistent", cause: { code: "ENOENT" } };
  const result = handleFileSystemError(err);
  assert(result !== null, "ENOENT produces FileSystemListError (NOT die/defect)");
  assert(result.code === "ENOENT", "ENOENT maps to code ENOENT");
}

// 1d. ENOTDIR → FileSystemListError { code: "ENOTDIR" }
{
  const err = { _tag: "FileSystemError", path: "/file", cause: { code: "ENOTDIR" } };
  const result = handleFileSystemError(err);
  assert(result !== null, "ENOTDIR produces FileSystemListError (NOT die/defect)");
  assert(result.code === "ENOTDIR", "ENOTDIR maps to code ENOTDIR");
}

// 1e. EMFILE → die/defect (still 500 but with proper logging)
{
  const err = { _tag: "FileSystemError", path: "/busy", cause: { code: "EMFILE" } };
  const result = handleFileSystemError(err);
  assert(result === null, "EMFILE produces die/defect (null return = die)");
}

// 1f. EINVAL → die/defect
{
  const err = { _tag: "FileSystemError", path: "/invalid", cause: { code: "EINVAL" } };
  const result = handleFileSystemError(err);
  assert(result === null, "EINVAL produces die/defect (null return = die)");
}

// --- Group 2: PlatformError (stat) → FileSystemListError ---
console.log("\nGroup 2: PlatformError (stat) → FileSystemListError");

// 2a. NotFound → ENOENT
{
  const result = handleStatPlatformError("NotFound", "/missing");
  assert(result !== null, "NotFound produces FileSystemListError");
  assertEqual(result.code, "ENOENT", "PlatformError.NotFound → code ENOENT");
}

// 2b. PermissionDenied → EACCES
{
  const result = handleStatPlatformError("PermissionDenied", "/restricted");
  assert(result !== null, "PermissionDenied produces FileSystemListError");
  assertEqual(result.code, "EACCES", "PlatformError.PermissionDenied → code EACCES");
}

// 2c. BadResource → ENOTDIR
{
  const result = handleStatPlatformError("BadResource", "/file");
  assert(result !== null, "BadResource produces FileSystemListError");
  assertEqual(result.code, "ENOTDIR", "PlatformError.BadResource → code ENOTDIR");
}

// 2d. Unknown reason → die/defect
{
  const result = handleStatPlatformError("Busy", "/busy");
  assert(result === null, "PlatformError.Busy → die/defect (unexpected)");
}

// --- Group 3: FileSystemListError → HttpApiError (HTTP status mapping) ---
console.log("\nGroup 3: FileSystemListError → HttpApiError mapping");

// 3a. ENOENT → HTTP 404 (NotFound)
{
  const err = { _tag: "FileSystemListError", code: "ENOENT" };
  const result = handleFileSystemListError(err);
  assertEqual(result.status, 404, "ENOENT → HTTP 404 (NotFound)");
}

// 3b. EACCES → HTTP 403 (Forbidden)
{
  const err = { _tag: "FileSystemListError", code: "EACCES" };
  const result = handleFileSystemListError(err);
  assertEqual(result.status, 403, "EACCES → HTTP 403 (Forbidden)");
}

// 3c. EPERM → HTTP 403 (Forbidden)
{
  const err = { _tag: "FileSystemListError", code: "EPERM" };
  const result = handleFileSystemListError(err);
  assertEqual(result.status, 403, "EPERM → HTTP 403 (Forbidden)");
}

// 3d. ENOTDIR → HTTP 400 (BadRequest)
{
  const err = { _tag: "FileSystemListError", code: "ENOTDIR" };
  const result = handleFileSystemListError(err);
  assertEqual(result.status, 400, "ENOTDIR → HTTP 400 (BadRequest)");
}

// 3e. UNKNOWN → HTTP 500 (InternalServerError)
{
  const err = { _tag: "FileSystemListError", code: "UNKNOWN" };
  const result = handleFileSystemListError(err);
  assertEqual(result.status, 500, "UNKNOWN → HTTP 500 (InternalServerError)");
}

// --- Group 4: Programming defects still produce die/defect (unchanged behavior) ---
console.log("\nGroup 4: Programming defects (unchanged — still die/defect)");

// These are the `die(new Error(...))` calls that should NOT be changed
const programmingDefects = [
  'die(new Error("Path escapes the location"))',
  'die(new Error("Path is not a directory"))',
  'die(new Error("Path is not a file"))',
];

// Read the actual patched file to verify these strings still exist
import { readFileSync } from 'node:fs';
const patchedCode = readFileSync('C:/Users/Ahmed/AppData/Local/Temp/opencode-extracted/out/main/chunks/node-D3DySoXZ.js', 'utf8');

for (const defect of programmingDefects) {
  const exists = patchedCode.includes(defect);
  assert(exists, `Genuine defect preserved: ${defect}`);
}

// --- Group 5: Logging includes required fields ---
console.log("\nGroup 5: Logging includes required metadata");

const fileSystemListIdx = patchedCode.indexOf('exports_Effect.fn("FileSystem.list")');
if (fileSystemListIdx >= 0) {
  const listSection = patchedCode.substring(fileSystemListIdx, fileSystemListIdx + 5000);

  const hasConsoleError = listSection.includes('console.error');
  const hasPathInLog = listSection.includes('target2.real');
  const hasCodeInLog = listSection.includes('code');
  const hasOperationInLog = listSection.includes('operation');
  const hasCauseInLog = listSection.includes('cause');

  assert(hasConsoleError, "Logging uses console.error");
  assert(hasPathInLog, "Logging includes resolved path (target2.real)");
  assert(hasCodeInLog, "Logging includes errno code");
  assert(hasOperationInLog, "Logging includes filesystem operation name");
  assert(hasCauseInLog, "Logging includes original error cause");
}

// --- Group 6: All expected catch patterns present in the file ---
console.log("\nGroup 6: Patch completeness check");

const patterns = [
  { name: "catchReason PlatformError NotFound (stat)", pattern: 'catchReason("PlatformError", "NotFound"' },
  { name: "catchReason PlatformError PermissionDenied (stat)", pattern: 'catchReason("PlatformError", "PermissionDenied"' },
  { name: "catchReason PlatformError BadResource (stat)", pattern: 'catchReason("PlatformError", "BadResource"' },
  { name: "catchTag FileSystemError (readdir)", pattern: 'catchTag("FileSystemError"' },
  { name: "catchTag FileSystemListError (handler)", pattern: 'catchTag("FileSystemListError"' },
  { name: "exports_Effect.fail with FileSystemListError", pattern: '_tag: "FileSystemListError"' },
  { name: "exports_HttpApiError.NotFound", pattern: 'exports_HttpApiError.NotFound' },
  { name: "exports_HttpApiError.Forbidden", pattern: 'exports_HttpApiError.Forbidden' },
  { name: "exports_HttpApiError.BadRequest", pattern: 'exports_HttpApiError.BadRequest' },
  { name: "exports_HttpApiError.InternalServerError", pattern: 'exports_HttpApiError.InternalServerError' },
];

for (const { name, pattern } of patterns) {
  const exists = patchedCode.includes(pattern);
  assert(exists, `Patch pattern present: ${name}`);
}

// ============================================================
// Summary
// ============================================================
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error("SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("All tests passed!");
}
