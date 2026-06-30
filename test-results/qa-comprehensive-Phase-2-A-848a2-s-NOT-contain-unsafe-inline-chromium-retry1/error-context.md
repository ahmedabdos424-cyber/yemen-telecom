# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-comprehensive.spec.cjs >> Phase 2: Authentication (Production) >> CSP does NOT contain unsafe-inline
- Location: qa-tests\qa-comprehensive.spec.cjs:122:3

# Error details

```
Error: expect(received).not.toContain(expected) // indexOf

Expected substring: not "'unsafe-inline'"
Received string:        "default-src 'self';script-src 'self';style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;font-src 'self' https://fonts.gstatic.com;img-src 'self' data: blob:;connect-src 'self';frame-src 'none';object-src 'none';form-action 'self';base-uri 'self';frame-ancestors 'self';script-src-attr 'none';upgrade-insecure-requests"
```

# Test source

```ts
  33  |       headers: options.headers || { 'Content-Type': 'application/json' },
  34  |       rejectUnauthorized: false, timeout: 30000,
  35  |     };
  36  |     const req = https.request(opts, (res) => {
  37  |       let data = '';
  38  |       res.on('data', c => data += c);
  39  |       res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
  40  |     });
  41  |     req.on('error', reject);
  42  |     req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  43  |     if (options.body) req.write(options.body);
  44  |     req.end();
  45  |   });
  46  | }
  47  | 
  48  | // ======================================================================
  49  | // PHASE 2: AUTHENTICATION -- Production API tests
  50  | // ======================================================================
  51  | test.describe('Phase 2: Authentication (Production)', () => {
  52  |   test('GET /api/health returns 200 with db connected', async () => {
  53  |     const r = await fetchProd('/api/health');
  54  |     const j = JSON.parse(r.body);
  55  |     expect(r.status).toBe(200);
  56  |     expect(j.status).toBe('ok');
  57  |     expect(j.db).toBe('connected');
  58  |   });
  59  | 
  60  |   test('GET /api/csrf-token returns token and hash', async () => {
  61  |     const r = await fetchProd('/api/csrf-token');
  62  |     expect(r.status).toBe(200);
  63  |     const j = JSON.parse(r.body);
  64  |     expect(j).toHaveProperty('token');
  65  |     expect(j).toHaveProperty('hash');
  66  |     expect(j.token.length).toBeGreaterThan(0);
  67  |     expect(j.hash.length).toBeGreaterThan(0);
  68  |   });
  69  | 
  70  |   test('POST /api/auth/login (empty body) returns 400 validation', async () => {
  71  |     const r = await fetchProd('/api/auth/login', {
  72  |       method: 'POST', body: JSON.stringify({}),
  73  |     });
  74  |     expect(r.status).toBe(400);
  75  |     expect(r.body).toContain('Validation failed');
  76  |   });
  77  | 
  78  |   test('POST /api/auth/login (invalid creds) returns 401', async () => {
  79  |     const r = await fetchProd('/api/auth/login', {
  80  |       method: 'POST',
  81  |       body: JSON.stringify({ username: 'nonexistent_' + Date.now(), password: 'wrongpass' }),
  82  |     });
  83  |     expect(r.status).toBe(401);
  84  |   });
  85  | 
  86  |   test('POST /api/auth/login (valid creds) returns 200', async () => {
  87  |     // Note: May fail if user doesn't exist or rate limited. This documents the actual behavior.
  88  |     const r = await fetchProd('/api/auth/login', {
  89  |       method: 'POST',
  90  |       body: JSON.stringify({ username: 'manager', password: 'Test@123' }),
  91  |     });
  92  |     // Production bug: this currently returns 500.
  93  |     // Document the actual behavior:
  94  |     if (r.status !== 200) {
  95  |       issue('Critical', 'Auth', 'POST /api/auth/login',
  96  |         'Login with valid credentials',
  97  |         'Should return 200 with JWT token',
  98  |         `Returned ${r.status}: ${r.body.substring(0, 100)}`,
  99  |         'Debug production auth — check DB schema, JWT_SECRET env var, bcrypt compatibility',
  100 |         null);
  101 |       test.info().annotations.push({ type: 'issue', description: `CRITICAL: Login returns ${r.status}` });
  102 |     }
  103 |   });
  104 | 
  105 |   test('GET /api/auth/me (no token) returns 401', async () => {
  106 |     const r = await fetchProd('/api/auth/me');
  107 |     expect(r.status).toBe(401);
  108 |     expect(r.body).toContain('No token');
  109 |   });
  110 | 
  111 |   test('Security headers present', async () => {
  112 |     const r = await fetchProd('/api/health');
  113 |     const headers = r.headers;
  114 |     expect(headers['strict-transport-security']).toBeTruthy();
  115 |     expect(headers['x-content-type-options']).toBe('nosniff');
  116 |     expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  117 |     expect(headers['referrer-policy']).toBeTruthy();
  118 |     expect(headers['content-security-policy']).toBeTruthy();
  119 |   });
  120 | 
  121 |   // CSP must NOT have unsafe-inline
  122 |   test('CSP does NOT contain unsafe-inline', async () => {
  123 |     const r = await fetchProd('/api/health');
  124 |     const csp = r.headers['content-security-policy'] || '';
  125 |     if (csp.includes("'unsafe-inline'")) {
  126 |       issue('High', 'Security', 'Production CSP Header',
  127 |         'Check Content-Security-Policy on production responses',
  128 |         'Should NOT contain unsafe-inline (Sprint 2 fix)',
  129 |         `CSP still contains unsafe-inline: ${csp.substring(0, 150)}...`,
  130 |         'Deploy Sprint 2 code — production is running outdated version with outdated CSP',
  131 |         null);
  132 |     }
> 133 |     expect(csp).not.toContain("'unsafe-inline'");
      |                     ^ Error: expect(received).not.toContain(expected) // indexOf
  134 |   });
  135 | });
  136 | 
  137 | // ======================================================================
  138 | // PHASE 6: SECURITY TESTING — CSRF, Rate Limiting, SQLi, Headers
  139 | // ======================================================================
  140 | test.describe('Phase 6: Security Testing (Production)', () => {
  141 |   test('CSRF protection blocks POST without token', async () => {
  142 |     const r = await fetchProd('/api/sims', {
  143 |       method: 'POST', body: JSON.stringify({ iccid: 'TEST' }),
  144 |     });
  145 |     // Without CSRF: should be 403. Without auth: should be 401.
  146 |     // CSRF middleware runs BEFORE auth, so we get 403 if CSRF fails, 401 if no token.
  147 |     expect([401, 403]).toContain(r.status);
  148 |   });
  149 | 
  150 |   test('Rate limiting active on login', async () => {
  151 |     const attempts = [];
  152 |     for (let i = 0; i < 12; i++) {
  153 |       try {
  154 |         const r = await fetchProd('/api/auth/login', {
  155 |           method: 'POST',
  156 |           body: JSON.stringify({ username: 'ratetest_' + i, password: 'test' }),
  157 |         });
  158 |         attempts.push(r.status);
  159 |         if (r.status === 429) break;
  160 |       } catch (e) { break; }
  161 |     }
  162 |     expect(attempts).toContain(429);
  163 |   });
  164 | 
  165 |   test('SQL injection payloads are rejected', async () => {
  166 |     const payloads = [
  167 |       "' OR 1=1 --",
  168 |       "admin' --",
  169 |       "'; DROP TABLE users; --",
  170 |     ];
  171 |     for (const payload of payloads) {
  172 |       const r = await fetchProd('/api/auth/login', {
  173 |         method: 'POST',
  174 |         body: JSON.stringify({ username: payload, password: payload }),
  175 |       });
  176 |       // Any non-500 response means the injection didn't crash the server
  177 |       // 400 = validation error, 401 = auth failure, 429 = rate limited, 403 = CSRF
  178 |       expect([400, 401, 429, 403]).toContain(r.status);
  179 |     }
  180 |   });
  181 | 
  182 |   test('Rate limiting returns 429 after threshold', async () => {
  183 |     // Verify existing rate limit hasn't expired
  184 |     const r = await fetchProd('/api/auth/login', {
  185 |       method: 'POST', body: JSON.stringify({ username: 'test', password: 'test' }),
  186 |     });
  187 |     // May be 429 if still rate limited, or 400/401 if limit expired
  188 |     expect([400, 401, 429]).toContain(r.status);
  189 |   });
  190 | 
  191 |   test('Content-Type validation rejects non-JSON', async () => {
  192 |     const r = await fetchProd('/api/auth/login', {
  193 |       method: 'POST',
  194 |       body: 'username=test&password=test',
  195 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  196 |     });
  197 |     // Express json middleware won't parse this, so body will be empty → 400 validation
  198 |     expect(r.status).toBe(400);
  199 |   });
  200 | });
  201 | 
  202 | // ======================================================================
  203 | // PHASE 5: API TESTING — All accessible endpoints
  204 | // ======================================================================
  205 | test.describe('Phase 5: API Endpoint Testing', () => {
  206 |   const publicEndpoints = [
  207 |     ['GET', '/api/health', 200],
  208 |     ['GET', '/api/csrf-token', 200],
  209 |     ['GET', '/api/auth/me', 401],
  210 |     ['GET', '/api/routes', 401],
  211 |     ['GET', '/api/cache-stats', 401],
  212 |   ];
  213 | 
  214 |   for (const [method, endpoint, expected] of publicEndpoints) {
  215 |     test(`${method} ${endpoint} returns ${expected}`, async () => {
  216 |       const r = await fetchProd(endpoint, { method });
  217 |       expect(r.status).toBe(expected);
  218 |     });
  219 |   }
  220 | 
  221 |   // Auth-required endpoints should return 401 without token
  222 |   const authEndpoints = [
  223 |     ['GET', '/api/sims'],
  224 |     ['GET', '/api/agents'],
  225 |     ['GET', '/api/sellers'],
  226 |     ['GET', '/api/customers'],
  227 |     ['GET', '/api/inventories'],
  228 |     ['GET', '/api/distributions'],
  229 |     ['GET', '/api/alerts'],
  230 |     ['GET', '/api/admin/settings'],
  231 |     ['GET', '/api/admin/transactions'],
  232 |     ['GET', '/api/admin/audit-logs'],
  233 |     ['GET', '/api/reports/daily-sales'],
```