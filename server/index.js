import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import psgcRoutes from './routes/psgc.js';
import dashboardRoutes from './routes/dashboard.js';
import staffMgmtRoutes from './routes/staffMgmt.js';
import settingsRoutes from './routes/settings.js';
import reportsRoutes from './routes/reports.js';
import pool from './config/db.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

async function ensureProductStockColumn() {
  try {
    const [rows] = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'products' AND column_name = 'stock'
       ) AS col_exists`
    );
    if (!rows[0]?.col_exists) {
      await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 10');
    }
  } catch (err) {
    // Expected if table doesn't exist - it will be created by init-db
    console.log('Note: Product stock column check skipped (tables may not exist yet)');
  }
}

async function ensureTrackingAndReviewTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_tracking_logs (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_order_tracking_order ON order_tracking_logs(order_id)`);

    const [cols] = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'overall_order_reviews' AND column_name = 'metrics'
       ) AS col_exists`
    );

    if (cols[0] && cols[0].col_exists === false) {
      // Table exists but doesn't have metrics column, add it
      await pool.query(`ALTER TABLE overall_order_reviews ADD COLUMN IF NOT EXISTS metrics JSONB`);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS overall_order_reviews (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        customer_name VARCHAR(100) NOT NULL,
        order_type VARCHAR(50) NOT NULL,
        metrics JSONB NOT NULL,
        overall_rating NUMERIC(3,2) NOT NULL,
        feedback TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  } catch (err) {
    // Expected if tables don't exist - they will be created by init-db
    console.log('Note: Tracking/review tables check skipped (tables may not exist yet)');
  }
}

app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      process.env.CLIENT_URL
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // allow all in dev
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/psgc', psgcRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/staff', staffMgmtRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Blend & Bond Cafe API running' });
});

// Frontend is served by Vercel, not by this backend
// 404 for any undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

await ensureProductStockColumn();
await ensureTrackingAndReviewTables();

app.listen(PORT, () => {
  console.log(`☕ Blend & Bond Cafe API running on port ${PORT}`);
});
