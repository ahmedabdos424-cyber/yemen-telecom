import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { resetSystemData } from './reset-data';
import { pool } from './db';

const CONFIRM_TOKEN = 'RESET_INVENTORY';

async function main(): Promise<void> {
  const arg = process.argv[2] || '';
  if (arg !== CONFIRM_TOKEN) {
    console.error(`Usage: npx tsx src/reset-inventory.ts ${CONFIRM_TOKEN}`);
    console.error('This wipes ALL inventory and relational data (agents, sellers, SIMs, customers, logs).');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_RESET !== '1') {
    console.error('Refusing to reset in production. Set ALLOW_PRODUCTION_RESET=1 to force a production reset.');
    process.exit(1);
  }

  try {
    const summary = await resetSystemData();
    console.log('System data reset completed successfully.');
    console.log('Deleted rows:', JSON.stringify(summary.deleted, null, 2));
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();