import bcrypt from 'bcryptjs';
import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf-8');

    const hash = await bcrypt.hash('123456', 10);
    // Replace the placeholder hash with the one generated at runtime
    schema = schema.replace(
      /\$2a\$10\$LS1\.tsnmbo8M8Uz8MEKuHOUWcRtEIq468TV05kTcMSYHzVGP4Ou02/g,
      hash
    );

    await client.query(schema);

    // Update all seed users to have the same default password
    const users = ['manager', 'agent', 'seller'];
    for (const username of users) {
      const userResult = await client.query('SELECT id FROM users WHERE username = $1', [username]);
      if (userResult.rows.length > 0) {
        await client.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);
      }
    }

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
