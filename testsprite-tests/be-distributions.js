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
    console.error('Cannot run Distribution tests: manager login failed');
    process.exitCode = 1;
    return;
  }

  const auth = { Authorization: `Bearer ${managerToken}` };

  await test('GET /api/distributions returns array', async () => {
    const { status, body } = await request('/api/distributions', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body) || Array.isArray(body.data), 'Expected array');
  });

  await test('GET /api/distributions/pending-count returns count', async () => {
    const { status, body } = await request('/api/distributions/pending-count', { headers: auth });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof body.count === 'number', 'Expected count number');
  });

  await test('POST /api/distributions as manager returns 403', async () => {
    const { status } = await request('/api/distributions', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        operator: 'Yemen Mobile',
        count: 10,
      }),
    });
    assert(status === 403, `Expected 403, got ${status}`);
  });
}

run();
