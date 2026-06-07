import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireRole } from '../middleware/auth';
import { getPagination } from '../helpers';

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
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', requireRole('manager'), async (req: Request, res: Response) => {
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
    console.error('Error updating settings:', err);
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
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      clientName: r.client_name,
      provider: r.provider,
      simsCount: r.sims_count,
      status: r.status,
      relativeTime: r.relative_time,
    })));
  } catch (err) {
    console.error('Error fetching transactions:', err);
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
    res.json(deduped.map((r: any) => {
      const count = r.duplicates_count;
      const risk = count >= 5 ? 'مرتفع جداً' : count >= 3 ? 'مرتفع' : 'متوسط';
      const initials = r.name ? r.name.split(' ').slice(0, 2).map((s: string) => s[0]).join(' ') : '';
      return {
        idNo: r.id_no,
        name: r.name,
        simsCount: parseInt(r.sims_count) || 0,
        duplicatesCount: parseInt(r.duplicates_count) || 0,
        risk,
        region: r.region || '',
        avatarInitials: initials,
      };
    }));
  } catch (err) {
    console.error('Error fetching duplicate identities:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/audit-logs', requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const paginate = req.query.page || req.query.limit;
    const queryText = paginate
      ? 'SELECT * FROM audit_logs ORDER BY id LIMIT $1 OFFSET $2'
      : 'SELECT * FROM audit_logs ORDER BY id';
    const params = paginate ? [limit, offset] : [];
    const result = await query(queryText, params);
    res.json(result.rows.map((r: any) => ({
      id: r.log_id,
      type: r.type,
      title: r.title,
      user: r.username,
      time: r.time,
      status: r.status,
    })));
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
