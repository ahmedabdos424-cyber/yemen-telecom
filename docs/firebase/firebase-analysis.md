# Firebase Analysis — Yemen Telecom

> Based strictly on source code analysis. Last updated: June 2026.

---

## 1. Firebase Project Configuration

### firebase.json

File: `firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

| Feature      | Configured | Actually Used |
|-------------|-----------|--------------|
| Hosting     | Yes (dist/, SPA rewrites) | No — app deployed on Render |
| Storage     | Yes (storage.rules)       | Yes (image uploads) |
| Firestore   | Yes (rules + indexes)     | No |
| Functions   | No                        | No |
| Extensions  | No                        | No |

**Hosting configuration** (`firebase.json:6-18`): Configured for a single-page application with the `dist/` directory as the public root. All routes (`**`) rewrite to `/index.html`. Only `.gitignore`-style ignores are set (`firebase.json`, `**/.*`, `**/node_modules/**`). Not currently deployed — the app is served via Render.

---

## 2. Admin SDK Analysis

File: `server/src/firebase-admin.ts` (36 lines)

### Initialization Pattern (Lazy Singleton)

```typescript
let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized) {
    // ... initialize once ...
    initialized = true;
  }
  return admin;
}
```

`firebase-admin.ts:3-31` — The SDK is initialized exactly once on the first call to `getFirebaseAdmin()`. Subsequent calls return the cached `admin` instance. This avoids redundant initialization on every request.

### Service Account Credential Handling

Credentials are read from environment variables (`firebase-admin.ts:7-9`):

| Env Variable                 | Purpose                    |
|-----------------------------|----------------------------|
| `FIREBASE_PROJECT_ID`        | GCP project identifier     |
| `FIREBASE_PRIVATE_KEY`       | Service account private key (PEM) |
| `FIREBASE_CLIENT_EMAIL`      | Service account email      |
| `FIREBASE_PRIVATE_KEY_ID`    | Private key ID (optional)  |
| `FIREBASE_CLIENT_ID`         | Client ID (optional)       |
| `FIREBASE_CLIENT_CERT_URL`   | x509 cert URL (optional)   |
| `FIREBASE_STORAGE_BUCKET`    | Storage bucket name        |

### Private Key Newline Handling

`firebase-admin.ts:17` — The private key from the env var undergoes `\n` replacement:

```typescript
private_key: privateKey.replace(/\\n/g, '\n'),
```

This compensates for newline encoding issues when service account JSON keys are stored in environment variables (common in Render, Heroku, etc.).

### Storage Bucket Configuration

`firebase-admin.ts:27` — The storage bucket is set from `FIREBASE_STORAGE_BUCKET` env var, falling back to `${projectId}.appspot.com`:

```typescript
storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
```

### Error Handling

`firebase-admin.ts:10-12` — If any of `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, or `FIREBASE_CLIENT_EMAIL` are missing, initialization throws:

```typescript
throw new Error('Firebase credentials missing: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL must be set');
```

### Exported API

- `getFirebaseAdmin()` — Returns the initialized `admin` namespace (`firebase-admin.ts:5`)
- `getBucket()` — Returns the default storage bucket instance (`firebase-admin.ts:34-36`)

---

## 3. Storage Implementation

File: `server/src/routes/upload.ts` (93 lines)

### Upload Flow

```
Client → Express endpoint → multer (memory) → extension check → MIME check → magic byte validation → Firebase Storage upload → signed URL → JSON response
```

### Route: Single Image Upload

`upload.ts:58-72` — `POST /api/upload/image`
- Middleware: `requireRole('manager', 'agent')` — only managers and agents can upload
- Parser: `upload.single('image')`
- Response: `{ url: string, filename: string }`

### Route: Batch Image Upload

`upload.ts:74-91` — `POST /api/upload/images`
- Middleware: `requireRole('manager', 'agent')`
- Parser: `upload.array('images', 5)` — max 5 files
- Response: `Array<{ url: string, filename: string }>`

### Upload Parameters (`upload.ts:22-31`)

| Parameter       | Value     |
|----------------|-----------|
| Storage engine | `multer.memoryStorage()` |
| Max file size  | 5 MB (`5 * 1024 * 1024`) |
| Allowed types  | `jpeg`, `jpg`, `png`, `gif`, `webp` |

### File Filter (Layer 1 & 2 — Extension + MIME)

`upload.ts:25-30` — Two independent checks against the regex `/jpeg|jpg|png|gif|webp/`:

1. **Extension check**: Tests the file extension from `originalname`
2. **MIME check**: Tests the `mimetype` header

Both must pass for multer to accept the file.

### Magic Byte Validation (Layer 3 — Content)

`upload.ts:6-18` — After multer accepts the file, the buffer is validated against known magic byte signatures:

| MIME Type    | Magic Bytes (Hex)                                        |
|-------------|----------------------------------------------------------|
| `image/jpeg` | `FF D8 FF` (3 bytes)                                     |
| `image/png`  | `89 50 4E 47` (4 bytes)                                  |
| `image/gif`  | `47 49 46 38` (4 bytes)                                  |
| `image/webp` | `52 49 46 46` (4 bytes) + `57 45 42 50` at offset 8      |

Rejects with `400 Invalid image file — content does not match expected format` on mismatch.

### Storage Path Convention

`upload.ts:33-35` — Files are stored at:

```
uploads/{timestamp}-{random}.{ext}
```

- `timestamp`: `Date.now()` (ms since epoch)
- `random`: `Math.random().toString(36).substring(2, 8)` (6 alphanumeric chars)
- `ext`: Original file extension (falls back to `jpg`)

Example: `uploads/1718000000000-a1b2c3.jpg`

### Upload to Firebase Storage

`upload.ts:33-52` — The `uploadToFirebase` function:

1. Gets the bucket via `getBucket()`
2. Creates a blob reference at `uploads/{filename}`
3. Writes the file buffer to Firebase Storage with `contentType` metadata
4. On completion, generates a **signed URL with 1-hour expiry** (`Date.now() + 3600 * 1000`)
5. Returns `{ url, filename }`

```typescript
const [url] = await blob.getSignedUrl({
  action: 'read',
  expires: Date.now() + 3600 * 1000,
});
```

### Error Handling

`upload.ts:68-71, 87-90` — Upload errors are logged to console and return `500 Failed to upload image[s]`.

### Access Control

`upload.ts:58, 74` — Both endpoints use `requireRole('manager', 'agent')` middleware. This is the application's **custom JWT-based role check**, not Firebase Authentication. The Firebase Auth `request.auth` in Storage/Firestore rules is not applicable here because the server uses a service account (admin SDK) — the `request.auth` check in rules applies to client SDK access, not admin SDK operations.

---

## 4. Storage Security Rules

File: `storage.rules` (8 lines)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Current Behavior

- `storage.rules:5` — **Any authenticated Firebase user** can read and write any file in the bucket.
- There are **no path-based restrictions**, **no size limits**, and **no content-type validation**.

### Risk

Since the application uses a **service account (Admin SDK)** for all storage operations, client-side Firebase Auth is not used. The `request.auth != null` rule effectively grants access to any Firebase user who authenticates with the Firebase project directly (e.g., via `@capacitor-firebase/authentication` if enabled). This means:

- Any client with Firebase credentials could bypass the Express backend and directly access storage
- No distinction between upload paths (`uploads/`) and other potential paths
- No file size or type enforcement at the rule level

### Recommendation

Add path-scoped rules with size and content-type constraints:

```
match /uploads/{allPaths=**} {
  allow read, write: if request.auth != null
                    && request.resource.size < 5 * 1024 * 1024
                    && request.resource.contentType.matches('image/.*');
}
```

---

## 5. Firestore Analysis

### Not Used in Application Code

- `firestore.rules` — Generic auth-required rule (identical pattern to storage rules)
- `firestore.indexes.json` — Empty array (`[]`)
- No Firestore `import`, `require`, or API calls exist anywhere in the source code

### Rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Same issue as storage: the rule requires Firebase Auth, but the application uses custom JWT authentication and a service account for backend operations. No client-side Firestore SDK is initialized.

### Indexes (`firestore.indexes.json`)

```json
[]
```

No composite indexes are defined because no Firestore queries are made.

---

## 6. Hosting Analysis

File: `firebase.json:6-18`

| Property      | Value      |
|--------------|------------|
| Public dir   | `dist`     |
| SPA rewrites | `** → /index.html` |
| Ignored      | `firebase.json`, `**/.*`, `**/node_modules/**` |

### Current Status

Firebase Hosting is **configured but not deployed**. The application runs on Render (`yemen-telecom-api.onrender.com` per `src/api/client.ts:16`). The `dist/` directory is the Vite build output (configured in `vite.config.ts`).

### SPA Rewrites

`firebase.json:13-17` — The catch-all rewrite ensures client-side routing works on Firebase Hosting. All paths serve `index.html` and let the SPA router handle the route.

---

## 7. Client-Side Firebase Plugins

### Installed Packages

From `package.json:23-24`:

| Package                             | Version | Installed | Imported in Source |
|-------------------------------------|---------|-----------|-------------------|
| `@capacitor-firebase/authentication` | 8.3.0   | Yes       | No                |
| `@capacitor-firebase/storage`        | 8.3.0   | Yes       | No                |

### Authentication Plugin

- Installed but **never imported** in any source file
- The app uses custom JWT authentication via `POST /api/auth/login` (`src/api/client.ts:203-207`)
- Firebase Auth could provide native Google, phone, or email-link auth on mobile via Capacitor

### Storage Plugin

- Installed but **never imported** in any source file
- All uploads go through the Express backend (`src/api/client.ts:175-193` -> `POST /api/upload/image` -> `PUT uploads/{filename}` in Firebase Storage)
- Direct client-to-Firebase Storage uploads are not implemented

---

## 8. Firebase Admin SDK Dependencies

From `server/package.json:30`:

| Package          | Version   |
|-----------------|-----------|
| `firebase-admin` | `^13.10.0` |

The Admin SDK is used only for:
- `admin.credential.cert()` — service account credential initialization
- `admin.storage().bucket()` — accessing Cloud Storage
- `bucket.file()`, `blob.createWriteStream()`, `blob.getSignedUrl()` — file operations

---

## 9. Gaps & Recommendations

### Currently Used
- **Firebase Admin SDK** (`firebase-admin.ts`) — Initialization only
- **Firebase Storage** (`upload.ts`) — Image uploads with signed URL generation

### Not Used But Available

| Feature                          | Status | Potential Use Case                     |
|----------------------------------|--------|----------------------------------------|
| Firebase Auth (client SDK)       | Installed, unused | Native Google/phone auth on mobile     |
| Firestore                        | Configured, unused | Real-time notifications, activity feed |
| Cloud Functions                  | Not configured | OCR offloading, scheduled backups      |
| Cloud Messaging                  | Not configured | Push notifications for approvals       |
| App Check                        | Not configured | Abuse protection for storage endpoints |
| Remote Config                    | Not configured | Feature flags, dynamic configuration   |
| Analytics                        | Not configured | User behavior insights                 |
| Crashlytics                      | Not configured | Crash reporting on mobile              |
| Performance Monitoring           | Not configured | Network/UI performance on mobile       |
| Firebase Data Connect            | Not configured | Not applicable (uses PostgreSQL)       |

### Specific Issues

1. **Storage rules too permissive** (`storage.rules:5`): `match /{allPaths=**}` with only `request.auth != null` allows any authenticated Firebase user full access. Add path scoping, size limits, and content-type validation.

2. **Firestore rules unused** (`firestore.rules`): Rules exist but no application code uses Firestore. Either remove the rules/config or implement Firestore for real-time features.

3. **Client Firebase plugins orphaned** (`package.json:23-24`): Two Capacitor Firebase plugins are installed but never imported. Remove them or implement actual Firebase Auth/Storage on the client.

4. **No App Check**: Without Firebase App Check, the storage bucket is vulnerable to abuse from unauthorized clients that obtain Firebase project credentials.

5. **No Firebase Auth integration**: The app uses custom JWT auth. Firebase Auth could provide native social login, phone auth, and seamless token management on mobile via Capacitor.

6. **Signed URLs expire in 1 hour** (`upload.ts:46`): Uploaded images become inaccessible after 1 hour unless the signed URL is refreshed. This may be intentional for security (transient upload access).

7. **Admin SDK bypasses security rules**: All storage operations use the service account (Admin SDK) which bypasses `storage.rules`. Security is enforced at the application layer via `requireRole('manager', 'agent')` middleware.
