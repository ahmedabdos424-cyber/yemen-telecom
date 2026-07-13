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
    console.error('Cannot run RBAC tests: manager login failed');
    process.exitCode = 1;
    return;
  }

  // Unauthenticated access tests
  await test('GET /api/sims without auth returns 401', async () => {
    const { status } = await request('/api/sims');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /api/agents without auth returns 401', async () => {
    const { status } = await request('/api/agents');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /api/sellers without auth returns 401', async () => {
    const { status } = await request('/api/sellers');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /api/customers without auth returns 401', async () => {
    const { status } = await request('/api/customers');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /api/operations without auth returns 401', async () => {
    const { status } = await request('/api/operations');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /api/alerts without auth returns 401', async () => {
    const { status } = await request('/api/alerts');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /api/inventories without auth returns 401', async () => {
    const { status } = await request('/api/inventories');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /api/admin/settings without auth returns 401', async () => {
    const { status } = await request('/api/admin/settings');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /api/reports/daily-sales without auth returns 401', async () => {
    const { status } = await request('/api/reports/daily-sales');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // Manager access tests
  await test('GET /api/sims with manager token returns 200', async () => {
    const { status } = await request('/api/sims', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/agents with manager token returns 200', async () => {
    const { status } = await request('/api/agents', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/sellers with manager token returns 200', async () => {
    const { status } = await request('/api/sellers', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/admin/settings with manager token returns 200', async () => {
    const { status } = await request('/api/admin/settings', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/reports/daily-sales with manager token returns 200', async () => {
    const { status } = await request('/api/reports/daily-sales', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/reports/agent-performance with manager token returns 200', async () => {
    const { status } = await request('/api/reports/agent-performance', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/reports/operator-distribution with manager token returns 200', async () => {
    const { status } = await request('/api/reports/operator-distribution', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/reports/seller-performance with manager token returns 200', async () => {
    const { status } = await request('/api/reports/seller-performance', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/admin/transactions with manager token returns 200', async () => {
    const { status } = await request('/api/admin/transactions', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/admin/audit-logs with manager token returns 200', async () => {
    const { status } = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/admin/duplicate-identities with manager token returns 200', async () => {
    const { status } = await request('/api/admin/duplicate-identities', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/admin/monitoring with manager token returns 200', async () => {
    const { status } = await request('/api/admin/monitoring', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/admin/system/lockdown/status with manager token returns 200', async () => {
    const { status } = await request('/api/admin/system/lockdown/status', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/stats with manager token returns 200', async () => {
    const { status } = await request('/api/stats', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /api/distributions/pending-count with manager token returns 200', async () => {
    const { status } = await request('/api/distributions/pending-count', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });
}

run();
