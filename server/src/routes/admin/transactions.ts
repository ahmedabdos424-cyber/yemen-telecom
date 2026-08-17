import { Router, Request, Response } from 'express';
import { query } from '../../db';
import { logger } from '../../logger';
import { requireRole } from '../../middleware/auth';
import { getPagination } from '../../helpers';

const router = Router();

router.get('/transactions', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    const queryText = paginate
      ? 'SELECT * FROM transactions ORDER BY id LIMIT $1 OFFSET $2'
      : 'SELECT * FROM transactions ORDER BY id';
    const params = paginate ? [limit, offset] : [];
    const result = await query(queryText, params);
    res.json(result.rows.map((r: { id: string; client_name: string; provider: string; sims_count: number; status: string; relative_time: string }) => ({
      id: r.id,
      clientName: r.client_name,
      provider: r.provider,
      simsCount: r.sims_count,
      status: r.status,
      relativeTime: r.relative_time,
    })));
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

export default router;
