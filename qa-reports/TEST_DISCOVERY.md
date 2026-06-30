# TEST_DISCOVERY.md

## Application: Yemen Telecom

## Test Environment

- **Production URL**: https://yemen-telecom-api.onrender.com
- **Node.js**: v24.18.0
- **Test Framework**: Vitest 4.1.9
- **Browser Automation**: Playwright

## API Endpoints Discovered

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | /api/health | No | Public |
| GET | /api/csrf-token | No | Public |
| POST | /api/auth/login | No | Public |
| POST | /api/auth/refresh | No | Public |
| POST | /api/auth/logout | Yes | All |
| GET | /api/auth/me | Yes | All |
| GET | /api/sims | Yes | Manager, Agent |
| POST | /api/sims | Yes | Manager |
| PUT | /api/sims/:id | Yes | Manager |
| DELETE | /api/sims/:id | Yes | Manager |
| GET | /api/agents | Yes | Manager, Agent |
| POST | /api/agents | Yes | Manager |
| PUT | /api/agents/:id | Yes | Manager |
| GET | /api/sellers | Yes | Manager, Agent, Seller |
| POST | /api/sellers | Yes | Manager, Agent |
| PUT | /api/sellers/:id | Yes | Manager, Agent |
| DELETE | /api/sellers/:id | Yes | Manager, Agent |
| PUT | /api/sellers/:id/balance | Yes | Manager, Agent |
| POST | /api/sellers/:id/reset-password | Yes | Manager, Agent |
| GET | /api/customers | Yes | Manager, Agent |
| GET | /api/customers/search | Yes | Manager, Agent |
| GET | /api/customers/:id | Yes | Manager, Agent, Seller |
| POST | /api/customers | Yes | Manager, Agent, Seller |
| GET | /api/inventories | Yes | Manager, Agent |
| PUT | /api/inventories | Yes | Manager |
| GET | /api/distributions | Yes | Manager, Agent |
| POST | /api/distributions | Yes | Agent |
| PUT | /api/distributions/:id/approve | Yes | Manager |
| GET | /api/alerts | Yes | Manager |
| DELETE | /api/alerts/:id | Yes | Manager |
| GET | /api/admin/settings | Yes | Manager |
| PUT | /api/admin/settings | Yes | Manager |
| GET | /api/admin/transactions | Yes | Manager |
| GET | /api/admin/duplicate-identities | Yes | Manager |
| GET | /api/admin/audit-logs | Yes | Manager |
| GET | /api/reports/daily-sales | Yes | Manager |
| GET | /api/reports/agent-performance | Yes | Manager |
| GET | /api/reports/operator-distribution | Yes | Manager |
| GET | /api/reports/seller-performance | Yes | Manager, Agent |
| GET | /api/stats | Yes | Manager |
| POST | /api/upload/image | Yes | Manager, Agent |
| POST | /api/upload/images | Yes | Manager, Agent |
| GET | /api/operations | Yes | Manager, Agent |
| POST | /api/operations | Yes | Manager, Agent |
| GET | /api/distributions/pending-count | Yes | Manager |
| POST | /api/admin/system/backup | Yes | Manager |
| POST | /api/admin/system/lockdown | Yes | Manager |
| GET | /api/admin/system/lockdown/status | Yes | Manager |
| GET | /api/admin/monitoring | Yes | Manager |
| GET | / | No | Public (SPA) |

## Frontend Routes

| Route | Component | Access |
|-------|-----------|--------|
| /login | LoginPage | Public |
| /dashboard | DashboardPage | All Roles |
| /sims | SimsPage | Manager, Agent |
| /agents | AgentsPage | Manager |
| /sellers | SellersPage | Manager, Agent |
| /customers | CustomersPage | Manager, Agent |
| /inventory | InventoryPage | Manager |
| /distribution | DistributionPage | Manager, Agent |
| /alerts | AlertsPage | Manager |
| /reports | ReportsPage | Manager |
| /settings | SettingsPage | Manager |
| /profile | ProfilePage | All Roles |
| /activation | ActivationPage | Agent, Seller |

## Middleware Pipeline

1. Helmet (security headers, CSP disabled — manual)
2. Nonce-based CSP middleware
3. CORS
4. Compression (Brotli/Gzip)
5. JSON Body Parser (1mb limit)
6. Static: /uploads, /assets
7. SPA handler for GET /
8. CSRF validation (POST/PUT/DELETE)
9. Rate Limiting (login: 10/15min, refresh: 20/15min, general: 100/min, writes: 30/min)
10. JWT Authentication (all /api/* except /api/auth/*)
11. RBAC: requireRole('manager'|'agent'|'seller')
12. Route handlers (13 modules, 49+ endpoints)
13. 404 handler
14. Global error handler

## Existing Test Coverage

- **15 test files**, **293 tests**
- Frontend: 8 files, 127 tests
- Server: 7 files, 167 tests
- Coverage includes: Auth, CSRF, IDOR, Validation, Token Storage, OCR, SIM Activation, Seller Management, Security, Hardcoded Credentials
- Missing: E2E tests, Playwright tests, Visual regression tests, Performance tests
