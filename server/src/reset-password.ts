import bcrypt from 'bcryptjs';
import { pool } from './db';
import { logger } from './logger';

async function resetPassword() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, username, password_hash FROM users WHERE username = $1', ['manager']);
    if (result.rows.length === 0) {
      logger.error('Manager user not found');
      return;
    }
    const user = result.rows[0];
    const DEFAULT_PASSWORD = process.env.MANAGER_DEFAULT_PASSWORD;
    if (!DEFAULT_PASSWORD) {
      logger.error('MANAGER_DEFAULT_PASSWORD environment variable is not set. Password reset aborted.');
      return;
    }
    const newHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
    logger.info(`Password reset for user ${user.username} (id=${user.id})`);
    const verify = await bcrypt.compare(DEFAULT_PASSWORD, newHash);
    logger.info(`Verification: ${verify}`);
  } finally {
    client.release();
    await pool.end();
  }
}
resetPassword();
