import { Router, Request, Response } from 'express';
import { query, transaction } from '../../db';
import { logger } from '../../logger';
import { requireRole } from '../../middleware/auth';
import { getPagination } from '../../helpers';
import { broadcastEvent } from '../../services/realtime.service';
import { mapAuditRow } from './shared';

const router = Router();

// ========================
// Seller & POS management (manager only)
// ========================
const ADMIN_SELLERS_SELECT = `
  SELECT s.*, a.name AS agent_name, u.username AS user_username, u.status AS user_status, u.last_login AS user_last_login,
    (SELECT COUNT(*) FROM operations o WHERE o.type = 'activate' AND o.created_by = u.id) AS activations_count
  FROM sellers s
  LEFT JOIN agents a ON s.agent_id = a.id
  LEFT JOIN users u ON u.id = s.user_id
`;

interface DbAdminSellerRow {
  id?: unknown;
  seller_id?: unknown;
  name?: unknown;
  store_name?: unknown;
  phone?: unknown;
  region?: unknown;
  status?: unknown;
  agent_id?: unknown;
  agent_name?: unknown;
  user_username?: unknown;
  user_status?: unknown;
  sales_30_days?: unknown;
  current_stock?: unknown;
  total_sales?: unknown;
  activations_count?: unknown;
  user_last_login?: unknown;
  last_login?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

function toCoord(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function mapAdminSeller(r: DbAdminSellerRow) {
  return {
    id: String(r.id),
    sellerId: r.seller_id,
    name: r.name,
    storeName: r.store_name,
    phone: r.phone,
    region: r.region,
    status: r.status,
    agentId: r.agent_id ? String(r.agent_id) : null,
    agentName: r.agent_name || '',
    username: r.user_username || '',
    userStatus: r.user_status || '',
    balance: r.sales_30_days || 0,
    currentStock: r.current_stock || 0,
    totalSales: r.total_sales || 0,
    activationsCount: Number(r.activations_count) || 0,
    lastLogin: r.user_last_login || r.last_login || '',
    latitude: toCoord(r.latitude),
    longitude: toCoord(r.longitude),
  };
}

router.get('/sellers', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const result = await query(`${ADMIN_SELLERS_SELECT} ORDER BY s.id DESC`);
    res.json(result.rows.map(mapAdminSeller));
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

// تفعيل/تعطيل بائع — يزامن حالة حساب المستخدم المرتبط به
router.put('/sellers/:id/status', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = req.body?.status;
    if (status !== 'active' && status !== 'inactive') {
      return res.status(400).json({ error: 'VALIDATION_FAILED', message: 'الحالة يجب أن تكون active أو inactive' });
    }
    const existing = await query('SELECT * FROM sellers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    const seller = existing.rows[0];
    await transaction(async (client) => {
      await client.query('UPDATE sellers SET status = $1 WHERE id = $2', [status, id]);
      if (seller.user_id) {
        await client.query('UPDATE users SET status = $1 WHERE id = $2', [status, seller.user_id]);
      }
    });
    broadcastEvent({ type: 'seller.updated', entity: 'seller', id, status, action: 'status-toggle' });
    const updated = await query(`${ADMIN_SELLERS_SELECT} WHERE s.id = $1`, [id]);
    res.json(updated.rows[0] ? mapAdminSeller(updated.rows[0]) : { id: String(id), status });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

// سجل جلسات دخول بائع معين (دخول ناجح/فاشل/خروج) من audit_logs
router.get('/sellers/:id/sessions', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page, limit, offset } = getPagination(req);
    const sellerRes = await query(
      'SELECT u.username FROM sellers s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = $1',
      [id]
    );
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    const uname = sellerRes.rows[0].username;
    if (!uname) {
      return res.json({ logs: [], total: 0, page, limit, totalPages: 1 });
    }
    const logsRes = await query(
      'SELECT * FROM audit_logs WHERE username = $1 ORDER BY id DESC LIMIT $2 OFFSET $3',
      [uname, limit, offset]
    );
    const totalRes = await query('SELECT COUNT(*) AS count FROM audit_logs WHERE username = $1', [uname]);
    const total = parseInt(totalRes.rows[0]?.count || '0', 10);
    res.json({
      logs: logsRes.rows.map(mapAuditRow),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

export default router;
