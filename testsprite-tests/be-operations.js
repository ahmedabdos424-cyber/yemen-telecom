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
    console.error('Cannot run Operations tests: manager login failed');
    process.exitCode = 1;
    return;
  }

  const auth = { Authorization: `Bearer ${managerToken}` };

  await test('GET /api/operations returns array', async () => {
    const { status, body } = await request('/api/operations', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body) || Array.isArray(body.data), 'Expected array');
  });

  await test('POST /api/operations creates operation', async () => {
    const { status, body } = await request('/api/operations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        type: 'activate',
        target: `77${Math.floor(Math.random() * 10000000)}`,
        operator: 'Yemen Mobile',
      }),
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.type === 'activate', 'Expected type activate');
    assert(body.id, 'Expected id field');
  });

  await test('POST /api/operations with recharge type', async () => {
    const { status, body } = await request('/api/operations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        type: 'recharge',
        target: `77${Math.floor(Math.random() * 10000000)}`,
        operator: 'Sabafon',
      }),
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.type === 'recharge', 'Expected type recharge');
  });

  await test('POST /api/operations without target returns 400', async () => {
    const { status } = await request('/api/operations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ type: 'activate' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /api/operations without type returns 400', async () => {
    const { status } = await request('/api/operations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ target: '771234567' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /api/operations with invalid type returns 400', async () => {
    const { status } = await request('/api/operations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ type: 'invalid', target: '771234567' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /api/operations normalizes operator', async () => {
    const { status, body } = await request('/api/operations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        type: 'activate',
        target: `77${Math.floor(Math.random() * 10000000)}`,
        operator: 'yemen mobile',
      }),
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.operator === 'Yemen Mobile', `Expected normalized operator, got ${body.operator}`);
  });

  await test('GET /api/inventories returns array', async () => {
    const { status, body } = await request('/api/inventories', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body), 'Expected array');
  });

  await test('PUT /api/inventories updates inventory', async () => {
    const get = await request('/api/inventories', { headers: auth });
    const inventories = get.body.map(inv => ({
      operator: inv.operator,
      available: inv.available || 0,
      remaining: inv.remaining || 0,
    }));
    if (inventories.length > 0) {
      const { status } = await request('/api/inventories', {
        method: 'PUT',
        headers: auth,
        body: JSON.stringify(inventories),
      });
      assert(status === 200, `Expected 200, got ${status}`);
    }
  });

  await test('PUT /api/inventories with empty array returns 400', async () => {
    const { status } = await request('/api/inventories', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify([]),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });
}

run();
