import { Router, Request, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { requireRole } from '../middleware/auth';
import { validate, updateInventoriesSchema } from '../validation';
import { broadcastEvent } from '../services/realtime.service';

const router = Router();

router.get('/', requireRole('manager', 'agent'), async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM inventories ORDER BY id');
    res.json(result.rows.map((r: { operator: string; available: number; remaining: number; period_days: number }) => ({
      operator: r.operator,
      available: r.available,
      remaining: r.remaining,
      periodDays: r.period_days,
    })));
  } catch (err) {
    logger.error('Error fetching inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', requireRole('manager'), validate(updateInventoriesSchema), async (req: Request, res: Response) => {
  const updates: Array<{ operator: string; available: number; remaining: number }> = req.body;
  try {
    for (const inv of updates) {
      await query(
        `UPDATE inventories SET available=$1, remaining=$2 WHERE operator=$3`,
        [inv.available, inv.remaining, inv.operator]
      );
    }
    const result = await query('SELECT * FROM inventories ORDER BY id');
    broadcastEvent({ type: 'inventory.updated', entity: 'inventory', action: 'update', operators: updates.map(u => u.operator) });
    res.json(result.rows.map((r: { operator: string; available: number; remaining: number; period_days: number }) => ({
      operator: r.operator,
      available: r.available,
      remaining: r.remaining,
      periodDays: r.period_days,
    })));
  } catch (err) {
    logger.error('Error updating inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
