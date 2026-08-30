import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination, paginatedQuery } from '../helpers';
import { validate, createAgentSchema, updateAgentSchema } from '../validation';
import { notifyNewMember } from '../services/fcm.service';
import { getUniqueViolationKind } from '../helpers/dbErrors';

const router = Router();

router.get('/', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const isAgent = req.user?.role === 'agent';
    const whereClause = isAgent ? 'WHERE user_id = $1' : '';
    const params = isAgent && req.user ? [req.user.id] : [];
    if (req.query.page || req.query.limit) {
      const result = await paginatedQuery<Record<string, unknown>>(
        `SELECT * FROM agents ${whereClause} ORDER BY id`,
        `SELECT COUNT(*) FROM agents ${whereClause}`,
        params, page, limit, offset
      );
      return res.json(result);
    }
    const result = await query(`SELECT * FROM agents ${whereClause} ORDER BY id`, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching agents:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager'), validate(createAgentSchema), async (req: AuthRequest, res: Response) => {
  const { name, full_name, region, phone, sellers_count, sims_count, status, username, password } = req.body;
  try {
    const agentUsername = (username || phone || `agent_${Date.now()}`).trim().toLowerCase();

    const userExists = await query('SELECT id FROM users WHERE username = $1', [agentUsername]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'Username is already registered by another account' });
    }

    const agentPassword = password || crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(agentPassword, 10);

    const { agent } = await transaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (username, password_hash, display_name, role, status, phone, region)
         VALUES ($1, $2, $3, 'agent', 'active', $4, $5)
         RETURNING id`,
        [agentUsername, passwordHash, name, phone || '', region || '']
      );
      const uid = userRes.rows[0].id;

      const agentRes = await client.query(
        `INSERT INTO agents (user_id, name, full_name, region, phone, sellers_count, sims_count, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [uid, name, full_name || '', region || '', phone || '', sellers_count || 0, sims_count || 0, status || 'active']
      );
      return { userId: uid, agent: agentRes.rows[0] };
    });

    // Best-effort push: notify managers a new agent was registered. Never
    // blocks the HTTP response.
    void notifyNewMember({
      memberType: 'agent',
      name,
      region,
      createdBy: req.user?.username || 'مدير النظام',
    }).catch((err) => logger.warn('[FCM] new agent notify failed:', err));

    res.status(201).json({
      agent,
      credentials: {
        username: agentUsername,
        password: agentPassword
      }
    });
   } catch (err) {
    const kind = getUniqueViolationKind(err);
    if (kind === 'phone') {
      return res.status(409).json({ error: 'رقم الهاتف مستخدم بالفعل لوكيل آخر، يرجى استخدام رقم مختلف' });
    }
    if (kind === 'username') {
      return res.status(409).json({ error: 'اسم المستخدم غير متاح؛ يرجى إعادة المحاولة أو اختيار اسم مستخدم آخر' });
    }
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

router.get('/:id', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  const agentId = parseId(req.params.id, res);
  if (agentId === null) return;
  try {
    if (req.user?.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0 || agentRes.rows[0].id !== agentId) {
        return res.status(403).json({ error: 'Access denied: this agent does not belong to your account' });
      }
    }
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
    const agent = existing.rows[0];
    await transaction(async (client) => {
      if (agent.user_id) {
        await client.query(
          `UPDATE users SET status = 'inactive', active_session_sid = NULL, session_expires_at = NOW() WHERE id = $1`,
          [agent.user_id]
        );
      }
      await client.query('UPDATE agents SET status = $1 WHERE id = $2', ['deleted', agentId]);
    });
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
    const statusChanged = status !== cur.status;
    const result = await query(
      `UPDATE agents SET name=$1, region=$2, phone=$3, sellers_count=$4, sims_count=$5, status=$6 WHERE id=$7 RETURNING *`,
      [name, region, phone, sellers_count, sims_count, status, agentId]
    );
    // Sync user status + force-logout active session when disabling
    if (statusChanged && cur.user_id) {
      if (status === 'inactive') {
        await query(
          `UPDATE users SET status = $1, active_session_sid = NULL, session_expires_at = NOW() WHERE id = $2`,
          [status, cur.user_id]
        );
      } else {
        await query('UPDATE users SET status = $1 WHERE id = $2', [status, cur.user_id]);
      }
    }
    res.json(result.rows[0]);
   } catch (err) {
    const kind = getUniqueViolationKind(err);
    if (kind === 'phone') {
      return res.status(409).json({ error: 'رقم الهاتف مستخدم بالفعل لوكيل آخر، يرجى استخدام رقم مختلف' });
    }
    if (kind === 'username') {
      return res.status(409).json({ error: 'اسم المستخدم غير متاح؛ يرجى اختيار اسم مستخدم آخر' });
    }
    logger.error('Error updating agent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
