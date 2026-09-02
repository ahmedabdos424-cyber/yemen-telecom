import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';

/**
 * Rate Limiter khusus لمسارات المصادقة
 * يمنع هجمات Brute Force على تسجيل الدخول
 *
 * الإعدادات:
 * - windowMs: 15 دقيقة
 * - max: 5 محاولات كحد أقصى
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // الحد الأقصى للمحاولات من نفس IP
  standardHeaders: true,
  legacyHeaders: false,
  message: (_req: Request, res: Response) => {
    res.status(429).json({
      status: 429,
      error: 'Too Many Requests',
      message: 'تم تجاوز الحد المسموح به لمحاولات الدخول. يرجى المحاولة بعد 15 دقيقة.'
    });
  },
  skip: (req: Request) => {
    // تخطي Rate Limiting في بيئة الاختبار
    if (process.env.NODE_ENV === 'test') return true;
    // السماح بمسارات-health check دون تحديد
    return req.path === '/health' || req.path === '/api/health';
  }
});

/**
 * Rate Limiter عام للتطبيق
 * يستخدم كطبقة حماية إضافية
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 دقيقة
  max: 100, // 100 طلب في الدقيقة
  standardHeaders: true,
  legacyHeaders: false,
  message: (_req: Request, res: Response) => {
    res.status(429).json({
      status: 429,
      error: 'Too Many Requests',
      message: 'طلبات كثيرة جداً. يرجى المحاولة لاحقاً.'
    });
  }
});

/**
 * Rate Limiter لعمليات API الحساسة
 * يستخدم في المسارات التي تتطلب حماية إضافية
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 دقيقة
  max: 10, // 10 طلبات في الدقيقة فقط
  standardHeaders: true,
  legacyHeaders: false,
  message: (_req: Request, res: Response) => {
    res.status(429).json({
      status: 429,
      error: 'Too Many Requests',
      message: 'عدد الطلبات تجاوز الحد المسموح. يرجى الانتظار قليلاً.'
    });
  }
});

// ========================
// Exponential login lockout (username + IP)
// يحل محل القفل الثابت (15 دقيقة) بنظام تصاعدي:
// 5 محاولات فاشلة → قفل 60 ثانية، ثم 2 دقيقة، ثم 5 دقائق، ثم 15 دقيقة كحد أقصى.
// ========================

interface LoginLockState {
  failures: number;
  lockedUntil: number;
  lockLevel: number;
}

export const MAX_FAILED_LOGINS = 5;
const LOCK_DURATIONS_MS = [60_000, 120_000, 300_000, 900_000]; // 1m → 2m → 5m → 15m
const LOGIN_LOCK_TTL_MS = 30 * 60 * 1000; // ننسى السجل بعد انتهاء القفل بـ 30 دقيقة خمول
const MAX_LOGIN_LOCKS = 10_000; // Prevent memory exhaustion under attack
const loginLocks = new Map<string, LoginLockState>();

function loginLockKey(username: string, ip: string): string {
  return `${String(username || '').toLowerCase()}|${String(ip || 'unknown')}`;
}

/** هل (اسم المستخدم + IP) مقفول حالياً؟ */
export function isLoginLocked(username: string, ip: string): boolean {
  const entry = loginLocks.get(loginLockKey(username, ip));
  return !!entry && Date.now() < entry.lockedUntil;
}

/** المدة المتبقية من القفل الحالي بالمللي ثانية (0 إن لم يكن مقفولاً). */
export function getLoginLockRemaining(username: string, ip: string): number {
  const entry = loginLocks.get(loginLockKey(username, ip));
  if (!entry) return 0;
  const remaining = entry.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * تسجيل محاولة دخول فاشلة.
 * عند بلوغ الحد (5) يُفعَّل القفل بالمدة التصاعدية التالية.
 * تُعيد المدة المتبقية من القفل الجديد بالمللي ثانية، أو 0 إن لم يُفعَّل قفل جديد.
 */
export function recordLoginFailure(username: string, ip: string): number {
  const key = loginLockKey(username, ip);
  const now = Date.now();
  let entry = loginLocks.get(key);
  if (!entry || (now > entry.lockedUntil && now - entry.lockedUntil > LOGIN_LOCK_TTL_MS)) {
    entry = { failures: 0, lockedUntil: 0, lockLevel: 0 };
  }
  entry.failures += 1;
  if (entry.failures >= MAX_FAILED_LOGINS) {
    const level = Math.min(entry.lockLevel, LOCK_DURATIONS_MS.length - 1);
    entry.lockLevel = Math.min(entry.lockLevel + 1, LOCK_DURATIONS_MS.length - 1);
    entry.lockedUntil = now + LOCK_DURATIONS_MS[level];
    entry.failures = 0;
    // Enforce max entries limit to prevent memory exhaustion
    if (loginLocks.size >= MAX_LOGIN_LOCKS) {
      // Remove oldest expired entry, or if none, remove oldest entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of loginLocks.entries()) {
        if (now > v.lockedUntil && v.lockedUntil < oldestTime) {
          oldestTime = v.lockedUntil;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        loginLocks.delete(oldestKey);
      } else {
        // All entries are currently locked - remove the oldest by lockLevel
        for (const [k, v] of loginLocks.entries()) {
          if (v.lockLevel < entry.lockLevel || (v.lockLevel === entry.lockLevel && v.lockedUntil < entry.lockedUntil)) {
            loginLocks.delete(k);
            break;
          }
        }
      }
    }
    loginLocks.set(key, entry);
    return LOCK_DURATIONS_MS[level];
  }
  loginLocks.set(key, entry);
  return 0;
}

/** تسجيل دخول ناجح — يُصفَّر القفل التصاعدي بالكامل. */
export function recordLoginSuccess(username: string, ip: string): void {
  loginLocks.delete(loginLockKey(username, ip));
}

/** تنظيف السجلات المنتهية (يُستدعى دورياً من index.ts). */
export function clearExpiredLoginLocks(): void {
  const now = Date.now();
  for (const [key, entry] of loginLocks) {
    if (now > entry.lockedUntil + LOGIN_LOCK_TTL_MS) {
      loginLocks.delete(key);
    }
  }
}

// ========================
// DB-backed persistent lockout
// يتحمل إعادة التشغيل والتعددية — يُفحص أولاً قبل القفل الم内存
// ========================

const DB_LOCK_DURATIONS_MS = [60_000, 120_000, 300_000, 900_000]; // 1m → 2m → 5m → 15m

/** هل المستخدم مقفول في قاعدة البيانات؟ */
export async function isDbLocked(username: string, ip: string): Promise<{ locked: boolean; remainingMs: number }> {
  try {
    const result = await query(
      `SELECT locked_until, lock_level FROM login_lockouts WHERE username = $1 AND ip = $2`,
      [username, ip]
    );
    if (result.rows.length === 0) return { locked: false, remainingMs: 0 };
    const row = result.rows[0];
    const lockedUntil = new Date(row.locked_until).getTime();
    const remaining = lockedUntil - Date.now();
    if (remaining > 0) return { locked: true, remainingMs: remaining };
    return { locked: false, remainingMs: 0 };
  } catch (err) {
    logger.warn('[LOCKOUT] DB check failed, falling back to memory:', err);
    return { locked: false, remainingMs: 0 };
  }
}

/** هل المستخدم مقفول عالمياً (بجميع الـ IPs)؟ */
export async function isGloballyLocked(username: string): Promise<{ locked: boolean; remainingMs: number }> {
  try {
    const result = await query(
      `SELECT MAX(locked_until) AS max_locked_until FROM login_lockouts WHERE username = $1 AND locked_until > NOW()`,
      [username]
    );
    if (result.rows.length === 0 || !result.rows[0].max_locked_until) return { locked: false, remainingMs: 0 };
    const remaining = new Date(result.rows[0].max_locked_until).getTime() - Date.now();
    if (remaining > 0) return { locked: true, remainingMs: remaining };
    return { locked: false, remainingMs: 0 };
  } catch (err) {
    logger.warn('[LOCKOUT] DB global check failed:', err);
    return { locked: false, remainingMs: 0 };
  }
}

/** تسجيل محاولة فاشلة في قاعدة البيانات. يُعيد المدة المتبقية من القفل. */
export async function recordDbFailure(username: string, ip: string): Promise<number> {
  try {
    // Get current state
    const existing = await query(
      `SELECT failures, lock_level, locked_until FROM login_lockouts WHERE username = $1 AND ip = $2`,
      [username, ip]
    );
    const now = Date.now();
    let failures = 1;
    let lockLevel = 0;
    let lockedUntil = new Date(0);

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const prevLockedUntil = new Date(row.locked_until).getTime();
      // If still locked, increment level
      if (now < prevLockedUntil) {
        lockLevel = Math.min(row.lock_level + 1, DB_LOCK_DURATIONS_MS.length - 1);
        failures = 0;
        lockedUntil = new Date(now + DB_LOCK_DURATIONS_MS[lockLevel]);
      } else if (now - prevLockedUntil > 30 * 60 * 1000) {
        // Expired too long ago — reset
        failures = 1;
        lockLevel = 0;
        lockedUntil = new Date(0);
      } else {
        failures = row.failures + 1;
        lockLevel = row.lock_level;
        lockedUntil = new Date(row.locked_until);
      }
    }

    if (failures >= MAX_FAILED_LOGINS) {
      const level = Math.min(lockLevel, DB_LOCK_DURATIONS_MS.length - 1);
      lockLevel = Math.min(lockLevel + 1, DB_LOCK_DURATIONS_MS.length - 1);
      lockedUntil = new Date(now + DB_LOCK_DURATIONS_MS[level]);
      failures = 0;
    }

    await query(
      `INSERT INTO login_lockouts (username, ip, failures, lock_level, locked_until)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username, ip) DO UPDATE SET failures = $3, lock_level = $4, locked_until = $5`,
      [username, ip, failures, lockLevel, lockedUntil.toISOString()]
    );

    const remaining = lockedUntil.getTime() - now;
    return remaining > 0 ? remaining : 0;
  } catch (err) {
    logger.warn('[LOCKOUT] DB record failed:', err);
    return 0;
  }
}

/** تسجيل دخول ناجح — يمسح القفل من قاعدة البيانات. */
export async function clearDbLockout(username: string, ip: string): Promise<void> {
  try {
    await query(`DELETE FROM login_lockouts WHERE username = $1 AND ip = $2`, [username, ip]);
  } catch (err) {
    logger.warn('[LOCKOUT] DB clear failed:', err);
  }
}

/** تنظيف السجلات المنتهية من قاعدة البيانات. */
export async function clearExpiredDbLockouts(): Promise<void> {
  try {
    await query(`DELETE FROM login_lockouts WHERE locked_until < NOW() - INTERVAL '30 minutes'`);
  } catch (err) {
    logger.warn('[LOCKOUT] DB cleanup failed:', err);
  }
}