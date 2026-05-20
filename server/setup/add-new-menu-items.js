import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blend_and_bond_db',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  const products = [
    { name: 'Creamy Vanilla Latte', description: 'Smooth espresso with sweet vanilla cream', base_price: 149, category_id: 1, image_filename: 'Creamy Vanilla Latte.jpg', has_sizes: true, is_featured: true, is_best_seller: false },
    { name: 'Iced Caramel Macchiato', description: 'Layered espresso with vanilla milk and caramel drizzle', base_price: 159, category_id: 1, image_filename: 'Iced Caramel Macchiato.jpg', has_sizes: true, is_featured: true, is_best_seller: true },
    { name: 'Thai Iced Tea', description: 'Creamy Thai tea served over ice with a fragrant finish', base_price: 129, category_id: 2, image_filename: 'Thai Iced Tea (Sweet, Spiced & Creamy).jpg', has_sizes: true, is_featured: true, is_best_seller: false },
    { name: 'French Fries', description: 'Golden crispy fries served hot and lightly salted', base_price: 99, category_id: 3, image_filename: 'French Fries.jpg', has_sizes: false, is_featured: false, is_best_seller: true },
    { name: 'Pancakes', description: 'Fluffy pancakes with syrup and butter', base_price: 129, category_id: 3, image_filename: 'Pancakes.jpg', has_sizes: false, is_featured: true, is_best_seller: false },
    { name: 'Banana Bread', description: 'Soft banana bread with a moist, sweet crumb', base_price: 169, category_id: 5, image_filename: 'Banana Cake.jpg', has_sizes: false, is_featured: true, is_best_seller: false },
    { name: 'Tiramisu', description: 'Classic coffee-soaked dessert with mascarpone cream', base_price: 189, category_id: 4, image_filename: 'Tiramisu.jpg', has_sizes: false, is_featured: true, is_best_seller: true },
    { name: 'Waffles', description: 'Golden waffles served warm with syrup and butter', base_price: 129, category_id: 5, image_filename: 'Waffles.jpg', has_sizes: false, is_featured: true, is_best_seller: false },
    { name: 'Ham and Cheese Croissant', description: 'Buttery croissant filled with ham and melted cheese', base_price: 149, category_id: 5, image_filename: 'Ham and Cheese Croissant.jpg', has_sizes: false, is_featured: true, is_best_seller: false },
  ];

  const drinkSizes = [
    { size_label: 'Small', volume_ml: 250 },
    { size_label: 'Medium', volume_ml: 350 },
    { size_label: 'Large', volume_ml: 500 },
  ];

  const sizePriceMap = {
    'Creamy Vanilla Latte': [149, 169, 189],
    'Iced Caramel Macchiato': [159, 179, 199],
    'Thai Iced Tea': [129, 149, 169],
  };

  for (const product of products) {
    const [existing] = await connection.query('SELECT id FROM products WHERE name = ? LIMIT 1', [product.name]);
    if (existing.length > 0) continue;

    const [result] = await connection.query(
      'INSERT INTO products (name, description, base_price, category_id, image_filename, stock, has_sizes, is_available, is_featured, is_best_seller) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [product.name, product.description, product.base_price, product.category_id, product.image_filename, 10, product.has_sizes, true, product.is_featured, product.is_best_seller]
    );

    if (product.has_sizes) {
      const prices = sizePriceMap[product.name] || [product.base_price, product.base_price + 20, product.base_price + 40];
      for (let i = 0; i < drinkSizes.length; i += 1) {
        const size = drinkSizes[i];
        await connection.query(
          'INSERT INTO product_sizes (product_id, size_label, volume_ml, price) VALUES (?,?,?,?)',
          [result.insertId, size.size_label, size.volume_ml, prices[i]]
        );
      }
    }
  }

  await connection.end();
  console.log('✅ New menu items added to the database');
}

run().catch(err => {
  console.error('❌ Failed to add menu items:', err);
  process.exit(1);
});