import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function testConnection() {
  const pool = new Pool({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    user: 'postgres.glzctqoygkvdjbpzwnfy',
    password: process.env.DB_PASSWORD,
    database: 'postgres',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to pooler...');
    const res = await pool.query('SELECT NOW()');
    console.log('SUCCESS! Server time:', res.rows[0].now);
  } catch (err) {
    console.error('CONNECTION FAILED:', err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
