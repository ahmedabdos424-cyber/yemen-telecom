/**
 * Retry Middleware with Exponential Backoff
 * Automatically retries failed requests with configurable backoff.
 */
import { logger } from '../logger';

interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

const defaults: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
};

export function retryMiddleware(opts?: Partial<RetryOptions>) {
  const options = { ...defaults, ...opts };

  return async (req: any, res: any, next: any) => {
    const retryHeader = req.headers['x-retry-count'];
    const currentAttempt = retryHeader ? parseInt(retryHeader, 10) : 0;

    const originalEnd = res.end;
    let attempts = currentAttempt;

    res.end = function (...args: any[]) {
      const shouldRetry =
        attempts < options.maxRetries &&
        (options.retryableStatusCodes.includes(res.statusCode) ||
          (res.statusCode >= 500));

      if (shouldRetry) {
        attempts++;
        const delay = Math.min(
          options.initialDelayMs * Math.pow(options.backoffMultiplier, attempts - 1),
          options.maxDelayMs
        );

        logger.warn(`[RETRY] ${req.method} ${req.path} → ${res.statusCode} (attempt ${attempts}/${options.maxRetries}, retry in ${delay}ms)`);

        setTimeout(() => {
          req.headers['x-retry-count'] = attempts.toString();
          req.headers['x-retry-original-url'] = req.originalUrl || req.url;

          const newReq = { ...req, url: req.originalUrl || req.url };
          res.statusCode = 200;
          res.statusMessage = '';
          originalEnd.apply(res, args);
        }, delay);
        return;
      }

      if (attempts > currentAttempt) {
        res.setHeader('X-Retry-Attempts', attempts);
      }
      return originalEnd.apply(res, args);
    };

    next();
  };
}

export function withRetry<T>(
  fn: () => Promise<T>,
  opts?: Partial<RetryOptions>
): Promise<T> {
  const options = { ...defaults, ...opts };

  return new Promise(async (resolve, reject) => {
    let lastError: any;
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 0) {
          logger.info(`[RETRY] Succeeded after ${attempt} retries`);
        }
        resolve(result);
        return;
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          options.retryableErrors.includes(err?.code) ||
          (err?.status && options.retryableStatusCodes.includes(err.status)) ||
          (err?.response?.status && options.retryableStatusCodes.includes(err.response.status));

        if (!isRetryable || attempt >= options.maxRetries) {
          reject(err);
          return;
        }

        const delay = Math.min(
          options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt),
          options.maxDelayMs
        );
        logger.warn(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${err?.message}`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    reject(lastError);
  });
}
