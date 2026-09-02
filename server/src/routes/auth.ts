import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../logger';
import { query } from '../db';
import { hashToken, isTokenBlacklisted, isSessionExempt, TokenPayload } from '../middleware/auth';
import { authRateLimiter, isLoginLocked, getLoginLockRemaining, recordLoginFailure, recordLoginSuccess } from '../middleware/rateLimiter';
import { getDeviceInfo } from '../helpers';
import { validate, loginSchema } from '../validation';

const router = Router();
if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
  throw new Error('JWT_SECRET and REFRESH_SECRET environment variables are required');
}
const JWT_SECRET: string = process.env.JWT_SECRET;
const REFRESH_SECRET: string = process.env.REFRESH_SECRET;
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours absolute cap

// رسالة خطأ موحدة لا تكشف ما إذا كان اسم المستخدم موجوداً أو كلمة المرور خاطئة
const GENERIC_LOGIN_ERROR = 'اسم المستخدم أو كلمة المرور غير صحيحة.';

function lockoutMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
  return `تم تجاوز الحد الأقصى لمحاولات الدخول. حاول مرة أخرى بعد ${minutes} دقيقة.`;
}

// توثيق محاولة الدخول الفاشلة في سجل التدقيق (نوع login_failed)
async function logFailedLogin(username: string, deviceName: string, ip: string, deviceId: string): Promise<void> {
  const logId = `LOGIN-FAIL-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await query(
      `INSERT INTO audit_logs (log_id, type, title, username, time, status, device_name, ip_address, mac_address, login_at, session_status)
       VALUES ($1, 'login_failed', $2, $3, TO_CHAR(NOW(), 'YYYY/MM/DD HH24:MI:SS'), 'failed', $4, $5, $6, NOW(), 'failed')`,
      [logId, `محاولة دخول فاشلة: ${username}`, username, deviceName, ip, deviceId]
    );
  } catch (err) {
    logger.warn('[AUDIT] Failed to record failed login:', err);
  }
}

router.post('/login', authRateLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const { deviceName, deviceId, ip } = getDeviceInfo(req);
    // قفل تصاعدي في الذاكرة: (اسم المستخدم + عنوان IP)
    if (isLoginLocked(username, ip)) {
      return res.status(429).json({ error: lockoutMessage(getLoginLockRemaining(username, ip)) });
    }
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      recordLoginFailure(username, ip);
      await logFailedLogin(username, deviceName, ip, deviceId);
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }
    const user = result.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account disabled' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await query('UPDATE users SET failed_attempts = COALESCE(failed_attempts, 0) + 1 WHERE id = $1', [user.id]);
      const lockedMs = recordLoginFailure(username, ip);
      await logFailedLogin(username, deviceName, ip, deviceId);
      if (lockedMs > 0) {
        return res.status(429).json({ error: lockoutMessage(lockedMs) });
      }
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }
    recordLoginSuccess(username, ip);
    await query('UPDATE users SET last_login = NOW(), failed_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);
    const sid = crypto.randomUUID();
    if (!isSessionExempt(user.username)) {
      await query('UPDATE users SET active_session_sid = $1, session_expires_at = $2 WHERE id = $3', [
        sid,
        new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
        user.id,
      ]);
    }
    const loginLogId = `LOGIN-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await query(
      `INSERT INTO audit_logs (log_id, type, title, username, time, status, device_name, ip_address, mac_address, login_at, session_status)
       VALUES ($1, 'login', $2, $3, TO_CHAR(NOW(), 'YYYY/MM/DD HH24:MI:SS'), 'success', $4, $5, $6, NOW(), 'active')`,
      [loginLogId, `تسجيل دخول ناجح: ${user.display_name || user.username}`, user.username, deviceName, ip, deviceId]
    );
    const payload = { id: user.id, username: user.username, role: user.role, sid };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h', issuer: 'yemen-telecom', algorithm: 'HS256' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d', issuer: 'yemen-telecom', algorithm: 'HS256' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600 * 1000, path: '/' });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth' });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        phone: user.phone,
        region: user.region,
      },
    });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      logger.error('[LOGIN ERROR]', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        code: err && typeof err === 'object' && 'code' in err ? (err as unknown as { code?: unknown }).code : undefined,
        detail: err && typeof err === 'object' && 'detail' in err ? (err as unknown as { detail?: unknown }).detail : undefined,
        name: err instanceof Error ? err.name : undefined,
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }
  try {
    const blacklisted = await isTokenBlacklisted(refreshToken);
    if (blacklisted) {
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET, { issuer: 'yemen-telecom', algorithms: ['HS256'] }) as TokenPayload;
    const rtExp = decoded.exp;
    if (rtExp) {
      await query(
        'INSERT INTO token_blacklist (token_hash, expires_at, user_id) VALUES ($1, $2, $3) ON CONFLICT (token_hash) DO NOTHING',
        [hashToken(refreshToken), new Date(rtExp * 1000).toISOString(), decoded.id]
      );
    }
    const userRes = await query('SELECT status FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active') {
      return res.status(403).json({ error: 'Account disabled' });
    }
    if (!isSessionExempt(decoded.username)) {
      // Absolute session lifetime: reject if JWT was issued more than 24h ago
      if (decoded.iat) {
        const sessionAgeMs = Date.now() - decoded.iat * 1000;
        if (sessionAgeMs > MAX_SESSION_LIFETIME_MS) {
          return res.status(401).json({ error: 'Session has exceeded maximum lifetime. Please log in again.', code: 'SESSION_MAX_LIFETIME' });
        }
      }
      const session = await query('SELECT active_session_sid, session_expires_at FROM users WHERE id = $1', [decoded.id]);
      const row = session.rows[0];
      if (row?.active_session_sid && decoded.sid && row.active_session_sid !== decoded.sid) {
        return res.status(401).json({ error: 'Session terminated by a new login from another device', code: 'SESSION_TERMINATED' });
      }
      if (row?.session_expires_at && new Date(row.session_expires_at) < new Date()) {
        return res.status(401).json({ error: 'Session has expired', code: 'SESSION_EXPIRED' });
      }
      await query('UPDATE users SET session_expires_at = $1 WHERE id = $2', [
        new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
        decoded.id,
      ]);
    }
    const payload = { id: decoded.id, username: decoded.username, role: decoded.role, sid: decoded.sid };
    const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h', issuer: 'yemen-telecom', algorithm: 'HS256' });
    const newRefreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d', issuer: 'yemen-telecom', algorithm: 'HS256' });
    res.cookie('token', newToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600 * 1000, path: '/' });
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth' });
    res.json({ token: newToken });
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    logger.error('Refresh token error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const cookieToken = req.cookies?.token;
  const auth = req.headers.authorization;
  const headerToken = auth?.startsWith('Bearer ') ? auth.split(' ')[1] : null;
  const token = cookieToken || headerToken;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'yemen-telecom', algorithms: ['HS256'] }) as TokenPayload;
    if (decoded.exp) {
      const expiresAt = new Date(decoded.exp * 1000).toISOString();
      await query(
        'INSERT INTO token_blacklist (token_hash, expires_at, user_id) VALUES ($1, $2, $3) ON CONFLICT (token_hash) DO NOTHING',
        [hashToken(token), expiresAt, decoded.id]
      );
    }
    const cookieRefreshToken = req.cookies?.refreshToken;
    const refreshTokenHeader = cookieRefreshToken || (req.headers['x-refresh-token'] as string);
    if (refreshTokenHeader) {
      try {
        const rtDecoded = jwt.verify(refreshTokenHeader, REFRESH_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
        if (rtDecoded.exp) {
          const rtExpiresAt = new Date(rtDecoded.exp * 1000).toISOString();
          await query(
            'INSERT INTO token_blacklist (token_hash, expires_at, user_id) VALUES ($1, $2, $3) ON CONFLICT (token_hash) DO NOTHING',
            [hashToken(refreshTokenHeader), rtExpiresAt, decoded.id]
          );
        }
      } catch { /* refresh token already expired — ignore */ }
    }
    if (decoded.sid && !isSessionExempt(decoded.username)) {
      await query(
        'UPDATE users SET active_session_sid = NULL, session_expires_at = NULL WHERE id = $1 AND active_session_sid = $2',
        [decoded.id, decoded.sid]
      );
    }
    const { deviceName, deviceId, ip } = getDeviceInfo(req);
    await query(
      `UPDATE audit_logs SET logout_at = NOW(), session_status = 'closed'
       WHERE id = COALESCE(
         (SELECT id FROM audit_logs WHERE username = $1 AND type = 'login' AND session_status = 'active' AND mac_address = $2 ORDER BY id DESC LIMIT 1),
         (SELECT id FROM audit_logs WHERE username = $1 AND type = 'login' AND session_status = 'active' ORDER BY id DESC LIMIT 1)
       )`,
      [decoded.username, deviceId]
    );
    const logoutLogId = `LOGOUT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await query(
      `INSERT INTO audit_logs (log_id, type, title, username, time, status, device_name, ip_address, mac_address, login_at, logout_at, session_status)
       VALUES ($1, 'logout', $2, $3, TO_CHAR(NOW(), 'YYYY/MM/DD HH24:MI:SS'), 'success', $4, $5, $6, NOW(), NOW(), 'closed')`,
      [logoutLogId, `تسجيل خروج: ${decoded.username}`, decoded.username, deviceName, ip, deviceId]
    );
    res.clearCookie('token', { path: '/', httpOnly: true, secure: true, sameSite: 'strict' });
    res.clearCookie('refreshToken', { path: '/api/auth', httpOnly: true, secure: true, sameSite: 'strict' });
    res.json({ message: 'Logged out successfully' });
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('Logout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  logger.info('[AUTH] AUTH ROUTES LOADED — /login /refresh /logout /me');
}

router.get('/me', async (req: Request, res: Response) => {
  const cookieToken = req.cookies?.token;
  const auth = req.headers.authorization;
  const headerToken = auth?.startsWith('Bearer ') ? auth.split(' ')[1] : null;
  const token = cookieToken || headerToken;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'yemen-telecom', algorithms: ['HS256'] }) as TokenPayload;
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    const result = await query(
      'SELECT id, username, display_name, role, phone, region, last_login, status, created_at, active_session_sid, session_expires_at FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const u = result.rows[0];

    // Check if account is disabled
    if (u.status !== 'active') {
      return res.status(403).json({ error: 'Account disabled', code: 'ACCOUNT_DISABLED' });
    }

    // Check session validity (same checks as /refresh)
    if (!isSessionExempt(decoded.username)) {
      if (u.active_session_sid && decoded.sid && u.active_session_sid !== decoded.sid) {
        return res.status(401).json({ error: 'Session terminated by a new login from another device', code: 'SESSION_TERMINATED' });
      }
      if (u.session_expires_at && new Date(u.session_expires_at) < new Date()) {
        return res.status(401).json({ error: 'Session has expired', code: 'SESSION_EXPIRED' });
      }
    }

    res.json({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      role: u.role,
      phone: u.phone,
      region: u.region,
      lastLogin: u.last_login,
      status: u.status,
      createdAt: u.created_at,
    });
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('Auth me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
