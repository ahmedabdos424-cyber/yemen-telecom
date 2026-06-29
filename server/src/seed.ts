import bcrypt from 'bcryptjs';
import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { logger } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    logger.error('[SEED] Refusing to seed database in production. Run with NODE_ENV=development to seed.');
    process.exit(1);
  }
  const client = await pool.connect();
  try {
    // Run schema.sql (creates tables + seed data with placeholder hashes)
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schema);

    // Generate unique passwords per user
    const seedUsers = ['manager', 'agent', 'seller'];
    const passwords: Record<string, string> = {};
    for (const username of seedUsers) {
      const envKey = `SEED_PASSWORD_${username.toUpperCase()}`;
      let pw = process.env[envKey];
      if (pw && !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(pw)) {
        logger.warn(`[WARN] ${envKey} is weak — must have uppercase, lowercase, and digit (min 8 chars). Using generated password.`);
        pw = undefined;
      }
      passwords[username] = pw || crypto.randomBytes(16).toString('base64url');
    }

    // Update each seed user with their unique password hash
    for (const username of seedUsers) {
      const userResult = await client.query('SELECT id FROM users WHERE username = $1', [username]);
      if (userResult.rows.length > 0) {
        const hash = await bcrypt.hash(passwords[username], 10);
        await client.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);
      }
    }

    logger.info('\n══════════════════════════════════════════════');
    logger.info('  Database seeded successfully!');
    if (process.env.NODE_ENV !== 'production') {
      for (const username of seedUsers) {
        logger.info(`  ${username}: ${passwords[username]}`);
      }
    }
    logger.info('  Set individual SEED_PASSWORD_MANAGER / SEED_PASSWORD_AGENT / SEED_PASSWORD_SELLER env vars to customize');
    logger.info('══════════════════════════════════════════════\n');
  } catch (err) {
    logger.error('Error seeding database:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
