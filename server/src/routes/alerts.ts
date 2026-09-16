import { Router, Request, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination, rejectIfUnpaginatedTooLarge } from '../helpers';
import { validate, idParamSchema } from '../validation';
import { logAudit } from '../audit-log';

const router = Router();

router.get('/', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    let sql = 'SELECT * FROM alerts ORDER BY id DESC';
    const params: (string | number)[] = [];
    if (paginate) {
      sql += ' LIMIT $1 OFFSET $2';
      params.push(limit, offset);
    } else {
      if (await rejectIfUnpaginatedTooLarge(res, 'SELECT COUNT(*) FROM alerts', [], 'alerts')) return;
    }
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

router.delete('/:id', requireRole('manager'), validate(idParamSchema, 'params'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // L-02: report 404 for a missing alert instead of a silent success.
    const result = await query('DELETE FROM alerts WHERE id = $1', [id]);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ success: true });
    void logAudit({ type: 'alert_deleted', title: `حذف التنبيه #${id}`, username: req.user?.username || 'unknown' });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

export default router;
