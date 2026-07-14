import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const JWT_SECRET = 'test-jwt-secret-for-k6-at-least-32-chars-long';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 10 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    'auth_duration': ['p(95)<3000'],
    'api_duration': ['p(95)<2000'],
  },
};

const authDuration = new Trend('auth_duration');
const apiDuration = new Trend('api_duration');
const authFailRate = new Rate('auth_fail_rate');
const apiFailRate = new Rate('api_fail_rate');

let token = '';
let csrfToken = '';
let csrfHash = '';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    username: 'manager',
    password: 'Admin@123',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login successful': (r) => r.status === 200 });

  const csrfRes = http.get(`${BASE_URL}/api/csrf-token`);
  check(csrfRes, { 'csrf token obtained': (r) => r.status === 200 });

  return {
    token: loginRes.json('token'),
    csrfToken: csrfRes.json('token'),
    csrfHash: csrfRes.json('hash'),
  };
}

export default function (data) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
      'x-csrf-token': data.csrfToken,
      'x-csrf-hash': data.csrfHash,
    },
  };

  group('Auth endpoints', function () {
    const start = Date.now();

    const meRes = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${data.token}` },
    });
    check(meRes, { '/me returns 200': (r) => r.status === 200 });
    authDuration.add(Date.now() - start);
    authFailRate.add(meRes.status !== 200);
    sleep(0.5);
  });

  group('CRM endpoints', function () {
    const start = Date.now();

    const agentsRes = http.get(`${BASE_URL}/api/agents?page=1&limit=20`, params);
    check(agentsRes, { '/agents returns 200': (r) => r.status === 200 });

    const simsRes = http.get(`${BASE_URL}/api/sims?page=1&limit=50`, params);
    check(simsRes, { '/sims returns 200': (r) => r.status === 200 });

    const sellersRes = http.get(`${BASE_URL}/api/sellers?page=1&limit=50`, params);
    check(sellersRes, { '/sellers returns 200': (r) => r.status === 200 });

    apiDuration.add(Date.now() - start);
    apiFailRate.add(agentsRes.status !== 200 || simsRes.status !== 200);
    sleep(0.5);
  });

  group('Dashboard endpoints', function () {
    const start = Date.now();

    const statsRes = http.get(`${BASE_URL}/api/stats`, params);
    check(statsRes, { '/stats returns 200': (r) => r.status === 200 });

    const alertsRes = http.get(`${BASE_URL}/api/alerts?page=1&limit=20`, params);
    check(alertsRes, { '/alerts returns 200': (r) => r.status === 200 });

    const inventoryRes = http.get(`${BASE_URL}/api/inventories`, params);
    check(inventoryRes, { '/inventories returns 200': (r) => r.status === 200 });

    apiDuration.add(Date.now() - start);
    apiFailRate.add(statsRes.status !== 200);
    sleep(0.5);
  });

  group('Health endpoint', function () {
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, { '/health returns 200': (r) => r.status === 200 });
    check(healthRes, { '/health has status field': (r) => r.json('status') !== undefined });
  });
}

export function teardown(data) {
  if (data.token) {
    http.post(`${BASE_URL}/api/auth/logout`, JSON.stringify({}), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`,
        'x-csrf-token': data.csrfToken,
        'x-csrf-hash': data.csrfHash,
      },
    });
  }
}
