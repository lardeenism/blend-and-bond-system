import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/staff - list all staff
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [staff] = await pool.query(
      "SELECT id, username, full_name, email, phone, role, is_active, last_login, created_at FROM users WHERE role = 'staff' ORDER BY created_at DESC"
    );
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/staff - create staff
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, full_name, email, phone } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password, and full name are required' });
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, full_name, email, phone, role) VALUES (?,?,?,?,?,?) RETURNING id',
      [username, hashed, full_name, email || null, phone || null, 'staff']
    );
    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'staff_created', `Created staff: ${full_name} (${username})`]);
    await pool.query(
      'INSERT INTO notifications (type, title, message, target_role) VALUES (?,?,?,?)',
      ['staff_added', 'New Staff Added', `${full_name} has been added as staff`, 'admin']
    );
    res.status(201).json({ message: 'Staff created', id: result[0].id });
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/staff/:id - update staff
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { full_name, email, phone, is_active, password } = req.body;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await pool.query("UPDATE users SET full_name=?, email=?, phone=?, is_active=?, password=? WHERE id=? AND role = 'staff'",
        [full_name, email || null, phone || null, is_active, hashed, req.params.id]);
    } else {
      await pool.query("UPDATE users SET full_name=?, email=?, phone=?, is_active=? WHERE id=? AND role = 'staff'",
        [full_name, email || null, phone || null, is_active, req.params.id]);
    }
    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'staff_updated', `Updated staff #${req.params.id}: ${full_name}`]);
    res.json({ message: 'Staff updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/staff/logs - activity logs
router.get('/logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT al.*, u.full_name, u.username
      FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 100
    `);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
