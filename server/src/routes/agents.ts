import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination, paginatedQuery } from '../helpers';
import { validate, createAgentSchema, updateAgentSchema } from '../validation';

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
    logger.error('Error fetching agents:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager'), validate(createAgentSchema), async (req: Request, res: Response) => {
  const { name, region, phone, sellers_count, sims_count, status, username, password } = req.body;
  try {
    const agentUsername = (username || phone || `agent_${Date.now()}`).trim().toLowerCase();

    const userExists = await query('SELECT id FROM users WHERE username = $1', [agentUsername]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'Username is already registered by another account' });
    }

    const agentPassword = password || crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(agentPassword, 10);

    const { userId, agent } = await transaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (username, password_hash, display_name, role, status, phone, region)
         VALUES ($1, $2, $3, 'agent', 'active', $4, $5)
         RETURNING id`,
        [agentUsername, passwordHash, name, phone || '', region || '']
      );
      const uid = userRes.rows[0].id;

      const agentRes = await client.query(
        `INSERT INTO agents (user_id, name, region, phone, sellers_count, sims_count, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [uid, name, region || '', phone || '', sellers_count || 0, sims_count || 0, status || 'active']
      );
      return { userId: uid, agent: agentRes.rows[0] };
    });

    res.status(201).json({
      agent,
      credentials: {
        username: agentUsername,
        password: agentPassword
      }
    });
  } catch (err) {
    logger.error('Error creating agent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function parseId(id: string, res: Response): number | null {
  const num = parseInt(id, 10);
  if (isNaN(num)) {
    res.status(404).json({ error: 'Agent not found' });
    return null;
  }
  return num;
}

router.get('/:id', requireRole('manager', 'agent'), async (req: Request, res: Response) => {
  const agentId = parseId(req.params.id, res);
  if (agentId === null) return;
  try {
    const result = await query('SELECT * FROM agents WHERE id = $1', [agentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error fetching agent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireRole('manager'), async (req: Request, res: Response) => {
  const agentId = parseId(req.params.id, res);
  if (agentId === null) return;
  try {
    const existing = await query('SELECT * FROM agents WHERE id = $1', [agentId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    await query('DELETE FROM agents WHERE id = $1', [agentId]);
    res.json({ message: 'Agent deleted successfully' });
  } catch (err) {
    logger.error('Error deleting agent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireRole('manager'), validate(updateAgentSchema), async (req: Request, res: Response) => {
  const agentId = parseId(req.params.id, res);
  if (agentId === null) return;
  try {
    const existing = await query('SELECT * FROM agents WHERE id = $1', [agentId]);
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
      [name, region, phone, sellers_count, sims_count, status, agentId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating agent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
