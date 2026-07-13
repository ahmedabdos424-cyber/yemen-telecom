import { Router, Request, Response } from 'express';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { requireRole } from '../middleware/auth';
import { validate, updateInventoriesSchema } from '../validation';

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
    await transaction(async (client) => {
      if (updates.length === 0) return;
      const valueClauses: string[] = [];
      const valueParams: any[] = [];
      updates.forEach((inv, i) => {
        const base = i * 3;
        valueClauses.push(`($${base + 1}::int, $${base + 2}::int, $${base + 3}::text)`);
        valueParams.push(inv.available, inv.remaining, inv.operator);
      });
      await client.query(
        `UPDATE inventories SET
          available = data.available,
          remaining = data.remaining
        FROM (VALUES ${valueClauses.join(', ')}) AS data(available, remaining, operator)
        WHERE inventories.operator = data.operator`,
        valueParams
      );
    });
    const result = await query('SELECT * FROM inventories ORDER BY id');
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
