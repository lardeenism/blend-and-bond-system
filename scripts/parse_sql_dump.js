import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const pgPool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('c:\\Users\\LENOVO IDEAPAD\\Downloads\\blend_and_bond_db (1).sql', 'utf8');

const booleanTables = {
  categories: ['is_active'],
  notifications: ['is_read'],
  products: ['has_sizes', 'is_available', 'is_featured', 'is_best_seller'],
  reviews: ['is_flagged'],
  users: ['is_active']
};

const executionOrder = [
  'users',
  'categories',
  'settings',
  'orders',
  'products',
  'activity_logs',
  'order_tracking_logs',
  'overall_order_reviews',
  'notifications',
  'product_sizes',
  'order_items',
  'reviews'
];

async function run() {
  try {
    const insertsMap = {};
    const inserts = sql.match(/INSERT INTO `[^`]+`.*?;/gs) || [];
    
    for (const statement of inserts) {
      const match = statement.match(/INSERT INTO `([^`]+)`/);
      if (match) {
        insertsMap[match[1]] = statement;
      }
    }
    
    for (const table of executionOrder) {
      if (insertsMap[table]) {
        try {
          await pgPool.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        } catch(e) {}
      }
    }
    
    for (const currentTable of executionOrder) {
      const statement = insertsMap[currentTable];
      if (!statement) continue;

      console.log(`\n--- Migrating table: ${currentTable} ---`);
      
      if (booleanTables[currentTable]) {
        for (const col of booleanTables[currentTable]) {
          try {
            await pgPool.query(`ALTER TABLE "${currentTable}" ALTER COLUMN "${col}" DROP DEFAULT;`);
            await pgPool.query(`ALTER TABLE "${currentTable}" ALTER COLUMN "${col}" TYPE int USING "${col}"::int;`);
          } catch(e) {
            console.error(`Alter to int error for ${col}:`, e.message);
          }
        }
      }
      
      let pgSql = statement.replace(/`/g, '"');
      pgSql = pgSql.replace(/\\'/g, "''");
      pgSql = pgSql.replace(/\\"/g, '"');
      
      try {
        await pgPool.query(pgSql);
        console.log(`Successfully inserted data into ${currentTable}`);
      } catch(err) {
        console.error(`Error inserting into ${currentTable}:`, err.message);
      }
      
      if (booleanTables[currentTable]) {
        for (const col of booleanTables[currentTable]) {
          try {
            await pgPool.query(`ALTER TABLE "${currentTable}" ALTER COLUMN "${col}" TYPE boolean USING "${col}"::int::boolean;`);
            
            // Set defaults based on our knowledge of the schema
            let def = 'true';
            if (['is_flagged', 'has_sizes', 'is_featured', 'is_best_seller', 'is_read'].includes(col)) def = 'false';
            
            await pgPool.query(`ALTER TABLE "${currentTable}" ALTER COLUMN "${col}" SET DEFAULT ${def};`);
          } catch(e) {
            console.error(`Alter to bool error for ${col}:`, e.message);
          }
        }
      }
      
      try {
        await pgPool.query(`SELECT setval('${currentTable}_id_seq', COALESCE((SELECT MAX(id) FROM "${currentTable}"), 1), true)`);
        console.log(`Reset sequence for ${currentTable}`);
      } catch(e) {}
    }
    
    console.log('\nMigration complete! Verifying products...');
    const res = await pgPool.query('SELECT COUNT(*) FROM products');
    console.log('Total products in Supabase:', res.rows[0].count);
    
    process.exit(0);
  } catch (err) {
    console.error('Fatal:', err);
    process.exit(1);
  }
}
run();
