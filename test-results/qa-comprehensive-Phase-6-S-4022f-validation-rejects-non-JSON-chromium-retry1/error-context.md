# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-comprehensive.spec.cjs >> Phase 6: Security Testing (Production) >> Content-Type validation rejects non-JSON
- Location: qa-tests\qa-comprehensive.spec.cjs:191:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 429
```

# Test source

```ts
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
  133 |     expect(csp).not.toContain("'unsafe-inline'");
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
> 198 |     expect(r.status).toBe(400);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
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
  234 |     ['GET', '/api/stats'],
  235 |     ['GET', '/api/operations'],
  236 |     ['GET', '/api/distributions/pending-count'],
  237 |     ['GET', '/api/admin/system/lockdown/status'],
  238 |     ['GET', '/api/admin/monitoring'],
  239 |   ];
  240 | 
  241 |   for (const [method, endpoint] of authEndpoints) {
  242 |     test(`${method} ${endpoint} requires authentication`, async () => {
  243 |       const r = await fetchProd(endpoint, { method });
  244 |       // Should be 401 (no token) or 500 (server error)
  245 |       expect([401, 500]).toContain(r.status);
  246 |     });
  247 |   }
  248 | });
  249 | 
  250 | // ======================================================================
  251 | // PHASE 7: UI TESTING — Local preview screenshots
  252 | // ======================================================================
  253 | test.describe('Phase 7: UI Testing (Local Preview)', () => {
  254 |   test('Home page loads in RTL Arabic', async ({ page }) => {
  255 |     await page.goto(LOCAL_URL + '/index.html', { waitUntil: 'networkidle' });
  256 |     await page.waitForSelector('html[dir="rtl"]', { timeout: 10000 });
  257 |     const dir = await page.getAttribute('html', 'dir');
  258 |     expect(dir).toBe('rtl');
  259 |     const lang = await page.getAttribute('html', 'lang');
  260 |     expect(lang).toBe('ar');
  261 |     const title = await page.title();
  262 |     expect(title).toContain('يمن');
  263 |   });
  264 | 
  265 |   test('SPA renders and mounts React app', async ({ page }) => {
  266 |     await page.goto(LOCAL_URL + '/index.html', { waitUntil: 'networkidle' });
  267 |     // Wait for root element to have content
  268 |     await page.waitForSelector('#root', { timeout: 10000 });
  269 |     const html = await page.content();
  270 |     // The SPA should render content inside #root
  271 |     expect(html.length).toBeGreaterThan(1000);
  272 |   });
  273 | 
  274 |   test('Light/Dark mode classes present', async ({ page }) => {
  275 |     await page.goto(LOCAL_URL + '/index.html', { waitUntil: 'networkidle' });
  276 |     const classList = await page.getAttribute('html', 'class');
  277 |     // Should have either 'light' or 'dark' class
  278 |     expect(classList).toMatch(/light|dark/);
  279 |   });
  280 | 
  281 |   test('Login form is rendered', async ({ page }) => {
  282 |     await page.goto(LOCAL_URL + '/index.html', { waitUntil: 'networkidle' });
  283 |     await page.waitForSelector('#root', { timeout: 10000 });
  284 |     // Take screenshot of initial state
  285 |     const html = await page.content();
  286 |     // Expect React renders something meaningful
  287 |     expect(html).toContain('id="root"');
  288 |   });
  289 | });
  290 | 
  291 | // ======================================================================
  292 | // PHASE 8: ACCESSIBILITY — Structural checks
  293 | // ======================================================================
  294 | test.describe('Phase 8: Accessibility (Local Preview)', () => {
  295 |   test('HTML has lang and dir attributes for screen readers', async ({ page }) => {
  296 |     await page.goto(LOCAL_URL + '/index.html', { waitUntil: 'networkidle' });
  297 |     const lang = await page.getAttribute('html', 'lang');
  298 |     expect(lang).toBeTruthy();
```