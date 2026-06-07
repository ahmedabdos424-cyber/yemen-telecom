import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db';
import { hashToken, isTokenBlacklisted } from '../middleware/auth';
import { validate, loginSchema, refreshTokenSchema } from '../validation';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? crypto.randomBytes(64).toString('hex') : '');
const REFRESH_SECRET = process.env.REFRESH_SECRET || (process.env.NODE_ENV !== 'production' ? crypto.randomBytes(64).toString('hex') : '');

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
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
  } catch (err) {
    console.error('[LOGIN ERROR]:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  try {
    const blacklisted = await isTokenBlacklisted(refreshToken);
    if (blacklisted) {
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    const payload = { id: decoded.id, username: decoded.username, role: decoded.role };
    const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    const newRefreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    console.error('Refresh token error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.exp) {
      const expiresAt = new Date(decoded.exp * 1000).toISOString();
      await query(
        'INSERT INTO token_blacklist (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING',
        [hashToken(token), expiresAt]
      );
    }
    const refreshTokenHeader = req.headers['x-refresh-token'] as string;
    if (refreshTokenHeader) {
      try {
        const rtDecoded = jwt.verify(refreshTokenHeader, REFRESH_SECRET) as any;
        if (rtDecoded.exp) {
          const rtExpiresAt = new Date(rtDecoded.exp * 1000).toISOString();
          await query(
            'INSERT INTO token_blacklist (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING',
            [hashToken(refreshTokenHeader), rtExpiresAt]
          );
        }
      } catch { /* refresh token already expired — ignore */ }
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('[AUTH] AUTH ROUTES LOADED — /login /refresh /logout /me');

router.get('/me', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
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
    console.error('Auth me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
