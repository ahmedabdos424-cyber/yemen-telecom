import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM inventories ORDER BY id');
    res.json(result.rows.map((r: any) => ({
      operator: r.operator,
      available: r.available,
      remaining: r.remaining,
      periodDays: r.period_days,
    })));
  } catch (err) {
    console.error('Error fetching inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  const updates: Array<{ operator: string; available: number; remaining: number }> = req.body;
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Body must be an array of inventory updates' });
  }
  try {
    for (const inv of updates) {
      await query(
        `UPDATE inventories SET available=$1, remaining=$2 WHERE operator=$3`,
        [inv.available, inv.remaining, inv.operator]
      );
    }
    const result = await query('SELECT * FROM inventories ORDER BY id');
    res.json(result.rows.map((r: any) => ({
      operator: r.operator,
      available: r.available,
      remaining: r.remaining,
      periodDays: r.period_days,
    })));
  } catch (err) {
    console.error('Error updating inventories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
