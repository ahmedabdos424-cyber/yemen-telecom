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
    console.error('Cannot run Agent CRUD tests: manager login failed');
    process.exitCode = 1;
    return;
  }

  const auth = { Authorization: `Bearer ${managerToken}` };

  await test('GET /api/agents returns array', async () => {
    const { status, body } = await request('/api/agents', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body) || Array.isArray(body.data), 'Expected array or paginated response');
  });

  await test('POST /api/agents creates agent with credentials', async () => {
    const { status, body } = await request('/api/agents', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: `Test Agent ${Date.now()}`,
        region: 'صنعاء',
        phone: `77${Math.floor(Math.random() * 10000000)}`,
      }),
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.agent, 'Expected agent object');
    assert(body.credentials, 'Expected credentials object');
    assert(body.credentials.username, 'Expected username in credentials');
    assert(body.credentials.password, 'Expected password in credentials');
    assert(body.agent.name.startsWith('Test Agent'), 'Expected matching name');
  });

  await test('POST /api/agents with duplicate username returns 409', async () => {
    const username = `dup_agent_${Date.now()}`;
    await request('/api/agents', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: 'Agent1', username, password: 'TestPass123!' }),
    });
    const { status } = await request('/api/agents', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: 'Agent2', username, password: 'TestPass123!' }),
    });
    assert(status === 409, `Expected 409, got ${status}`);
  });

  await test('POST /api/agents without name returns 400', async () => {
    const { status } = await request('/api/agents', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ region: 'region' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /api/agents with weak password returns 400', async () => {
    const { status } = await request('/api/agents', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: 'Weak Pass Agent', password: 'weak' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('GET /api/agents/:id returns single agent', async () => {
    const create = await request('/api/agents', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: `Single Agent ${Date.now()}` }),
    });
    const { status, body } = await request(`/api/agents/${create.body.agent.id}`, { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.id === create.body.agent.id, 'Expected matching ID');
  });

  await test('GET /api/agents/999999 returns 404', async () => {
    const { status } = await request('/api/agents/999999', { headers: auth });
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('PUT /api/agents/:id updates agent', async () => {
    const create = await request('/api/agents', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: `Update Agent ${Date.now()}` }),
    });
    const { status, body } = await request(`/api/agents/${create.body.agent.id}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ name: 'Updated Agent Name', region: 'عدن' }),
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.name === 'Updated Agent Name', `Expected updated name, got ${body.name}`);
  });

  await test('DELETE /api/agents/:id soft-deletes agent', async () => {
    const create = await request('/api/agents', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: `Delete Agent ${Date.now()}` }),
    });
    const { status } = await request(`/api/agents/${create.body.agent.id}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('DELETE /api/agents/999999 returns 404', async () => {
    const { status } = await request('/api/agents/999999', {
      method: 'DELETE',
      headers: auth,
    });
    assert(status === 404, `Expected 404, got ${status}`);
  });
}

run();
