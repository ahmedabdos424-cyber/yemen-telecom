import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

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
  message: (req: Request, res: Response) => {
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
  message: (req: Request, res: Response) => {
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
  message: (req: Request, res: Response) => {
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