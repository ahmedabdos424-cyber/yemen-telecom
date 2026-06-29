import { Router, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination } from '../helpers';
import { validate, createOperationSchema } from '../validation';

const router = Router();

router.get('/', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    let sql = 'SELECT * FROM operations';
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (req.user?.role === 'agent') {
      conditions.push('created_by = $1');
      params.push(req.user.id);
    }
    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY id DESC';
    if (paginate) {
      sql += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);
    }
    const result = await query(sql, params);
    res.json(result.rows.map((r: { op_id: string; type: string; target: string; operator: string; date: string; time: string; status: string }) => ({
      id: r.op_id,
      type: r.type,
      target: r.target,
      operator: r.operator,
      date: r.date,
      time: r.time,
      status: r.status,
    })));
  } catch (err) {
    logger.error('Error fetching operations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager', 'agent'), validate(createOperationSchema), async (req: AuthRequest, res: Response) => {
  const { type, target, operator, status } = req.body;
  try {
    const opId = `op_${Date.now()}`;
    const now = new Date();
    const date = now.toISOString().split('T')[0].replace(/-/g, '/');
    const time = 'الآن';
    const result = await query(
      `INSERT INTO operations (op_id, type, target, operator, date, time, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [opId, type, target, operator || '', date, time, status || 'success', req.user?.id]
    );
    res.status(201).json({
      id: result.rows[0].op_id,
      type: result.rows[0].type,
      target: result.rows[0].target,
      operator: result.rows[0].operator,
      date: result.rows[0].date,
      time: result.rows[0].time,
      status: result.rows[0].status,
    });
  } catch (err) {
    logger.error('Error creating operation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
