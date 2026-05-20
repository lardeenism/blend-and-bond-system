import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports/sales
router.get('/sales', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { period } = req.query; // daily, weekly, monthly

    let dateFilter = 'DATE(created_at) = CURRENT_DATE';
    if (period === 'weekly') dateFilter = `created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    else if (period === 'monthly') dateFilter = `created_at >= CURRENT_DATE - INTERVAL '30 days'`;

    // Revenue by day
    const [dailyRevenue] = await pool.query(`
      SELECT DATE(created_at) as date, COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
      FROM orders WHERE ${dateFilter} AND status NOT IN ('cancelled')
      GROUP BY DATE(created_at) ORDER BY date
    `);

    // Revenue by category
    const [categoryRevenue] = await pool.query(`
      SELECT c.name as category, COALESCE(SUM(oi.subtotal),0) as revenue, SUM(oi.quantity) as sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.${dateFilter} AND o.status NOT IN ('cancelled')
      GROUP BY c.id ORDER BY revenue DESC
    `);

    // Top products
    const [topProducts] = await pool.query(`
      SELECT p.name, p.image_filename, SUM(oi.quantity) as sold, SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.${dateFilter} AND o.status NOT IN ('cancelled')
      GROUP BY p.id ORDER BY sold DESC LIMIT 10
    `);

    // Order type breakdown
    const [orderTypes] = await pool.query(`
      SELECT order_type, COUNT(*) as count, COALESCE(SUM(total),0) as revenue
      FROM orders WHERE ${dateFilter} AND status NOT IN ('cancelled')
      GROUP BY order_type
    `);

    // Summary
    const [summary] = await pool.query(`
      SELECT COUNT(*) as total_orders, COALESCE(SUM(total),0) as total_revenue,
      COALESCE(AVG(total),0) as avg_order_value, COUNT(DISTINCT customer_name) as unique_customers
      FROM orders WHERE ${dateFilter} AND status NOT IN ('cancelled')
    `);

    // Hourly distribution
    const [hourly] = await pool.query(`
      SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as orders
      FROM orders WHERE ${dateFilter} AND status NOT IN ('cancelled')
      GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY hour
    `);

    res.json({
      dailyRevenue,
      categoryRevenue,
      topProducts,
      orderTypes,
      summary: summary[0],
      hourly
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
