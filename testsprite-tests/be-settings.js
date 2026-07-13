const BASE = 'https://yemen-telecom.onrender.com';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  return { status: res.status, body, headers: Object.fromEntries(res.headers) };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (e) {
    console.error(`FAIL: ${name} — ${e.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

let managerToken;

async function loginManager() {
  const { body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'manager', password: 'Admin@123' }),
  });
  managerToken = body.token;
}

async function run() {
  await loginManager();
  if (!managerToken) {
    console.error('Cannot run Settings tests: manager login failed');
    process.exitCode = 1;
    return;
  }

  const auth = { Authorization: `Bearer ${managerToken}` };

  await test('GET /api/admin/settings returns settings object', async () => {
    const { status, body } = await request('/api/admin/settings', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof body === 'object', 'Expected object');
  });

  await test('PUT /api/admin/settings updates settings', async () => {
    const { status, body } = await request('/api/admin/settings', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ language: 'ar' }),
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('PUT /api/admin/settings with no valid fields returns 400', async () => {
    const { status } = await request('/api/admin/settings', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ invalidField: 'value' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('GET /api/admin/transactions returns array', async () => {
    const { status, body } = await request('/api/admin/transactions', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body) || Array.isArray(body.data), 'Expected array');
  });

  await test('GET /api/admin/duplicate-identities returns array', async () => {
    const { status, body } = await request('/api/admin/duplicate-identities', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body) || Array.isArray(body.data), 'Expected array');
  });

  await test('GET /api/admin/audit-logs returns array', async () => {
    const { status, body } = await request('/api/admin/audit-logs', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body) || Array.isArray(body.data), 'Expected array');
  });

  await test('GET /api/admin/monitoring returns status', async () => {
    const { status, body } = await request('/api/admin/monitoring', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.db !== undefined || body.uptime !== undefined, 'Expected monitoring data');
  });

  await test('GET /api/admin/system/lockdown/status returns locked state', async () => {
    const { status, body } = await request('/api/admin/system/lockdown/status', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof body.locked === 'boolean', 'Expected boolean locked field');
  });

  await test('POST /api/admin/system/lockdown toggles lockdown', async () => {
    const before = await request('/api/admin/system/lockdown/status', { headers: auth });
    const { status, body } = await request('/api/admin/system/lockdown', {
      method: 'POST',
      headers: auth,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof body.locked === 'boolean', 'Expected boolean locked field');
    // Restore original state
    if (body.locked !== before.body.locked) {
      await request('/api/admin/system/lockdown', {
        method: 'POST',
        headers: auth,
      });
    }
  });

  await test('GET /api/distributions/pending-count returns count', async () => {
    const { status, body } = await request('/api/distributions/pending-count', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof body.count === 'number', 'Expected count number');
  });

  await test('GET /api/reports/daily-sales returns data', async () => {
    const { status, body } = await request('/api/reports/daily-sales', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body), 'Expected array');
  });

  await test('GET /api/reports/agent-performance returns data', async () => {
    const { status, body } = await request('/api/reports/agent-performance', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body), 'Expected array');
  });

  await test('GET /api/reports/operator-distribution returns sims and operations', async () => {
    const { status, body } = await request('/api/reports/operator-distribution', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body.sims), 'Expected sims array');
    assert(Array.isArray(body.operations), 'Expected operations array');
  });

  await test('GET /api/reports/seller-performance returns data', async () => {
    const { status, body } = await request('/api/reports/seller-performance', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body), 'Expected array');
  });
}

run();
