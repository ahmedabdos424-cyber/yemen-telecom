# Phases 5-8: Technology Assessment

Based on complete source code analysis, the following technologies are **not present** in this project:

## Phase 5: Firebase Data Connect
**Status: ❌ Not Used**
- No `dataconnect/` directory existed (empty directory created per request)
- No `schema.gql` or GraphQL schema files
- Firebase Data Connect is a serverless PostgreSQL + GraphQL offering — this project uses a custom Express API with raw PostgreSQL queries
- Recommendation: Data Connect could replace the custom Express API layer, but would require a full migration

## Phase 6: GraphQL
**Status: ❌ Not Used**
- No `.gql`, `.graphql`, or `.graphqls` files exist
- No Apollo, Relay, graphql-http, or any GraphQL libraries in package.json
- The project uses a standard REST API pattern with 13 Express route files
- Recommendation: GraphQL could benefit the frontend for flexible data fetching, but the current REST API with pagination is functional

## Phase 7: Firebase Security Rules
**Status: ⚠️ Partially Configured**
- `storage.rules`: Basic rules — `allow read, write: if request.auth != null` (any authenticated Firebase user)
- `firestore.rules`: Same generic rule — but Firestore is **not used** in the application
- `firestore.indexes.json`: Empty array (no indexes needed — no Firestore usage)
- **Gaps**: No path-based restrictions, no size limits, no content-type validation, no user-based access control
- Storage paths follow `uploads/{filename}` pattern — could restrict to `match /uploads/{allPaths=**}`
- Server generates signed URLs — client never writes directly to Firebase

## Phase 8: Firebase MCP
**Status: ❌ Not Configured**
- No MCP configuration files found (no `.opencode/`, `opencode.json`, or MCP server configs)
- No Firebase MCP integration exists in the project
- The Firebase MCP server is available in this environment but was not used for project setup
- Recommendation: Firebase MCP can help manage Firebase project configuration, deploy Storage/Firestore rules, and sync project settings
