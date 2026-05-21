import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

function generateOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `BB-${date}-${rand}`;
}

// POST /api/orders - Create
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      customer_name, phone, email, order_type, table_number,
      delivery_address, province, municipality, barangay,
      order_notes, payment_method, scheduled_date, scheduled_time, items
    } = req.body;

    if (!customer_name || !phone || !order_type || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!/^\d{11}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must be exactly 11 digits' });
    }
    if (order_type === 'delivery') {
      if (!province || !municipality || !barangay) {
        return res.status(400).json({ error: 'Delivery requires complete address' });
      }
      if (!scheduled_date || !scheduled_time) {
        return res.status(400).json({ error: 'Delivery requires a scheduled date and time' });
      }
      const timeStr = scheduled_time.substring(0, 5); // ensure HH:mm
      if (timeStr < '08:00' || timeStr > '21:00') {
        return res.status(400).json({ error: 'Delivery time must be within working hours (08:00 - 21:00)' });
      }
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const [products] = await conn.query('SELECT * FROM products WHERE id = ? AND is_available = TRUE FOR UPDATE', [item.product_id]);
      if (products.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: `Product ${item.product_id} not available` });
      }
      const product = products[0];

      if (Number(product.stock) < Number(item.quantity)) {
        await conn.rollback();
        return res.status(400).json({ error: `Only ${product.stock} left for ${product.name}` });
      }

      // Determine price based on size or use provided price
      let itemPrice = Number(product.base_price);
      let sizeLabel = null;
      let volumeMl = null;

      if (item.size_label && product.has_sizes) {
        const [sizes] = await conn.query('SELECT * FROM product_sizes WHERE product_id = ? AND size_label = ?', [product.id, item.size_label]);
        if (sizes.length > 0) {
          itemPrice = Number(sizes[0].price);
          sizeLabel = sizes[0].size_label;
          volumeMl = sizes[0].volume_ml;
        }
      } else if (item.price) {
        itemPrice = Number(item.price);
      }

      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_filename,
        size_label: sizeLabel,
        volume_ml: volumeMl,
        quantity: item.quantity,
        price: itemPrice,
        subtotal: itemSubtotal
      });

      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, product.id]);
    }

    const delivery_fee = order_type === 'delivery' ? 50.00 : 0;
    const total = subtotal + delivery_fee;
    const order_number = generateOrderNumber();

    const [orderResult] = await conn.query(
      `INSERT INTO orders (order_number, customer_name, phone, email, order_type, table_number,
        delivery_address, province, municipality, barangay, order_notes, payment_method,
        scheduled_date, scheduled_time, subtotal, delivery_fee, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [order_number, customer_name, phone, email || null, order_type, table_number || null,
        delivery_address || null, province || null, municipality || null, barangay || null,
        order_notes || null, payment_method || 'cash',
        scheduled_date || null, scheduled_time || null, subtotal, delivery_fee, total]
    );

    const newOrderId = orderResult[0].id;

    for (const item of orderItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, product_name, product_image, size_label, volume_ml, quantity, price, subtotal) VALUES (?,?,?,?,?,?,?,?,?)',
        [newOrderId, item.product_id, item.product_name, item.product_image, item.size_label, item.volume_ml, item.quantity, item.price, item.subtotal]
      );
    }

    await conn.query(
      'INSERT INTO notifications (type, title, message, target_role, order_id) VALUES (?,?,?,?,?)',
      ['order_placed', 'New Order Received', `Order ${order_number} - ${order_type} from ${customer_name}`, 'staff', newOrderId]
    );
    await conn.query(
      'INSERT INTO notifications (type, title, message, target_role, order_id) VALUES (?,?,?,?,?)',
      ['order_placed', 'New Order Received', `Order ${order_number} - ${total.toFixed(2)}`, 'admin', newOrderId]
    );

    await conn.query(
      'INSERT INTO order_tracking_logs (order_id, status, message) VALUES (?, ?, ?)',
      [newOrderId, 'pending', 'Your order has been placed successfully.']
    );

    await conn.commit();
    res.status(201).json({ order: { id: newOrderId, order_number, status: 'pending', total, items: orderItems } });
  } catch (err) {
    await conn.rollback();
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally { conn.release(); }
});

// GET /api/orders/track/:orderNumber
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE order_number = ?', [req.params.orderNumber]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];
    const [items] = await pool.query(`
      SELECT oi.*, p.stock as current_stock, p.is_available as current_available
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);
    const [tracking_logs] = await pool.query('SELECT * FROM order_tracking_logs WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
    res.json({ order: { ...order, items, tracking_logs } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/orders
router.get('/', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { status, order_type } = req.query;
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (order_type) { query += ' AND order_type = ?'; params.push(order_type); }
    query += ' ORDER BY created_at DESC';
    const [orders] = await pool.query(query, params);
    for (const order of orders) {
      const [items] = await pool.query(`
        SELECT oi.*, p.stock as current_stock, p.is_available as current_available
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);
      order.items = items;
      const [tracking_logs] = await pool.query('SELECT * FROM order_tracking_logs WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
      order.tracking_logs = tracking_logs;
    }
    res.json({ orders });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/orders/:id/status
router.put('/:id/status', authenticateToken, requireRole('staff', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];

    const validTransitions = {
      'dine-in': { pending: ['confirmed'], confirmed: ['preparing'], preparing: ['ready'], ready: ['served'], served: ['completed'] },
      'take-out': { pending: ['confirmed'], confirmed: ['preparing'], preparing: ['ready'], ready: ['completed'] },
      'delivery': { pending: ['confirmed'], confirmed: ['preparing'], preparing: ['ready'], ready: ['out_for_delivery'], out_for_delivery: ['delivered'], delivered: ['completed'] }
    };

    const allowed = validTransitions[order.order_type]?.[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot change from "${order.status}" to "${status}" for ${order.order_type}` });
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    await pool.query('INSERT INTO notifications (type, title, message, target_role, order_id) VALUES (?,?,?,?,?)',
      ['order_updated', 'Order Updated', `Order ${order.order_number} is now ${status}`, 'admin', req.params.id]);
    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'order_status_updated', `Order ${order.order_number}: ${order.status} → ${status}`]);

    let statusMessage = `Order status updated to ${status}`;
    if (status === 'confirmed') statusMessage = 'Your order has been confirmed by the cafe.';
    else if (status === 'preparing') statusMessage = 'The kitchen is now preparing your order.';
    else if (status === 'ready') statusMessage = 'Your order is ready for pickup.';
    else if (status === 'out_for_delivery') statusMessage = 'Your order is out for delivery.';
    else if (status === 'delivered') statusMessage = 'Your order has been delivered.';
    else if (status === 'completed') statusMessage = 'Your order has been completed. Thank you!';
    else if (status === 'served') statusMessage = 'Your order has been served.';

    await pool.query('INSERT INTO order_tracking_logs (order_id, status, message) VALUES (?, ?, ?)',
      [req.params.id, status, statusMessage]);

    res.json({ message: 'Status updated', status });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/orders/:id/cancel
router.put('/:id/cancel', async (req, res) => {
  try {
    const { cancel_reason, order_number } = req.body;
    let query, params;
    if (req.params.id === '0' && order_number) { query = 'SELECT * FROM orders WHERE order_number = ?'; params = [order_number]; }
    else { query = 'SELECT * FROM orders WHERE id = ?'; params = [req.params.id]; }

    const [orders] = await pool.query(query, params);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ error: 'Order can only be cancelled when pending or confirmed' });
    }

    const [items] = await pool.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.id]);
    const restoreTotals = new Map();
    for (const item of items) {
      restoreTotals.set(item.product_id, (restoreTotals.get(item.product_id) || 0) + Number(item.quantity));
    }

    for (const [productId, quantity] of restoreTotals.entries()) {
      await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, productId]);
    }

    await pool.query("UPDATE orders SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ? WHERE id = ?", [cancel_reason || null, order.id]);
    await pool.query('INSERT INTO notifications (type, title, message, target_role, order_id) VALUES (?,?,?,?,?)',
      ['order_cancelled', 'Order Cancelled', `Order ${order.order_number} was cancelled`, 'admin', order.id]);

    res.json({ message: 'Order cancelled' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
