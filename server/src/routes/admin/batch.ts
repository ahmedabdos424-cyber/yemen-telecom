import { Router, Response } from 'express';
import { query, transaction } from '../../db';
import { logger } from '../../logger';
import { requireRole, AuthRequest } from '../../middleware/auth';
import { validate, createSimBatchSchema } from '../../validation';
import { createAlert } from '../../services/alerts.service';
import { notifyBatchAssigned } from '../../services/fcm.service';

const router = Router();

// ========================
// Batch SIM inventory (range-based ICCID)
// ========================
const MAX_BATCH_SIMS = 5000;

router.post('/sims/batch', requireRole('manager'), validate(createSimBatchSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { from_iccid, to_iccid, provider, package_type, owner_role, owner_id } = req.body;

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
    if (totalCount > BigInt(MAX_BATCH_SIMS)) {
      return res.status(400).json({ error: `Batch limit is ${MAX_BATCH_SIMS} SIMs per request` });
    }

    let status = 'available';
    let ownerText = 'المركز الرئيسي';
    let assignedToSeller: number | null = null;
    let assignedToAgent: number | null = null;

    if (owner_role && owner_role !== 'admin') {
      if (!owner_id) {
        return res.status(400).json({ error: 'owner_id is required when assigning to an agent or seller' });
      }
      if (owner_role === 'agent') {
        const agentRes = await query('SELECT id, name FROM agents WHERE id = $1', [owner_id]);
        if (agentRes.rows.length === 0) {
          return res.status(400).json({ error: 'Agent not found' });
        }
        ownerText = agentRes.rows[0].name || `Agent #${owner_id}`;
        assignedToAgent = owner_id;
        // The SIM becomes part of the agent's available stock (owner_role=agent).
        status = 'available';
      } else {
        const sellerRes = await query('SELECT id, name FROM sellers WHERE id = $1', [owner_id]);
        if (sellerRes.rows.length === 0) {
          return res.status(400).json({ error: 'Seller not found' });
        }
        ownerText = sellerRes.rows[0].name || `Seller #${owner_id}`;
        assignedToSeller = owner_id;
        // The SIM becomes part of the seller's available stock (owner_role=seller).
        status = 'available';
      }
    }

    // Expand the range into explicit ICCIDs (zero-padded to the input width).
    const width = from_iccid.length;
    const iccids: string[] = [];
    for (let value = fromVal; value <= toVal; value += 1n) {
      iccids.push(value.toString().padStart(width, '0'));
    }

    const dateAdded = new Date().toLocaleDateString('ar-YE');
    const cols = 10;
    const placeholders = iccids
      .map((_, i) => `($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, $${i * cols + 5}, $${i * cols + 6}, $${i * cols + 7}, $${i * cols + 8}, $${i * cols + 9}, $${i * cols + 10})`)
      .join(', ');
    const params: (string | number | null)[] = [];
    for (const iccid of iccids) {
      params.push(
        iccid,
        '',
        provider,
        status,
        ownerText,
        dateAdded,
        package_type,
        owner_role,
        assignedToSeller,
        assignedToAgent
      );
    }

    const created = await transaction(async (client) => {
      const insertResult = await client.query(
        `INSERT INTO sims (iccid, phone, provider, status, owner, date_added, package_type, owner_role, assigned_to, assigned_to_agent)
         VALUES ${placeholders}
         ON CONFLICT (iccid) DO NOTHING
         RETURNING id`,
        params
      );
      const inserted = insertResult.rows.length;
      // Stock counters: the batch lands in the owner's inventory, so their
      // available stock must reflect it atomically with the insert.
      if (inserted > 0 && owner_role === 'agent' && assignedToAgent != null) {
        await client.query('UPDATE agents SET sims_count = sims_count + $1 WHERE id = $2', [inserted, assignedToAgent]);
      } else if (inserted > 0 && owner_role === 'seller' && assignedToSeller != null) {
        await client.query(
          'UPDATE sellers SET current_stock = current_stock + $1, sims_count = sims_count + $1 WHERE id = $2',
          [inserted, assignedToSeller]
        );
      }
      if (inserted > 0) {
        await createAlert(
          {
            title: `تمت إضافة دفعة شرائح (${inserted} شريحة)`,
            description: `أُضيفت ${inserted} شريحة عبر النطاق ${from_iccid} → ${to_iccid} للمشغل ${provider} (الحالة: ${status === 'assigned' ? 'مسندة' : 'متاحة'})، المالك: ${ownerText}.`,
            priority: 'low',
            category: 'مخزون',
            userId: req.user?.id ?? null,
          },
          client
        );
      }
      return inserted;
    });
    const skipped = iccids.length - created;

    // Best-effort push: when the batch was assigned to a specific agent/seller,
    // notify that user that new SIMs landed in their stock. Never blocks the
    // response; a failure only logs.
    if (created > 0 && owner_id && owner_role) {
      const table = owner_role === 'agent' ? 'agents' : 'sellers';
      query(`SELECT user_id AS id FROM ${table} WHERE id = $1 AND user_id IS NOT NULL`, [owner_id])
        .then((u) => {
          if (u.rows[0]?.id) {
            void notifyBatchAssigned([u.rows[0].id], {
              count: created,
              provider,
              iccidRange: `${from_iccid} → ${to_iccid}`,
            });
          }
        })
        .catch((err) => logger.warn('[FCM] batch assignment notify failed:', err));
    }

    res.status(201).json({
      created,
      skipped,
      total: iccids.length,
      from_iccid,
      to_iccid,
      status,
      owner_role,
      owner: ownerText,
    });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

export default router;
