const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync(path.resolve('.env')));
(async () => {
  const client = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT || 5432,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const q = `SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('users','system_settings') AND column_name IN ('failed_attempts','locked_until','max_failed_logins_threshold','display_name','last_login') ORDER BY table_name, column_name;`;
  const res = await client.query(q);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})();
