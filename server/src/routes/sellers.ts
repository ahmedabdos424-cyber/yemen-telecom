import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination, getDefaultLimit } from '../helpers';
import { validate, createSellerSchema, updateSellerSchema, updateSellerBalanceSchema } from '../validation';

const router = Router();

const mapSeller = (row: any) => ({
  id: String(row.id),
  sellerId: row.seller_id,
  name: row.name,
  storeName: row.store_name,
  idNumber: row.id_number,
  phone: row.phone,
  region: row.region,
  regionCode: row.region_code,
  status: row.status,
  totalSales: row.total_sales,
  currentStock: row.current_stock,
  efficiency: row.efficiency,
  simsCount: row.sims_count,
  sales30Days: row.sales_30_days,
  salesGrowth: row.sales_growth,
  activityRate: row.activity_rate,
  creationDate: row.creation_date,
  lastLogin: row.last_login,
  avatar: row.avatar,
  agent_name: row.agent_name || ''
});

router.get('/', requireRole('manager', 'agent', 'seller'), async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { page, limit, offset } = getPagination(req);
  try {
    const paginate = req.query.page || req.query.limit;
    let result;
    if (req.user.role === 'manager') {
      if (paginate) {
        result = await query(
          `SELECT s.*, a.name as agent_name 
           FROM sellers s 
           LEFT JOIN agents a ON s.agent_id = a.id 
           ORDER BY s.id DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
      } else {
        result = await query(
          `SELECT s.*, a.name as agent_name 
           FROM sellers s 
           LEFT JOIN agents a ON s.agent_id = a.id 
            ORDER BY s.id DESC LIMIT ${getDefaultLimit()}`
        );
      }
    } else if (req.user.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0) {
        return res.json([]);
      }
      const agentId = agentRes.rows[0].id;
      if (paginate) {
        result = await query(
          `SELECT s.*, a.name as agent_name 
           FROM sellers s 
           LEFT JOIN agents a ON s.agent_id = a.id 
           WHERE s.agent_id = $1 
           ORDER BY s.id DESC LIMIT $2 OFFSET $3`,
          [agentId, limit, offset]
        );
      } else {
        result = await query(
          `SELECT s.*, a.name as agent_name 
           FROM sellers s 
           LEFT JOIN agents a ON s.agent_id = a.id 
           WHERE s.agent_id = $1 
           ORDER BY s.id DESC LIMIT ${getDefaultLimit()}`,
          [agentId]
        );
      }
    } else {
      if (paginate) {
        result = await query(
          `SELECT s.*, a.name as agent_name 
           FROM sellers s 
           LEFT JOIN agents a ON s.agent_id = a.id 
           WHERE s.user_id = $1 
           ORDER BY s.id DESC LIMIT $2 OFFSET $3`,
          [req.user.id, limit, offset]
        );
      } else {
        result = await query(
          `SELECT s.*, a.name as agent_name 
           FROM sellers s 
           LEFT JOIN agents a ON s.agent_id = a.id 
           WHERE s.user_id = $1 
           ORDER BY s.id DESC LIMIT ${getDefaultLimit()}`,
          [req.user.id]
        );
      }
    }
    res.json(result.rows.map(mapSeller));
  } catch (err) {
    logger.error('Error fetching sellers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager', 'agent'), validate(createSellerSchema), async (req: AuthRequest, res: Response) => {
  const {
    name, store_name, id_number, phone, region, region_code, status,
    username, password, agent_name
  } = req.body;
  try {
    // Support camelCase parameters
    const storeNameVal = store_name ?? req.body.storeName ?? '';
    const idNumberVal = id_number ?? req.body.idNumber ?? '';
    const regionCodeVal = region_code ?? req.body.regionCode ?? '';

    // Create user account for the seller
    const sellerUsername = (username || phone || `seller_${Date.now()}`).trim().toLowerCase();
    const sellerPassword = password || crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(sellerPassword, 10);

    let agentId: number | null = null;
    const authReq = req as AuthRequest;
    if (authReq.user?.role === 'agent') {
      const myAgent = await query('SELECT id FROM agents WHERE user_id = $1', [authReq.user.id]);
      if (myAgent.rows.length > 0) {
        agentId = myAgent.rows[0].id;
      }
    } else if (agent_name) {
      const agentRes = await query('SELECT id FROM agents WHERE name = $1', [agent_name]);
      if (agentRes.rows.length > 0) {
        agentId = agentRes.rows[0].id;
      }
    }

    const sid = req.body.seller_id || req.body.sellerId || `SLR-${String(crypto.randomInt(10000, 99999))}`;
    const now = new Date().toISOString().split('T')[0].replace(/-/g, '/');

    // Execute all DB writes inside a transaction
    const { seller: createdSeller } = await transaction(async (client) => {
      const userExists = await client.query('SELECT id FROM users WHERE username = $1', [sellerUsername]);
      if (userExists.rows.length > 0) {
        throw Object.assign(new Error('Username is already taken by another account'), { statusCode: 409 });
      }

      const userResult = await client.query(
        `INSERT INTO users (username, password_hash, display_name, role, status, phone, region)
         VALUES ($1, $2, $3, 'seller', 'active', $4, $5)
         RETURNING id`,
        [sellerUsername, passwordHash, name, phone || '', region || '']
      );
      const userId = userResult.rows[0].id;

      const sellerResult = await client.query(
        `INSERT INTO sellers (seller_id, user_id, agent_id, name, store_name, id_number, phone, region, region_code, status, creation_date, last_login)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [sid, userId, agentId, name, storeNameVal, idNumberVal, phone || '', region || '', regionCodeVal, status || 'active', now, 'لم يسجل دخول بعد']
      );

      const finalResult = await client.query(
        `SELECT s.*, a.name as agent_name 
         FROM sellers s 
         LEFT JOIN agents a ON s.agent_id = a.id 
         WHERE s.id = $1`,
        [sellerResult.rows[0].id]
      );

      return { seller: mapSeller(finalResult.rows[0]) };
    });

    res.status(201).json({
      seller: createdSeller,
      credentials: {
        username: sellerUsername,
        password: sellerPassword
      }
    });
  } catch (err: any) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    logger.error('Error creating seller:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireRole('manager', 'agent'), validate(updateSellerSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await transaction(async (client) => {
      const lock = await client.query('SELECT * FROM sellers WHERE id = $1 FOR UPDATE', [id]);
      if (lock.rows.length === 0) {
        throw Object.assign(new Error('Seller not found'), { statusCode: 404 });
      }
      if (req.user?.role === 'agent') {
        const agentRes = await client.query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
        if (agentRes.rows.length === 0 || agentRes.rows[0].id !== lock.rows[0].agent_id) {
          throw Object.assign(new Error('Access denied: this seller does not belong to your agency'), { statusCode: 403 });
        }
      }
      const cur = lock.rows[0];
      const name = req.body.name ?? cur.name;
      const store_name = req.body.store_name ?? req.body.storeName ?? cur.store_name;
      const id_number = req.body.id_number ?? req.body.idNumber ?? cur.id_number;
      const phone = req.body.phone ?? cur.phone;
      const region = req.body.region ?? cur.region;
      const region_code = req.body.region_code ?? req.body.regionCode ?? cur.region_code;
      const status = req.body.status ?? cur.status;
      await client.query(
        `UPDATE sellers SET name=$1, store_name=$2, id_number=$3, phone=$4, region=$5, region_code=$6, status=$7 WHERE id=$8`,
        [name, store_name, id_number, phone, region, region_code, status, id]
      );
      const updated = await client.query(
        `SELECT s.*, a.name as agent_name FROM sellers s LEFT JOIN agents a ON s.agent_id = a.id WHERE s.id = $1`,
        [id]
      );
      return mapSeller(updated.rows[0]);
    });
    res.json(result);
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    logger.error('Error updating seller:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/balance', requireRole('manager', 'agent'), validate(updateSellerBalanceSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body;
  try {
    const result = await transaction(async (client) => {
      const lock = await client.query('SELECT * FROM sellers WHERE id = $1 FOR UPDATE', [id]);
      if (lock.rows.length === 0) {
        throw Object.assign(new Error('Seller not found'), { statusCode: 404 });
      }
      if (req.user?.role === 'agent') {
        const agentRes = await client.query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
        if (agentRes.rows.length === 0 || agentRes.rows[0].id !== lock.rows[0].agent_id) {
          throw Object.assign(new Error('Access denied: this seller does not belong to your agency'), { statusCode: 403 });
        }
      }
      const lockedRow = lock.rows[0];
      const updatedSales = (lockedRow.sales_30_days || 0) + amount;
      await client.query(
        `UPDATE sellers SET sales_30_days=$1, total_sales=COALESCE(total_sales,0)+$2 WHERE id=$3 RETURNING *`,
        [updatedSales, amount, id]
      );
      const finalResult = await client.query(
        `SELECT s.*, a.name as agent_name FROM sellers s LEFT JOIN agents a ON s.agent_id = a.id WHERE s.id = $1`,
        [id]
      );
      return mapSeller(finalResult.rows[0]);
    });
    res.json(result);
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    logger.error('Error updating seller balance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/reset-password', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await transaction(async (client) => {
      const lock = await client.query('SELECT * FROM sellers WHERE id = $1 FOR UPDATE', [id]);
      if (lock.rows.length === 0) {
        throw Object.assign(new Error('Seller not found'), { statusCode: 404 });
      }
      if (req.user?.role === 'agent') {
        const agentRes = await client.query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
        if (agentRes.rows.length === 0 || agentRes.rows[0].id !== lock.rows[0].agent_id) {
          throw Object.assign(new Error('Access denied: this seller does not belong to your agency'), { statusCode: 403 });
        }
      }
      const seller = lock.rows[0];
      if (!seller.user_id) {
        throw Object.assign(new Error('Seller has no linked user account'), { statusCode: 400 });
      }
      const newPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, seller.user_id]);
      const userRes = await client.query('SELECT username FROM users WHERE id = $1', [seller.user_id]);
      return { username: userRes.rows[0].username, password: newPassword, name: seller.name };
    }).then((result) => {
      res.json({
        message: `Password reset successfully for ${result.name}`,
        credentials: { username: result.username, password: result.password },
      });
    });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    logger.error('Error resetting seller password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await transaction(async (client) => {
      const lock = await client.query('SELECT * FROM sellers WHERE id = $1 FOR UPDATE', [id]);
      if (lock.rows.length === 0) {
        throw Object.assign(new Error('Seller not found'), { statusCode: 404 });
      }
      if (req.user?.role === 'agent') {
        const agentRes = await client.query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
        if (agentRes.rows.length === 0 || agentRes.rows[0].id !== lock.rows[0].agent_id) {
          throw Object.assign(new Error('Access denied: this seller does not belong to your agency'), { statusCode: 403 });
        }
      }
      const seller = lock.rows[0];
      if (seller.user_id) {
        await client.query('UPDATE users SET status = $1 WHERE id = $2', ['inactive', seller.user_id]);
      }
      await client.query('UPDATE sims SET assigned_to = NULL, owner = $1 WHERE assigned_to = $2', ['المركز الرئيسي', id]);
      await client.query('DELETE FROM distribution_requests WHERE seller_id = $1', [id]);
      await client.query('UPDATE sellers SET status = $1 WHERE id = $2', ['deleted', id]);
    });
    res.json({ message: 'Seller deleted successfully' });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    logger.error('Error deleting seller:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
