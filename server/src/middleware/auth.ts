import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import nodeCrypto from 'crypto';
import { query } from '../db';
import { logger } from '../logger';
import { setSentryUser } from '../sentry';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long in production');
}

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
  tv?: number;
  iat?: number;
  exp?: number;
  iss?: string;
}

// Only demo seed accounts are exempt from single-device session enforcement.
// Every real production account must pass the active_session_sid check to
// prevent concurrent-device hijacking.
export const DEMO_USERNAMES = new Set<string>(['manager', 'agent', 'seller']);

export function isSessionExempt(username?: string): boolean {
  return !!username && DEMO_USERNAMES.has(username);
}

export function hashToken(token: string): string {
  return nodeCrypto.createHmac('sha256', BLACKLIST_HMAC_SECRET).update(token).digest('hex');
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

export type ResolvedUser = { id: number; username: string; role: string };

// Shared token resolution used by both the Express middleware and the
// realtime WebSocket gateway. Returns the authenticated user or null.
export async function resolveTokenUser(token: string): Promise<ResolvedUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'yemen-telecom',
      algorithms: ['HS256'],
    }) as TokenPayload;
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return null;
    }
    const userCheck = await query('SELECT status FROM users WHERE id = $1', [decoded.id]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].status !== 'active') {
      return null;
    }
    if (!isSessionExempt(decoded.username)) {
      const session = await query('SELECT active_session_sid, session_expires_at FROM users WHERE id = $1', [decoded.id]);
      const row = session.rows[0];
      if (row) {
        if (row.session_expires_at && new Date(row.session_expires_at) < new Date()) {
          return null;
        }
        if (row.active_session_sid && (!decoded.sid || decoded.sid !== row.active_session_sid)) {
          return null;
        }
      }
    }
    return { id: decoded.id, username: decoded.username, role: decoded.role };
  } catch (err) {
    logger.warn('[AUTH] Token resolution failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.token;
  const auth = req.headers.authorization;
  const headerToken = auth?.startsWith('Bearer ') ? auth.split(' ')[1] : null;
  const token = cookieToken || headerToken;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const user = await resolveTokenUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = user;
  setSentryUser(user);
  next();
}
