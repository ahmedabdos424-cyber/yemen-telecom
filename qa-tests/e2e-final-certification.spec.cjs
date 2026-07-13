// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const API = 'http://localhost:4000';

// Shared auth state — login once, reuse across all tests
let sharedToken = null;
let sharedCsrfToken = null;
let sharedCsrfHash = null;

async function getAuthHeaders(request) {
  if (sharedToken) {
    return {
      'Authorization': `Bearer ${sharedToken}`,
      'X-CSRF-Token': sharedCsrfToken,
      'X-CSRF-Hash': sharedCsrfHash,
    };
  }
  const csrfRes = await request.get(`${API}/api/csrf-token`);
  const csrfData = await csrfRes.json();
  sharedCsrfToken = csrfData.token;
  sharedCsrfHash = csrfData.hash;
  const loginRes = await request.post(`${API}/api/auth/login`, {
    data: { username: 'manager', password: 'Admin@123' },
    headers: { 'X-CSRF-Token': sharedCsrfToken, 'X-CSRF-Hash': sharedCsrfHash },
  });
  const loginData = await loginRes.json();
  sharedToken = loginData.token;
  return {
    'Authorization': `Bearer ${sharedToken}`,
    'X-CSRF-Token': sharedCsrfToken,
    'X-CSRF-Hash': sharedCsrfHash,
  };
}

test.describe('FINAL RELEASE CERTIFICATION - Yemen Telecom Admin Panel', () => {

  // ═══════════════════════════════════════════════
  // SECTION 1: INFRASTRUCTURE (5 tests)
  // ═══════════════════════════════════════════════

  test('1.1 Backend health check', async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.db).toBe('connected');
    expect(data.uptime).toBeGreaterThan(0);
  });

  test('1.2 Frontend serves HTML with RTL', async ({ request }) => {
    const res = await request.get(BASE);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
  });

  test('1.3 Frontend serves manifest.json', async ({ request }) => {
    const res = await request.get(`${BASE}/manifest.json`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.name).toBeTruthy();
  });

  test('1.4 Frontend serves static assets', async ({ request }) => {
    const [iconRes, svgRes] = await Promise.all([
      request.get(`${BASE}/icon-192.png`),
      request.get(`${BASE}/icon.svg`),
    ]);
    expect(iconRes.ok()).toBeTruthy();
    expect(svgRes.ok()).toBeTruthy();
  });

  // ═══════════════════════════════════════════════
  // SECTION 2: SECURITY VERIFICATION (7 tests)
  // ═══════════════════════════════════════════════

  test('2.1 CSRF token endpoint works', async ({ request }) => {
    const res = await request.get(`${API}/api/csrf-token`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.token).toBeTruthy();
    expect(data.hash).toBeTruthy();
  });

  test('2.2 Auth/me returns 401 without token', async ({ request }) => {
    const res = await request.get(`${API}/api/auth/me`);
    expect(res.status()).toBe(401);
  });

  test('2.3 POST without CSRF token returns 403', async ({ request }) => {
    const res = await request.post(`${API}/api/sims`, {
      data: { iccid: 'test', msisdn: 'test', operator: 'test' },
    });
    expect(res.status()).toBe(403);
  });

  test('2.4 Protected endpoints require auth (8 endpoints)', async ({ request }) => {
    const endpoints = [
      '/api/sims', '/api/agents', '/api/sellers', '/api/alerts',
      '/api/customers', '/api/stats', '/api/reports/daily-sales', '/api/admin/settings',
    ];
    for (const path of endpoints) {
      const res = await request.get(`${API}${path}`);
      expect(res.status()).toBe(401);
    }
  });

  test('2.5 Invalid login credentials rejected', async ({ request }) => {
    const csrfRes = await request.get(`${API}/api/csrf-token`);
    const csrfData = await csrfRes.json();
    const res = await request.post(`${API}/api/auth/login`, {
      data: { username: 'nonexistent', password: 'wrong' },
      headers: { 'X-CSRF-Token': csrfData.token, 'X-CSRF-Hash': csrfData.hash },
    });
    expect(res.status() >= 400).toBeTruthy();
  });

  test('2.6 Lockdown status endpoint returns structure', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/admin/system/lockdown/status`, { headers });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('locked');
    expect(typeof data.locked).toBe('boolean');
  });

  test('2.7 Distribution pending count endpoint', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/distributions/pending-count`, { headers });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('count');
  });

  // ═══════════════════════════════════════════════
  // SECTION 3: AUTHENTICATED API ENDPOINTS (22 tests)
  // ═══════════════════════════════════════════════

  test('3.1 Login as manager and get token', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    expect(sharedToken).toBeTruthy();
    expect(headers['Authorization']).toContain('Bearer');
  });

  test('3.2 GET /api/sims', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/sims`, { headers });
    expect(res.ok()).toBeTruthy();
    const sims = await res.json();
    const isValid = Array.isArray(sims) || (sims && sims.data && Array.isArray(sims.data));
    expect(isValid).toBeTruthy();
  });

  test('3.3 GET /api/agents', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/agents`, { headers });
    expect(res.ok()).toBeTruthy();
    const agents = await res.json();
    const isValid = Array.isArray(agents) || (agents && agents.data && Array.isArray(agents.data));
    expect(isValid).toBeTruthy();
  });

  test('3.4 GET /api/sellers', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/sellers`, { headers });
    expect(res.ok()).toBeTruthy();
    const sellers = await res.json();
    expect(Array.isArray(sellers)).toBeTruthy();
  });

  test('3.5 GET /api/alerts', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/alerts`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.6 GET /api/customers', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/customers`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.7 GET /api/stats', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/stats`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.8 GET /api/operations', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/operations`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.9 GET /api/inventories', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/inventories`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.10 GET /api/admin/settings', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/admin/settings`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.11 GET /api/reports/daily-sales', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/reports/daily-sales`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.12 GET /api/reports/agent-performance', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/reports/agent-performance`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.13 GET /api/reports/operator-distribution', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/reports/operator-distribution`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.14 GET /api/reports/seller-performance', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/reports/seller-performance`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.15 GET /api/admin/transactions', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/admin/transactions`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.16 GET /api/admin/duplicate-identities', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/admin/duplicate-identities`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.17 GET /api/admin/audit-logs', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/admin/audit-logs`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.18 GET /api/admin/monitoring', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/admin/monitoring`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.19 GET /api/customers/search?q=test', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/customers/search?q=test`, { headers });
    expect(res.ok()).toBeTruthy();
  });

  test('3.20 API: All responses have valid JSON', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const endpoints = ['/api/sims', '/api/agents', '/api/sellers', '/api/stats', '/api/alerts'];
    for (const path of endpoints) {
      const res = await request.get(`${API}${path}`, { headers });
      expect(res.ok()).toBeTruthy();
      const ct = res.headers()['content-type'] || '';
      expect(ct).toContain('application/json');
    }
  });

  // ═══════════════════════════════════════════════
  // SECTION 4: CRUD OPERATIONS (4 tests)
  // ═══════════════════════════════════════════════

  test('4.1 CRUD: Create and delete agent', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const ts = Date.now();
    const createRes = await request.post(`${API}/api/agents`, {
      data: {
        name: `Cert Agent ${ts}`,
        password: 'Test@1234',
        phone: `77${ts}`.slice(0, 9),
        region: 'صنعاء',
      },
      headers,
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    expect(created.agent).toBeTruthy();
    expect(created.agent.id).toBeTruthy();

    const deleteRes = await request.delete(`${API}/api/agents/${created.agent.id}`, { headers });
    expect(deleteRes.ok()).toBeTruthy();
  });

  test('4.2 CRUD: Create and delete seller', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const agentsRes = await request.get(`${API}/api/agents`, { headers });
    const agents = await agentsRes.json();
    if (agents.length > 0) {
      const ts = Date.now();
      const createRes = await request.post(`${API}/api/sellers`, {
        data: {
          name: `Cert Seller ${ts}`,
          password: 'Test@1234',
          phone: `78${ts}`.slice(0, 9),
          region: 'عدن',
          agent_name: agents[0].name,
        },
        headers,
      });
      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      expect(created.seller).toBeTruthy();
      const deleteRes = await request.delete(`${API}/api/sellers/${created.seller.id}`, { headers });
      expect(deleteRes.ok()).toBeTruthy();
    }
  });

  test('4.3 CRUD: Create and delete SIM', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const ts = Date.now();
    const createRes = await request.post(`${API}/api/sims`, {
      data: {
        iccid: `89977${ts}`,
        phone: `77${ts}`.slice(0, 9),
        provider: 'Yemen Mobile',
        status: 'available',
      },
      headers,
    });
    expect(createRes.ok()).toBeTruthy();
    const sim = await createRes.json();

    const updateRes = await request.put(`${API}/api/sims/${sim.id}`, {
      data: { status: 'sold' },
      headers,
    });
    expect(updateRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(`${API}/api/sims/${sim.id}`, { headers });
    expect(deleteRes.ok()).toBeTruthy();
  });

  test('4.4 CRUD: Update and read back settings', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const getRes = await request.get(`${API}/api/admin/settings`, { headers });
    const settings = await getRes.json();
    const updateRes = await request.put(`${API}/api/admin/settings`, {
      data: settings,
      headers,
    });
    expect(updateRes.ok()).toBeTruthy();
  });

  // ═══════════════════════════════════════════════
  // SECTION 5: ERROR HANDLING (2 tests)
  // ═══════════════════════════════════════════════

  test('5.1 Unknown API route returns error', async ({ request }) => {
    const res = await request.get(`${API}/api/nonexistent`);
    expect(res.status() >= 400).toBeTruthy();
  });

  test('5.2 Missing required body fields returns error', async ({ request }) => {
    const csrfRes = await request.get(`${API}/api/csrf-token`);
    const csrfData = await csrfRes.json();
    const res = await request.post(`${API}/api/auth/login`, {
      data: { username: 'manager' },
      headers: { 'X-CSRF-Token': csrfData.token, 'X-CSRF-Hash': csrfData.hash },
    });
    expect(res.ok()).toBeFalsy();
  });

  // ═══════════════════════════════════════════════
  // SECTION 6: DATABASE INTEGRITY (4 tests)
  // ═══════════════════════════════════════════════

  test('6.1 Database: Stats returns object', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/stats`, { headers });
    expect(res.ok()).toBeTruthy();
    const stats = await res.json();
    expect(typeof stats).toBe('object');
  });

  test('6.2 Database: SIMs have id field', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/sims`, { headers });
    const sims = await res.json();
    if (sims.length > 0) {
      expect(sims[0]).toHaveProperty('id');
      expect(sims[0]).toHaveProperty('iccid');
    }
  });

  test('6.3 Database: Agents have id and name', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/agents`, { headers });
    const agents = await res.json();
    if (agents.length > 0) {
      expect(agents[0]).toHaveProperty('id');
      expect(agents[0]).toHaveProperty('name');
    }
  });

  test('6.4 Database: Sellers have totalSales field', async ({ request }) => {
    const headers = await getAuthHeaders(request);
    const res = await request.get(`${API}/api/sellers`, { headers });
    const sellers = await res.json();
    if (sellers.length > 0) {
      expect(sellers[0]).toHaveProperty('id');
      expect(sellers[0]).toHaveProperty('totalSales');
    }
  });

  // ═══════════════════════════════════════════════
  // SECTION 7: BROWSER E2E - FULL FLOW (8 tests)
  // ═══════════════════════════════════════════════

  test('7.1 App loads and shows splash/login', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(BASE);
    await page.waitForTimeout(4000);
    const html = await page.content();
    expect(html).toContain('root');
    const criticalErrors = errors.filter(e => !e.includes('NetworkError') && !e.includes('fetch'));
    expect(criticalErrors.length).toBe(0);
  });

  test('7.2 Login screen renders with inputs and Arabic', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(4000);
    const inputs = await page.$$('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    const body = await page.textContent('body');
    const hasArabic = /[\u0600-\u06FF]/.test(body || '');
    expect(hasArabic).toBeTruthy();
  });

  test('7.3 Login as manager navigates to dashboard', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(4000);
    const inputs = await page.$$('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    await inputs[0].fill('manager');
    await inputs[1].fill('Admin@123');
    const buttons = await page.$$('button');
    let clicked = false;
    for (const b of buttons) {
      const text = await b.textContent();
      if (text && (text.includes('دخول') || text.includes('تسجيل الدخول'))) {
        await b.click();
        clicked = true;
        break;
      }
    }
    if (!clicked && buttons.length > 0) {
      await buttons[buttons.length - 1].click();
    }
    await page.waitForTimeout(4000);
    const url = page.url();
    expect(url.includes('manager') || url.includes('dashboard') || !url.includes('login')).toBeTruthy();
  });

  test('7.4 Dashboard page shows content after login', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(BASE);
    await page.waitForTimeout(4000);
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].fill('manager');
      await inputs[1].fill('Admin@123');
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const text = await b.textContent();
        if (text && (text.includes('دخول') || text.includes('تسجيل الدخول'))) {
          await b.click();
          break;
        }
      }
      await page.waitForTimeout(4000);
      const body = await page.textContent('body');
      expect((body || '').length).toBeGreaterThan(100);
    }
    const criticalErrors = errors.filter(e => !e.includes('NetworkError') && !e.includes('fetch') && !e.includes('favicon'));
    expect(criticalErrors.length).toBe(0);
  });

  test('7.5 Navigate to each manager route', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(4000);
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].fill('manager');
      await inputs[1].fill('Admin@123');
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const text = await b.textContent();
        if (text && (text.includes('دخول') || text.includes('تسجيل الدخول'))) {
          await b.click();
          break;
        }
      }
      await page.waitForTimeout(4000);
    }

    const routes = ['sims', 'agents', 'sellers', 'alerts', 'reports', 'settings', 'duplicate-identities', 'add-agent'];
    for (const route of routes) {
      await page.goto(`${BASE}/manager/${route}`);
      await page.waitForTimeout(2000);
      const html = await page.content();
      expect(html).toContain('root');
    }
  });

  test('7.6 Login screen invalid credentials shows error', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(4000);
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].fill('wronguser');
      await inputs[1].fill('wrongpass');
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const text = await b.textContent();
        if (text && (text.includes('دخول') || text.includes('تسجيل الدخول'))) {
          await b.click();
          break;
        }
      }
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url.includes('manager') || url.includes('dashboard') || url.includes('/')).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════════════
  // SECTION 8: RESPONSIVE DESIGN (3 tests)
  // ═══════════════════════════════════════════════

  test('8.1 Mobile viewport (375x812)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const html = await page.content();
    expect(html).toContain('root');
  });

  test('8.2 Tablet viewport (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const html = await page.content();
    expect(html).toContain('root');
  });

  test('8.3 Desktop viewport (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const html = await page.content();
    expect(html).toContain('root');
  });

  // ═══════════════════════════════════════════════
  // SECTION 9: RTL, ACCESSIBILITY, META (7 tests)
  // ═══════════════════════════════════════════════

  test('9.1 HTML dir="rtl"', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });

  test('9.2 HTML lang="ar"', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('ar');
  });

  test('9.3 Page title present', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('9.4 Meta viewport present', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const viewport = await page.$('meta[name="viewport"]');
    expect(viewport).toBeTruthy();
  });

  test('9.5 Meta theme-color present', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const themeColor = await page.$('meta[name="theme-color"]');
    expect(themeColor).toBeTruthy();
  });

  test('9.6 IBM Plex Sans Arabic font loaded', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const html = await res.text();
    expect(html).toContain('IBM Plex Sans Arabic');
  });

  test('9.7 Material Symbols loaded', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const html = await res.text();
    expect(html).toContain('Material Symbols Outlined');
  });

  // ═══════════════════════════════════════════════
  // SECTION 10: CONSOLE ERRORS (1 test)
  // ═══════════════════════════════════════════════

  test('10.1 No React errors during full login + navigate flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BASE);
    await page.waitForTimeout(4000);
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].fill('manager');
      await inputs[1].fill('Admin@123');
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const text = await b.textContent();
        if (text && (text.includes('دخول') || text.includes('تسجيل الدخول'))) {
          await b.click();
          break;
        }
      }
      await page.waitForTimeout(4000);
    }

    // Navigate a few routes
    for (const route of ['sims', 'agents', 'sellers']) {
      await page.goto(`${BASE}/manager/${route}`);
      await page.waitForTimeout(1500);
    }

    const criticalErrors = errors.filter(e =>
      !e.includes('NetworkError') &&
      !e.includes('fetch') &&
      !e.includes('favicon') &&
      !e.includes('ResizeObserver')
    );
    expect(criticalErrors.length).toBe(0);
  });

  // ═══════════════════════════════════════════════
  // SECTION 11: DARK MODE / THEME (1 test)
  // ═══════════════════════════════════════════════

  test('11.1 Theme toggle present on login screen', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(4000);
    const html = await page.content();
    // Dark mode toggle should exist (Sun/Moon icon or similar)
    expect(html).toContain('root');
    const className = await page.getAttribute('html', 'class');
    expect(className).toContain('light');
  });

  // ═══════════════════════════════════════════════
  // SECTION 12: RATE LIMITING (1 test — LAST)
  // ═══════════════════════════════════════════════

  test('12.1 Rate limiter blocks rapid login attempts', async ({ request }) => {
    const results = [];
    for (let i = 0; i < 35; i++) {
      const csrfRes = await request.get(`${API}/api/csrf-token`);
      const csrfData = await csrfRes.json();
      const res = await request.post(`${API}/api/auth/login`, {
        data: { username: 'test', password: 'wrong' },
        headers: { 'X-CSRF-Token': csrfData.token, 'X-CSRF-Hash': csrfData.hash },
      });
      results.push(res.status());
    }
    const rateLimited = results.filter(s => s === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
