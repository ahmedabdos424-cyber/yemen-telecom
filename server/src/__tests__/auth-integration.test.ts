import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import http from 'http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'p1-20-test-jwt-secret';
  process.env.REFRESH_SECRET = 'p1-20-test-refresh-secret';
  process.env.CSRF_SECRET = 'p1-20-test-csrf-secret';
  process.env.BLACKLIST_HMAC_SECRET = 'test-blacklist-hmac-secret';
});

vi.mock('../db', () => ({
  query: vi.fn(),
}));

import { query } from '../db';
import authRoutes from '../routes/auth';

const PASSWORD = 'TestPass123';
const passwordHash = bcrypt.hashSync(PASSWORD, 10);

const testUser = {
  id: 1,
  username: 'testuser',
  password_hash: passwordHash,
  display_name: 'Test User',
  role: 'agent',
  status: 'active',
  phone: '777000001',
  region: 'Sana\'a',
  email: '',
  created_at: new Date(),
  last_login: null,
};

const JWT_SECRET = 'p1-20-test-jwt-secret';
const REFRESH_SECRET = 'p1-20-test-refresh-secret';

function makeToken(payload: any, secret = JWT_SECRET, expiresIn = '1h') {
  return jwt.sign(payload, secret, { expiresIn, issuer: 'yemen-telecom', algorithm: 'HS256' });
}

describe('P1-20 Auth Integration Tests', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    server?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const req = (method: string, path: string, body?: any, headers?: Record<string, string>) => {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
    return fetch(`http://localhost:${port}${path}`, {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
    }).then(async (r) => ({ status: r.status, data: await r.json() }));
  };

  function mockUser(user: any = testUser) {
    (query as any).mockImplementation((sql: string, params: any[]) => {
      if (sql.includes('token_blacklist')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT * FROM users WHERE username')) {
        const username = params[0];
        if (username === user.username) return Promise.resolve({ rows: [user] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('SELECT status FROM users WHERE id')) {
        const id = Number(params[0]);
        if (id === user.id) return Promise.resolve({ rows: [{ status: user.status }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('INSERT INTO token_blacklist')) return Promise.resolve({ rows: [] });
      if (sql.includes('UPDATE users SET last_login')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });
  }

  describe('Full login & token lifecycle', () => {
    it('should login, return token (refreshToken is httpOnly cookie only)', async () => {
      mockUser();
      const r = await req('POST', '/api/auth/login', { username: 'testuser', password: PASSWORD });
      expect(r.status).toBe(200);
      expect(r.data.token).toBeDefined();
      expect(r.data.user.username).toBe('testuser');
    });

    it('should use access token to make authenticated requests', async () => {
      mockUser();
      const r = await req('POST', '/api/auth/login', { username: 'testuser', password: PASSWORD });
      const decoded = jwt.verify(r.data.token, JWT_SECRET) as any;
      expect(decoded.id).toBe(1);
      expect(decoded.role).toBe('agent');
      expect(decoded.iss).toBe('yemen-telecom');
    });

    it('should refresh tokens and return new valid token', async () => {
      mockUser();
      const refreshToken = makeToken(
        { id: 1, username: 'testuser', role: 'agent', type: 'refresh' },
        REFRESH_SECRET, '7d'
      );
      const r = await req('POST', '/api/auth/refresh', { refreshToken });
      expect(r.status).toBe(200);
      expect(r.data.token).toBeDefined();
      const decoded = jwt.verify(r.data.token, JWT_SECRET) as any;
      expect(decoded.id).toBe(1);
    });

    it('should reject expired access tokens', async () => {
      mockUser();
      const expired = makeToken({ id: 1, username: 'testuser', role: 'agent' }, JWT_SECRET, '0s');
      await new Promise(r => setTimeout(r, 100));
      expect(() => jwt.verify(expired, JWT_SECRET)).toThrow('jwt expired');
    });

    it('should reject tampered access tokens', async () => {
      mockUser();
      const token = makeToken({ id: 1, username: 'testuser', role: 'agent' });
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => jwt.verify(tampered, JWT_SECRET)).toThrow();
    });

    it('should reject tokens with wrong secret', async () => {
      mockUser();
      const token = makeToken({ id: 1, username: 'testuser', role: 'agent' }, 'wrong-secret');
      expect(() => jwt.verify(token, JWT_SECRET)).toThrow('invalid signature');
    });
  });

  describe('Token refresh lifecycle', () => {
    it('should reject refresh with expired refresh token', async () => {
      mockUser();
      const expired = makeToken({ id: 1, type: 'refresh' }, REFRESH_SECRET, '0s');
      await new Promise(r => setTimeout(r, 100));
      const r = await req('POST', '/api/auth/refresh', { refreshToken: expired });
      expect(r.status).toBe(401);
    });

    it('should reject refresh with malformed refresh token', async () => {
      mockUser();
      const r = await req('POST', '/api/auth/refresh', { refreshToken: 'not-a-valid-jwt' });
      expect(r.status).toBe(401);
    });

    it('should reject refresh with empty refresh token', async () => {
      mockUser();
      const r = await req('POST', '/api/auth/refresh', { refreshToken: '' });
      expect(r.status).toBe(400);
    });
  });

  describe('Logout / token blacklisting', () => {
    it('should blacklist token on logout', async () => {
      let insertCount = 0;
      (query as any).mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO token_blacklist')) {
          insertCount++;
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('token_blacklist')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT * FROM users WHERE username')) {
          return Promise.resolve({ rows: [testUser] });
        }
        if (sql.includes('UPDATE users SET last_login')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      const r = await req('POST', '/api/auth/login', { username: 'testuser', password: PASSWORD });
      expect(r.status).toBe(200);

      // refreshToken is now httpOnly cookie only — generate a test one for logout
      const rt = makeToken({ id: 1, username: 'testuser', role: 'agent' }, REFRESH_SECRET, '7d');
      await req('POST', '/api/auth/logout', undefined, {
        'Authorization': `Bearer ${r.data.token}`,
        'x-refresh-token': rt,
      });
      expect(insertCount).toBe(2);
    });

    it('should blacklist old refresh token on refresh', async () => {
      mockUser();
      let blacklisted = false;
      (query as any).mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('token_blacklist') && sql.includes('INSERT')) {
          blacklisted = true;
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT 1 FROM token_blacklist')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT * FROM users WHERE username')) {
          return Promise.resolve({ rows: [testUser] });
        }
        if (sql.includes('SELECT status FROM users WHERE id')) {
          return Promise.resolve({ rows: [{ status: 'active' }] });
        }
        if (sql.includes('INSERT INTO token_blacklist')) {
          blacklisted = true;
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('UPDATE users SET last_login')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      const refreshToken = makeToken(
        { id: 1, username: 'testuser', role: 'agent', type: 'refresh' },
        REFRESH_SECRET, '7d'
      );
      const r = await req('POST', '/api/auth/refresh', { refreshToken });
      expect(r.status).toBe(200);
      expect(blacklisted).toBe(true);
    });
  });

  describe('Login validation', () => {
    it('should reject login with missing username', async () => {
      const r = await req('POST', '/api/auth/login', { password: PASSWORD });
      expect(r.status).toBe(400);
    });

    it('should reject login with missing password', async () => {
      const r = await req('POST', '/api/auth/login', { username: 'testuser' });
      expect(r.status).toBe(400);
    });

    it('should reject login with empty body', async () => {
      const r = await req('POST', '/api/auth/login', {});
      expect(r.status).toBe(400);
    });

    it('should reject login with non-existent user', async () => {
      mockUser();
      const r = await req('POST', '/api/auth/login', { username: 'nobody', password: PASSWORD });
      expect(r.status).toBe(401);
    });

    it('should reject login with wrong password', async () => {
      mockUser();
      const r = await req('POST', '/api/auth/login', { username: 'testuser', password: 'WrongPass999' });
      expect(r.status).toBe(401);
    });

    it('should reject login with disabled user', async () => {
      const disabledUser = { ...testUser, status: 'inactive' };
      mockUser(disabledUser);
      const r = await req('POST', '/api/auth/login', { username: 'testuser', password: PASSWORD });
      expect(r.status).toBe(403);
      expect(r.data.error).toBe('Account disabled');
    });
  });

  describe('Password update flow', () => {
    it('should reject password update with weak password', async () => {
      const { updatePasswordSchema } = await import('../validation');
      const result = updatePasswordSchema.safeParse({ currentPassword: PASSWORD, newPassword: 'weak' });
      expect(result.success).toBe(false);
    });

    it('should reject password update without uppercase', async () => {
      const { updatePasswordSchema } = await import('../validation');
      const result = updatePasswordSchema.safeParse({ currentPassword: PASSWORD, newPassword: 'alllowercase1' });
      expect(result.success).toBe(false);
    });

    it('should reject password update without digit', async () => {
      const { updatePasswordSchema } = await import('../validation');
      const result = updatePasswordSchema.safeParse({ currentPassword: PASSWORD, newPassword: 'NoDigitsHere' });
      expect(result.success).toBe(false);
    });

    it('should accept valid password update', async () => {
      const { updatePasswordSchema } = await import('../validation');
      const result = updatePasswordSchema.safeParse({ currentPassword: PASSWORD, newPassword: 'NewValidPass1' });
      expect(result.success).toBe(true);
    });
  });
});
