import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination } from '../helpers';
import { validate, createSellerSchema, updateSellerSchema, updateSellerBalanceSchema } from '../validation';
import { broadcastEvent } from '../services/realtime.service';
import { notifyNewMember } from '../services/fcm.service';
import { cacheInvalidate } from '../cache';

const router = Router();

interface SellerDbRow {
  id: number | string;
  seller_id?: string | null;
  name: string;
  store_name?: string | null;
  id_number?: string | null;
  phone: string;
  region?: string | null;
  region_code?: string | null;
  status?: string | null;
  total_sales?: number | null;
  current_stock?: number | null;
  efficiency?: number | null;
  sims_count?: number | null;
  sales_30_days?: number | null;
  sales_growth?: number | null;
  activity_rate?: number | null;
  creation_date?: string | null;
  last_login?: string | null;
  avatar?: string | null;
  agent_name?: string | null;
}

const mapSeller = (row: SellerDbRow) => ({
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

router.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { limit, offset } = getPagination(req);
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
           ORDER BY s.id DESC`
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
           ORDER BY s.id DESC`,
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
           ORDER BY s.id DESC`,
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

router.get('/:id', requireRole('manager', 'agent', 'seller'), async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT s.*, a.name as agent_name FROM sellers s LEFT JOIN agents a ON s.agent_id = a.id WHERE s.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    if (req.user.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0 || agentRes.rows[0].id !== result.rows[0].agent_id) {
        return res.status(403).json({ error: 'Access denied: this seller does not belong to your agency' });
      }
    } else if (req.user.role === 'seller') {
      if (String(result.rows[0].user_id) !== String(req.user.id)) {
        return res.status(403).json({ error: 'Access denied: this is not your seller profile' });
      }
    }
    res.json(mapSeller(result.rows[0]));
  } catch (err) {
    logger.error('Error fetching seller:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager', 'agent'), validate(createSellerSchema), async (req: AuthRequest, res: Response) => {
  const {
    name, store_name, id_number, phone, region, region_code, status,
    username, password, agent_name
  } = req.body;
  const avatar = req.body.avatar ?? req.body.id_document ?? req.body.idDocument ?? '';
  try {
    // Support camelCase parameters
    const storeNameVal = store_name ?? req.body.storeName ?? '';
    const idNumberVal = id_number ?? req.body.idNumber ?? '';
    const regionCodeVal = region_code ?? req.body.regionCode ?? '';

    // Create user account for the seller
    const sellerUsername = (username || phone || `seller_${Date.now()}`).trim().toLowerCase();
    const sellerPassword = password || crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(sellerPassword, 10);

    // Resolve agent_id. Agents may ONLY create sellers under their own
    // agency — any agent_name/agent_id sent in the request body is ignored to
    // prevent cross-tenant (IDOR) assignment of sellers to another agency.
    let agentId: number | null = null;
    if (req.user?.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: no agency is associated with your account' });
      }
      agentId = agentRes.rows[0].id;
    } else if (agent_name) {
      const agentRes = await query('SELECT id FROM agents WHERE name = $1', [agent_name]);
      if (agentRes.rows.length > 0) {
        agentId = agentRes.rows[0].id;
      }
    }

    const sid = req.body.seller_id || req.body.sellerId || `SLR-${crypto.randomUUID().split('-').slice(0, 2).join('')}`;
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
        `INSERT INTO sellers (seller_id, user_id, agent_id, name, store_name, id_number, phone, region, region_code, status, creation_date, last_login, avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [sid, userId, agentId, name, storeNameVal, idNumberVal, phone || '', region || '', regionCodeVal, status || 'active', now, 'لم يسجل دخول بعد', avatar]
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

    broadcastEvent({ type: 'seller.created', entity: 'seller', id: createdSeller.id, name: createdSeller.name, agent_id: agentId });
    cacheInvalidate('report:');

    // Best-effort push: notify managers a new seller was registered. Never
    // blocks the HTTP response.
    void notifyNewMember({
      memberType: 'seller',
      name,
      region,
      createdBy: req.user?.username || 'مستخدم النظام',
    }).catch((err) => logger.warn('[FCM] new seller notify failed:', err));

    res.status(201).json({
      seller: createdSeller,
      message: 'تم إنشاء البائع بنجاح. اسم المستخدم: ' + sellerUsername,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode?: number }).statusCode === 409) {
      return res.status(409).json({ error: err instanceof Error ? err.message : String(err) });
    }
    logger.error('Error creating seller:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireRole('manager', 'agent'), validate(updateSellerSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await query('SELECT * FROM sellers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    if (req.user?.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0 || agentRes.rows[0].id !== existing.rows[0].agent_id) {
        return res.status(403).json({ error: 'Access denied: this seller does not belong to your agency' });
      }
    }
    const cur = existing.rows[0];
    const name = req.body.name ?? cur.name;
    const store_name = req.body.store_name ?? req.body.storeName ?? cur.store_name;
    const id_number = req.body.id_number ?? req.body.idNumber ?? cur.id_number;
    const phone = req.body.phone ?? cur.phone;
    const region = req.body.region ?? cur.region;
    const region_code = req.body.region_code ?? req.body.regionCode ?? cur.region_code;
    const avatar = req.body.avatar ?? req.body.id_document ?? req.body.idDocument ?? cur.avatar;

    // Agents may NOT change seller status — only managers can
    let status = cur.status;
    if (req.user?.role === 'manager') {
      status = req.body.status ?? cur.status;
    } else if (req.user?.role === 'agent' && req.body.status && req.body.status !== cur.status) {
      return res.status(403).json({ error: 'Access denied: agents cannot change seller status' });
    }

    await query(
      `UPDATE sellers SET name=$1, store_name=$2, id_number=$3, phone=$4, region=$5, region_code=$6, status=$7, avatar=$8 WHERE id=$9 RETURNING *`,
      [name, store_name, id_number, phone, region, region_code, status, avatar, id]
    );
    const updated = await query(
      `SELECT s.*, a.name as agent_name FROM sellers s LEFT JOIN agents a ON s.agent_id = a.id WHERE s.id = $1`,
      [id]
    );
    broadcastEvent({ type: 'seller.updated', entity: 'seller', id, status, action: 'update' });
    res.json(mapSeller(updated.rows[0]));
  } catch (err) {
    logger.error('Error updating seller:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/balance', requireRole('manager', 'agent'), validate(updateSellerBalanceSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, invoiceImage } = req.body;
  try {
    const existing = await query('SELECT * FROM sellers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    if (req.user?.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0 || agentRes.rows[0].id !== existing.rows[0].agent_id) {
        return res.status(403).json({ error: 'Access denied: this seller does not belong to your agency' });
      }
    }
    const result = await transaction(async (client) => {
      const lock = await client.query('SELECT sales_30_days, total_sales FROM sellers WHERE id = $1 FOR UPDATE', [id]);
      const lockedRow = lock.rows[0];
      const updatedSales = (lockedRow.sales_30_days || 0) + amount;
      if (updatedSales < 0) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      const updateResult = await client.query(
        `UPDATE sellers SET sales_30_days=$1, total_sales=COALESCE(total_sales,0)+$2 WHERE id=$3 RETURNING *`,
        [updatedSales, amount, id]
      );
      const finalResult = await client.query(
        `SELECT s.*, a.name as agent_name FROM sellers s LEFT JOIN agents a ON s.agent_id = a.id WHERE s.id = $1`,
        [id]
      );
      // Record a recharge operation so the captured invoice is persisted and auditable.
      if (invoiceImage) {
        const seller = updateResult.rows[0];
        const opId = `recharge-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        await client.query(
          `INSERT INTO operations (op_id, type, target, operator, date, time, status, customer_name, contract_image, created_by)
           VALUES ($1, 'recharge', $2, 'yemen_telecom', TO_CHAR(NOW(), 'YYYY/MM/DD'), TO_CHAR(NOW(), 'HH24:MI:SS'), 'success', $3, $4, $5)`,
          [opId, `#BALANCE-${seller.seller_id}`, seller.name, invoiceImage, req.user?.id || null]
        );
      }
      return finalResult.rows[0];
    });
    broadcastEvent({ type: 'seller.updated', entity: 'seller', id, action: 'balance', amount });
    cacheInvalidate('report:');
    res.json(mapSeller(result));
  } catch (err) {
    if (err instanceof Error && err.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ error: 'الرصيد الحالي غير كافٍ لهذه العملية' });
    }
    logger.error('Error updating seller balance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/reset-password', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const sellerRes = await query('SELECT * FROM sellers WHERE id = $1', [id]);
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    if (req.user?.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0 || agentRes.rows[0].id !== sellerRes.rows[0].agent_id) {
        return res.status(403).json({ error: 'Access denied: this seller does not belong to your agency' });
      }
    }
    const seller = sellerRes.rows[0];
    if (!seller.user_id) {
      return res.status(400).json({ error: 'Seller has no linked user account' });
    }
    const newPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password_hash = $1, active_session_sid = NULL, session_expires_at = NULL WHERE id = $2',
      [passwordHash, seller.user_id]
    );
    const userRes = await query('SELECT username FROM users WHERE id = $1', [seller.user_id]);
    res.json({
      message: `تم إعادة تعيين كلمة المرور بنجاح لـ ${seller.name}. اسم المستخدم: ${userRes.rows[0].username}`,
    });
  } catch (err) {
    logger.error('Error resetting seller password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await query('SELECT * FROM sellers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    if (req.user?.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0 || agentRes.rows[0].id !== existing.rows[0].agent_id) {
        return res.status(403).json({ error: 'Access denied: this seller does not belong to your agency' });
      }
    }
    const seller = existing.rows[0];
    await transaction(async (client) => {
      if (seller.user_id) {
        await client.query(
          `UPDATE users SET status = $1, active_session_sid = NULL, session_expires_at = NULL WHERE id = $2`,
          ['inactive', seller.user_id]
        );
      }
      await client.query(
        `UPDATE sims SET assigned_to = NULL, owner = $1, owner_role = 'admin' WHERE assigned_to = $2`,
        ['المركز الرئيسي', id]
      );
      await client.query('DELETE FROM distribution_requests WHERE seller_id = $1', [id]);
      await client.query('UPDATE sellers SET status = $1 WHERE id = $2', ['deleted', id]);
      // Audit log for seller deletion
      const deleteLogId = `SELLER-DELETE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      await client.query(
        `INSERT INTO audit_logs (log_id, type, title, username, time, status, device_name, ip_address, mac_address, login_at, session_status)
         VALUES ($1, 'seller_deleted', $2, $3, TO_CHAR(NOW(), 'YYYY/MM/DD HH24:MI:SS'), 'success', '', '', '', NOW(), 'closed')`,
        [deleteLogId, `حذف بائع: ${seller.name}`, req.user?.username || 'unknown']
      );
    });
    broadcastEvent({ type: 'seller.deleted', entity: 'seller', id });
    cacheInvalidate('report:');
    res.json({ message: 'Seller deleted successfully' });
  } catch (err) {
    logger.error('Error deleting seller:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
