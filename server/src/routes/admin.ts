import path from 'path';
import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { cacheStats } from '../cache';
import { requireRole, AuthRequest } from '../middleware/auth';
import { getPagination, formatDbTimestamp } from '../helpers';
import { validate, updateSettingsSchema, createSimBatchSchema, resetDataSchema } from '../validation';
import { resetSystemData } from '../reset-data';

const router = Router();

const RESET_CONFIRM_TOKEN = 'RESET_INVENTORY';

router.get('/settings', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM system_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({});
    }
    const s = result.rows[0];
    res.json({
      twoFAEnabled: s.two_fa_enabled,
      email2FAEnabled: s.email_2fa_enabled,
      trustedDevicesEnabled: s.trusted_devices_enabled,
      sessionTimeout: s.session_timeout,
      passwordSpecialRequired: s.password_special_required,
      passwordExpiry90Days: s.password_expiry_90_days,
      passwordNoReuse5: s.password_no_reuse_5,
      maintenanceMode: s.maintenance_mode,
      language: s.language,
      emailAlertsEnabled: s.email_alerts_enabled,
      smsAlertsEnabled: s.sms_alerts_enabled,
      appNotificationsEnabled: s.app_notifications_enabled,
      stockShortageThreshold: s.stock_shortage_threshold,
      inactiveSimsThreshold: s.inactive_sims_threshold,
      maxFailedLoginsThreshold: s.max_failed_logins_threshold,
      highRiskDuplicatesThreshold: s.high_risk_duplicates_threshold,
      identityRemindersEnabled: s.identity_reminders_enabled,
      identityRemindersFrequency: s.identity_reminders_frequency,
    });
  } catch (err) {
    logger.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', requireRole('manager'), validate(updateSettingsSchema), async (req: Request, res: Response) => {
  const settings = req.body;
  try {
    const result = await query(
      `UPDATE system_settings SET
        two_fa_enabled=$1, email_2fa_enabled=$2, trusted_devices_enabled=$3,
        session_timeout=$4, password_special_required=$5, password_expiry_90_days=$6,
        password_no_reuse_5=$7, maintenance_mode=$8, language=$9,
        email_alerts_enabled=$10, sms_alerts_enabled=$11, app_notifications_enabled=$12,
        stock_shortage_threshold=$13, inactive_sims_threshold=$14,
        max_failed_logins_threshold=$15, high_risk_duplicates_threshold=$16,
        identity_reminders_enabled=$17, identity_reminders_frequency=$18
      WHERE id=1 RETURNING *`,
      [
        settings.twoFAEnabled ?? true, settings.email2FAEnabled ?? false,
        settings.trustedDevicesEnabled ?? true, settings.sessionTimeout || '30 دقيقة',
        settings.passwordSpecialRequired ?? true, settings.passwordExpiry90Days ?? true,
        settings.passwordNoReuse5 ?? false, settings.maintenanceMode ?? false,
        settings.language || 'العربية (المملكة العربية السعودية)',
        settings.emailAlertsEnabled ?? true, settings.smsAlertsEnabled ?? true,
        settings.appNotificationsEnabled ?? false, settings.stockShortageThreshold ?? 5,
        settings.inactiveSimsThreshold ?? 90, settings.maxFailedLoginsThreshold ?? 3,
        settings.highRiskDuplicatesThreshold ?? 5, settings.identityRemindersEnabled ?? true,
        settings.identityRemindersFrequency || 'weekly',
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/transactions', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    const queryText = paginate
      ? 'SELECT * FROM transactions ORDER BY id LIMIT $1 OFFSET $2'
      : 'SELECT * FROM transactions ORDER BY id';
    const params = paginate ? [limit, offset] : [];
    const result = await query(queryText, params);
    res.json(result.rows.map((r: { id: string; client_name: string; provider: string; sims_count: number; status: string; relative_time: string }) => ({
      id: r.id,
      clientName: r.client_name,
      provider: r.provider,
      simsCount: r.sims_count,
      status: r.status,
      relativeTime: r.relative_time,
    })));
  } catch (err) {
    logger.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/duplicate-identities', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    const queryText = paginate
      ? `SELECT id_number AS id_no, name,
              COUNT(*) OVER (PARTITION BY id_number) AS duplicates_count,
              SUM(COALESCE(sims_count, 0)) OVER (PARTITION BY id_number) AS sims_count,
              region
       FROM sellers
       WHERE id_number != ''
       ORDER BY duplicates_count DESC LIMIT $1 OFFSET $2`
      : `SELECT id_number AS id_no, name,
              COUNT(*) OVER (PARTITION BY id_number) AS duplicates_count,
              SUM(COALESCE(sims_count, 0)) OVER (PARTITION BY id_number) AS sims_count,
              region
       FROM sellers
       WHERE id_number != ''
       ORDER BY duplicates_count DESC`;
    const params = paginate ? [limit, offset] : [];
    const result = await query(queryText, params);
    const seen = new Set<string>();
    const deduped = result.rows.filter((r: any) => {
      if (seen.has(r.id_no)) return false;
      seen.add(r.id_no);
      return true;
    });
    // Pull current flag/block status per id_no (may be empty for new ids).
    const idNos = deduped.map((r: any) => r.id_no);
    const statusRows = idNos.length
      ? await query(`SELECT id_no, flagged, blocked, review_status FROM duplicate_identities WHERE id_no = ANY($1)`, [idNos])
      : { rows: [] as any[] };
    const statusMap = new Map<string, any>();
    for (const s of statusRows.rows) statusMap.set(s.id_no, s);
    res.json(deduped.map((r: { id_no: string; name: string; sims_count: string; duplicates_count: string; region: string }) => {
      const count = parseInt(r.duplicates_count);
      const risk = count >= 5 ? 'مرتفع جداً' : count >= 3 ? 'مرتفع' : 'متوسط';
      const initials = r.name ? r.name.split(' ').slice(0, 2).map((s: string) => s[0]).join(' ') : '';
      const st = statusMap.get(r.id_no);
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
      };
    }));
  } catch (err) {
    logger.error('Error fetching duplicate identities:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Duplicate Identities: Flag / Block actions
// ========================
function logIdentityAction(idNo: string, name: string, action: string, performedBy: string) {
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
    logger.error('Error flagging duplicate identity:', err);
    res.status(500).json({ error: 'Failed to flag identity' });
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
    logger.error('Error blocking duplicate identity:', err);
    res.status(500).json({ error: 'Failed to block identity' });
  }
});

router.post('/duplicate-identities/:idNo/unblock', requireRole('manager'), async (req: AuthRequest, res: Response) => {
  try {
    const idNo = req.params.idNo;
    if (!idNo) return res.status(400).json({ error: 'idNo is required' });
    const name = (req.body && typeof req.body.name === 'string') ? req.body.name : '';
    const performedBy = req.user?.username || 'manager';

    await query(
      `INSERT INTO identity_risk_actions (id_no, name, action, performed_by)
       VALUES ($1, $2, 'unblock', $3)`,
      [idNo, name, performedBy]
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
    logger.error('Error unblocking duplicate identity:', err);
    res.status(500).json({ error: 'Failed to unblock identity' });
  }
});

router.get('/audit-logs', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    const queryText = paginate
      ? 'SELECT * FROM audit_logs ORDER BY id DESC LIMIT $1 OFFSET $2'
      : 'SELECT * FROM audit_logs ORDER BY id DESC';
    const params = paginate ? [limit, offset] : [];
    const result = await query(queryText, params);
    const totalResult = paginate ? await query('SELECT COUNT(*) AS count FROM audit_logs') : null;
    const total = totalResult ? parseInt(totalResult.rows[0]?.count || '0') : 0;
    const logs = result.rows.map((r: any) => ({
      id: r.log_id,
      type: r.type,
      title: r.title,
      user: r.username,
      time: r.time,
      status: r.status,
      deviceName: r.device_name || '',
      ipAddress: r.ip_address || '',
      macAddress: r.mac_address || '',
      loginAt: formatDbTimestamp(r.login_at),
      logoutAt: formatDbTimestamp(r.logout_at),
      sessionStatus: r.session_status || (r.logout_at ? 'closed' : r.type === 'login' ? 'active' : ''),
    }));
    if (paginate) {
      res.json({ logs, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
    } else {
      res.json(logs);
    }
  } catch (err) {
    logger.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Batch SIM inventory (range-based ICCID)
// ========================
const MAX_BATCH_SIMS = 5000;

router.post('/sims/batch', requireRole('manager'), validate(createSimBatchSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { from_iccid, to_iccid, provider, package_type, owner_role, owner_id } = req.body;

    if (from_iccid.length !== to_iccid.length) {
      return res.status(400).json({ error: 'from_iccid and to_iccid must have the same length' });
    }

    let fromVal: bigint;
    let toVal: bigint;
    try {
      fromVal = BigInt(from_iccid);
      toVal = BigInt(to_iccid);
    } catch {
      return res.status(400).json({ error: 'Invalid ICCID range values' });
    }

    if (toVal < fromVal) {
      return res.status(400).json({ error: 'to_iccid must be greater than or equal to from_iccid' });
    }
    const totalCount = toVal - fromVal + 1n;
    if (totalCount > BigInt(MAX_BATCH_SIMS)) {
      return res.status(400).json({ error: `Batch limit is ${MAX_BATCH_SIMS} SIMs per request` });
    }

    let status = 'available';
    let ownerText = 'المركز الرئيسي';
    let assignedToSeller: number | null = null;
    let assignedToAgent: number | null = null;

    if (owner_role && owner_role !== 'admin') {
      if (!owner_id) {
        return res.status(400).json({ error: 'owner_id is required when assigning to an agent or seller' });
      }
      if (owner_role === 'agent') {
        const agentRes = await query('SELECT id, name FROM agents WHERE id = $1', [owner_id]);
        if (agentRes.rows.length === 0) {
          return res.status(400).json({ error: 'Agent not found' });
        }
        ownerText = agentRes.rows[0].name || `Agent #${owner_id}`;
        assignedToAgent = owner_id;
        // The SIM becomes part of the agent's available stock (owner_role=agent).
        status = 'available';
      } else {
        const sellerRes = await query('SELECT id, name FROM sellers WHERE id = $1', [owner_id]);
        if (sellerRes.rows.length === 0) {
          return res.status(400).json({ error: 'Seller not found' });
        }
        ownerText = sellerRes.rows[0].name || `Seller #${owner_id}`;
        assignedToSeller = owner_id;
        // The SIM becomes part of the seller's available stock (owner_role=seller).
        status = 'available';
      }
    }

    // Expand the range into explicit ICCIDs (zero-padded to the input width).
    const width = from_iccid.length;
    const iccids: string[] = [];
    for (let value = fromVal; value <= toVal; value += 1n) {
      iccids.push(value.toString().padStart(width, '0'));
    }

    const dateAdded = new Date().toLocaleDateString('ar-YE');
    const cols = 10;
    const placeholders = iccids
      .map((_, i) => `($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, $${i * cols + 5}, $${i * cols + 6}, $${i * cols + 7}, $${i * cols + 8}, $${i * cols + 9}, $${i * cols + 10})`)
      .join(', ');
    const params: (string | number | null)[] = [];
    for (const iccid of iccids) {
      params.push(
        iccid,
        '',
        provider,
        status,
        ownerText,
        dateAdded,
        package_type,
        owner_role,
        assignedToSeller,
        assignedToAgent
      );
    }

    const insertResult = await query(
      `INSERT INTO sims (iccid, phone, provider, status, owner, date_added, package_type, owner_role, assigned_to, assigned_to_agent)
       VALUES ${placeholders}
       ON CONFLICT (iccid) DO NOTHING
       RETURNING id`,
      params
    );
    const created = insertResult.rows.length;
    const skipped = iccids.length - created;

    if (created > 0) {
      await query(
        `INSERT INTO alerts (title, description, priority, time, category, created_by)
         VALUES ($1, $2, 'low', $3, 'مخزون', $4)`,
        [
          `تمت إضافة دفعة شرائح (${created} شريحة)`,
          `أُضيفت ${created} شريحة عبر النطاق ${from_iccid} → ${to_iccid} للمشغل ${provider} (الحالة: ${status === 'assigned' ? 'مسندة' : 'متاحة'})، المالك: ${ownerText}.`,
          new Date().toLocaleString('ar-YE'),
          req.user?.id ?? null,
        ]
      );
    }

    res.status(201).json({
      created,
      skipped,
      total: iccids.length,
      from_iccid,
      to_iccid,
      status,
      owner_role,
      owner: ownerText,
    });
  } catch (err) {
    logger.error('Error creating sim batch:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// System: Data Reset (secure)
// ========================
router.post('/reset', requireRole('manager'), validate(resetDataSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (req.body.confirm !== RESET_CONFIRM_TOKEN) {
      return res.status(400).json({ error: 'Invalid confirmation token. Pass confirm="RESET_INVENTORY" to proceed.' });
    }
    const summary = await resetSystemData();
    // Audit trail for the reset itself (recorded after the wipe).
    await query(
      `INSERT INTO alerts (title, description, priority, time, category, created_by)
       VALUES ($1, $2, 'high', $3, 'أمان', $4)`,
      [
        'تم تصفير بيانات النظام',
        `قام ${req.user?.username || 'manager'} بتصفير المخزون والجداول العلائقية (${Object.values(summary.deleted).reduce((a, b) => a + b, 0)} سجلاً).`,
        new Date().toLocaleString('ar-YE'),
        req.user?.id ?? null,
      ]
    );
    res.json({ success: true, message: 'System data reset completed', deleted: summary.deleted });
  } catch (err) {
    logger.error('Error resetting system data:', err);
    res.status(500).json({ error: 'Failed to reset system data' });
  }
});

// ========================
// System: Backup
// ========================
router.post('/system/backup', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const allowedTables: Record<string, string> = {
      users: 'SELECT * FROM users ORDER BY id',
      agents: 'SELECT * FROM agents ORDER BY id',
      sellers: 'SELECT * FROM sellers ORDER BY id',
      sims: 'SELECT * FROM sims ORDER BY id',
      alerts: 'SELECT * FROM alerts ORDER BY id',
      transactions: 'SELECT * FROM transactions ORDER BY id',
      operations: 'SELECT * FROM operations ORDER BY id',
      inventories: 'SELECT * FROM inventories ORDER BY id',
      audit_logs: 'SELECT * FROM audit_logs ORDER BY id',
      system_settings: 'SELECT * FROM system_settings ORDER BY id',
      token_blacklist: 'SELECT * FROM token_blacklist ORDER BY token_hash',
      duplicate_identities: 'SELECT * FROM duplicate_identities ORDER BY id',
      customers: 'SELECT * FROM customers ORDER BY id',
      distribution_requests: 'SELECT * FROM distribution_requests ORDER BY id',
    };
    const backup: Record<string, any[]> = {};
    for (const [table, queryText] of Object.entries(allowedTables)) {
      const result = await query(queryText);
      backup[table] = result.rows;
    }
    const { uploadBackup, isConfigured } = await import('../backup-storage');
    if (!isConfigured()) {
      return res.status(500).json({ error: 'External backup storage not configured. Set BACKUP_S3_* environment variables.' });
    }
    const result = await uploadBackup(backup);
    res.json({
      success: true,
      filename: result.filename,
      size: result.size,
      sizeFormatted: `${(result.size / 1024 / 1024).toFixed(2)} MB`,
      tables: Object.keys(allowedTables).length,
      records: Object.values(backup).reduce((sum, arr) => sum + arr.length, 0),
      downloadUrl: result.url,
    });
  } catch (err) {
    logger.error('Error creating backup:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

router.get('/system/backup/download/:filename', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    if (filename !== req.params.filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const { downloadBackup, isConfigured } = await import('../backup-storage');
    if (!isConfigured()) {
      return res.status(500).json({ error: 'External backup storage not configured.' });
    }
    const url = await downloadBackup(filename);
    if (!url) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    res.redirect(url);
  } catch (err) {
    logger.error('Error downloading backup:', err);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

// ========================
// System: Emergency Lockdown
// ========================
router.post('/system/lockdown', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const current = await query('SELECT maintenance_mode FROM system_settings WHERE id = 1');
    const isCurrentlyLocked = current.rows[0]?.maintenance_mode || false;
    await query(
      `UPDATE system_settings SET maintenance_mode = $1 WHERE id = 1`,
      [!isCurrentlyLocked]
    );
    await query(
      `UPDATE sellers SET status = $1 WHERE status NOT IN ('deleted')`,
      [!isCurrentlyLocked ? 'suspended' : 'active']
    );
    const newStatus = !isCurrentlyLocked;
    res.json({
      success: true,
      locked: newStatus,
      message: newStatus ? 'Emergency lockdown activated. All seller accounts suspended.' : 'Lockdown deactivated. All seller accounts restored.',
    });
  } catch (err) {
    logger.error('Error toggling lockdown:', err);
    res.status(500).json({ error: 'Failed to toggle lockdown' });
  }
});

router.get('/system/lockdown/status', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT maintenance_mode FROM system_settings WHERE id = 1');
    res.json({ locked: result.rows[0]?.maintenance_mode || false });
  } catch (err) {
    logger.error('Error checking lockdown status:', err);
    res.status(500).json({ error: 'Failed to check lockdown status' });
  }
});

// Monitoring and health overview (admin only)
router.get('/monitoring', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const dbResult = await query('SELECT 1');
    const mem = process.memoryUsage();
    res.json({
      db: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
        heap: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      },
      node: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development',
      cache: cacheStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Error fetching monitoring data:', err);
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
});

// ========================
// Idempotent schema bootstrap for identity risk actions
// (Safe to run on every boot: all statements use IF NOT EXISTS / ON CONFLICT.)
// ========================
let bootstrapDone = false;
async function ensureIdentityRiskSchema() {
  if (bootstrapDone) return;
  bootstrapDone = true;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS identity_risk_actions (
        id SERIAL PRIMARY KEY,
        id_no VARCHAR(50) NOT NULL,
        name VARCHAR(200) DEFAULT '',
        action VARCHAR(20) NOT NULL CHECK (action IN ('flag', 'block', 'unblock')),
        reason TEXT DEFAULT '',
        performed_by VARCHAR(200) DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_identity_risk_actions_id_no ON identity_risk_actions(id_no);
      CREATE INDEX IF NOT EXISTS idx_identity_risk_actions_created ON identity_risk_actions(created_at);

      ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
      ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;
      ALTER TABLE duplicate_identities ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'flagged', 'blocked', 'resolved'));
      CREATE INDEX IF NOT EXISTS idx_duplicate_identities_review ON duplicate_identities(review_status);
    `);
    // Enable RLS for the new table if not already.
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'identity_risk_actions'
        ) THEN
          CREATE POLICY identity_risk_actions_backend_full_access
            ON public.identity_risk_actions FOR ALL
            TO postgres, service_role
            USING (true) WITH CHECK (true);
          ALTER TABLE public.identity_risk_actions ENABLE ROW LEVEL SECURITY;
        END IF;
      END $$;
    `);
    logger.info('Identity risk schema ensured.');
  } catch (err) {
    logger.error('Error ensuring identity risk schema:', err);
  }
}

// Run bootstrap once the module is loaded (server-side only).
if (process.env.NODE_ENV !== 'test') {
  ensureIdentityRiskSchema();
}

// ========================
// Idempotent schema bootstrap for single-device sessions + device audit fields
// (Safe to run on every boot: all statements use IF NOT EXISTS / ON CONFLICT.)
// ========================
let sessionSchemaDone = false;
async function ensureSessionSchema() {
  if (sessionSchemaDone) return;
  sessionSchemaDone = true;
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_sid VARCHAR(64);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_name VARCHAR(200) DEFAULT '';
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64) DEFAULT '';
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS mac_address VARCHAR(128) DEFAULT '';
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS login_at TIMESTAMP;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS logout_at TIMESTAMP;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_status VARCHAR(20) DEFAULT 'active';
      CREATE INDEX IF NOT EXISTS idx_audit_logs_username_login ON audit_logs(username, login_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_session_status ON audit_logs(session_status);
    `);
    logger.info('Session tracking schema ensured.');
  } catch (err) {
    logger.error('Error ensuring session schema:', err);
  }
}

// Bootstrap after definitions (module scope) — server-side only.
if (process.env.NODE_ENV !== 'test') {
  ensureSessionSchema();
}

export default router;
export { ensureIdentityRiskSchema };
