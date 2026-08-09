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