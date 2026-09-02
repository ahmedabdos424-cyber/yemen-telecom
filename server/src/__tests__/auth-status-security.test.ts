import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { NextFunction, Response } from 'express';
import http from 'http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'p0-02-test-jwt-secret';
  process.env.REFRESH_SECRET = 'p0-02-test-refresh-secret';
  process.env.BLACKLIST_HMAC_SECRET = 'test-blacklist-hmac-secret';
  process.env.RATE_LIMIT_DISABLED = 'true';
});

vi.mock('../db', () => ({
  query: vi.fn(),
}));

import { query } from '../db';
import authRoutes from '../routes/auth';

const PASSWORD = 'secret1234';
const passwordHash = bcrypt.hashSync(PASSWORD, 10);

const activeUser = {
  id: 1,
  username: 'active_user',
  password_hash: passwordHash,
  display_name: 'Active User',
  role: 'agent',
  status: 'active',
  phone: '777000001',
  region: 'Sana\'a',
  email: '',
  created_at: new Date(),
  last_login: null,
};

const disabledUser = {
  id: 2,
  username: 'disabled_user',
  password_hash: passwordHash,
  display_name: 'Disabled User',
  role: 'agent',
  status: 'inactive',
  phone: '777000002',
  region: 'Sana\'a',
  email: '',
  created_at: new Date(),
  last_login: null,
};

describe('P0-02 Login Status Security Regression Tests', () => {
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

  const setupLoginMock = (user: any) => {
    (query as any).mockImplementation((sql: string, params: any[]) => {
      if (sql.includes('token_blacklist')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('SELECT * FROM users WHERE username')) {
        const username = params[0];
        if (username === user.username) {
          return Promise.resolve({ rows: [user] });
        }
        if (username === 'active_user') {
          return Promise.resolve({ rows: [activeUser] });
        }
        if (username === 'disabled_user') {
          return Promise.resolve({ rows: [disabledUser] });
        }
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('SELECT status, token_version FROM users WHERE id')) {
        const id = Number(params[0]);
        if (id === 1) return Promise.resolve({ rows: [{ status: 'active', token_version: 1 }] });
        if (id === 2) return Promise.resolve({ rows: [{ status: 'inactive', token_version: 1 }] });
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });
  };

  // ─── Active user ───

  describe('Active user login', () => {
    it('active user can login (200)', async () => {
      setupLoginMock(activeUser);
      const r = await req('POST', '/api/auth/login', { username: 'active_user', password: PASSWORD });
      expect(r.status).toBe(200);
    });

    it('active user receives JWT token', async () => {
      setupLoginMock(activeUser);
      const r = await req('POST', '/api/auth/login', { username: 'active_user', password: PASSWORD });
      expect(r.status).toBe(200);
      expect(r.data).toHaveProperty('token');
      expect(typeof r.data.token).toBe('string');
    });

    it('active user login returns token but not refreshToken in body (refresh via httpOnly cookie only)', async () => {
      setupLoginMock(activeUser);
      const r = await req('POST', '/api/auth/login', { username: 'active_user', password: PASSWORD });
      expect(r.status).toBe(200);
      expect(r.data).toHaveProperty('token');
      expect(r.data).not.toHaveProperty('refreshToken');
    });

    it('active user can refresh token', async () => {
      setupLoginMock(activeUser);
      const refreshToken = jwt.sign(
        { id: 1, username: 'active_user', role: 'agent' },
        'p0-02-test-refresh-secret',
        { expiresIn: '7d', issuer: 'yemen-telecom', algorithm: 'HS256' }
      );
      const r = await req('POST', '/api/auth/refresh', { refreshToken });
      expect(r.status).toBe(200);
      expect(r.data).toHaveProperty('token');
    });
  });

  // ─── Disabled user ───

  describe('Disabled user login', () => {
    it('disabled user cannot login (403)', async () => {
      setupLoginMock(disabledUser);
      const r = await req('POST', '/api/auth/login', { username: 'disabled_user', password: PASSWORD });
      expect(r.status).toBe(403);
    });

    it('disabled user receives no JWT', async () => {
      setupLoginMock(disabledUser);
      const r = await req('POST', '/api/auth/login', { username: 'disabled_user', password: PASSWORD });
      expect(r.status).toBe(403);
      expect(r.data).not.toHaveProperty('token');
    });

    it('disabled user receives no refresh token', async () => {
      setupLoginMock(disabledUser);
      const r = await req('POST', '/api/auth/login', { username: 'disabled_user', password: PASSWORD });
      expect(r.status).toBe(403);
      expect(r.data).not.toHaveProperty('refreshToken');
    });

    it('error message is "Account disabled"', async () => {
      setupLoginMock(disabledUser);
      const r = await req('POST', '/api/auth/login', { username: 'disabled_user', password: PASSWORD });
      expect(r.status).toBe(403);
      expect(r.data.error).toBe('Account disabled');
    });

    it('disabled user cannot refresh token (403)', async () => {
      setupLoginMock(disabledUser);
      const refreshToken = jwt.sign(
        { id: 2, username: 'disabled_user', role: 'agent' },
        'p0-02-test-refresh-secret',
        { expiresIn: '7d', issuer: 'yemen-telecom', algorithm: 'HS256' }
      );
      const r = await req('POST', '/api/auth/refresh', { refreshToken });
      expect(r.status).toBe(403);
      expect(r.data.error).toBe('Account disabled');
    });
  });

  // ─── Edge cases ───

  describe('Edge cases', () => {
    it('non-existent user returns 401', async () => {
      setupLoginMock(activeUser);
      const r = await req('POST', '/api/auth/login', { username: 'no_such_user', password: PASSWORD });
      expect(r.status).toBe(401);
    });

    it('wrong password returns 401', async () => {
      setupLoginMock(activeUser);
      const r = await req('POST', '/api/auth/login', { username: 'active_user', password: 'wrongpass1234' });
      expect(r.status).toBe(401);
    });
  });
});
