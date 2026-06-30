import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './logger';
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
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

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
        ...(process.env.DB_SSL_CA_CERT ? { ca: process.env.DB_SSL_CA_CERT.replace(/\\\\n/g, '\n') } : {}),
      },
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  connectionTimeoutMillis: 15000,
};
if (process.env.DB_FAMILY) {
  (poolConfig as any).family = parseInt(process.env.DB_FAMILY, 10);
}
if (process.env.NODE_ENV === 'production' && !isLocal && !rejectUnauthorized) {
  logger.error('[DB] SSL certificate validation is disabled (DB_SSL_REJECT_UNAUTHORIZED=false). Set it to true in production.');
}
export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('[DB] Unexpected error on idle client', err);
});

let slowQueryThreshold = parseInt(process.env.DB_SLOW_QUERY_MS || '500', 10);

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > slowQueryThreshold) {
    logger.warn('[DB] Slow query', { text: text.substring(0, 120), duration, rows: res.rowCount });
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
