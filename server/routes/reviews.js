import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET /api/reviews - all reviews (with product name)
router.get('/', async (req, res) => {
  try {
    const { product_id, rating, order_id } = req.query;
    let query = `
      SELECT r.*, p.name as product_name, p.image_filename as product_image
      FROM reviews r JOIN products p ON r.product_id = p.id WHERE 1=1
    `;
    const params = [];
    if (product_id) { query += ' AND r.product_id = ?'; params.push(product_id); }
    if (rating) { query += ' AND r.rating = ?'; params.push(rating); }
    if (order_id) { query += ' AND r.order_id = ?'; params.push(order_id); }
    query += ' ORDER BY r.created_at DESC';
    const [reviews] = await pool.query(query, params);
    res.json({ reviews });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  try {
    const { order_id, product_id, rating, comment, customer_name } = req.body;
    if (!order_id || !product_id || !rating || !customer_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }
    const [existing] = await pool.query('SELECT id FROM reviews WHERE order_id = ? AND product_id = ?', [order_id, product_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already reviewed' });
    }
    const [orders] = await pool.query("SELECT id FROM orders WHERE id = ? AND status = 'completed'", [order_id]);
    if (orders.length === 0) {
      return res.status(400).json({ error: 'Can only review completed orders' });
    }

    await pool.query(
      'INSERT INTO reviews (order_id, product_id, rating, comment, customer_name) VALUES (?,?,?,?,?)',
      [order_id, product_id, rating, comment || null, customer_name]
    );

    // Update product avg rating
    const [stats] = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ?', [product_id]
    );
    await pool.query('UPDATE products SET avg_rating = ?, total_reviews = ? WHERE id = ?',
      [stats[0].avg_rating, stats[0].total, product_id]);

    await pool.query(
      'INSERT INTO notifications (type, title, message, target_role) VALUES (?,?,?,?)',
      ['review_added', 'New Review', `${customer_name} left a ${rating}-star review`, 'admin']
    );

    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/reviews/:id - Edit existing product review
router.put('/:id', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valid rating (1-5) is required' });
    }
    const [reviews] = await pool.query('SELECT * FROM reviews WHERE id = ?', [req.params.id]);
    if (reviews.length === 0) return res.status(404).json({ error: 'Review not found' });

    await pool.query('UPDATE reviews SET rating = ?, comment = ? WHERE id = ?', [rating, comment || null, req.params.id]);

    // Update product avg rating
    const productId = reviews[0].product_id;
    const [stats] = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ?', [productId]
    );
    await pool.query('UPDATE products SET avg_rating = ?, total_reviews = ? WHERE id = ?',
      [stats[0].avg_rating, stats[0].total, productId]);

    res.json({ message: 'Review updated' });
  } catch (err) {
    console.error('Update review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reviews/overall/:orderId
router.get('/overall/:orderId', async (req, res) => {
  try {
    const [reviews] = await pool.query('SELECT * FROM overall_order_reviews WHERE order_id = ?', [req.params.orderId]);
    if (reviews.length === 0) return res.json({ review: null });
    res.json({ review: reviews[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/reviews/overall
router.post('/overall', async (req, res) => {
  try {
    const { order_id, customer_name, order_type, metrics, feedback } = req.body;
    if (!order_id || !customer_name || !order_type || !metrics || typeof metrics !== 'object') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [existing] = await pool.query('SELECT id FROM overall_order_reviews WHERE order_id = ?', [order_id]);
    if (existing.length > 0) return res.status(400).json({ error: 'Overall review already submitted for this order' });

    const values = Object.values(metrics);
    const overall_rating = values.length > 0 ? values.reduce((sum, v) => sum + Number(v), 0) / values.length : 0;

    await pool.query(
      `INSERT INTO overall_order_reviews 
      (order_id, customer_name, order_type, metrics, overall_rating, feedback) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [order_id, customer_name, order_type, JSON.stringify(metrics), overall_rating, feedback || null]
    );

    res.status(201).json({ message: 'Overall review submitted successfully' });
  } catch (err) {
    console.error('Create overall review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reviews/overall
router.get('/overall', async (req, res) => {
  try {
    const [reviews] = await pool.query('SELECT * FROM overall_order_reviews ORDER BY created_at DESC');
    res.json({ reviews });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
