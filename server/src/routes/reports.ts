import { Router, Response } from 'express';
import { query } from '../db';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/daily-sales', requireRole('manager'), async (_req: any, res: Response) => {
  try {
    const result = await query(`
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS activations,
        COUNT(DISTINCT customer_name) AS unique_customers,
        operator
      FROM operations
      WHERE type='activate' AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at), operator
      ORDER BY day DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching daily sales:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/agent-performance', requireRole('manager'), async (_req: any, res: Response) => {
  try {
    const result = await query(`
      SELECT
        a.id, a.name AS agent_name, a.region,
        COUNT(DISTINCT s.id) AS seller_count,
        COALESCE(SUM(s.sims_count), 0) AS total_sims,
        COALESCE(SUM(s.sales_30_days), 0) AS sales_30_days,
        COALESCE(AVG(s.efficiency), 0) AS avg_efficiency
      FROM agents a
      LEFT JOIN sellers s ON s.agent_id = a.id
      GROUP BY a.id, a.name, a.region
      ORDER BY sales_30_days DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching agent performance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/operator-distribution', requireRole('manager'), async (_req: any, res: Response) => {
  try {
    const sims = await query(`
      SELECT provider AS operator, COUNT(*) AS count, status
      FROM sims GROUP BY provider, status ORDER BY provider
    `);
    const ops = await query(`
      SELECT operator, COUNT(*) AS count, status
      FROM operations GROUP BY operator, status ORDER BY operator
    `);
    res.json({ sims: sims.rows, operations: ops.rows });
  } catch (err) {
    console.error('Error fetching operator distribution:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/seller-performance', requireRole('manager', 'agent'), async (_req: any, res: Response) => {
  try {
    const result = await query(`
      SELECT
        s.id, s.name, s.store_name, s.region,
        s.sims_count, s.sales_30_days, s.sales_growth,
        s.efficiency, s.activity_rate, s.status,
        a.name AS agent_name
      FROM sellers s
      LEFT JOIN agents a ON s.agent_id = a.id
      ORDER BY s.sales_30_days DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching seller performance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
