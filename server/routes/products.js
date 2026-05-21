import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

function parseBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function parseSizes(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// GET /api/products - public
router.get('/', async (req, res) => {
  try {
    const { category, search, featured, best_seller } = req.query;
    let query = `
      SELECT p.*, c.name as category_name, c.icon as category_icon, c.slug as category_slug
      FROM products p JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (category) { query += ' AND c.slug = ?'; params.push(category); }
    if (search) { query += ' AND (p.name ILIKE ? OR p.description ILIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (featured === 'true') query += ' AND p.is_featured = TRUE';
    if (best_seller === 'true') query += ' AND p.is_best_seller = TRUE';
    query += ' ORDER BY c.display_order, p.name';
    const [products] = await pool.query(query, params);

    // Batch-load all sizes in one query
    const productIds = products.map(p => p.id);
    const [allSizes] = productIds.length > 0 
      ? await pool.query(
          `SELECT * FROM product_sizes WHERE product_id = ANY($1) ORDER BY product_id, 
           CASE size_label WHEN 'Small' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Large' THEN 3 END`,
          [productIds]
        )
      : [[], null];
    
    // Map sizes to products
    const sizesMap = new Map();
    for (const size of allSizes) {
      if (!sizesMap.has(size.product_id)) {
        sizesMap.set(size.product_id, []);
      }
      sizesMap.get(size.product_id).push(size);
    }
    
    for (const p of products) {
      p.sizes = sizesMap.get(p.id) || [];
    }
    
    res.json({ products });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/all - admin
router.get('/all', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, c.icon as category_icon
      FROM products p JOIN categories c ON p.category_id = c.id ORDER BY c.display_order, p.name
    `);
    
    // Batch-load all sizes
    const productIds = products.map(p => p.id);
    const [allSizes] = productIds.length > 0
      ? await pool.query(
          `SELECT * FROM product_sizes WHERE product_id = ANY($1) ORDER BY product_id,
           CASE size_label WHEN 'Small' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Large' THEN 3 END`,
          [productIds]
        )
      : [[], null];
    
    const sizesMap = new Map();
    for (const size of allSizes) {
      if (!sizesMap.has(size.product_id)) {
        sizesMap.set(size.product_id, []);
      }
      sizesMap.get(size.product_id).push(size);
    }
    
    for (const p of products) {
      p.sizes = sizesMap.get(p.id) || [];
    }
    
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [req.params.id]);
    if (products.length === 0) return res.status(404).json({ error: 'Not found' });
    const product = products[0];
    const [sizes] = await pool.query(`SELECT * FROM product_sizes WHERE product_id = ? ORDER BY CASE size_label WHEN 'Small' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Large' THEN 3 END`, [product.id]);
    product.sizes = sizes;
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products - admin
router.post('/', authenticateToken, requireRole('admin'), upload.single('image'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, base_price, category_id } = req.body;
    const image_filename = req.file ? `/uploads/products/${req.file.filename}` : req.body.image_filename || null;
    const has_sizes = parseBoolean(req.body.has_sizes);
    const is_featured = parseBoolean(req.body.is_featured);
    const is_best_seller = parseBoolean(req.body.is_best_seller);
    const is_available = parseBoolean(req.body.is_available);
    const stock = Number.parseInt(req.body.stock ?? '10', 10);
    const sizes = parseSizes(req.body.sizes);
    const [result] = await conn.query(
      'INSERT INTO products (name, description, base_price, category_id, image_filename, stock, has_sizes, is_available, is_featured, is_best_seller) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [name, description, base_price, category_id, image_filename, Number.isFinite(stock) ? stock : 10, has_sizes, is_available, is_featured, is_best_seller]
    );
    if (has_sizes && sizes) {
      for (const s of sizes) {
        await conn.query('INSERT INTO product_sizes (product_id, size_label, volume_ml, price) VALUES (?,?,?,?)',
          [result[0].id, s.size_label, s.volume_ml || null, s.price]);
      }
    }
    await conn.commit();

    // Log
    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'product_created', `Created product: ${name}`]);

    const [newProd] = await pool.query('SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [result[0].id]);
    res.status(201).json({ product: newProd[0] });
  } catch (err) {
    await conn.rollback();
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/products/:id - admin
router.put('/:id', authenticateToken, requireRole('admin'), upload.single('image'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, base_price, category_id } = req.body;
    const image_filename = req.file ? `/uploads/products/${req.file.filename}` : req.body.image_filename || null;
    const has_sizes = parseBoolean(req.body.has_sizes);
    const is_available = parseBoolean(req.body.is_available);
    const is_featured = parseBoolean(req.body.is_featured);
    const is_best_seller = parseBoolean(req.body.is_best_seller);
    const stock = Number.parseInt(req.body.stock ?? '10', 10);
    const sizes = parseSizes(req.body.sizes);
    await conn.query(
      'UPDATE products SET name=?, description=?, base_price=?, category_id=?, image_filename=?, stock=?, has_sizes=?, is_available=?, is_featured=?, is_best_seller=? WHERE id=?',
      [name, description, base_price, category_id, image_filename, Number.isFinite(stock) ? stock : 10, has_sizes, is_available, is_featured, is_best_seller, req.params.id]
    );
    // Update sizes
    await conn.query('DELETE FROM product_sizes WHERE product_id = ?', [req.params.id]);
    if (has_sizes && sizes) {
      for (const s of sizes) {
        await conn.query('INSERT INTO product_sizes (product_id, size_label, volume_ml, price) VALUES (?,?,?,?)',
          [req.params.id, s.size_label, s.volume_ml || null, s.price]);
      }
    }
    await conn.commit();
    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'product_updated', `Updated product #${req.params.id}: ${name}`]);
    const [updated] = await pool.query('SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [req.params.id]);
    res.json({ product: updated[0] });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// DELETE /api/products/:id - admin
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'product_deleted', `Deleted product #${req.params.id}`]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
