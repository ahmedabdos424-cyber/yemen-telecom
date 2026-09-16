import path from 'path';
import { Router, Request, Response } from 'express';
import { query, transaction } from '../../db';
import { invalidateMaintenanceMode } from '../../maintenance';
import { logger } from '../../logger';
import { cacheStats } from '../../cache';
import { realtimeStats } from '../../services/realtime.service';
import { requireRole, AuthRequest } from '../../middleware/auth';
import { validate, resetDataSchema } from '../../validation';
import { resetSystemData } from '../../reset-data';
import { createAlert } from '../../services/alerts.service';
import { logAudit } from '../../audit-log';
import { hasColumn } from '../../dbColumns';

const router = Router();

const RESET_CONFIRM_TOKEN = process.env.RESET_CONFIRM_TOKEN;
if (!RESET_CONFIRM_TOKEN && process.env.NODE_ENV === 'production') {
  logger.warn('⚠️  RESET_CONFIRM_TOKEN env var not set — system reset endpoint will reject all requests');
}

// ========================
// System: Data Reset (secure)
// ========================
router.post('/reset', requireRole('manager'), validate(resetDataSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (!RESET_CONFIRM_TOKEN) {
      return res.status(503).json({ error: 'System reset is not configured. Set RESET_CONFIRM_TOKEN env var.' });
    }
    if (req.body.confirm !== RESET_CONFIRM_TOKEN) {
      return res.status(400).json({ error: 'Invalid confirmation token.' });
    }
    const summary = await resetSystemData();
    // Audit trail for the reset itself (recorded after the wipe).
    await createAlert({
      title: 'تم تصفير بيانات النظام',
      description: `قام ${req.user?.username || 'manager'} بتصفير المخزون والجداول العلائقية (${Object.values(summary.deleted).reduce((a, b) => a + b, 0)} سجلاً).`,
      priority: 'high',
      category: 'أمان',
      userId: req.user?.id ?? null,
    });
    res.json({ success: true, message: 'System data reset completed', deleted: summary.deleted });
    void logAudit({ type: 'system_reset', title: 'تصفير بيانات النظام', username: req.user?.username || 'unknown' });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(503).json({ error: 'خدمة الخارة غير متاحة', message: 'تعذر التواصل مع خدمة الخلفية — يرجى إعادة المحاولة لاحقاً' });
  }
});

// ========================
// System: Backup
// ========================
router.post('/system/backup', requireRole('manager'), async (req: AuthRequest, res: Response) => {
  try {
    const allowedTables: Record<string, string> = {
      users: 'SELECT id, username, display_name, role, status, phone, email, region, created_at, last_login FROM users ORDER BY id',
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
    const backup: Record<string, unknown[]> = {};
    for (const [table, queryText] of Object.entries(allowedTables)) {
      const result = await query(queryText);
      backup[table] = result.rows;
    }
    const { uploadBackup, isConfigured, isEncryptionConfigured } = await import('../../backup-storage');
    if (!isConfigured()) {
      return res.status(500).json({ error: 'External backup storage not configured. Set BACKUP_S3_* environment variables.' });
    }
    if (!isEncryptionConfigured() && process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Backup encryption not configured. Set BACKUP_ENCRYPTION_KEY environment variable.' });
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
    void logAudit({ type: 'backup_created', title: `إنشاء نسخة احتياطية: ${result.filename}`, username: req.user?.username || 'unknown' });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(503).json({ error: 'خدمة الخارة غير متاحة', message: 'تعذر التواصل مع خدمة الخلفية — يرجى إعادة المحاولة لاحقاً' });
  }
});

router.get('/system/backup/download/:filename', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    if (filename !== req.params.filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const { downloadBackup, isConfigured } = await import('../../backup-storage');
    if (!isConfigured()) {
      return res.status(500).json({ error: 'External backup storage not configured.' });
    }
    const url = await downloadBackup(filename);
    if (!url) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    res.redirect(url);
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(503).json({ error: 'خدمة الخارة غير متاحة', message: 'تعذر التواصل مع خدمة الخلفية — يرجى إعادة المحاولة لاحقاً' });
  }
});

// ========================
// System: Emergency Lockdown
// ========================
router.post('/system/lockdown', requireRole('manager'), async (req: AuthRequest, res: Response) => {
  try {
    const current = await query('SELECT maintenance_mode FROM system_settings WHERE id = 1');
    const isCurrentlyLocked = current.rows[0]?.maintenance_mode || false;
    // C-05: remember each seller's pre-lockdown status so deactivation
    // restores the exact previous state instead of wiping inactive/suspended
    // to active. The column arrives via migration 050; probe first so a code
    // deploy ahead of the migration keeps the legacy behavior (with a warn).
    const stateful = await hasColumn('sellers', 'pre_lockdown_status');
    await transaction(async (client) => {
      await client.query(
        `UPDATE system_settings SET maintenance_mode = $1 WHERE id = 1`,
        [!isCurrentlyLocked]
      );
      if (!isCurrentlyLocked) {
        if (stateful) {
          await client.query(
            `UPDATE sellers SET pre_lockdown_status = status, status = 'suspended'
              WHERE status NOT IN ('deleted', 'suspended')`
          );
          await client.query(
            `UPDATE sellers SET pre_lockdown_status = status
              WHERE status = 'suspended' AND pre_lockdown_status IS NULL`
          );
        } else {
          logger.warn('[LOCKDOWN] sellers.pre_lockdown_status missing — falling back to legacy blanket suspend (apply migration 050)');
          await client.query(
            `UPDATE sellers SET status = $1 WHERE status NOT IN ('deleted')`,
            ['suspended']
          );
        }
        // Lockdown: force every non-manager session to re-authenticate. `sellers`
        // status is a different table, so without this bump seller/agent JWTs
        // would remain valid even while seller rows are suspended.
        await client.query(
          `UPDATE users SET token_version = token_version + 1,
                  active_session_sid = NULL, session_expires_at = NULL
           WHERE role <> 'manager' AND status <> 'inactive'`
        );
      } else if (stateful) {
        await client.query(
          `UPDATE sellers SET status = COALESCE(pre_lockdown_status, 'active'), pre_lockdown_status = NULL
            WHERE status NOT IN ('deleted')`
        );
      } else {
        await client.query(
          `UPDATE sellers SET status = $1 WHERE status NOT IN ('deleted')`,
          ['active']
        );
      }
    });
    const newStatus = !isCurrentlyLocked;
    invalidateMaintenanceMode();
    res.json({
      success: true,
      locked: newStatus,
      message: newStatus ? 'Emergency lockdown activated. All seller accounts suspended.' : 'Lockdown deactivated. All seller accounts restored.',
    });
    void logAudit({ type: newStatus ? 'lockdown_activated' : 'lockdown_deactivated', title: newStatus ? 'تفعيل الإغلاق الطارئ' : 'رفع الإغلاق الطارئ', username: req.user?.username || 'unknown' });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(503).json({ error: 'خدمة الخارة غير متاحة', message: 'تعذر التواصل مع خدمة الخلفية — يرجى إعادة المحاولة لاحقاً' });
  }
});

router.get('/system/lockdown/status', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT maintenance_mode FROM system_settings WHERE id = 1');
    res.json({ locked: result.rows[0]?.maintenance_mode || false });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(503).json({ error: 'خدمة الخارة غير متاحة', message: 'تعذر التواصل مع خدمة الخلفية — يرجى إعادة المحاولة لاحقاً' });
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
      realtime: realtimeStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(503).json({ error: 'خدمة الخارة غير متاحة', message: 'تعذر التواصل مع خدمة الخلفية — يرجى إعادة المحاولة لاحقاً' });
  }
});

export default router;
