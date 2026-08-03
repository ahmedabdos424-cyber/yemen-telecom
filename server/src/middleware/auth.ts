import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Request, Response, NextFunction } from 'express';
import jwt, { VerifyOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db';
import { setSentryUser } from '../sentry';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

if (!process.env.BLACKLIST_HMAC_SECRET) {
  throw new Error('BLACKLIST_HMAC_SECRET environment variable is required');
}
const BLACKLIST_HMAC_SECRET = process.env.BLACKLIST_HMAC_SECRET;

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export interface TokenPayload {
  id: number;
  username: string;
  role: string;
  sid?: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

export const SESSION_EXEMPT_ROLES = new Set<string>(['manager', 'agent', 'seller']);

export function isSessionExempt(role: string): boolean {
  return SESSION_EXEMPT_ROLES.has(role);
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', BLACKLIST_HMAC_SECRET).update(token).digest('hex');
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const hash = hashToken(token);
  const result = await query('SELECT 1 FROM token_blacklist WHERE token_hash = $1 AND expires_at > NOW()', [hash]);
  return result.rows.length > 0;
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.token;
  const auth = req.headers.authorization;
  const headerToken = auth?.startsWith('Bearer ') ? auth.split(' ')[1] : null;
  const token = cookieToken || headerToken;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'yemen-telecom',
      algorithms: ['HS256'],
    }) as TokenPayload;
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    const userCheck = await query('SELECT status FROM users WHERE id = $1', [decoded.id]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }
    if (!isSessionExempt(decoded.role)) {
      const session = await query('SELECT active_session_sid, session_expires_at FROM users WHERE id = $1', [decoded.id]);
      const row = session.rows[0];
      if (row) {
        if (row.session_expires_at && new Date(row.session_expires_at) < new Date()) {
          return res.status(401).json({ error: 'Session has expired', code: 'SESSION_EXPIRED' });
        }
        if (row.active_session_sid && (!decoded.sid || decoded.sid !== row.active_session_sid)) {
          return res.status(401).json({ error: 'Session terminated by a new login from another device', code: 'SESSION_TERMINATED' });
        }
      }
    }
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    setSentryUser(req.user);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
