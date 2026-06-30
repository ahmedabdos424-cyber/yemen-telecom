import { Router, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination } from '../helpers';
import { validate, createCustomerSchema } from '../validation';

const router = Router();

router.get('/', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    let queryText = 'SELECT * FROM customers';
    const conditions: string[] = [];
    const params: any[] = [];
    if (req.user?.role === 'agent') {
      conditions.push('created_by = $' + (params.length + 1));
      params.push(req.user.id);
    }
    if (conditions.length) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id DESC';
    if (paginate) {
      queryText += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);
    }
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  const q = req.query.q as string;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  try {
    let sql = 'SELECT * FROM customers WHERE (full_name ILIKE $1 OR id_number ILIKE $1 OR phone ILIKE $1)';
    const params: any[] = [`%${q}%`];
    if (req.user?.role === 'agent') {
      sql += ' AND created_by = $2';
      params.push(req.user.id);
    }
    sql += ' ORDER BY id DESC LIMIT 20';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error searching customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireRole('manager', 'agent', 'seller'), async (req: AuthRequest, res: Response) => {
  try {
    let sql = 'SELECT * FROM customers WHERE id = $1';
    if (req.user?.role === 'agent' || req.user?.role === 'seller') {
      sql += ' AND created_by = $2';
    }
    const params: any[] = [req.params.id];
    if (req.user?.role === 'agent' || req.user?.role === 'seller') {
      params.push(req.user.id);
    }
    const result = await query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const ops = await query(
      `SELECT * FROM operations WHERE customer_name = $1 ORDER BY id DESC LIMIT 50`,
      [result.rows[0].full_name]
    );
    res.json({ ...result.rows[0], operations: ops.rows });
  } catch (err) {
    logger.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager', 'agent', 'seller'), validate(createCustomerSchema), async (req: AuthRequest, res: Response) => {
  const body = req.body;
  const full_name = body.full_name || body.fullName;
  const id_number = body.id_number || body.idNumber;
  const { phone, region } = body;
  const activated_by = body.activated_by || body.activatedBy;
  try {
    const existing = await query('SELECT id FROM customers WHERE id_number = $1', [id_number]);
    if (existing.rows.length > 0) {
      const updated = await query(
        `UPDATE customers SET sims_count = sims_count + 1, last_activation = NOW(), phone = COALESCE($2, phone), region = COALESCE($3, region) WHERE id = $1 RETURNING *`,
        [existing.rows[0].id, phone, region]
      );
      return res.json(updated.rows[0]);
    }
    const result = await query(
      `INSERT INTO customers (full_name, id_number, phone, region, first_activation, last_activation, activated_by, created_by)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6) RETURNING *`,
      [full_name, id_number, phone || '', region || '', activated_by || null, req.user?.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Error creating customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
