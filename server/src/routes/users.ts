import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { AuthRequest } from '../middleware/auth';
import { validate, updatePasswordSchema, updateProfileSchema } from '../validation';

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
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/account', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const userId = req.user.id;
    const userResult = await query('SELECT id, username, role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];
    await query('DELETE FROM token_blacklist WHERE token_hash IN (SELECT token_hash FROM token_blacklist WHERE expires_at > NOW())');
    await query('UPDATE users SET status = \'deleted\', password_hash = \'\', username = CONCAT(username, \'_\', id, \'_deleted\') WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { displayName, phone, region, avatar } = req.body;
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
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
