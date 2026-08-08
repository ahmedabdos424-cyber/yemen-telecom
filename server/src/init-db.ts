import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureMigrationTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function runMigrations(client: any) {
  await ensureMigrationTable(client);
  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) return;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const alreadyRan = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (alreadyRan.rows.length > 0) {
      logger.info(`Migration ${file} already applied, skipping`);
      continue;
    }
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    // Some migration files manage their own BEGIN/COMMIT (they were authored
    // for psql). Wrapping them again in a transaction would break the outer
    // COMMIT (no transaction in progress), so run those without a wrapper.
    const managesOwnTx = /(?:^|\n)\s*(?:BEGIN|START TRANSACTION|COMMIT|ROLLBACK)\s*;/i.test(sql);
    try {
      if (!managesOwnTx) {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } else {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      }
      logger.info(`Migration ${file} applied successfully`);
    } catch (err: unknown) {
      await client.query('ROLLBACK').catch(() => undefined);
      logger.error(`Migration ${file} failed:`, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }
}

async function initDB() {
  if (process.env.NODE_ENV === 'production') {
    logger.error('[INIT-DB] Refusing to run database initialization in production.');
    process.exit(1);
  }
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schema);
    logger.info('Database schema and seed data created successfully');
    await runMigrations(client);
  } catch (err) {
    logger.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();
