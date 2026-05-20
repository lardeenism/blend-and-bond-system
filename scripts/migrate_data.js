import mysql from 'mysql2/promise';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const mysqlPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'blend_and_bond_db',
  port: 3306
});

const pgPool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

const tablesToMigrate = [
  'users',
  'categories',
  'products',
  'product_sizes',
  'orders',
  'order_items',
  'order_tracking_logs',
  'reviews',
  'overall_order_reviews',
  'notifications',
  'settings',
  'activity_logs'
];

async function migrate() {
  console.log('Starting data migration from MySQL to Supabase...');
  
  for (const table of tablesToMigrate) {
    console.log(`\n--- Migrating table: ${table} ---`);
    try {
      const [rows] = await mysqlPool.query(`SELECT * FROM ${table}`);
      console.log(`Found ${rows.length} rows in MySQL for ${table}.`);

      if (rows.length === 0) continue;

      const keys = Object.keys(rows[0]);
      
      // Clear existing data in PG to prevent conflicts (CASCADE handles foreign keys)
      await pgPool.query(`TRUNCATE TABLE ${table} CASCADE;`);

      for (const row of rows) {
        // Map values
        const values = keys.map(k => {
          let val = row[k];
          // Handle MySQL tinyint(1) boolean representations if needed, but PG can usually parse 1/0 as boolean or integers
          // Actually, our schema defined them as BOOLEAN in PG, so we should convert 1/0 to true/false for safety
          if (val === 1 && typeof val === 'number') {
             // Let's just let pg handle it, but to be safe for strict booleans:
             if (['is_active', 'has_sizes', 'is_available', 'is_featured', 'is_best_seller', 'is_flagged', 'is_read'].includes(k)) {
                return true;
             }
          }
          if (val === 0 && typeof val === 'number') {
             if (['is_active', 'has_sizes', 'is_available', 'is_featured', 'is_best_seller', 'is_flagged', 'is_read'].includes(k)) {
                return false;
             }
          }
          if (val instanceof Date) {
            return val.toISOString(); // PG accepts ISO strings
          }
          return val;
        });

        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');
        
        const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        await pgPool.query(query, values);
      }
      
      console.log(`Successfully inserted ${rows.length} rows into Supabase ${table}.`);

      // Reset Sequence so auto-increment works
      // Check if table has an 'id' column
      if (keys.includes('id')) {
        await pgPool.query(`SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`);
        console.log(`Reset sequence for ${table}.`);
      }

    } catch (err) {
      console.error(`Error migrating ${table}:`, err);
    }
  }

  console.log('\nMigration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed completely:', err);
  process.exit(1);
});
