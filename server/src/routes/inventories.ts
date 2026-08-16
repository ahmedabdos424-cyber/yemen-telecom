import { Router, Request, Response } from 'express';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole } from '../middleware/auth';
import { validate, updateInventoriesSchema } from '../validation';
import { broadcastEvent } from '../services/realtime.service';

const router = Router();

function toInventoryDto(r: { operator: string; available: number; remaining: number; period_days: number }) {
  return {
    operator: r.operator,
    available: r.available,
    remaining: r.remaining,
    periodDays: r.period_days,
  };
}

router.get('/', requireRole('manager', 'agent'), async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM inventories ORDER BY id');
    res.json(result.rows.map(toInventoryDto));
  } catch (err) {
    logger.error('Error fetching inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', requireRole('manager'), validate(updateInventoriesSchema), async (req: Request, res: Response) => {
  const updates: Array<{ operator: string; available: number; remaining: number }> = req.body;
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
        await client.query(
          `UPDATE inventories i
           SET available = u.available, remaining = u.remaining
           FROM (VALUES ${rows.join(', ')}) AS u(available, remaining, operator)
           WHERE i.operator = u.operator`,
          params
        );
      });
    }
    const result = await query('SELECT * FROM inventories ORDER BY id');
    broadcastEvent({ type: 'inventory.updated', entity: 'inventory', action: 'update', operators: updates.map(u => u.operator) });
    res.json(result.rows.map(toInventoryDto));
  } catch (err) {
    logger.error('Error updating inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;