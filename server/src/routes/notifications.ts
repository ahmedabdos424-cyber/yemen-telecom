import { Router, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/notifications/device-token
// Register (or refresh) the current device's FCM token for the authenticated user.
// NOTE: the global JWT wall in index.ts already guarantees req.user; the 401
// check below is defense-in-depth for direct router mounting (e.g. tests).
router.post('/device-token', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const platform = typeof req.body?.platform === 'string' ? req.body.platform : 'android';

  if (!token || token.length < 20 || token.length > 512) {
    return res.status(400).json({ error: 'Invalid token' });
  }
  if (!['android', 'ios', 'web'].includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  try {
    // Anti-hijack: the conditional upsert only reassigns a token that already
    // belongs to this user. A token owned by ANOTHER user matches the
    // ON CONFLICT branch but fails the WHERE guard → rowCount 0 → 403.
    // This is atomic (no check-then-act race between concurrent requests).
    const result = await query(
      `INSERT INTO device_tokens (user_id, token, platform, last_used_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE SET platform = EXCLUDED.platform, last_used_at = NOW()
       WHERE device_tokens.user_id = $1
       RETURNING id`,
      [userId, token, platform]
    );
    if (result.rowCount === 0) {
      logger.warn('[notifications] device-token hijack attempt blocked', { userId });
      return res.status(403).json({ error: 'Token already registered to another user' });
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Error registering device token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notifications/device-token
// Unregister the current device's FCM token (logout or disabled notifications).
router.delete('/device-token', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token) return res.status(400).json({ error: 'Invalid token' });

  try {
    await query('DELETE FROM device_tokens WHERE token = $1 AND user_id = $2', [token, userId]);
    res.json({ success: true });
  } catch (err) {
    logger.error('Error unregistering device token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
