import { Router, Request, Response } from 'express';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole } from '../middleware/auth';
import { validate, updateInventoriesSchema, resolveProviderSlug } from '../validation';
import { broadcastEvent } from '../services/realtime.service';

const router = Router();

async function toInventoryDto(r: { provider_id: number | null; operator: string; available: number; remaining: number; period_days: number }) {
  // Prefer provider_id, fallback to operator column for backward compatibility
  let operator = r.operator;
  if (r.provider_id) {
    operator = await resolveProviderSlug(null, r.provider_id);
  }
  return {
    operator,
    available: r.available,
    remaining: r.remaining,
    periodDays: r.period_days,
  };
}

router.get('/', requireRole('manager', 'agent'), async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM inventories ORDER BY id');
    const inventories = await Promise.all(result.rows.map(toInventoryDto));
    res.json(inventories);
  } catch (err) {
    logger.error('Error fetching inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', requireRole('manager'), validate(updateInventoriesSchema), async (req: Request, res: Response) => {
  const updates: Array<{ operator: string | number; available: number; remaining: number }> = req.body;
  try {
    if (updates.length > 0) {
      await transaction(async (client) => {
        const params: Array<string | number> = [];
        const rows: string[] = [];
        updates.forEach((inv, i) => {
          const base = i * 3;
          rows.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
          params.push(inv.available, inv.remaining, inv.operator);
        });
        // Support both operator (slug) and provider_id in the update
        await client.query(
          `UPDATE inventories i
           SET available = u.available, remaining = u.remaining
           FROM (VALUES ${rows.join(', ')}) AS u(available, remaining, operator_or_id)
           WHERE i.operator = u.operator_or_id OR i.provider_id = u.operator_or_id`,
          params
        );
      });
    }
    const result = await query('SELECT * FROM inventories ORDER BY id');
    const inventories = await Promise.all(result.rows.map(toInventoryDto));
    // Extract operators for broadcast (convert to slugs)
    const operators = await Promise.all(updates.map(async u => {
      if (typeof u.operator === 'number') return resolveProviderSlug(null, u.operator);
      return u.operator;
    }));
    broadcastEvent({ type: 'inventory.updated', entity: 'inventory', action: 'update', operators });
    res.json(inventories);
  } catch (err) {
    logger.error('Error updating inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;