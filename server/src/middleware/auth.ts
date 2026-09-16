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
  user?: { id: number; username: string; role: string; agentId?: number; sellerId?: number };
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

// Only demo seed accounts are exempt from single-device session enforcement,
// and only outside production. Every production account — including accounts
// that happen to reuse a demo username — must pass the active_session_sid
// check so a stolen token cannot survive a fresh login (H-01).
export const DEMO_USERNAMES = new Set<string>(['manager', 'agent', 'seller']);

export function isSessionExempt(username?: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;
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

export type ResolvedUser = { id: number; username: string; role: string; agentId?: number; sellerId?: number };

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
    const userCheck = await query('SELECT status, token_version FROM users WHERE id = $1', [decoded.id]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].status !== 'active') {
      return null;
    }
    // Global token revocation: reject when the token was issued under an old
    // token_version (mirrors the /auth/refresh check). Tokens minted before
    // the column existed carry no tv — only enforce when the claim is present.
    const currentTv = userCheck.rows[0].token_version || 1;
    if (decoded.tv && decoded.tv !== currentTv) {
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
    // Resolve the role-scoped foreign key once so authenticated handlers never
    // re-query it (removes the per-endpoint N+1 agent/seller lookups). Read
    // fresh per request — never trust a stale value baked into a token.
    let agentId: number | undefined;
    let sellerId: number | undefined;
    if (decoded.role === 'agent') {
      const agentResult = await query('SELECT id FROM agents WHERE user_id = $1', [decoded.id]);
      agentId = agentResult.rows[0]?.id;
    } else if (decoded.role === 'seller') {
      const sellerResult = await query('SELECT id FROM sellers WHERE user_id = $1', [decoded.id]);
      sellerId = sellerResult.rows[0]?.id;
    }
    return { id: decoded.id, username: decoded.username, role: decoded.role, agentId, sellerId };
  } catch (err) {
    logger.warn('[AUTH] Token resolution failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// Helpers that hand a handler its role-scoped foreign key. In production the
// value is already resolved by resolveTokenUser (agentId/sellerId on the
// request). The query fallback keeps direct-auth test suites working, where
// req.user is stubbed without the scoped ids and the select is intercepted by
// a mocked db query.
export async function resolveScopeAgentId(req: AuthRequest): Promise<number | null> {
  if (req.user?.agentId != null) return req.user.agentId;
  const agentResult = await query('SELECT id FROM agents WHERE user_id = $1', [req.user!.id]);
  return (agentResult.rows[0]?.id as number | undefined) ?? null;
}

export async function resolveScopeSellerId(req: AuthRequest): Promise<number | null> {
  if (req.user?.sellerId != null) return req.user.sellerId;
  const sellerResult = await query('SELECT id FROM sellers WHERE user_id = $1', [req.user!.id]);
  return (sellerResult.rows[0]?.id as number | undefined) ?? null;
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
