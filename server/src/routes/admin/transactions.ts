import { Router, Request, Response } from 'express';
import { query } from '../../db';
import { logger } from '../../logger';
import { requireRole } from '../../middleware/auth';
import { getPagination, getReportPaging, setTotalCount } from '../../helpers';

const router = Router();

router.get('/transactions', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    // J-05: newest-first like every other list; the legacy unpaginated shape
    // is capped at 500 with the full count in X-Total-Count.
    const rep = getReportPaging(req, 500, 500);
    const queryText = paginate
      ? 'SELECT * FROM transactions ORDER BY id DESC LIMIT $1 OFFSET $2'
      : `SELECT * FROM transactions ORDER BY id DESC LIMIT ${rep.limit} OFFSET ${rep.offset}`;
    const params = paginate ? [limit, offset] : [];
    const totalRow = await query('SELECT COUNT(*) AS count FROM transactions');
    setTotalCount(res, parseInt(totalRow.rows[0]?.count || '0', 10));
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
