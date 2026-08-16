import { Router, Request, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { requireRole } from '../middleware/auth';
import { getPagination } from '../helpers';

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
    }
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

router.delete('/:id', requireRole('manager'), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM alerts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

export default router;
