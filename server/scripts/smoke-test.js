/**
 * Smoke Tests — Post-deploy verification
 * Run: node server/scripts/smoke-test.js [base_url]
 *
 * Verifies critical paths are operational after deployment.
 * Exit code 0 = all pass, 1 = any failure.
 */

const BASE = process.argv[2] || 'http://localhost:4000';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => null);
  return { status: res.status, body, headers: Object.fromEntries(res.headers) };
}

async function main() {
  console.log(`\n🔍 Smoke tests against ${BASE}\n`);

  // 1. Health endpoint
  await test('GET /api/health returns 200', async () => {
    const { status, body } = await fetchJSON(`${BASE}/api/health`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.status === 'ok', `Expected status ok, got ${body.status}`);
    assert(body.db === 'connected', `Expected db connected, got ${body.db}`);
  });

  // 2. Readiness
  await test('GET /readiness returns 200', async () => {
    const { status } = await fetchJSON(`${BASE}/readiness`);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // 3. Liveness
  await test('GET /liveness returns 200', async () => {
    const { status } = await fetchJSON(`${BASE}/liveness`);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // 4. CSRF token
  await test('GET /api/csrf-token returns token', async () => {
    const { status, body } = await fetchJSON(`${BASE}/api/csrf-token`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.csrfToken, 'Missing csrfToken in response');
  });

  // 5. Auth — login
  let authToken;
  await test('POST /api/auth/login succeeds', async () => {
    const { status, body } = await fetchJSON(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager', password: 'Admin@123' }),
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.token, 'Missing token');
    authToken = body.token;
  });

  // 6. Auth — protected endpoint
  await test('GET /api/stats returns data with auth', async () => {
    const { status, body } = await fetchJSON(`${BASE}/api/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.totalSims !== undefined, 'Missing totalSims');
  });

  // 7. Auth — without token returns 401
  await test('GET /api/stats returns 401 without token', async () => {
    const { status } = await fetchJSON(`${BASE}/api/stats`);
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // 8. Static frontend
  await test('GET / returns HTML', async () => {
    const res = await fetch(`${BASE}/`);
    const text = await res.text();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes('<!DOCTYPE html>') || text.includes('<!doctype html>'), 'Not HTML');
  });

  // 9. CORS headers
  await test('CORS headers present', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { Origin: 'https://yementelecom1.netlify.app' },
    });
    const corsHeader = res.headers.get('access-control-allow-origin');
    assert(corsHeader, 'Missing CORS header');
  });

  // 10. Circuit breaker endpoint
  await test('GET /api/sre/circuit-breaker returns status', async () => {
    const { status, body } = await fetchJSON(`${BASE}/api/sre/circuit-breaker`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.state, 'Missing state');
  });

  // 11. Feature flags endpoint
  await test('GET /api/feature-flags returns list', async () => {
    const { status, body } = await fetchJSON(`${BASE}/api/feature-flags`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body.flags), 'Missing flags array');
  });

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(40)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke test runner failed:', err);
  process.exit(1);
});
