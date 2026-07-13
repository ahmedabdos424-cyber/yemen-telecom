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

async function run() {
  await test('POST /api/auth/login with valid manager credentials', async () => {
    const { status, body } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'manager', password: 'Admin@123' }),
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.token, 'Expected JWT token');
    assert(body.refreshToken, 'Expected refresh token');
    assert(body.user, 'Expected user object');
    assert(body.user.role === 'manager', `Expected manager role, got ${body.user.role}`);
    assert(body.user.username === 'manager', 'Expected username manager');
  });

  await test('POST /api/auth/login with wrong password returns 401', async () => {
    const { status, body } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'manager', password: 'WrongPassword123!' }),
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('POST /api/auth/login with non-existent user returns 401', async () => {
    const { status } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'nonexistent_user_xyz', password: 'Admin@123' }),
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('POST /api/auth/login with missing fields returns 400', async () => {
    const { status } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /api/auth/login with short password returns 400', async () => {
    const { status } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'manager', password: 'short' }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('GET /api/auth/me with valid token returns user', async () => {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'manager', password: 'Admin@123' }),
    });
    const { status, body } = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${login.body.token}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.username === 'manager', 'Expected username manager');
    assert(body.role === 'manager', 'Expected role manager');
  });

  await test('GET /api/auth/me without token returns 401', async () => {
    const { status } = await request('/api/auth/me');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /api/auth/me with invalid token returns 401', async () => {
    const { status } = await request('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('POST /api/auth/refresh with valid refresh token', async () => {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'manager', password: 'Admin@123' }),
    });
    const { status, body } = await request('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: login.body.refreshToken }),
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.token, 'Expected new token');
    assert(body.refreshToken, 'Expected new refresh token');
  });

  await test('POST /api/auth/refresh without token returns 400', async () => {
    const { status } = await request('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /api/auth/refresh with expired/invalid token returns 401', async () => {
    const { status } = await request('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'invalid.refresh.token' }),
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('POST /api/auth/logout with valid token succeeds', async () => {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'manager', password: 'Admin@123' }),
    });
    const { status, body } = await request('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${login.body.token}`,
        'X-Refresh-Token': login.body.refreshToken,
      },
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.message, 'Expected success message');
  });

  await test('POST /api/auth/logout without token returns 401', async () => {
    const { status } = await request('/api/auth/logout', { method: 'POST' });
    assert(status === 401, `Expected 401, got ${status}`);
  });
}

run();
