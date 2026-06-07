import { Router, Response } from 'express';
import { query } from '../db';
import { requireRole } from '../middleware/auth';
import { getPagination } from '../helpers';

const router = Router();

router.get('/', requireRole('manager', 'agent'), async (req: any, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    const queryText = paginate
      ? 'SELECT * FROM customers ORDER BY id DESC LIMIT $1 OFFSET $2'
      : 'SELECT * FROM customers ORDER BY id DESC';
    const params = paginate ? [limit, offset] : [];
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search', requireRole('manager', 'agent'), async (req: any, res: Response) => {
  const q = req.query.q as string;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  try {
    const result = await query(
      `SELECT * FROM customers WHERE full_name ILIKE $1 OR id_number ILIKE $1 OR phone ILIKE $1 ORDER BY id DESC LIMIT 20`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireRole('manager', 'agent', 'seller'), async (req: any, res: Response) => {
  try {
    const result = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const ops = await query(
      `SELECT * FROM operations WHERE customer_name = $1 ORDER BY id DESC LIMIT 50`,
      [result.rows[0].full_name]
    );
    res.json({ ...result.rows[0], operations: ops.rows });
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager', 'agent', 'seller'), async (req: any, res: Response) => {
  const { full_name, id_number, phone, region, activated_by } = req.body;
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
      `INSERT INTO customers (full_name, id_number, phone, region, first_activation, last_activation, activated_by)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), $5) RETURNING *`,
      [full_name, id_number, phone || '', region || '', activated_by || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
