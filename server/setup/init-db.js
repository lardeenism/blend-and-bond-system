import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  const dbName = process.env.DB_NAME || 'blend_and_bond_db';

  console.log('☕ Initializing Blend & Bond Cafe Database...\n');

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ Database "${dbName}" ready`);
  } catch (err) {
    console.error('Failed to create/use database:', err);
    process.exit(1);
  }

  // Disable foreign key checks to allow table drops
  await connection.query('SET FOREIGN_KEY_CHECKS=0');

  // Drop all tables with DISCARD TABLESPACE handling
  const drops = ['activity_logs','notifications','reviews','order_items','orders','product_sizes','products','categories','settings','users'];
  for (const t of drops) {
    try {
      // Try to discard tablespace if it exists
      await connection.query(`ALTER TABLE \`${t}\` DISCARD TABLESPACE`).catch(() => {});
      await connection.query(`DROP TABLE IF EXISTS \`${t}\``);
    } catch (err) {
      // If table doesn't exist or other error, just try to drop
      try {
        await connection.query(`DROP TABLE IF EXISTS \`${t}\``);
      } catch (e) {
        console.log(`Note: Could not drop ${t}`);
      }
    }
  }

  // Re-enable foreign key checks
  await connection.query('SET FOREIGN_KEY_CHECKS=1');
  console.log('✅ Old tables dropped');

  // === USERS ===
  try {
    await connection.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(11),
        role ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
        avatar VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role (role),
        INDEX idx_username (username)
      ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {
    if (err.code === 'ER_TABLESPACE_EXISTS') {
      // If tablespace exists, try with a simpler approach
      console.log('Handling tablespace issue, using temporary workaround...');
      await connection.query('SET FOREIGN_KEY_CHECKS=0');
      try {
        await connection.query(`DROP TABLE IF EXISTS users`);
      } catch (e) {}
      // Recreate with explicit tablespace handling
      await connection.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          email VARCHAR(100),
          phone VARCHAR(11),
          role ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
          avatar VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          last_login TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_role (role),
          INDEX idx_username (username)
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await connection.query('SET FOREIGN_KEY_CHECKS=1');
    } else {
      throw err;
    }
  }

  // === CATEGORIES ===
  await connection.query(`
    CREATE TABLE categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      slug VARCHAR(50) UNIQUE NOT NULL,
      icon VARCHAR(50),
      display_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // === PRODUCTS ===
  await connection.query(`
    CREATE TABLE products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      base_price DECIMAL(10,2) NOT NULL,
      category_id INT NOT NULL,
      image_filename VARCHAR(255),
      stock INT NOT NULL DEFAULT 10,
      has_sizes BOOLEAN DEFAULT FALSE,
      is_available BOOLEAN DEFAULT TRUE,
      is_featured BOOLEAN DEFAULT FALSE,
      is_best_seller BOOLEAN DEFAULT FALSE,
      avg_rating DECIMAL(3,2) DEFAULT 0.00,
      total_reviews INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      INDEX idx_category (category_id),
      INDEX idx_available (is_available)
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // === PRODUCT SIZES ===
  await connection.query(`
    CREATE TABLE product_sizes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      size_label ENUM('Small','Medium','Large') NOT NULL,
      volume_ml INT DEFAULT NULL,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE KEY unique_product_size (product_id, size_label)
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // === ORDERS ===
  await connection.query(`
    CREATE TABLE orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(20) UNIQUE NOT NULL,
      customer_name VARCHAR(100) NOT NULL,
      phone VARCHAR(11) NOT NULL,
      email VARCHAR(100),
      order_type ENUM('dine-in','take-out','delivery') NOT NULL,
      table_number VARCHAR(10),
      delivery_address TEXT,
      province VARCHAR(100),
      municipality VARCHAR(100),
      barangay VARCHAR(100),
      order_notes TEXT,
      payment_method ENUM('cash','cod') DEFAULT 'cash',
      scheduled_date DATE,
      scheduled_time TIME,
      status ENUM('pending','confirmed','preparing','ready','served','out_for_delivery','delivered','completed','cancelled') DEFAULT 'pending',
      subtotal DECIMAL(10,2) NOT NULL,
      delivery_fee DECIMAL(10,2) DEFAULT 0.00,
      total DECIMAL(10,2) NOT NULL,
      cancelled_at TIMESTAMP NULL,
      cancel_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_order_number (order_number),
      INDEX idx_created (created_at)
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // === ORDER ITEMS ===
  await connection.query(`
    CREATE TABLE order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(100) NOT NULL,
      product_image VARCHAR(255),
      size_label VARCHAR(10) DEFAULT NULL,
      volume_ml INT DEFAULT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_order (order_id)
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // === REVIEWS ===
  await connection.query(`
    CREATE TABLE reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      customer_name VARCHAR(100) NOT NULL,
      is_flagged BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE KEY unique_review (order_id, product_id),
      INDEX idx_product (product_id),
      INDEX idx_rating (rating)
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // === NOTIFICATIONS ===
  await connection.query(`
    CREATE TABLE notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('order_placed','order_updated','order_cancelled','review_added','staff_added','system_alert') NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      target_role ENUM('admin','staff','customer'),
      order_id INT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
      INDEX idx_role (target_role),
      INDEX idx_read (is_read)
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // === SETTINGS ===
  await connection.query(`
    CREATE TABLE settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(50) UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type ENUM('string','number','boolean','json') DEFAULT 'string',
      description VARCHAR(200),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // === ACTIVITY LOGS ===
  await connection.query(`
    CREATE TABLE activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user (user_id),
      INDEX idx_created (created_at)
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ All tables created');

  // ===== SEED DATA =====
  console.log('\n📦 Seeding data...\n');

  // Users
  const adminPass = await bcrypt.hash('faith', 10);
  const staffPass = await bcrypt.hash('212121', 10);
  await connection.query(`
    INSERT INTO users (username, password, full_name, role) VALUES
    ('jireh', ?, 'Jireh Admin', 'admin'),
    ('jai', ?, 'Jai Staff', 'staff')
  `, [adminPass, staffPass]);
  console.log('✅ Users seeded');

  // Categories
  await connection.query(`
    INSERT INTO categories (name, slug, icon, display_order) VALUES
    ('Coffee', 'coffee', 'coffee', 1),
    ('Non Coffee', 'non-coffee', 'cup-soda', 2),
    ('Meals', 'meals', 'utensils', 3),
    ('Desserts', 'desserts', 'cake', 4),
    ('Pastries', 'pastries', 'croissant', 5),
    ('Cookies', 'cookies', 'cookie', 6)
  `);
  console.log('✅ Categories seeded');

  // Settings
  await connection.query(`
    INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
    ('cafe_name', 'Blend & Bond Cafe', 'string', 'Café display name'),
    ('operating_hours_open', '08:00', 'string', 'Opening time'),
    ('operating_hours_close', '21:00', 'string', 'Closing time'),
    ('delivery_fee', '50.00', 'number', 'Default delivery fee'),
    ('currency_symbol', '₱', 'string', 'Currency symbol'),
    ('default_theme', 'light', 'string', 'Default theme'),
    ('order_prefix', 'BB', 'string', 'Order number prefix'),
    ('enable_notifications', 'true', 'boolean', 'Enable notifications')
  `);
  console.log('✅ Settings seeded');

  // Products with sizes
  // Helper to insert a product with sizes
  async function addProduct(name, desc, basePrice, catId, img, hasSizes, featured, bestSeller, sizes) {
    const [r] = await connection.query(
      'INSERT INTO products (name, description, base_price, category_id, image_filename, has_sizes, is_featured, is_best_seller) VALUES (?,?,?,?,?,?,?,?)',
      [name, desc, basePrice, catId, img, hasSizes, featured, bestSeller]
    );
    if (hasSizes && sizes) {
      for (const s of sizes) {
        await connection.query(
          'INSERT INTO product_sizes (product_id, size_label, volume_ml, price) VALUES (?,?,?,?)',
          [r.insertId, s.label, s.ml || null, s.price]
        );
      }
    }
    return r.insertId;
  }

  const drinkSizes = (sm, md, lg) => [
    { label: 'Small', ml: 250, price: sm },
    { label: 'Medium', ml: 350, price: md },
    { label: 'Large', ml: 500, price: lg }
  ];

  // Coffee (cat 1)
  await addProduct('Espresso', 'Rich and bold single shot espresso with golden crema', 89, 1, 'Espresso Coffee Recipe.jpg', true, true, true, drinkSizes(89, 109, 129));
  await addProduct('Cappuccino', 'Classic Italian cappuccino with velvety steamed milk foam', 129, 1, 'Cappucino.jpg', true, true, true, drinkSizes(129, 149, 169));
  await addProduct('Caffe Americano', 'Smooth espresso diluted with hot water', 109, 1, 'Caffe Americano.jpg', true, true, false, drinkSizes(109, 129, 149));
  await addProduct('Caramel Iced Coffee', 'Chilled coffee with sweet caramel drizzle', 139, 1, 'Caramel Iced Coffee .jpg', true, false, true, drinkSizes(139, 159, 179));
  await addProduct('Flat White', 'Velvety micro-foam milk over a double shot', 139, 1, 'flat white.jpg', true, false, false, drinkSizes(139, 159, 179));
  await addProduct('Mocha', 'Rich espresso blended with chocolate and steamed milk', 149, 1, 'mocha.jpg', true, true, true, drinkSizes(149, 169, 189));
  await addProduct('Iced Americano', 'Bold espresso over ice, refreshingly smooth', 119, 1, 'Iced Americano.jpg', true, false, false, drinkSizes(119, 139, 159));
  await addProduct('Tiramisu Iced Latte', 'Creamy latte infused with tiramisu flavors', 159, 1, 'Tiramisu Iced Latte.jpg', true, true, false, drinkSizes(159, 179, 199));
  await addProduct('Caramel Biscoff Iced Latte', 'Biscoff cookie butter with caramel espresso', 169, 1, 'Caramel Biscoff Cookie Butter Iced Latte.jpg', true, true, true, drinkSizes(169, 189, 209));
  await addProduct('Spanish Bread', 'Soft sweet bread with a lightly glazed finish', 79, 5, 'Spanish.jpg', false, false, false, null);
  await addProduct('Creamy Vanilla Latte', 'Smooth espresso with sweet vanilla cream', 149, 1, 'Creamy Vanilla Latte.jpg', true, true, false, drinkSizes(149, 169, 189));
  await addProduct('Iced Caramel Macchiato', 'Layered espresso with vanilla milk and caramel drizzle', 159, 1, 'Iced Caramel Macchiato.jpg', true, true, true, drinkSizes(159, 179, 199));

  // Non Coffee (cat 2)
  await addProduct('Hot Chocolate', 'Luxurious Belgian hot chocolate with whipped cream', 129, 2, 'hot choco.jpg', true, false, false, drinkSizes(129, 149, 169));
  await addProduct('Iced Matcha Latte', 'Premium Japanese matcha whisked with cold milk', 149, 2, 'Iced Matcha Latte.jpg', true, true, true, drinkSizes(149, 169, 189));
  await addProduct('Chai Tea', 'Aromatic spiced chai with warm steamed milk', 119, 2, 'Chai Tea.jpg', true, false, false, drinkSizes(119, 139, 159));
  await addProduct('Fresh Fruit Juice', 'Seasonal fresh-pressed fruit juice blend', 109, 2, 'juice.jpg', true, false, false, drinkSizes(109, 129, 149));
  await addProduct('Mango Soda Float', 'Sweet mango soda topped with vanilla ice cream', 129, 2, 'mango soda float.jpg', true, false, true, drinkSizes(129, 149, 169));
  await addProduct('Thai Iced Tea', 'Creamy Thai tea served over ice with a fragrant finish', 129, 2, 'Thai Iced Tea (Sweet, Spiced & Creamy).jpg', true, true, false, drinkSizes(129, 149, 169));

  // Meals (cat 3)
  await addProduct('Club Sandwich', 'Triple-decker club sandwich with fries', 179, 3, 'Classic Homemade Club Sandwich.jpg', false, true, true, null);
  await addProduct('Spaghetti Aglio e Olio', 'Italian garlic and olive oil pasta', 169, 3, 'Spaghetti Aglio e Olio _ Provecho.jpg', false, false, false, null);
  await addProduct('Avocado Toast', 'Sourdough with smashed avocado and poached egg', 159, 3, 'Avocado Toast Brunch Goals.jpg', false, true, false, null);
  await addProduct('Garlic Bread', 'Toasted garlic bread with herb butter and cheese', 89, 3, 'garlic.jpg', false, false, true, null);
  await addProduct('Smoked Salmon Salad', 'Fresh smoked salmon with caper dressing', 199, 3, 'Smoked Salmon Salad in Creamy Caper Chive Dressing.jpg', false, false, false, null);
  await addProduct('Fruit Salad', 'Mixed tropical fruits with yogurt', 149, 3, 'Fruit Salad.jpg', false, false, false, null);
  await addProduct('French Fries', 'Golden crispy fries served hot and lightly salted', 99, 3, 'French Fries.jpg', false, false, true, null);
  await addProduct('Pancakes', 'Fluffy pancakes with syrup and butter', 129, 3, 'Pancakes.jpg', false, true, false, null);

  // Desserts (cat 4)
  await addProduct('Chocolate Cake', 'Decadent triple-layer chocolate cake', 199, 4, 'Chocolate Cake.jpg', false, true, true, null);
  await addProduct('Cheesecake', 'Creamy New York-style cheesecake', 189, 4, '𝐜𝐡𝐞𝐞𝐬𝐞𝐜𝐚𝐤𝐞.jpg', false, true, true, null);
  await addProduct('Red Velvet Cake', 'Velvety red cake with cream cheese frosting', 209, 4, 'Red velvet.jpg', false, true, false, null);
  await addProduct('Black Forest Cake', 'Classic Black Forest with cherries and cream', 219, 4, 'Black Forest.jpg', false, false, true, null);
  await addProduct('Mango Cake', 'Light sponge cake with fresh mango layers', 199, 4, 'Mango cake.jpg', false, false, false, null);
  await addProduct('Japanese Cake Roll', 'Fluffy Japanese-style cake roll', 169, 4, 'Japanese Cake Roll.jpg', false, true, false, null);
  await addProduct('Vanilla Cake', 'Classic Madagascar vanilla bean cake', 179, 4, 'vanilla cake.jpg', false, false, false, null);
  await addProduct('Leche Flan', 'Traditional Filipino caramel custard', 129, 4, 'Leche Flan.jpg', false, false, true, null);
  await addProduct('Chocolate Brownies', 'Fudgy chocolate brownies with walnuts', 99, 4, 'Chocolate brownies.jpg', false, false, true, null);
  await addProduct('Halo Halo', 'Classic Filipino shaved ice dessert', 139, 4, 'Halo Halo.jpg', false, false, false, null);
  await addProduct('Tiramisu', 'Classic coffee-soaked dessert with mascarpone cream', 189, 4, 'Tiramisu.jpg', false, true, true, null);

  // Pastries (cat 5)
  await addProduct('Butter Croissant', 'Freshly baked buttery croissants with crispy layers', 79, 5, 'Freshly Baked Buttery Croissants With Crispy Layers.jpg', false, true, true, null);
  await addProduct('Waffles', 'Golden waffles served warm with syrup and butter', 129, 5, 'Waffles.jpg', false, true, false, null);
  await addProduct('Chocolate Donuts', 'Rich chocolate-glazed donuts', 69, 5, 'Chocolate Donuts.jpg', false, false, false, null);
  await addProduct('Glazed Donuts', 'Classic sugar-glazed ring donuts', 59, 5, 'Glazed Donuts.jpg', false, false, true, null);
  await addProduct('Bavarian Donuts', 'Cream-filled Bavarian donuts', 79, 5, 'Bavarian  Donuts.jpg', false, false, false, null);
  await addProduct('Sprinkle Donuts', 'Colorful sprinkle-topped donuts', 69, 5, 'Sprinkle Donuts.jpg', false, false, false, null);
  await addProduct('Strawberry Donuts', 'Fresh strawberry-glazed donuts', 79, 5, 'Strawberry Donuts.jpg', false, false, false, null);
  await addProduct('Pandesal', 'Warm Filipino bread rolls, soft and sweet', 29, 5, 'Pandesal.jpg', false, false, true, null);
  await addProduct('Whole Wheat Bread', 'Hearty whole wheat artisan bread', 89, 5, 'Whole Wheat.jpg', false, false, false, null);
  await addProduct('Biscotti', 'Crunchy Italian almond biscotti', 89, 5, 'Biscotti.jpg', false, false, false, null);
  await addProduct('Oatmeal Almond Biscotti', 'Wholesome oatmeal biscotti with almonds', 99, 5, 'Oatmeal Almond Biscotti.jpg', false, false, false, null);
  await addProduct('Cheese Bread', 'Warm cheese-filled bread rolls', 79, 5, 'cheese.jpg', false, false, false, null);
  await addProduct('Banana Bread', 'Soft banana bread with a moist, sweet crumb', 169, 5, 'Banana Cake.jpg', false, true, false, null);
  await addProduct('Ham and Cheese Croissant', 'Buttery croissant filled with ham and melted cheese', 149, 5, 'Ham and Cheese Croissant.jpg', false, true, false, null);

  // Cookies (cat 6)
  await addProduct('Chocolate Chip Cookies', 'Classic chewy chocolate chip cookies', 69, 6, 'Chocolate Chip Cookies.jpg', false, false, false, null);
  await addProduct('Butter Cookies', 'Danish-style butter cookies', 79, 6, 'Butter Cookies.jpg', false, false, false, null);
  await addProduct('Sugar Cookies', 'Amish-style sugar cookies with vanilla glaze', 69, 6, 'Amish Sugar Cookies.jpg', false, false, false, null);
  await addProduct('Blueberry White Chocolate Cookies', 'Soft cookies with blueberries', 89, 6, 'Blueberry White Chocolate Chip Cookie.jpg', false, false, false, null);
  await addProduct('Oatmeal Raisin Cookies', 'Chewy oatmeal cookies with raisins', 69, 6, 'Oatmeal Raisin Cookies - AngelaLynne.jpg', false, false, false, null);
  await addProduct('Macadamia Cookies', 'White chocolate macadamia nut cookies', 99, 6, 'macadamia.jpg', false, false, false, null);

  // Summary
  const [uc] = await connection.query('SELECT COUNT(*) as c FROM users');
  const [cc] = await connection.query('SELECT COUNT(*) as c FROM categories');
  const [pc] = await connection.query('SELECT COUNT(*) as c FROM products');
  const [sc] = await connection.query('SELECT COUNT(*) as c FROM product_sizes');

  console.log('\n🎉 Database initialization complete!');
  console.log(`   Users: ${uc[0].c}`);
  console.log(`   Categories: ${cc[0].c}`);
  console.log(`   Products: ${pc[0].c}`);
  console.log(`   Product Sizes: ${sc[0].c}`);
  console.log('\n   Admin: jireh / faith');
  console.log('   Staff: jai / 212121\n');

  await connection.end();
}

initDatabase().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});

