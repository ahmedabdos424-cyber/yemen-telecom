import { Router, Response } from 'express';
import { query } from '../db';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination } from '../helpers';
import { validate, createDistributionSchema, approveDistributionSchema } from '../validation';

const router = Router();

router.get('/', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    let result;
    if (req.user?.role === 'manager') {
      if (paginate) {
        result = await query(
          `SELECT dr.*, a.name AS agent_name, s.name AS seller_name
           FROM distribution_requests dr
           LEFT JOIN agents a ON dr.agent_id = a.id
           LEFT JOIN sellers s ON dr.seller_id = s.id
           ORDER BY dr.id DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
      } else {
        result = await query(
          `SELECT dr.*, a.name AS agent_name, s.name AS seller_name
           FROM distribution_requests dr
           LEFT JOIN agents a ON dr.agent_id = a.id
           LEFT JOIN sellers s ON dr.seller_id = s.id
           ORDER BY dr.id DESC`
        );
      }
    } else {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user!.id]);
      if (agentRes.rows.length === 0) return res.json([]);
      if (paginate) {
        result = await query(
          `SELECT dr.*, a.name AS agent_name, s.name AS seller_name
           FROM distribution_requests dr
           LEFT JOIN agents a ON dr.agent_id = a.id
           LEFT JOIN sellers s ON dr.seller_id = s.id
           WHERE dr.agent_id = $1
           ORDER BY dr.id DESC LIMIT $2 OFFSET $3`,
          [agentRes.rows[0].id, limit, offset]
        );
      } else {
        result = await query(
          `SELECT dr.*, a.name AS agent_name, s.name AS seller_name
           FROM distribution_requests dr
           LEFT JOIN agents a ON dr.agent_id = a.id
           LEFT JOIN sellers s ON dr.seller_id = s.id
           WHERE dr.agent_id = $1
           ORDER BY dr.id DESC`,
          [agentRes.rows[0].id]
        );
      }
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching distribution requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('agent'), validate(createDistributionSchema), async (req: AuthRequest, res: Response) => {
  const { seller_id, seller_name, operator, count, notes } = req.body;
  try {
    const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user!.id]);
    if (agentRes.rows.length === 0) {
      return res.status(400).json({ error: 'Agent profile not found' });
    }
    const agentId = agentRes.rows[0].id;
    let sellerId = seller_id || null;
    if (seller_name && !sellerId) {
      const s = await query('SELECT id FROM sellers WHERE name = $1', [seller_name]);
      if (s.rows.length > 0) sellerId = s.rows[0].id;
    }
    const requestId = `DIST-${Date.now()}`;
    const result = await query(
      `INSERT INTO distribution_requests (request_id, agent_id, seller_id, operator, count, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [requestId, agentId, sellerId, operator, count, notes || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating distribution request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/approve', requireRole('manager'), validate(approveDistributionSchema), async (req: AuthRequest, res: Response) => {
  const { status: decision, notes } = req.body;
  try {
    const existing = await query('SELECT * FROM distribution_requests WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution request not found' });
    }
    const dr = existing.rows[0];
    if (dr.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${dr.status}` });
    }
    await query(
      `UPDATE distribution_requests SET status=$1, approved_by=$2, approved_at=NOW(), notes=COALESCE($3, notes) WHERE id=$4`,
      [decision, req.user!.id, notes || null, req.params.id]
    );
    if (decision === 'approved') {
      await query(
        `UPDATE inventories SET available=GREATEST(available-$1, 0), remaining=remaining+$1 WHERE operator=$2`,
        [dr.count, dr.operator]
      );
    }
    res.json({ message: `Request ${decision} successfully` });
  } catch (err) {
    console.error('Error approving distribution request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pending-count', requireRole('manager'), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query("SELECT COUNT(*) FROM distribution_requests WHERE status='pending'");
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error counting pending requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
