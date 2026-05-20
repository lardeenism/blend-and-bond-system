import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

// Convert MySQL `?` placeholders to Postgres `$1, $2`
function convertQueryToPg(sql) {
  let count = 1;
  return sql.replace(/\?/g, () => `$${count++}`);
}

const db = {
  query: async (sql, params = []) => {
    const result = await pool.query(convertQueryToPg(sql), params);
    return [result.rows];
  },
  getConnection: async () => {
    const client = await pool.connect();
    return {
      query: async (sql, params = []) => {
        const result = await client.query(convertQueryToPg(sql), params);
        return [result.rows];
      },
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release()
    };
  }
};

export default db;
