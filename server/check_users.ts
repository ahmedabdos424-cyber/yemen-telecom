import { pool } from './src/db.js';

async function check() {
  const r = await pool.query('SELECT username, role FROM users');
  console.log(r.rows);
  await pool.end();
}
check();