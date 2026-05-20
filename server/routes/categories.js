import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE is_active = TRUE ORDER BY display_order'
    );
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
