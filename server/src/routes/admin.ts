import path from 'path';
import { Router, Request, Response } from 'express';
import { query, transaction } from '../db';
import { logger } from '../logger';
import { cacheStats } from '../cache';
import { requireRole } from '../middleware/auth';
import { getPagination, getDefaultLimit } from '../helpers';
import { validate, updateSettingsSchema } from '../validation';

const router = Router();

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
  const body = req.body;
  const provided = Object.keys(body);
  const fieldMap: Record<string, string> = {
    twoFAEnabled: 'two_fa_enabled', email2FAEnabled: 'email_2fa_enabled',
    trustedDevicesEnabled: 'trusted_devices_enabled', sessionTimeout: 'session_timeout',
    passwordSpecialRequired: 'password_special_required', passwordExpiry90Days: 'password_expiry_90_days',
    passwordNoReuse5: 'password_no_reuse_5', maintenanceMode: 'maintenance_mode',
    language: 'language', emailAlertsEnabled: 'email_alerts_enabled',
    smsAlertsEnabled: 'sms_alerts_enabled', appNotificationsEnabled: 'app_notifications_enabled',
    stockShortageThreshold: 'stock_shortage_threshold', inactiveSimsThreshold: 'inactive_sims_threshold',
    maxFailedLoginsThreshold: 'max_failed_logins_threshold',
    highRiskDuplicatesThreshold: 'high_risk_duplicates_threshold',
    identityRemindersEnabled: 'identity_reminders_enabled',
    identityRemindersFrequency: 'identity_reminders_frequency',
  };
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;
  for (const camel of provided) {
    const col = fieldMap[camel];
    if (col) {
      setClauses.push(`${col}=$${idx++}`);
      values.push(body[camel]);
    }
  }
  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid settings fields provided' });
  }
  try {
    const result = await query(
      `UPDATE system_settings SET ${setClauses.join(', ')} WHERE id=1 RETURNING *`,
      values
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
    const hasPagination = !!(req.query.page || req.query.limit);
    const effectiveLimit = hasPagination ? limit : getDefaultLimit();
    const effectiveOffset = hasPagination ? offset : 0;
    const queryText = 'SELECT * FROM transactions ORDER BY id LIMIT $1 OFFSET $2';
    const params = [effectiveLimit, effectiveOffset];
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
    const hasPagination = !!(req.query.page || req.query.limit);
    const effectiveLimit = hasPagination ? limit : getDefaultLimit();
    const effectiveOffset = hasPagination ? offset : 0;
    const queryText = `SELECT id_number AS id_no, name,
             COUNT(*) OVER (PARTITION BY id_number) AS duplicates_count,
             SUM(COALESCE(sims_count, 0)) OVER (PARTITION BY id_number) AS sims_count,
             region
      FROM sellers
      WHERE id_number != ''
      ORDER BY duplicates_count DESC LIMIT $1 OFFSET $2`;
    const params = [effectiveLimit, effectiveOffset];
    const result = await query(queryText, params);
    const seen = new Set<string>();
    const deduped = result.rows.filter((r: any) => {
      if (seen.has(r.id_no)) return false;
      seen.add(r.id_no);
      return true;
    });
    res.json(deduped.map((r: { id_no: string; name: string; sims_count: string; duplicates_count: string; region: string }) => {
      const count = parseInt(r.duplicates_count);
      const risk = count >= 5 ? 'مرتفع جداً' : count >= 3 ? 'مرتفع' : 'متوسط';
      const initials = r.name ? r.name.split(' ').slice(0, 2).map((s: string) => s[0]).join(' ') : '';
      return {
        idNo: r.id_no,
        name: r.name,
        simsCount: parseInt(r.sims_count) || 0,
        duplicatesCount: count || 0,
        risk,
        region: r.region || '',
        avatarInitials: initials,
      };
    }));
  } catch (err) {
    logger.error('Error fetching duplicate identities:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/audit-logs', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const hasPagination = !!(req.query.page || req.query.limit);
    const effectiveLimit = hasPagination ? limit : getDefaultLimit();
    const effectiveOffset = hasPagination ? offset : 0;
    const queryText = 'SELECT * FROM audit_logs ORDER BY id LIMIT $1 OFFSET $2';
    const params = [effectiveLimit, effectiveOffset];
    const result = await query(queryText, params);
    res.json(result.rows.map((r: { log_id: string; type: string; title: string; username: string; time: string; status: string }) => ({
      id: r.log_id,
      type: r.type,
      title: r.title,
      user: r.username,
      time: r.time,
      status: r.status,
    })));
  } catch (err) {
    logger.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// System: Backup
// ========================
router.post('/system/backup', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const maxRowsPerTable = parseInt(process.env.BACKUP_MAX_ROWS_PER_TABLE || '20000', 10);
    const allowedTables: Record<string, string> = {
      users: `SELECT * FROM users ORDER BY id LIMIT ${maxRowsPerTable}`,
      agents: `SELECT * FROM agents ORDER BY id LIMIT ${maxRowsPerTable}`,
      sellers: `SELECT * FROM sellers ORDER BY id LIMIT ${maxRowsPerTable}`,
      sims: `SELECT * FROM sims ORDER BY id LIMIT ${maxRowsPerTable}`,
      alerts: `SELECT * FROM alerts ORDER BY id LIMIT ${maxRowsPerTable}`,
      transactions: `SELECT * FROM transactions ORDER BY id LIMIT ${maxRowsPerTable}`,
      operations: `SELECT * FROM operations ORDER BY id LIMIT ${maxRowsPerTable}`,
      inventories: `SELECT * FROM inventories ORDER BY id LIMIT ${maxRowsPerTable}`,
      audit_logs: `SELECT * FROM audit_logs ORDER BY id LIMIT ${maxRowsPerTable}`,
      system_settings: `SELECT * FROM system_settings ORDER BY id LIMIT ${maxRowsPerTable}`,
      token_blacklist: `SELECT * FROM token_blacklist ORDER BY token_hash LIMIT ${maxRowsPerTable}`,
      duplicate_identities: `SELECT * FROM duplicate_identities ORDER BY id LIMIT ${maxRowsPerTable}`,
      customers: `SELECT * FROM customers ORDER BY id LIMIT ${maxRowsPerTable}`,
      distribution_requests: `SELECT * FROM distribution_requests ORDER BY id LIMIT ${maxRowsPerTable}`,
    };
    const backup: Record<string, any[]> = {};
    let totalRecords = 0;
    let truncatedTables: string[] = [];
    for (const [table, queryText] of Object.entries(allowedTables)) {
      const result = await query(queryText);
      backup[table] = result.rows;
      totalRecords += result.rows.length;
      if (result.rows.length >= maxRowsPerTable) {
        truncatedTables.push(table);
      }
    }
    // Sanitize sensitive data before export
    if (backup.users) {
      backup.users = backup.users.map((u: Record<string, unknown>) => {
        const sanitized = { ...u };
        delete sanitized.password_hash;
        return sanitized;
      });
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
      records: totalRecords,
      downloadUrl: result.url,
      ...(truncatedTables.length > 0 ? { warning: `Tables truncated to ${maxRowsPerTable} rows: ${truncatedTables.join(', ')}. Set BACKUP_MAX_ROWS_PER_TABLE to increase limit.` } : {}),
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
    const newLocked = !isCurrentlyLocked;
    await transaction(async (client) => {
      await client.query(
        `UPDATE system_settings SET maintenance_mode = $1 WHERE id = 1`,
        [newLocked]
      );
      await client.query(
        `UPDATE sellers SET status = $1 WHERE status NOT IN ('deleted')`,
        [newLocked ? 'suspended' : 'active']
      );
    });
    res.json({
      success: true,
      locked: newLocked,
      message: newLocked ? 'Emergency lockdown activated. All seller accounts suspended.' : 'Lockdown deactivated. All seller accounts restored.',
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
    res.json({
      db: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
      uptime: Math.floor(process.uptime()),
      env: process.env.NODE_ENV || 'development',
      cache: cacheStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Error fetching monitoring data:', err);
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
});

export default router;
