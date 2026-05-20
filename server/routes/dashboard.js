import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [totalOrders] = await pool.query('SELECT COUNT(*) as count FROM orders');
    const [totalRevenue] = await pool.query("SELECT COALESCE(SUM(total),0) as revenue FROM orders WHERE status NOT IN ('cancelled')");
    const [todayOrders] = await pool.query('SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE');
    const [todayRevenue] = await pool.query("SELECT COALESCE(SUM(total),0) as revenue FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status NOT IN ('cancelled')");
    const [pendingOrders] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
    const [activeOrders] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('completed','cancelled')");
    const [completedOrders] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'");
    const [totalProducts] = await pool.query('SELECT COUNT(*) as count FROM products');
    const [totalCustomers] = await pool.query('SELECT COUNT(DISTINCT customer_name) as count FROM orders');
    const [totalStaff] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'staff'");

    const [popularProducts] = await pool.query(`
      SELECT p.name, p.image_filename, SUM(oi.quantity) as total_sold, SUM(oi.subtotal) as total_revenue
      FROM order_items oi JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id WHERE o.status NOT IN ('cancelled')
      GROUP BY p.id ORDER BY total_sold DESC LIMIT 5
    `);

    const [recentOrders] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10');

    const [ordersByType] = await pool.query(`
      SELECT order_type, COUNT(*) as count FROM orders WHERE status NOT IN ('cancelled') GROUP BY order_type
    `);

    const [dailyRevenue] = await pool.query(`
      SELECT DATE(created_at) as date, COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
      FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status NOT IN ('cancelled')
      GROUP BY DATE(created_at) ORDER BY date
    `);

    const [recentLogs] = await pool.query(`
      SELECT al.*, u.full_name FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 20
    `);

    const [ordersByStatus] = await pool.query(`
      SELECT status, COUNT(*) as count FROM orders GROUP BY status
    `);

    res.json({
      stats: {
        totalOrders: totalOrders[0].count,
        totalRevenue: totalRevenue[0].revenue,
        todayOrders: todayOrders[0].count,
        todayRevenue: todayRevenue[0].revenue,
        pendingOrders: pendingOrders[0].count,
        activeOrders: activeOrders[0].count,
        completedOrders: completedOrders[0].count,
        totalProducts: totalProducts[0].count,
        totalCustomers: totalCustomers[0].count,
        totalStaff: totalStaff[0].count
      },
      popularProducts, recentOrders, ordersByType, dailyRevenue, recentLogs, ordersByStatus
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/notifications
router.get('/notifications', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE target_role = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.role]
    );
    const [unreadCount] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE target_role = ? AND is_read = FALSE',
      [req.user.role]
    );
    const [pendingOrders] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
    res.json({ notifications, unreadCount: unreadCount[0].count, pendingOrdersCount: pendingOrders[0].count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/dashboard/notifications/:id/read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/dashboard/notifications/read-all
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE target_role = ?', [req.user.role]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
