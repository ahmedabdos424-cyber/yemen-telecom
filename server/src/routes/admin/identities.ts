import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { query } from '../../db';
import { logger } from '../../logger';
import { requireRole, AuthRequest } from '../../middleware/auth';
import { getPagination } from '../../helpers';

const router = Router();

interface DbDuplicateIdentityRow {
  id_no: string;
  name: string;
  sims_count: string;
  duplicates_count: string;
  region: string;
  agent_name?: string | null;
  created_at?: unknown;
}

interface DbDuplicateStatusRow {
  id_no: string;
  flagged?: unknown;
  blocked?: unknown;
  review_status?: unknown;
}

router.get('/duplicate-identities', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    const queryText = paginate
      ? `SELECT id_number AS id_no, name, agent_name, created_at,
              COUNT(*) OVER (PARTITION BY id_number) AS duplicates_count,
              SUM(COALESCE(sims_count, 0)) OVER (PARTITION BY id_number) AS sims_count,
              region
       FROM sellers
       WHERE id_number != ''
       ORDER BY duplicates_count DESC LIMIT $1 OFFSET $2`
      : `SELECT id_number AS id_no, name, agent_name, created_at,
              COUNT(*) OVER (PARTITION BY id_number) AS duplicates_count,
              SUM(COALESCE(sims_count, 0)) OVER (PARTITION BY id_number) AS sims_count,
              region
       FROM sellers
       WHERE id_number != ''
       ORDER BY duplicates_count DESC`;
    const params = paginate ? [limit, offset] : [];
    const result = await query(queryText, params);
    const seen = new Set<string>();
    const deduped = result.rows.filter((r: DbDuplicateIdentityRow) => {
      if (seen.has(r.id_no)) return false;
      seen.add(r.id_no);
      return true;
    });
    // Aggregate involved agents/sellers and last activity per id_no (across all rows).
    const aggMap = new Map<string, { agents: Set<string>; last: Date | null }>();
    for (const r of result.rows) {
      const entry = aggMap.get(r.id_no) || { agents: new Set<string>(), last: null };
      if (r.agent_name) entry.agents.add(r.agent_name);
      const t = r.created_at ? new Date(r.created_at) : null;
      if (t && (!entry.last || t.getTime() > entry.last.getTime())) entry.last = t;
      aggMap.set(r.id_no, entry);
    }
    // Pull current flag/block status per id_no (may be empty for new ids).
    const idNos = deduped.map((r: DbDuplicateIdentityRow) => r.id_no);
    const statusRows = idNos.length
      ? await query(`SELECT id_no, flagged, blocked, review_status FROM duplicate_identities WHERE id_no = ANY($1)`, [idNos])
      : { rows: [] as DbDuplicateStatusRow[] };
    const statusMap = new Map<string, DbDuplicateStatusRow>();
    for (const s of statusRows.rows) statusMap.set(s.id_no, s);
    res.json(deduped.map((r: { id_no: string; name: string; sims_count: string; duplicates_count: string; region: string }) => {
      const count = parseInt(r.duplicates_count);
      const risk = count >= 5 ? 'مرتفع جداً' : count >= 3 ? 'مرتفع' : 'متوسط';
      const initials = r.name ? r.name.split(' ').slice(0, 2).map((s: string) => s[0]).join(' ') : '';
      const st = statusMap.get(r.id_no);
      const agg = aggMap.get(r.id_no);
      return {
        idNo: r.id_no,
        name: r.name,
        simsCount: parseInt(r.sims_count) || 0,
        duplicatesCount: count || 0,
        risk,
        region: r.region || '',
        avatarInitials: initials,
        flagged: st?.flagged || false,
        blocked: st?.blocked || false,
        reviewStatus: st?.review_status || 'pending',
        agentNames: agg ? Array.from(agg.agents) : [],
        lastActivity: agg?.last?.toISOString() || null,
      };
    }));
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

// ========================
// Duplicate Identities: Flag / Block actions
// ========================
function logIdentityAction(idNo: string, _name: string, action: string, performedBy: string) {
  const logId = `DUP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const title =
    action === 'flag'
      ? `تم وضع علامة اشتباه على الهوية ${idNo}`
      : action === 'block'
      ? `تم تجميد وحظر الهوية ${idNo}`
      : `تم رفع الحظر عن الهوية ${idNo}`;
  const status = action === 'flag' ? 'flagged' : action === 'block' ? 'blocked' : 'resolved';
  return query(
    `INSERT INTO audit_logs (log_id, type, title, username, time, status)
     VALUES ($1, 'identity_risk', $2, $3, NOW()::text, $4)`,
    [logId, title, performedBy, status]
  );
}

router.post('/duplicate-identities/:idNo/flag', requireRole('manager'), async (req: AuthRequest, res: Response) => {
  try {
    const idNo = req.params.idNo;
    if (!idNo) return res.status(400).json({ error: 'idNo is required' });
    const name = (req.body && typeof req.body.name === 'string') ? req.body.name : '';
    const reason = (req.body && typeof req.body.reason === 'string') ? req.body.reason : '';
    const performedBy = req.user?.username || 'manager';

    await query(
      `INSERT INTO identity_risk_actions (id_no, name, action, reason, performed_by)
       VALUES ($1, $2, 'flag', $3, $4)`,
      [idNo, name, reason, performedBy]
    );
    // Upsert into duplicate_identities so the list reflects the flag.
    await query(
      `INSERT INTO duplicate_identities (id_no, name, review_status, flagged)
       VALUES ($1, $2, 'flagged', TRUE)
       ON CONFLICT (id_no) DO UPDATE SET flagged = TRUE, review_status = 'flagged'`,
      [idNo, name]
    );
    await logIdentityAction(idNo, name, 'flag', performedBy);
    res.json({ success: true, idNo, flagged: true, reviewStatus: 'flagged' });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

router.post('/duplicate-identities/:idNo/block', requireRole('manager'), async (req: AuthRequest, res: Response) => {
  try {
    const idNo = req.params.idNo;
    if (!idNo) return res.status(400).json({ error: 'idNo is required' });
    const name = (req.body && typeof req.body.name === 'string') ? req.body.name : '';
    const reason = (req.body && typeof req.body.reason === 'string') ? req.body.reason : '';
    const performedBy = req.user?.username || 'manager';

    await query(
      `INSERT INTO identity_risk_actions (id_no, name, action, reason, performed_by)
       VALUES ($1, $2, 'block', $3, $4)`,
      [idNo, name, reason, performedBy]
    );
    // Block all sellers sharing this id_number.
    await query(
      `UPDATE sellers SET status = 'suspended' WHERE id_number = $1 AND status NOT IN ('deleted')`,
      [idNo]
    );
    // Upsert into duplicate_identities so the list reflects the block.
    await query(
      `INSERT INTO duplicate_identities (id_no, name, review_status, flagged, blocked)
       VALUES ($1, $2, 'blocked', TRUE, TRUE)
       ON CONFLICT (id_no) DO UPDATE SET blocked = TRUE, flagged = TRUE, review_status = 'blocked'`,
      [idNo, name]
    );
    await logIdentityAction(idNo, name, 'block', performedBy);
    res.json({ success: true, idNo, blocked: true, reviewStatus: 'blocked' });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

router.post('/duplicate-identities/:idNo/unblock', requireRole('manager'), async (req: AuthRequest, res: Response) => {
  try {
    const idNo = req.params.idNo;
    if (!idNo) return res.status(400).json({ error: 'idNo is required' });
    const name = (req.body && typeof req.body.name === 'string') ? req.body.name : '';
    const reason = (req.body && typeof req.body.reason === 'string') ? req.body.reason : '';
    if (!reason) return res.status(400).json({ error: 'سبب الحظر مطلوب', message: 'يجب توفير سبب عملية رفع الحظر لتوثيق السجل.' });
    const performedBy = req.user?.username || 'manager';

    await query(
      `INSERT INTO identity_risk_actions (id_no, name, action, reason, performed_by)
       VALUES ($1, $2, 'unblock', $3, $4)`,
      [idNo, name, reason, performedBy]
    );
    await query(
      `UPDATE sellers SET status = 'active' WHERE id_number = $1 AND status = 'suspended'`,
      [idNo]
    );
    await query(
      `UPDATE duplicate_identities SET blocked = FALSE, review_status = 'resolved' WHERE id_no = $1`,
      [idNo]
    );
    await logIdentityAction(idNo, name, 'unblock', performedBy);
    res.json({ success: true, idNo, blocked: false, reviewStatus: 'resolved' });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

export default router;
