import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

const mapSeller = (row: any) => ({
  id: String(row.id),
  sellerId: row.seller_id,
  name: row.name,
  storeName: row.store_name,
  idNumber: row.id_number,
  phone: row.phone,
  region: row.region,
  regionCode: row.region_code,
  status: row.status,
  totalSales: row.total_sales,
  currentStock: row.current_stock,
  efficiency: row.efficiency,
  simsCount: row.sims_count,
  sales30Days: row.sales_30_days,
  salesGrowth: row.sales_growth,
  activityRate: row.activity_rate,
  creationDate: row.creation_date,
  lastLogin: row.last_login,
  avatar: row.avatar,
  agent_name: row.agent_name || ''
});

router.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    let result;
    if (req.user.role === 'manager') {
      result = await query(
        `SELECT s.*, a.name as agent_name 
         FROM sellers s 
         LEFT JOIN agents a ON s.agent_id = a.id 
         ORDER BY s.id DESC`
      );
    } else if (req.user.role === 'agent') {
      const agentRes = await query('SELECT id FROM agents WHERE user_id = $1', [req.user.id]);
      if (agentRes.rows.length === 0) {
        return res.json([]);
      }
      const agentId = agentRes.rows[0].id;
      result = await query(
        `SELECT s.*, a.name as agent_name 
         FROM sellers s 
         LEFT JOIN agents a ON s.agent_id = a.id 
         WHERE s.agent_id = $1 
         ORDER BY s.id DESC`,
        [agentId]
      );
    } else {
      // seller role
      result = await query(
        `SELECT s.*, a.name as agent_name 
         FROM sellers s 
         LEFT JOIN agents a ON s.agent_id = a.id 
         WHERE s.user_id = $1 
         ORDER BY s.id DESC`,
        [req.user.id]
      );
    }
    res.json(result.rows.map(mapSeller));
  } catch (err) {
    console.error('Error fetching sellers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager', 'agent'), async (req: Request, res: Response) => {
  const {
    name, store_name, id_number, phone, region, region_code, status,
    username, password, agent_name
  } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    // Support camelCase parameters
    const storeNameVal = store_name ?? req.body.storeName ?? '';
    const idNumberVal = id_number ?? req.body.idNumber ?? '';
    const regionCodeVal = region_code ?? req.body.regionCode ?? '';

    // Create user account for the seller
    let userId: number | null = null;
    const sellerUsername = (username || phone || `seller_${Date.now()}`).trim().toLowerCase();

    // Prevent takeover/downgrade of existing accounts
    const userExists = await query('SELECT id FROM users WHERE username = $1', [sellerUsername]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'Username is already taken by another account' });
    }

    const sellerPassword = password || '123456';
    const passwordHash = await bcrypt.hash(sellerPassword, 10);

    const userResult = await query(
      `INSERT INTO users (username, password_hash, display_name, role, status, phone, region)
       VALUES ($1, $2, $3, 'seller', 'active', $4, $5)
       RETURNING id`,
      [sellerUsername, passwordHash, name, phone || '', region || '']
    );
    userId = userResult.rows[0].id;

    // Look up agent_id if agent_name provided
    let agentId: number | null = null;
    if (agent_name) {
      const agentRes = await query('SELECT id FROM agents WHERE name = $1', [agent_name]);
      if (agentRes.rows.length > 0) {
        agentId = agentRes.rows[0].id;
      }
    }

    // Create seller record
    const sid = req.body.seller_id || req.body.sellerId || `SLR-${String(Math.floor(10000 + Math.random() * 90000))}`;
    const now = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const result = await query(
      `INSERT INTO sellers (seller_id, user_id, agent_id, name, store_name, id_number, phone, region, region_code, status, creation_date, last_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [sid, userId, agentId, name, storeNameVal, idNumberVal, phone || '', region || '', regionCodeVal, status || 'active', now, 'لم يسجل دخول بعد']
    );

    // Fetch newly created seller with agent_name JOIN
    const finalResult = await query(
      `SELECT s.*, a.name as agent_name 
       FROM sellers s 
       LEFT JOIN agents a ON s.agent_id = a.id 
       WHERE s.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      seller: mapSeller(finalResult.rows[0]),
      credentials: {
        username: sellerUsername,
        password: sellerPassword
      }
    });
  } catch (err) {
    console.error('Error creating seller:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
