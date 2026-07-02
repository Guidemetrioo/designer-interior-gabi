const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const client = await pool.connect();
  try {
    const sellers = await client.query('SELECT id, name, "leadsCount", "lastAssignedAt", active FROM "Seller" ORDER BY id');
    console.log('--- SELLERS ---');
    console.log(sellers.rows);

    const logs = await client.query('SELECT id, "sellerId", "sellerName", "createdAt" FROM "LeadLog" ORDER BY id DESC LIMIT 10');
    console.log('--- RECENT LOGS ---');
    console.log(logs.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
