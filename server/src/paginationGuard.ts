import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

const MAX_PAGE_LIMIT = parseInt(process.env.MAX_PAGE_LIMIT || '500', 10);
const DEFAULT_LIMIT = parseInt(process.env.DEFAULT_PAGE_LIMIT || '50', 10);

export function paginationGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') return next();

  const hasPage = req.query.page !== undefined;
  const hasLimit = req.query.limit !== undefined;

  if (!hasPage && !hasLimit) {
    if (process.env.NODE_ENV === 'production' && !req.path.startsWith('/api/health')) {
      req.query.page = '1';
      req.query.limit = String(DEFAULT_LIMIT);
      logger.warn(`[PAGINATION] Enforced defaults for ${req.path} — page=1, limit=${DEFAULT_LIMIT}`);
      return next();
    }
    logger.warn(`[PAGINATION] GET ${req.path} called without page/limit params`);
    return next();
  }

  if (hasLimit) {
    const limit = parseInt(req.query.limit as string, 10);
    if (limit > MAX_PAGE_LIMIT) {
      req.query.limit = String(MAX_PAGE_LIMIT);
      logger.warn(`[PAGINATION] Capped limit from ${limit} to ${MAX_PAGE_LIMIT} for ${req.path}`);
    }
    if (limit < 1) {
      req.query.limit = '1';
    }
  }

  next();
}
