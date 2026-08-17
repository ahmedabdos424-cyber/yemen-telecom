import path from 'path';
import { Router, Request, Response } from 'express';
import { query } from '../../db';
import { invalidateMaintenanceMode } from '../../maintenance';
import { logger } from '../../logger';
import { cacheStats } from '../../cache';
import { realtimeStats } from '../../services/realtime.service';
import { requireRole, AuthRequest } from '../../middleware/auth';
import { validate, resetDataSchema } from '../../validation';
import { resetSystemData } from '../../reset-data';
import { createAlert } from '../../services/alerts.service';

const router = Router();

const RESET_CONFIRM_TOKEN = process.env.RESET_CONFIRM_TOKEN || 'RESET_INVENTORY';

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
    await createAlert({
      title: 'تم تصفير بيانات النظام',
      description: `قام ${req.user?.username || 'manager'} بتصفير المخزون والجداول العلائقية (${Object.values(summary.deleted).reduce((a, b) => a + b, 0)} سجلاً).`,
      priority: 'high',
      category: 'أمان',
      userId: req.user?.id ?? null,
    });
    res.json({ success: true, message: 'System data reset completed', deleted: summary.deleted });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
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
    const backup: Record<string, unknown[]> = {};
    for (const [table, queryText] of Object.entries(allowedTables)) {
      const result = await query(queryText);
      backup[table] = result.rows;
    }
    const { uploadBackup, isConfigured } = await import('../../backup-storage');
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
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
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
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
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
    invalidateMaintenanceMode();
    res.json({
      success: true,
      locked: newStatus,
      message: newStatus ? 'Emergency lockdown activated. All seller accounts suspended.' : 'Lockdown deactivated. All seller accounts restored.',
    });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

router.get('/system/lockdown/status', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT maintenance_mode FROM system_settings WHERE id = 1');
    res.json({ locked: result.rows[0]?.maintenance_mode || false });
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
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
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
  }
});

export default router;
