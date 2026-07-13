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
  await test('GET /api/health returns 200', async () => {
    const { status, body } = await request('/api/health');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.status === 'ok' || body.status === 'healthy' || body.db, 'Expected health status');
  });

  await test('GET /api/health includes db status', async () => {
    const { body } = await request('/api/health');
    assert('db' in body || 'database' in body || 'status' in body, 'Expected db field');
  });

  await test('GET /api/csrf-token returns token and hash', async () => {
    const { status, body } = await request('/api/csrf-token');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.token, 'Expected token');
    assert(body.hash, 'Expected hash');
  });

  await test('GET /api/unknown-route returns 404', async () => {
    const { status } = await request('/api/nonexistent-endpoint-xyz');
    assert(status === 404, `Expected 404, got ${status}`);
  });
}

run();
