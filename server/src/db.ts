import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DB_PASSWORD environment variable is required in production');
  }
  console.warn('WARNING: DB_PASSWORD not set in environment. Using insecure default. Set DB_PASSWORD in .env for production.');
}

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: dbPassword || 'postgres',
  database: process.env.DB_NAME || 'yemen_telecom',
  ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  family: 4,
} as any);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res;
}
