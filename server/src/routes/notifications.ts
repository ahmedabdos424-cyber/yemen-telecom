import { Router, Request, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';

const router = Router();

// POST /api/notifications/device-token
// Register (or refresh) the current device's FCM token for the authenticated user.
router.post('/device-token', async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { id: number } }).user?.id;
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
    await query(
      `INSERT INTO device_tokens (user_id, token, platform, last_used_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_used_at = NOW()`,
      [userId, token, platform]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('Error registering device token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notifications/device-token
// Unregister the current device's FCM token (logout or disabled notifications).
router.delete('/device-token', async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { id: number } }).user?.id;
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
