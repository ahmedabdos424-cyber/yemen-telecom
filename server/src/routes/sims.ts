import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination, paginatedQuery } from '../helpers';
import { validate, createSimSchema, updateSimSchema, activateSimSchema, transferSimsSchema } from '../validation';
import { createAlert } from '../services/alerts.service';
import { broadcastEvent } from '../services/realtime.service';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { cacheInvalidate } from '../cache';

interface SimDbRow {
  id: number;
  phone?: string;
  iccid: string;
  provider?: string;
  status?: string;
  owner?: string;
  date_added?: string;
  package_type?: string;
  assigned_to?: number | null;
  contract_image?: string | null;
  customer_name?: string | null;
  customer_id?: string | null;
  created_at?: string;
  owner_role?: string;
  assigned_to_agent?: number | null;
}

const router = Router();

router.post('/activate', requireRole('manager', 'agent', 'seller'), validate(activateSimSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { iccid } = req.body;
    const customerName = req.body.customer_name ?? req.body.customerName ?? null;
    const customerId = req.body.customer_id ?? req.body.customerId ?? null;
    const contractImage = req.body.contract_image ?? req.body.contractImage ?? null;
    const requester = req.user;

    // Lock the SIM row to prevent concurrent activation (TOCTOU fix)
    const existing = await query('SELECT * FROM sims WHERE iccid = $1 FOR UPDATE', [iccid]);
    const sim = existing.rows[0];

    // Serial validation: the SIM must exist in the requester's available stock.
    let inStock = false;
    if (sim) {
      if (requester?.role === 'agent') {
        const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [requester.id]);
        const agentId = agentRes.rows[0]?.id;
        inStock =
          sim.status === 'available' &&
          sim.owner_role === 'agent' &&
          agentId != null &&
          Number(sim.assigned_to_agent) === Number(agentId);
      } else if (requester?.role === 'seller') {
        const sellerRes = await query('SELECT id FROM sellers WHERE user_id = $1', [requester.id]);
        const sellerId = sellerRes.rows[0]?.id;
        inStock =
          sim.status === 'available' &&
          sim.owner_role === 'seller' &&
          sellerId != null &&
          Number(sim.assigned_to) === Number(sellerId);
      } else {
        inStock = sim.status === 'available' && sim.owner_role === 'admin';
      }
    }

    if (!inStock) {
      await createAlert({
        title: 'محاولة تفعيل شريحة خارج المخزون المتاح',
        description: `فشلت محاولة تفعيل الشريحة ${iccid} لأنها غير موجودة في المخزون المتاح للوكيل.`,
        priority: 'high',
        category: 'مخزون',
        userId: requester?.id ?? null,
      });
      return res.status(400).json({ error: 'الرقم التسلسلي غير متوفر في مخزونك' });
    }

    const updated = await query(
      `UPDATE sims SET status = 'activated', activated_by = $1,
         customer_name = COALESCE($2, customer_name),
         customer_id = COALESCE($3, customer_id),
         contract_image = COALESCE($4, contract_image)
       WHERE id = $5 AND status = 'available' RETURNING *`,
      [requester?.id ?? null, customerName, customerId, contractImage, sim.id]
    );
    if (updated.rowCount === 0) {
      return res.status(409).json({ error: 'تعذر التفعيل: الشريحة تم تفعيلها مسبقاً أو لم تعد متاحة' });
    }
    broadcastEvent({ type: 'sim.updated', entity: 'sim', id: sim.id, iccid, status: 'activated', action: 'activate' });
    cacheInvalidate('report:');
    res.json(updated.rows[0]);
  } catch (err) {
    logger.error('Error activating sim:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const MAX_TRANSFER_SIMS = 5000;

// Agent → seller SIM range transfer with strict ownership + isolation checks.
router.post('/transfer', requireRole('agent'), strictRateLimiter, validate(transferSimsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { seller_id, from_iccid, to_iccid } = req.body;

    if (from_iccid.length !== to_iccid.length) {
      return res.status(400).json({ error: 'from_iccid and to_iccid must have the same length' });
    }
    let fromVal: bigint;
    let toVal: bigint;
    try {
      fromVal = BigInt(from_iccid);
      toVal = BigInt(to_iccid);
    } catch {
      return res.status(400).json({ error: 'Invalid ICCID range values' });
    }
    if (toVal < fromVal) {
      return res.status(400).json({ error: 'to_iccid must be greater than or equal to from_iccid' });
    }
    const totalCount = toVal - fromVal + 1n;
    if (totalCount > BigInt(MAX_TRANSFER_SIMS)) {
      return res.status(400).json({ error: `Transfer limit is ${MAX_TRANSFER_SIMS} SIMs per request` });
    }

    const agentRes = await query('SELECT id, name FROM agents WHERE user_id = $1', [req.user!.id]);
    if (agentRes.rows.length === 0) {
      return res.status(400).json({ error: 'Agent profile not found' });
    }
    const agentId = Number(agentRes.rows[0].id);

    // Isolation: the target seller must belong to the requesting agent.
    const sellerRes = await query('SELECT * FROM sellers WHERE id = $1', [seller_id]);
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    const seller = sellerRes.rows[0];
    if (Number(seller.agent_id) !== agentId) {
      return res.status(403).json({ error: 'Access denied: this seller does not belong to your agency' });
    }

    // Expand the range into explicit ICCIDs (zero-padded to the input width).
    const width = from_iccid.length;
    const iccids: string[] = [];
    for (let value = fromVal; value <= toVal; value += 1n) {
      iccids.push(value.toString().padStart(width, '0'));
    }

    // Strict stock check — every SIM in the range must be in the agent's available stock.
    const owned = await query(
      `SELECT iccid FROM sims
       WHERE iccid = ANY($1) AND owner_role = 'agent' AND assigned_to_agent = $2
         AND status IN ('available', 'assigned')`,
      [iccids, agentId]
    );
    const ownedSet = new Set(owned.rows.map((r: { iccid: string }) => r.iccid));
    const missing = iccids.filter(iccid => !ownedSet.has(iccid));
    if (missing.length > 0) {
      return res.status(400).json({ error: 'الرقم التسلسلي غير متوفر في مخزونك' });
    }

    // Strict deduction: ownership move and both stock counters are updated
    // atomically so a transfer can never leave inventories out of sync.
    const updated = await transaction(async (client) => {
      const res = await client.query(
        `UPDATE sims SET owner_role = 'seller', assigned_to = $1, assigned_to_agent = NULL, owner = $2, status = 'available'
         WHERE iccid = ANY($3) AND owner_role = 'agent' AND assigned_to_agent = $4
         RETURNING id`,
        [seller_id, seller.name || `Seller #${seller_id}`, iccids, agentId]
      );
      if (res.rows.length > 0) {
        await client.query(
          'UPDATE sellers SET current_stock = current_stock + $1, sims_count = sims_count + $1 WHERE id = $2',
          [res.rows.length, seller_id]
        );
        await client.query(
          'UPDATE agents SET sims_count = GREATEST(sims_count - $1, 0) WHERE id = $2',
          [res.rows.length, agentId]
        );
      }
      return res;
    });

    await createAlert({
      title: `تم تحويل دفعة شرائح (${updated.rows.length} شريحة)`,
      description: `حُوِّلت ${updated.rows.length} شريحة عبر النطاق ${from_iccid} → ${to_iccid} إلى البائع ${seller.name}.`,
      priority: 'low',
      category: 'مخزون',
      userId: req.user?.id ?? null,
    });

    broadcastEvent({
      type: 'sim.batch_updated',
      entity: 'sim',
      action: 'transfer',
      count: updated.rows.length,
      seller_id,
      from_iccid,
      to_iccid,
    });
    cacheInvalidate('report:');

    res.json({
      transferred: updated.rows.length,
      total: iccids.length,
      from_iccid,
      to_iccid,
      seller_id,
      status: 'available',
    });
  } catch (err) {
    logger.error('Error transferring sims:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', requireRole('manager', 'agent'), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    if (req.query.page || req.query.limit) {
      const result = await paginatedQuery<SimDbRow>(
        'SELECT * FROM sims ORDER BY id DESC',
        'SELECT COUNT(*) FROM sims',
        [], page, limit, offset
      );
      return res.json(result);
    }
    const result = await query('SELECT * FROM sims ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching sims:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireRole('manager', 'agent'), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM sims WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SIM not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error fetching sim:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager'), validate(createSimSchema), async (req: Request, res: Response) => {
  const { phone, iccid, provider, status, owner, package_type } = req.body;
  try {
    const result = await query(
      `INSERT INTO sims (phone, iccid, provider, status, owner, date_added, package_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
       [phone || '', iccid, provider || 'Yemen Mobile', status || 'available', owner || 'المركز الرئيسي',
        new Date().toISOString().split('T')[0].replace(/-/g, '/'), package_type || 'باقة مزايا الشهرية']
    );
    broadcastEvent({ type: 'sim.created', entity: 'sim', id: result.rows[0].id, iccid, status: result.rows[0].status });
    cacheInvalidate('report:');
    // Audit log for single SIM creation
    const logId = `SIM-CREATE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    try {
      await query(
        `INSERT INTO audit_logs (log_id, type, title, username, time, status, device_name, ip_address, mac_address, login_at, session_status)
         VALUES ($1, 'sim_created', $2, $3, TO_CHAR(NOW(), 'YYYY/MM/DD HH24:MI:SS'), 'success', '', '', '', NOW(), 'active')`,
        [logId, `إنشاء شريحة: ${iccid} (${provider || 'Yemen Mobile'})`, (req as AuthRequest).user?.username || 'unknown']
      );
    } catch (err) {
      logger.warn('[AUDIT] Failed to log SIM creation:', err);
    }
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') {
      return res.status(409).json({ error: 'ICCID already exists' });
    }
    logger.error('Error creating sim:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireRole('manager', 'agent', 'seller'), validate(updateSimSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await query('SELECT * FROM sims WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'SIM not found' });
    }
    const cur = existing.rows[0];

    // Ownership isolation: agents/sellers may only update SIMs in their own
    // stock. Managers retain full access.
    if (req.user?.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      const agentId = agentRes.rows[0]?.id;
      const owned = cur.owner_role === 'agent' && agentId != null && Number(cur.assigned_to_agent) === Number(agentId);
      if (!owned) {
        return res.status(403).json({ error: 'Access denied: this SIM does not belong to your stock' });
      }
    } else if (req.user?.role === 'seller') {
      const sellerRes = await query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
      const sellerId = sellerRes.rows[0]?.id;
      const owned = cur.owner_role === 'seller' && sellerId != null && Number(cur.assigned_to) === Number(sellerId);
      if (!owned) {
        return res.status(403).json({ error: 'Access denied: this SIM does not belong to your stock' });
      }
    }

    const phone = req.body.phone ?? cur.phone;
    const iccid = req.body.iccid ?? cur.iccid;
    const provider = req.body.provider ?? cur.provider;
    const owner = req.body.owner ?? cur.owner;
    const package_type = req.body.package_type ?? cur.package_type;
    const customerName = req.body.customer_name ?? req.body.customerName ?? cur.customer_name;
    const customerId = req.body.customer_id ?? req.body.customerId ?? cur.customer_id;
    const contractImage = req.body.contract_image ?? req.body.contractImage ?? cur.contract_image;

    // Sellers may only set status to 'available' or 'reserved'
    let status = cur.status;
    if (req.user?.role === 'manager' || req.user?.role === 'agent') {
      status = req.body.status ?? cur.status;
    } else if (req.user?.role === 'seller') {
      const allowedStatuses = ['available', 'requested'];
      const requestedStatus = req.body.status ?? cur.status;
      if (allowedStatuses.includes(requestedStatus)) {
        status = requestedStatus;
      } else if (requestedStatus !== cur.status) {
        return res.status(403).json({ error: 'Access denied: sellers can only set status to available or requested' });
      }
    }

    const result = await query(
      `UPDATE sims SET phone=$1, iccid=$2, provider=$3, status=$4, owner=$5, package_type=$6,
         customer_name=$7, customer_id=$8, contract_image=$9 WHERE id=$10 RETURNING *`,
      [phone, iccid, provider, status, owner, package_type, customerName, customerId, contractImage, id]
    );
    broadcastEvent({ type: 'sim.updated', entity: 'sim', id, iccid, status, action: 'update' });
    cacheInvalidate('report:');
    // Audit log for SIM update
    const logId = `SIM-UPDATE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    try {
      await query(
        `INSERT INTO audit_logs (log_id, type, title, username, time, status, device_name, ip_address, mac_address, login_at, session_status)
         VALUES ($1, 'sim_updated', $2, $3, TO_CHAR(NOW(), 'YYYY/MM/DD HH24:MI:SS'), 'success', '', '', '', NOW(), 'active')`,
        [logId, `تحديث شريحة: ${iccid}`, req.user?.username || 'unknown']
      );
    } catch (err) {
      logger.warn('[AUDIT] Failed to log SIM update:', err);
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating sim:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireRole('manager'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await query('SELECT iccid FROM sims WHERE id = $1', [id]);
    const iccid = existing.rows[0]?.iccid || 'unknown';
    await query('DELETE FROM sims WHERE id = $1', [id]);
    // Audit log for SIM deletion
    const deleteLogId = `SIM-DELETE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await query(
      `INSERT INTO audit_logs (log_id, type, title, username, time, status, device_name, ip_address, mac_address, login_at, session_status)
       VALUES ($1, 'sim_deleted', $2, $3, TO_CHAR(NOW(), 'YYYY/MM/DD HH24:MI:SS'), 'success', '', '', '', NOW(), 'closed')`,
      [deleteLogId, `حذف شريحة: ${iccid}`, req.user?.username || 'unknown']
    );
    broadcastEvent({ type: 'sim.deleted', entity: 'sim', id });
    cacheInvalidate('report:');
    res.json({ success: true });
  } catch (err) {
    logger.error('Error deleting sim:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
