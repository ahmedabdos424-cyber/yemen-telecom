import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db';
import { requireRole } from '../middleware/auth';
import { getPagination, paginatedQuery } from '../helpers';

const router = Router();

router.get('/', requireRole('manager', 'agent'), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    if (req.query.page || req.query.limit) {
      const result = await paginatedQuery<any>(
        'SELECT * FROM agents ORDER BY id',
        'SELECT COUNT(*) FROM agents',
        [], page, limit, offset
      );
      return res.json(result);
    }
    const result = await query('SELECT * FROM agents ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager'), async (req: Request, res: Response) => {
  const { name, region, phone, sellers_count, sims_count, status, username, password } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    // Create user account for the agent
    const agentUsername = (username || phone || `agent_${Date.now()}`).trim().toLowerCase();
    
    // Prevent takeover/downgrade of existing users (e.g. admin)
    const userExists = await query('SELECT id FROM users WHERE username = $1', [agentUsername]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'Username is already registered by another account' });
    }

    const agentPassword = password || crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(agentPassword, 10);

    const userResult = await query(
      `INSERT INTO users (username, password_hash, display_name, role, status, phone, region)
       VALUES ($1, $2, $3, 'agent', 'active', $4, $5)
       RETURNING id`,
      [agentUsername, passwordHash, name, phone || '', region || '']
    );
    const userId = userResult.rows[0].id;

    const result = await query(
      `INSERT INTO agents (user_id, name, region, phone, sellers_count, sims_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, name, region || '', phone || '', sellers_count || 0, sims_count || 0, status || 'active']
    );
    res.status(201).json({
      agent: result.rows[0],
      credentials: {
        username: agentUsername,
        password: agentPassword
      }
    });
  } catch (err) {
    console.error('Error creating agent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireRole('manager'), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await query('SELECT * FROM agents WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const cur = existing.rows[0];
    const name = req.body.name ?? cur.name;
    const region = req.body.region ?? cur.region;
    const phone = req.body.phone ?? cur.phone;
    const sellers_count = req.body.sellers_count ?? cur.sellers_count;
    const sims_count = req.body.sims_count ?? cur.sims_count;
    const status = req.body.status ?? cur.status;
    const result = await query(
      `UPDATE agents SET name=$1, region=$2, phone=$3, sellers_count=$4, sims_count=$5, status=$6 WHERE id=$7 RETURNING *`,
      [name, region, phone, sellers_count, sims_count, status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating agent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
