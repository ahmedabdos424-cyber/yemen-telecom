import { Router, Request, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { cacheGet, cacheSet } from '../cache';
import { requireRole, AuthRequest } from '../middleware/auth';
import {
  DailySalesRow,
  AgentPerformanceRow,
  OperatorDistributionRow,
  SellerPerformanceRow,
  ActivationsReportRow,
  SellersRegistryRow,
  AgentIdRow,
} from '../types/reports';

const router = Router();

router.get('/daily-sales', requireRole('manager'), async (_req: Request, res: Response) => {
  const cached = cacheGet('report:daily-sales');
  if (cached) return res.json(cached);
  try {
    const result = await query<DailySalesRow>(`
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
    cacheSet('report:daily-sales', result.rows, 300_000);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching daily sales:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/agent-performance', requireRole('manager'), async (_req: Request, res: Response) => {
  const cached = cacheGet('report:agent-performance');
  if (cached) return res.json(cached);
  try {
    const result = await query<AgentPerformanceRow>(`
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
    cacheSet('report:agent-performance', result.rows, 300_000);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching agent performance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/operator-distribution', requireRole('manager'), async (_req: Request, res: Response) => {
  const cached = cacheGet('report:operator-distribution');
  if (cached) return res.json(cached);
  try {
    const sims = await query<OperatorDistributionRow>(`
      SELECT provider AS operator, COUNT(*) AS count, status
      FROM sims GROUP BY provider, status ORDER BY provider
    `);
    const ops = await query<OperatorDistributionRow>(`
      SELECT operator, COUNT(*) AS count, status
      FROM operations GROUP BY operator, status ORDER BY operator
    `);
    const data = { sims: sims.rows, operations: ops.rows };
    cacheSet('report:operator-distribution', data, 300_000);
    res.json(data);
  } catch (err) {
    logger.error('Error fetching operator distribution:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/seller-performance', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  const cacheKey = `report:seller-performance:${req.user?.id || 'anon'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);
  try {
    let whereClause = '';
    let params: any[] | undefined;
    if (req.user?.role === 'agent') {
      const agentRes = await query<AgentIdRow>('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0) {
        return res.json([]);
      }
      whereClause = ' WHERE s.agent_id = $1';
      params = [agentRes.rows[0].id];
    }
    const result = await query<SellerPerformanceRow>(`
      SELECT
        s.id, s.name, s.store_name, s.region,
        s.sims_count, s.sales_30_days, s.sales_growth,
        s.efficiency, s.activity_rate, s.status,
        s.avatar, s.id_number, s.phone,
        a.name AS agent_name
      FROM sellers s
      LEFT JOIN agents a ON s.agent_id = a.id
      ${whereClause}
      ORDER BY s.sales_30_days DESC
      LIMIT 100
    `, params);
    cacheSet(cacheKey, result.rows, 120_000);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching seller performance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Detailed activation report — every activate operation with customer data
// and the contract evidence image. This powers the manager's activations
// table (thumbnail + lightbox) and CSV/Excel export.
router.get('/activations', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  const cacheKey = `report:activations:${req.user?.role === 'agent' ? req.user.id : 'manager'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);
  try {
    let whereClause = 'WHERE o.type = $1';
    let params: any[] = ['activate'];
    if (req.user?.role === 'agent') {
      const agentRes = await query<AgentIdRow>('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0) {
        return res.json([]);
      }
      const agentId = agentRes.rows[0].id;
      whereClause = `WHERE o.type = $1 AND (
        o.created_by = $2
        OR o.created_by IN (SELECT s.user_id FROM sellers s WHERE s.agent_id = $2)
      )`;
      params = ['activate', agentId];
    }
    const result = await query<ActivationsReportRow>(`
      SELECT
        o.op_id, o.type, o.target, o.operator, o.date, o.time, o.status,
        o.customer_name, o.customer_id, o.contract_image, o.iccid, o.created_at,
        COALESCE(u.display_name, '') AS actor_name,
        COALESCE(u.role, '') AS actor_role,
        COALESCE(a.name, '') AS agent_name,
        COALESCE(s.name, '') AS seller_name
      FROM operations o
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN sellers s ON s.user_id = o.created_by
      LEFT JOIN agents a ON a.id = s.agent_id
      ${whereClause}
      ORDER BY o.id DESC
      LIMIT 500
    `, params);
    cacheSet(cacheKey, result.rows, 120_000);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching activations report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sellers registry report — seller profile + avatar/id document image.
router.get('/sellers', requireRole('manager', 'agent'), async (req: AuthRequest, res: Response) => {
  try {
    let whereClause = '';
    let params: any[] | undefined;
    if (req.user?.role === 'agent') {
      const agentRes = await query<AgentIdRow>('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0) {
        return res.json([]);
      }
      whereClause = ' WHERE s.agent_id = $1';
      params = [agentRes.rows[0].id];
    }
    const result = await query<SellersRegistryRow>(`
      SELECT
        s.id, s.seller_id, s.name, s.store_name, s.id_number, s.phone,
        s.region, s.region_code, s.status, s.avatar, s.creation_date, s.last_login,
        s.total_sales, s.current_stock, s.efficiency, s.sims_count,
        s.sales_30_days, s.sales_growth, s.activity_rate,
        a.name AS agent_name
      FROM sellers s
      LEFT JOIN agents a ON s.agent_id = a.id
      ${whereClause}
      ORDER BY s.id DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching sellers report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
