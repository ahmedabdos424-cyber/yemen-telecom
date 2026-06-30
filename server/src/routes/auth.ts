import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../logger';
import { query } from '../db';
import { hashToken, isTokenBlacklisted, TokenPayload } from '../middleware/auth';
import { validate, loginSchema } from '../validation';

const router = Router();
if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
  throw new Error('JWT_SECRET and REFRESH_SECRET environment variables are required');
}
const JWT_SECRET: string = process.env.JWT_SECRET;
const REFRESH_SECRET: string = process.env.REFRESH_SECRET;

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = result.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account disabled' });
    }
    const threshold = (await query('SELECT max_failed_logins_threshold FROM system_settings WHERE id = 1')).rows[0]?.max_failed_logins_threshold ?? 5;
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(429).json({ error: 'Account temporarily locked. Try again later.' });
    }
    if (user.failed_attempts >= threshold) {
      await query('UPDATE users SET locked_until = NOW() + INTERVAL \'15 minutes\' WHERE id = $1', [user.id]);
      return res.status(429).json({ error: 'Account temporarily locked. Try again later.' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await query('UPDATE users SET failed_attempts = COALESCE(failed_attempts, 0) + 1 WHERE id = $1', [user.id]);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    await query('UPDATE users SET last_login = NOW(), failed_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);
    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h', issuer: 'yemen-telecom', algorithm: 'HS256' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d', issuer: 'yemen-telecom', algorithm: 'HS256' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600 * 1000, path: '/' });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth' });
    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        phone: user.phone,
        region: user.region,
      },
    });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      logger.error('[LOGIN ERROR]', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        detail: err.detail,
        name: err.name,
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
    const payload = { id: decoded.id, username: decoded.username, role: decoded.role };
    const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h', issuer: 'yemen-telecom', algorithm: 'HS256' });
    const newRefreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d', issuer: 'yemen-telecom', algorithm: 'HS256' });
    res.cookie('token', newToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600 * 1000, path: '/' });
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth' });
    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
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
    res.clearCookie('token', { path: '/', httpOnly: true, secure: true, sameSite: 'strict' });
    res.clearCookie('refreshToken', { path: '/api/auth', httpOnly: true, secure: true, sameSite: 'strict' });
    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
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
    const result = await query('SELECT id, username, display_name, role, phone, region, last_login FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const u = result.rows[0];
    res.json({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      role: u.role,
      phone: u.phone,
      region: u.region,
      lastLogin: u.last_login,
    });
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('Auth me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
