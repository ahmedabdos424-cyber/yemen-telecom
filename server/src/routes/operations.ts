import crypto from 'crypto';
import { Router, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination, rejectIfUnpaginatedTooLarge } from '../helpers';
import { validate, createOperationSchema } from '../validation';
import { cacheInvalidate } from '../cache';
import { logAudit } from '../audit-log';

const router = Router();

router.get('/', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  try {
    const { limit, offset } = getPagination(req);
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
    } else {
      const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
      // COUNT params exclude LIMIT/OFFSET (not yet pushed) — reuse filter params as-is.
      if (await rejectIfUnpaginatedTooLarge(res, 'SELECT COUNT(*) FROM operations' + where, params, 'operations')) return;
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

router.post('/', requireRole('manager', 'agent', 'seller'), validate(createOperationSchema), async (req: AuthRequest, res: Response) => {
  const { type, target, operator, status } = req.body;
  const customerName = req.body.customer_name ?? req.body.customerName ?? null;
  const customerId = req.body.customer_id ?? req.body.customerId ?? null;
  const contractImage = req.body.contract_image ?? req.body.contractImage ?? null;
  const iccid = req.body.iccid ?? null;
  // Client-supplied idempotency key: an offline-queue or network retry replays
  // the exact same operation instead of inserting a duplicate row.
  const clientOpId = req.body.op_id ?? req.body.opId ?? null;

  // Sellers can only create recharge operations (not activate)
  if (req.user?.role === 'seller' && type === 'activate') {
    return res.status(403).json({ error: 'Sellers cannot create activation operations' });
  }

  try {
    // Idempotent replay: if an operation with this key already exists it is
    // returned untouched. The key is bound to its original creator, so a
    // replay can never hijack another user's operation id.
    if (clientOpId) {
      const existing = await query('SELECT * FROM operations WHERE op_id = $1', [clientOpId]);
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (Number(row.created_by) !== Number(req.user?.id)) {
          return res.status(409).json({ error: 'هوية العملية مستخدمة بالفعل' });
        }
        return res.json(toMappedOperation(row));
      }
    }

    const opId = clientOpId ?? `op_${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();
    const date = now.toISOString().split('T')[0].replace(/-/g, '/');
    const time = 'الآن';
    const result = await query(
      `INSERT INTO operations (op_id, type, target, operator, date, time, status, customer_name, customer_id, contract_image, iccid, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [opId, type, target, operator || '', date, time, status || 'success', customerName, customerId, contractImage, iccid, req.user?.id]
    );
    res.status(201).json(toMappedOperation(result.rows[0]));
    // Audit trail for sales operations (idempotent replays skip this)
    void logAudit({ type: `operation_${type}`, title: `عملية ${type} على ${target || iccid || '—'}`, username: req.user?.username || 'unknown' });
    // Invalidate report cache so fresh data appears immediately
    cacheInvalidate('report:');
  } catch (err) {
    logger.error('Error creating operation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function toMappedOperation(row: {
  op_id: string; type: string; target: string; operator: string;
  date: string; time: string; status: string;
  customer_name?: string; customer_id?: string; contract_image?: string; iccid?: string;
}): Record<string, unknown> {
  return {
    id: row.op_id,
    type: row.type,
    target: row.target,
    operator: row.operator,
    date: row.date,
    time: row.time,
    status: row.status,
    customer_name: row.customer_name,
    customer_id: row.customer_id,
    contract_image: row.contract_image,
    iccid: row.iccid,
  };
}

export default router;
