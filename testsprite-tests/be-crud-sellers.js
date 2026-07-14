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
    console.error('Cannot run Seller CRUD tests: manager login failed');
    process.exitCode = 1;
    return;
  }

  const auth = { Authorization: `Bearer ${managerToken}` };

  await test('GET /api/sellers returns array', async () => {
    const { status, body } = await request('/api/sellers', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body) || Array.isArray(body.data), 'Expected array or paginated response');
  });

  await test('POST /api/sellers creates seller with credentials', async () => {
    const { status, body } = await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: `Test Seller ${Date.now()}`,
        store_name: 'متجر تجريبي',
        phone: `77${Math.floor(Math.random() * 10000000)}`,
        region: 'صنعاء',
      }),
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.seller, 'Expected seller object');
    assert(body.credentials, 'Expected credentials object');
    assert(body.seller.name.startsWith('Test Seller'), 'Expected matching name');
  });

  await test('POST /api/sellers with duplicate username returns 409', async () => {
    const username = `dup_seller_${Date.now()}`;
    await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: 'Seller1', username, password: 'TestPass123!' }),
    });
    const { status } = await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: 'Seller2', username, password: 'TestPass123!' }),
    });
    assert(status === 409, `Expected 409, got ${status}`);
  });

  await test('POST /api/sellers without name returns 400', async () => {
    const { status } = await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ region: 'region' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('GET /api/sellers/:id returns single seller', async () => {
    const create = await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: `Get Seller ${Date.now()}` }),
    });
    const { status, body } = await request(`/api/sellers/${create.body.seller.id}`, { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.id === create.body.seller.id, 'Expected matching ID');
  });

  await test('PUT /api/sellers/:id updates seller', async () => {
    const create = await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: `Update Seller ${Date.now()}` }),
    });
    const { status, body } = await request(`/api/sellers/${create.body.seller.id}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ name: 'Updated Seller Name', region: 'عدن' }),
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.name === 'Updated Seller Name', `Expected updated name, got ${body.name}`);
  });

  await test('PUT /api/sellers/:id/balance updates balance', async () => {
    const create = await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: `Balance Seller ${Date.now()}` }),
    });
    const { status } = await request(`/api/sellers/${create.body.seller.id}/balance`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ amount: 500 }),
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('PUT /api/sellers/:id/balance with negative amount returns 400', async () => {
    const create = await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: `Neg Balance ${Date.now()}` }),
    });
    const { status } = await request(`/api/sellers/${create.body.seller.id}/balance`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ amount: -100 }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /api/sellers/:id/reset-password generates new credentials', async () => {
    const create = await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: `Reset Seller ${Date.now()}` }),
    });
    const { status, body } = await request(`/api/sellers/${create.body.seller.id}/reset-password`, {
      method: 'POST',
      headers: auth,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.credentials, 'Expected new credentials');
  });

  await test('DELETE /api/sellers/:id cascading soft delete', async () => {
    const create = await request('/api/sellers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: `Delete Seller ${Date.now()}` }),
    });
    const { status } = await request(`/api/sellers/${create.body.seller.id}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });
}

run();
