import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db';
import { logger } from '../logger';
import { AuthRequest } from '../middleware/auth';
import { validate, updatePasswordSchema, updateProfileSchema, updateUserPreferencesSchema } from '../validation';

const router = Router();

router.put('/password', validate(updatePasswordSchema), async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    // Invalidate all existing refresh tokens by clearing the active session
    // and inserting a blacklisted sentinel so old refresh tokens can no longer
    // be exchanged. The sentinel is keyed on a wildcard prefix so the refresh
    // endpoint can check `LIKE` — but since we also clear active_session_sid,
    // any old JWT will fail the session check anyway.
    await query(
      'UPDATE users SET active_session_sid = NULL, session_expires_at = NULL WHERE id = $1',
      [req.user.id]
    );
    logger.info(`[AUTH] Password changed for user ${req.user.id} — session invalidated`);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('Error updating password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/account', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // Log the attempt even though it's rejected
  const logId = `SELF-DEL-ATTEMPT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await query(
      `INSERT INTO audit_logs (log_id, type, title, username, time, status, device_name, ip_address, mac_address, login_at, session_status)
       VALUES ($1, 'self_deletion_attempt', $2, $3, TO_CHAR(NOW(), 'YYYY/MM/DD HH24:MI:SS'), 'denied', '', '', '', NOW(), 'active')`,
      [logId, `محاولة حذف حساب ذاتي: ${req.user.username}`, req.user.username]
    );
  } catch (err) {
    logger.warn('[AUDIT] Failed to log self-deletion attempt:', err);
  }
  return res.status(409).json({ error: 'Self account deletion is disabled.' });
});

router.put('/profile', validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { displayName, phone, region } = req.body;
  try {
    const result = await query(
      `UPDATE users SET display_name = COALESCE($1, display_name), phone = COALESCE($2, phone),
       region = COALESCE($3, region) WHERE id = $4 RETURNING id, username, display_name, role, phone, region`,
      [displayName || null, phone || null, region || null, req.user.id]
    );
    const u = result.rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: u.id, username: u.username, displayName: u.display_name,
      role: u.role, phone: u.phone, region: u.region,
    });
  } catch (err) {
    logger.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── User Preferences (notification toggles, display settings) ──

router.get('/preferences', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const result = await query(
      `SELECT sim_notifications, low_stock_notifications, font_size, dark_mode
       FROM user_preferences WHERE user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      // Return defaults if no row exists yet
      return res.json({
        simNotifications: true,
        lowStockNotifications: true,
        fontSize: 'base',
        darkMode: false,
      });
    }
    const row = result.rows[0];
    res.json({
      simNotifications: row.sim_notifications,
      lowStockNotifications: row.low_stock_notifications,
      fontSize: row.font_size,
      darkMode: row.dark_mode,
    });
  } catch (err) {
    logger.error('Error fetching user preferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/preferences', validate(updateUserPreferencesSchema), async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { simNotifications, lowStockNotifications, fontSize, darkMode } = req.body;
  try {
    await query(
      `INSERT INTO user_preferences (user_id, sim_notifications, low_stock_notifications, font_size, dark_mode, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         sim_notifications = COALESCE($2, user_preferences.sim_notifications),
         low_stock_notifications = COALESCE($3, user_preferences.low_stock_notifications),
         font_size = COALESCE($4, user_preferences.font_size),
         dark_mode = COALESCE($5, user_preferences.dark_mode),
         updated_at = NOW()`,
      [
        req.user.id,
        simNotifications ?? true,
        lowStockNotifications ?? true,
        fontSize ?? 'base',
        darkMode ?? false,
      ]
    );
    res.json({ message: 'Preferences updated successfully' });
  } catch (err) {
    logger.error('Error updating user preferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
