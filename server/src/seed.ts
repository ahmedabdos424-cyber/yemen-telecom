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
    schema = schema.replace(
      /\$2b\$10\$8K1p\/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGmIxqZpEEBFTFqO2q3mS/g,
      hash
    );

    await client.query(schema);
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
