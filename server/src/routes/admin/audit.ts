import { Router, Request, Response } from 'express';
import { query } from '../../db';
import { logger } from '../../logger';
import { requireRole } from '../../middleware/auth';
import { getPagination } from '../../helpers';
import { mapAuditRow } from './shared';

const router = Router();

router.get('/audit-logs', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    const SAFE_LIMIT = 500;
    const queryText = paginate
      ? 'SELECT * FROM audit_logs ORDER BY id DESC LIMIT $1 OFFSET $2'
      : `SELECT * FROM audit_logs ORDER BY id DESC LIMIT ${SAFE_LIMIT}`;
    const params = paginate ? [limit, offset] : [];
    const result = await query(queryText, params);
    const totalResult = paginate ? await query('SELECT COUNT(*) AS count FROM audit_logs') : null;
    const total = totalResult ? parseInt(totalResult.rows[0]?.count || '0') : 0;
    const logs = result.rows.map(mapAuditRow);
    if (paginate) {
      res.json({ logs, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
    } else {
      res.json(logs);
    }
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

export default router;
