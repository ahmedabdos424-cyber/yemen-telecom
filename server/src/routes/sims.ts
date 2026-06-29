import { Router, Request, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { requireRole } from '../middleware/auth';
import { getPagination, paginatedQuery } from '../helpers';
import { validate, createSimSchema, updateSimSchema } from '../validation';

const router = Router();

router.get('/', requireRole('manager', 'agent'), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    if (req.query.page || req.query.limit) {
      const result = await paginatedQuery<any>(
        'SELECT * FROM sims ORDER BY id DESC',
        'SELECT COUNT(*) FROM sims',
        [], page, limit, offset
      );
      return res.json(result);
    }
    const result = await query('SELECT * FROM sims ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching sims:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('manager'), validate(createSimSchema), async (req: Request, res: Response) => {
  const { phone, iccid, provider, status, owner, package_type } = req.body;
  try {
    const result = await query(
      `INSERT INTO sims (phone, iccid, provider, status, owner, date_added, package_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [phone || '', iccid, provider || 'Yemen Mobile', status || 'available', owner || 'المركز الرئيسي',
       new Date().toLocaleDateString('ar-YE'), package_type || 'باقة مزايا الشهرية']
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'ICCID already exists' });
    }
    logger.error('Error creating sim:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireRole('manager'), validate(updateSimSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await query('SELECT * FROM sims WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'SIM not found' });
    }
    const cur = existing.rows[0];
    const phone = req.body.phone ?? cur.phone;
    const iccid = req.body.iccid ?? cur.iccid;
    const provider = req.body.provider ?? cur.provider;
    const status = req.body.status ?? cur.status;
    const owner = req.body.owner ?? cur.owner;
    const package_type = req.body.package_type ?? cur.package_type;
    const result = await query(
      `UPDATE sims SET phone=$1, iccid=$2, provider=$3, status=$4, owner=$5, package_type=$6 WHERE id=$7 RETURNING *`,
      [phone, iccid, provider, status, owner, package_type, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating sim:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireRole('manager'), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM sims WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    logger.error('Error deleting sim:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
