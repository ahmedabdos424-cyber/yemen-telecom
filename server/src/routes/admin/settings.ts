import { Router, Request, Response } from 'express';
import { query } from '../../db';
import { invalidateMaintenanceMode } from '../../maintenance';
import { logger } from '../../logger';
import { requireRole } from '../../middleware/auth';
import { validate, updateSettingsSchema } from '../../validation';

const router = Router();

interface DbSystemSettingsRow {
  two_fa_enabled?: unknown;
  email_2fa_enabled?: unknown;
  trusted_devices_enabled?: unknown;
  session_timeout?: unknown;
  password_special_required?: unknown;
  password_expiry_90_days?: unknown;
  password_no_reuse_5?: unknown;
  maintenance_mode?: unknown;
  language?: unknown;
  email_alerts_enabled?: unknown;
  sms_alerts_enabled?: unknown;
  app_notifications_enabled?: unknown;
  stock_shortage_threshold?: unknown;
  inactive_sims_threshold?: unknown;
  max_failed_logins_threshold?: unknown;
  high_risk_duplicates_threshold?: unknown;
  identity_reminders_enabled?: unknown;
  identity_reminders_frequency?: unknown;
}

function mapAdminSettingsToCamelCase(s: DbSystemSettingsRow) {
  return {
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
  };
}

router.get('/settings', requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM system_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({});
    }
    res.json(mapAdminSettingsToCamelCase(result.rows[0]));
  } catch (err) {
    logger.error('Failed to process request:', { error: err, stack: (err as Error).stack });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });
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
    invalidateMaintenanceMode();
    res.json(mapAdminSettingsToCamelCase(result.rows[0]));
  } catch (err) {
    logger.error('Error updating settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
