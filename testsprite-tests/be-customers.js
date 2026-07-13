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
    console.error('Cannot run Customer tests: manager login failed');
    process.exitCode = 1;
    return;
  }

  const auth = { Authorization: `Bearer ${managerToken}` };

  await test('GET /api/customers returns array', async () => {
    const { status, body } = await request('/api/customers', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body) || Array.isArray(body.data), 'Expected array');
  });

  await test('POST /api/customers creates customer', async () => {
    const { status, body } = await request('/api/customers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        full_name: `عميل تجريبي ${Date.now()}`,
        id_number: `${Date.now()}`,
        phone: `77${Math.floor(Math.random() * 10000000)}`,
        region: 'صنعاء',
      }),
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.id_number || body.idNumber, 'Expected id_number field');
  });

  await test('POST /api/customers with existing id_number upserts', async () => {
    const idNum = `UPSERT${Date.now()}`;
    await request('/api/customers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ full_name: 'Customer A', id_number: idNum }),
    });
    const { status, body } = await request('/api/customers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ full_name: 'Customer A Updated', id_number: idNum }),
    });
    assert(status === 201, `Expected 201 for upsert, got ${status}`);
  });

  await test('POST /api/customers without required fields returns 400', async () => {
    const { status } = await request('/api/customers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ phone: '771234567' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('GET /api/customers/search with valid query returns results', async () => {
    const { status, body } = await request('/api/customers/search?q=test', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body), 'Expected array');
  });

  await test('GET /api/customers/search with short query returns 400', async () => {
    const { status } = await request('/api/customers/search?q=a', { headers: auth });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('GET /api/customers/:id returns customer with operations', async () => {
    const create = await request('/api/customers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        full_name: `Get Customer ${Date.now()}`,
        id_number: `${Date.now()}99`,
      }),
    });
    if (create.status === 201) {
      const customerId = create.body.id;
      const { status, body } = await request(`/api/customers/${customerId}`, { headers: auth });
      assert(status === 200, `Expected 200, got ${status}`);
      assert(Array.isArray(body.operations), 'Expected operations array');
    }
  });
}

run();
