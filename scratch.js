const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    let query = 'SELECT p.*, c.name as category_name, c.icon as category_icon, c.slug as category_slug FROM products p JOIN categories c ON p.category_id = c.id WHERE 1=1 ORDER BY c.display_order, p.name';
    const [products] = await pool.query(query, []);

    for (const p of products) {
      if (p.has_sizes) {
        const [sizes] = await pool.query('SELECT * FROM product_sizes WHERE product_id = ? ORDER BY FIELD(size_label, "Small", "Medium", "Large")', [p.id]);
        p.sizes = sizes;
      } else {
        p.sizes = [];
      }
    }

    console.log('Success');
    pool.end();
  } catch (err) {
    console.error('ERROR:', err);
  }
}

run();
