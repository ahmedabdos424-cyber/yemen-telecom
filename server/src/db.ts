import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './logger';
import { Sentry } from './sentry';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function safeEnv(key: string): string {
  const val = process.env[key];
  if (!val && process.env.NODE_ENV === 'production') {
    logger.error(`FATAL: ${key} environment variable is required in production`);
    process.exit(1);
  }
  return val || '';
}

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
if (process.env.NODE_ENV === 'production') {
  for (const key of required) safeEnv(key);
}

const dbHost = process.env.DB_HOST || 'localhost';
const isLocal = dbHost === 'localhost' || dbHost === '127.0.0.1';
// In production, SSL certificate validation MUST be enabled.
 // Default to true; only allow false explicitly in non-production.
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
if (process.env.NODE_ENV === 'production' && !isLocal && !rejectUnauthorized) {
  logger.error('FATAL: DB_SSL_REJECT_UNAUTHORIZED must be true in production. Refusing to start with SSL verification disabled.');
  process.exit(1);
}

const poolConfig: PoolConfig = {
  host: dbHost,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: safeEnv('DB_USER'),
  password: safeEnv('DB_PASSWORD'),
  database: process.env.DB_NAME || 'postgres',
  ssl: isLocal
    ? false
    : {
        rejectUnauthorized,
        ...(process.env.DB_SSL_CA_CERT ? { ca: process.env.DB_SSL_CA_CERT.replace(/\\n/g, '\n') } : {}),
      },
  // Default matches production (render.yaml: DB_MAX_CONNECTIONS=20, Supabase pooler).
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  min: parseInt(process.env.DB_MIN_CONNECTIONS || '3', 10),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 15000,
  allowExitOnIdle: false,
};
if (process.env.DB_FAMILY) {
  ((poolConfig as unknown) as { family?: number }).family = parseInt(process.env.DB_FAMILY, 10);
}
export const pool = new Pool(poolConfig);

pool.on('error', (err: NodeJS.ErrnoException) => {
  // تجاهل هادئ لأخطاء إعادة ضبط الاتصال الخامل (PgBouncer) لتقليل ضجيج السجلات
  if (err.code === 'ECONNRESET' || err.code === '57P01') {
    logger.debug('[DB] idle client recycled:', err.code);
    return;
  }
  logger.error('[DB] Unexpected error on idle client', err);
});

let slowQueryThreshold = parseInt(process.env.DB_SLOW_QUERY_MS || '500', 10);

export async function query<T extends import('pg').QueryResultRow = any>(text: string, params?: unknown[]): Promise<import('pg').QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > slowQueryThreshold) {
    logger.warn('[DB] Slow query', { text: text.substring(0, 120), duration, rows: res.rowCount });
    Sentry.addBreadcrumb({
      category: 'db.slow_query',
      message: text.substring(0, 120),
      level: 'warning',
      data: { duration_ms: duration, rows: res.rowCount },
    });
  }
  return res;
}

export async function transaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
