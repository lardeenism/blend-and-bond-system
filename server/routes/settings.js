import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM settings ORDER BY id');
    const obj = {};
    settings.forEach(s => { obj[s.setting_key] = s.setting_value; });
    res.json({ settings: obj, raw: settings });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings
router.put('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [String(value), key]);
    }
    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'settings_updated', `Updated settings: ${Object.keys(updates).join(', ')}`]);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
