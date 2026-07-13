# DEPENDENCIES FINAL REPORT

**System**: Yemen Telecom Management Platform  
**Date**: 2026-07-06  
**Score**: 🟡 60/100  

---

## 1. ROOT (FRONTEND) DEPENDENCIES

### Total: 4 direct + ~1,500 transitive (indirect from Vite + React)

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| react | ^19.0.0 | 19.1.0 | 🟡 Minor behind |
| react-dom | ^19.0.0 | 19.1.0 | 🟡 Minor behind |
| react-router-dom | ^7.1.5 | 7.5.0 | 🟡 Minor behind |
| @heroicons/react | ^2.2.0 | 2.2.0 | ✅ Current |
| @capacitor/core | ^7.0.0 | 7.0.0+ | ✅ Current |

### npm audit (root): 9 vulnerabilities

| Severity | Count | Description |
|----------|-------|-------------|
| HIGH | 1 | ngrok command injection |
| MODERATE | 8 | Various (path traversal, XSS, etc.) |

**Note**: ngrok is dev-only, used for tunneling. These are not production risks.

## 2. SERVER DEPENDENCIES

### Total: 30+ direct + ~890 transitive

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| express | ^4.21.0 | 4.21.2 | 🟡 Minor behind |
| firebase-admin | ^12.7.0 | 13.1.0+ | 🟡 Major available |
| jsonwebtoken | ^9.0.2 | 9.0.2 | ✅ Current |
| pg | ^8.13.0 | 8.13.2 | 🟡 Minor behind |
| zod | ^3.24.0 | 3.24.3 | 🟡 Minor behind |

### npm audit (server): 11 vulnerabilities

| Severity | Count | Description |
|----------|-------|-------------|
| HIGH | 1 | form-data CRLF injection |
| MODERATE | 9 | Various (via google-gax, protobufjs) |
| LOW | 1 | Minor issue |

## 3. VULNERABILITY ANALYSIS

### Firebase Admin transitive issues
- Packages: `google-gax`, `protobufjs`, `@grpc/grpc-js`, `form-data`
- These are deep transitive dependencies of `firebase-admin`
- `npm audit fix --force` would break Firebase Admin
- Safest approach: wait for Firebase Admin SDK update

### Key outdated packages
| Package | From | To | Type |
|---------|------|----|------|
| typescript | 5.8.3 | 5.8.4 | Dev |
| @vitejs/plugin-react | 5.2.0 | 6.0.3 | Dev |
| vite | 6.2.3 | 6.3.2 | Dev |
| vitest | ^3.1.1 | 3.1.3 | Dev |
| lucide-react | 0.546.0 | 1.23.0 | Frontend |
| recharts | 2.15.0 | 2.15.3 | Frontend |
| prettier | ^3.5.0 | 3.5.3 | Dev |

## 4. ISSUES

| # | Issue | Severity | Action |
|---|-------|----------|--------|
| 1 | 2 HIGH vulnerabilities | MEDIUM | ngrok dev-only; form-data needs firebase-admin upgrade |
| 2 | 19 outdated packages (root) | LOW | Schedule periodic `npm update` |
| 3 | Firebase Admin major update available | MEDIUM | Upgrade to v13 for security fixes |
| 4| 9 moderate vulnerabilities via google-gax | LOW | Blocked by firebase-admin compatibility |
