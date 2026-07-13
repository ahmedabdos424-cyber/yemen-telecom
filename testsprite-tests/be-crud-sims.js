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
    console.error('Cannot run SIM CRUD tests: manager login failed');
    process.exitCode = 1;
    return;
  }

  const auth = { Authorization: `Bearer ${managerToken}` };

  await test('GET /api/sims returns array', async () => {
    const { status, body } = await request('/api/sims', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body) || Array.isArray(body.data), 'Expected array or paginated response');
  });

  await test('GET /api/sims with pagination returns paginated response', async () => {
    const { status, body } = await request('/api/sims?page=1&limit=5', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    if (body.total !== undefined) {
      assert(typeof body.total === 'number', 'Expected total field');
      assert(Array.isArray(body.data), 'Expected data array');
    }
  });

  await test('POST /api/sims with valid data creates SIM', async () => {
    const iccid = `TEST${Date.now()}${Math.random().toString().slice(2, 8)}`;
    const { status, body } = await request('/api/sims', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        iccid,
        phone: `77${Math.floor(Math.random() * 10000000)}`,
        provider: 'Yemen Mobile',
        status: 'available',
      }),
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.iccid === iccid, 'Expected ICCID to match');
    assert(body.id, 'Expected id field');
  });

  await test('POST /api/sims with duplicate ICCID returns 409', async () => {
    const iccid = `DUP${Date.now()}`;
    await request('/api/sims', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ iccid, provider: 'Yemen Mobile' }),
    });
    const { status } = await request('/api/sims', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ iccid, provider: 'Yemen Mobile' }),
    });
    assert(status === 409, `Expected 409, got ${status}`);
  });

  await test('POST /api/sims without iccid returns 400', async () => {
    const { status } = await request('/api/sims', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ provider: 'Yemen Mobile' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /api/sims with invalid provider returns 400', async () => {
    const { status } = await request('/api/sims', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ iccid: `INV${Date.now()}`, provider: 'InvalidProvider' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('GET /api/sims/:id returns single SIM', async () => {
    const create = await request('/api/sims', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ iccid: `GET${Date.now()}`, provider: 'Yemen Mobile' }),
    });
    const { status, body } = await request(`/api/sims/${create.body.id}`, { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.id === create.body.id, 'Expected matching ID');
  });

  await test('GET /api/sims/999999 returns 404', async () => {
    const { status } = await request('/api/sims/999999', { headers: auth });
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('PUT /api/sims/:id updates SIM', async () => {
    const create = await request('/api/sims', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ iccid: `UPD${Date.now()}`, provider: 'Yemen Mobile' }),
    });
    const { status, body } = await request(`/api/sims/${create.body.id}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ status: 'sold' }),
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.status === 'sold', `Expected status sold, got ${body.status}`);
  });

  await test('DELETE /api/sims/:id deletes SIM', async () => {
    const create = await request('/api/sims', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ iccid: `DEL${Date.now()}`, provider: 'Yemen Mobile' }),
    });
    const { status } = await request(`/api/sims/${create.body.id}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });
}

run();
