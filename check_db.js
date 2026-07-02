const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const client = await pool.connect();
  try {
    const sellers = await client.query('SELECT id, name, phone, active FROM "Seller" ORDER BY id');
    console.log('--- SELLERS ---');
    console.log(sellers.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
