import crypto from 'crypto';
import { Router, Response } from 'express';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest, resolveScopeAgentId, resolveScopeSellerId } from '../middleware/auth';
import { getPagination, rejectIfUnpaginatedTooLarge } from '../helpers';
import { validate, createOperationSchema } from '../validation';
import { cacheInvalidate } from '../cache';
import { logAudit } from '../audit-log';
import { hasColumn } from '../dbColumns';

const router = Router();

router.get('/', requireRole('manager', 'agent', 'seller'), async (req: AuthRequest, res: Response) => {
  try {
    const { limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    let sql = 'SELECT * FROM operations';
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    // Agents and sellers see only their own operations; managers see all.
    if (req.user?.role === 'agent' || req.user?.role === 'seller') {
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
    // replay can never hijack another user's operation id. This outer check
    // is a fast path; the authoritative check runs inside the transaction
    // below under an advisory lock (C-04).
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
    const scopeAgentId = req.user?.role === 'agent' ? await resolveScopeAgentId(req) : null;
    const scopeSellerId = req.user?.role === 'seller' ? await resolveScopeSellerId(req) : null;
    // Probe outside the transaction (catalog read needs no tx scope).
    const linkable = await hasColumn('operations', 'customer_row_id');

    const outcome = await transaction(async (client) => {
      // Serialize concurrent inserts carrying the same op_id. The partitioned
      // operations table enforces UNIQUE(op_id, created_at) — two racing
      // inserts get different created_at values and would both succeed — so
      // the advisory lock (xact-scoped, auto-released) is the real guard.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [opId]);
      const raced = await client.query('SELECT * FROM operations WHERE op_id = $1', [opId]);
      if (raced.rows.length > 0) {
        const row = raced.rows[0];
        if (Number(row.created_by) !== Number(req.user?.id)) {
          return { status: 409 as const };
        }
        return { status: 200 as const, row, replay: true as const };
      }
      // C-04: an operation that names an ICCID must reference a real SIM in
      // the caller's scope — managers any SIM, agents their agency stock (or
      // a SIM they personally activated), sellers their own stock (or a SIM
      // they personally activated). ICCID-less records (e.g. balance
      // recharges) skip this check.
      if (iccid) {
        const simRes = await client.query(
          'SELECT owner_role, assigned_to, assigned_to_agent, activated_by FROM sims WHERE iccid = $1',
          [iccid]
        );
        const sim = simRes.rows[0];
        if (!sim) {
          return { status: 404 as const };
        }
        let allowed = false;
        if (req.user?.role === 'manager') {
          allowed = true;
        } else if (req.user?.role === 'agent' && scopeAgentId != null) {
          const ownSeller = sim.assigned_to != null
            ? (await client.query('SELECT 1 FROM sellers WHERE id = $1 AND agent_id = $2', [sim.assigned_to, scopeAgentId]))
            : { rows: [] as unknown[] };
          allowed =
            Number(sim.assigned_to_agent) === Number(scopeAgentId) ||
            Number(sim.activated_by) === Number(req.user.id) ||
            ownSeller.rows.length > 0;
        } else if (req.user?.role === 'seller' && scopeSellerId != null) {
          allowed =
            Number(sim.assigned_to) === Number(scopeSellerId) ||
            Number(sim.activated_by) === Number(req.user.id);
        }
        if (!allowed) {
          return { status: 403 as const };
        }
      }
      // C-03: resolve the integrity link. customer_id carries the national
      // id_number (see the activation flow) — store the matching customers
      // row id so detail views never fall back to name matching. The column
      // arrives via migration 050; probe first so a code deploy ahead of the
      // migration keeps working (link simply stays null until then).
      let customerRowId: number | null = null;
      if (linkable && customerId) {
        const cRes = await client.query('SELECT id FROM customers WHERE id_number = $1', [customerId]);
        if (cRes.rows[0]) customerRowId = cRes.rows[0].id;
      }
      const result = linkable
        ? await client.query(
          `INSERT INTO operations (op_id, type, target, operator, date, time, status, customer_name, customer_id, customer_row_id, contract_image, iccid, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
          [opId, type, target, operator || '', date, time, status || 'success', customerName, customerId, customerRowId, contractImage, iccid, req.user?.id]
        )
        : await client.query(
          `INSERT INTO operations (op_id, type, target, operator, date, time, status, customer_name, customer_id, contract_image, iccid, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
          [opId, type, target, operator || '', date, time, status || 'success', customerName, customerId, contractImage, iccid, req.user?.id]
        );
      return { status: 201 as const, row: result.rows[0] };
    });

    if (outcome.status === 409) {
      return res.status(409).json({ error: 'هوية العملية مستخدمة بالفعل' });
    }
    if (outcome.status === 404) {
      return res.status(404).json({ error: 'الشريحة المذكورة غير موجودة' });
    }
    if (outcome.status === 403) {
      return res.status(403).json({ error: 'الشريحة المذكورة ليست ضمن مخزونك' });
    }
    if (outcome.status === 201) {
      res.status(201).json(toMappedOperation(outcome.row));
    } else {
      res.json(toMappedOperation(outcome.row));
    }
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
