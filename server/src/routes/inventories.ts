import { Router, Request, Response } from 'express';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';
import { validate, updateInventoriesSchema, resolveProviderSlug } from '../validation';
import { broadcastEvent } from '../services/realtime.service';
import { logAudit } from '../audit-log';
import { cacheInvalidate } from '../cache';

const router = Router();

async function toInventoryDto(r: { provider_id: number | null; operator: string; available: number; remaining: number; period_days: number }) {
  // Prefer provider_id, fallback to operator column for backward compatibility
  let operator = r.operator;
  if (r.provider_id) {
    operator = resolveProviderSlug(r.provider_id);
  }
  return {
    operator,
    available: r.available,
    remaining: r.remaining,
    periodDays: r.period_days,
  };
}

router.get('/', requireRole('manager', 'agent', 'seller'), async (_req: Request, res: Response) => {
  try {
    // Read-only global stock overview for all roles (PUT stays manager-only).
    // Sellers previously got 403 here while the app fetched it on every
    // refresh (C-10); the data itself is aggregate availability, not PII.
    const result = await query('SELECT * FROM inventories ORDER BY id');
    const inventories = await Promise.all(result.rows.map(toInventoryDto));
    res.json(inventories);
  } catch (err) {
    logger.error('Error fetching inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', requireRole('manager'), validate(updateInventoriesSchema), async (req: AuthRequest, res: Response) => {
  const updates: Array<{ operator: string | number; available: number; remaining: number }> = req.body;
  try {
    if (updates.length > 0) {
      const touched = await transaction(async (client) => {
        const params: Array<string | number> = [];
        const rows: string[] = [];
        updates.forEach((inv, i) => {
          const base = i * 3;
          rows.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
          params.push(inv.available, inv.remaining, inv.operator);
        });
        // Support both operator (slug) and provider_id in the update
        const updated = await client.query(
          `UPDATE inventories i
           SET available = u.available, remaining = u.remaining
           FROM (VALUES ${rows.join(', ')}) AS u(available, remaining, operator_or_id)
           WHERE i.operator = u.operator_or_id OR i.provider_id = u.operator_or_id`,
          params
        );
        return updated.rowCount ?? 0;
      });
      // L-02: an unknown operator slug matches zero rows — fail loudly (400)
      // instead of returning 200 with unchanged data.
      if (touched === 0) {
        return res.status(400).json({ error: 'No inventory rows matched the requested operator(s)' });
      }
    }
    const result = await query('SELECT * FROM inventories ORDER BY id');
    const inventories = await Promise.all(result.rows.map(toInventoryDto));
    // Extract operators for broadcast (convert to slugs)
    const operators = await Promise.all(updates.map(async u => {
      if (typeof u.operator === 'number') return resolveProviderSlug(u.operator);
      return u.operator;
    }));
    broadcastEvent({ type: 'inventory.updated', entity: 'inventory', action: 'update', operators });
    // H-03: inventory edits feed the daily-sales/operator reports (and the
    // overview stats) — drop the cached reports so the next read is fresh.
    cacheInvalidate('report:');
    res.json(inventories);
    void logAudit({ type: 'inventory_updated', title: `تحديث المخزون (${updates.length} مشغل)`, username: req.user?.username || 'unknown' });
  } catch (err) {
    logger.error('Error updating inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;