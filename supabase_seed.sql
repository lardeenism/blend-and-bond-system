-- Seed Data for Blend & Bond Cafe Database (PostgreSQL/Supabase)

-- Clear existing data (optional, do not run if you want to keep existing data)
-- TRUNCATE TABLE users, categories, products, product_sizes, settings CASCADE;

-- === USERS ===
INSERT INTO users (id, username, password, full_name, role, is_active) VALUES
(1, 'jireh', '$2b$10$IOJfam9bWV6qEmKwsZ/0rOZkaZ34zzJVgkBOZ1YjF1rB.cC.SPhjW', 'Jireh Admin', 'admin', true),
(2, 'jai', '$2b$10$S50.XJLViAwlc0SmxH7jPuVsWFcjBvbt2Jg2d1RNdG4dqwxwEni22', 'Jai Staff', 'staff', true)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username, 
    password = EXCLUDED.password, 
    full_name = EXCLUDED.full_name, 
    role = EXCLUDED.role;

-- === CATEGORIES ===
INSERT INTO categories (id, name, slug, icon, display_order, is_active) VALUES
(1, 'Coffee', 'coffee', 'coffee', 1, true),
(2, 'Non Coffee', 'non-coffee', 'cup-soda', 2, true),
(3, 'Meals', 'meals', 'utensils', 3, true),
(4, 'Desserts', 'desserts', 'cake', 4, true),
(5, 'Pastries', 'pastries', 'croissant', 5, true),
(6, 'Cookies', 'cookies', 'cookie', 6, true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    slug = EXCLUDED.slug, 
    icon = EXCLUDED.icon, 
    display_order = EXCLUDED.display_order;

-- === SETTINGS ===
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('cafe_name', 'Blend & Bond Cafe', 'string', 'Café display name'),
('operating_hours_open', '08:00', 'string', 'Opening time'),
('operating_hours_close', '21:00', 'string', 'Closing time'),
('delivery_fee', '50.00', 'number', 'Default delivery fee'),
('currency_symbol', '₱', 'string', 'Currency symbol'),
('default_theme', 'light', 'string', 'Default theme'),
('order_prefix', 'BB', 'string', 'Order number prefix'),
('enable_notifications', 'true', 'boolean', 'Enable notifications')
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value, 
    setting_type = EXCLUDED.setting_type, 
    description = EXCLUDED.description;

-- === PRODUCTS ===
INSERT INTO products (id, name, description, base_price, category_id, image_filename, stock, has_sizes, is_available, is_featured, is_best_seller) VALUES
-- Coffee (cat_id = 1)
(1, 'Espresso', 'Rich and bold single shot espresso with golden crema', 89.00, 1, 'Espresso Coffee Recipe.jpg', 10, true, true, true, true),
(2, 'Cappuccino', 'Classic Italian cappuccino with velvety steamed milk foam', 129.00, 1, 'Cappucino.jpg', 10, true, true, true, true),
(3, 'Caffe Americano', 'Smooth espresso diluted with hot water', 109.00, 1, 'Caffe Americano.jpg', 10, true, true, true, false),
(4, 'Caramel Iced Coffee', 'Chilled coffee with sweet caramel drizzle', 139.00, 1, 'Caramel Iced Coffee .jpg', 10, true, true, false, true),
(5, 'Flat White', 'Velvety micro-foam milk over a double shot', 139.00, 1, 'flat white.jpg', 10, true, true, false, false),
(6, 'Mocha', 'Rich espresso blended with chocolate and steamed milk', 149.00, 1, 'mocha.jpg', 10, true, true, true, true),
(7, 'Iced Americano', 'Bold espresso over ice, refreshingly smooth', 119.00, 1, 'Iced Americano.jpg', 10, true, true, false, false),
(8, 'Tiramisu Iced Latte', 'Creamy latte infused with tiramisu flavors', 159.00, 1, 'Tiramisu Iced Latte.jpg', 10, true, true, true, false),
(9, 'Caramel Biscoff Iced Latte', 'Biscoff cookie butter with caramel espresso', 169.00, 1, 'Caramel Biscoff Cookie Butter Iced Latte.jpg', 10, true, true, true, true),
(11, 'Creamy Vanilla Latte', 'Smooth espresso with sweet vanilla cream', 149.00, 1, 'Creamy Vanilla Latte.jpg', 10, true, true, true, false),
(12, 'Iced Caramel Macchiato', 'Layered espresso with vanilla milk and caramel drizzle', 159.00, 1, 'Iced Caramel Macchiato.jpg', 10, true, true, true, true),

-- Non-Coffee (cat_id = 2)
(13, 'Hot Chocolate', 'Luxurious Belgian hot chocolate with whipped cream', 129.00, 2, 'hot choco.jpg', 10, true, true, false, false),
(14, 'Iced Matcha Latte', 'Premium Japanese matcha whisked with cold milk', 149.00, 2, 'Iced Matcha Latte.jpg', 10, true, true, true, true),
(15, 'Chai Tea', 'Aromatic spiced chai with warm steamed milk', 119.00, 2, 'Chai Tea.jpg', 10, true, true, false, false),
(16, 'Fresh Fruit Juice', 'Seasonal fresh-pressed fruit juice blend', 109.00, 2, 'juice.jpg', 10, true, true, false, false),
(17, 'Mango Soda Float', 'Sweet mango soda topped with vanilla ice cream', 129.00, 2, 'mango soda float.jpg', 10, true, true, false, true),
(18, 'Thai Iced Tea', 'Creamy Thai tea served over ice with a fragrant finish', 129.00, 2, 'Thai Iced Tea (Sweet, Spiced & Creamy).jpg', 10, true, true, true, false),

-- Meals (cat_id = 3)
(19, 'Club Sandwich', 'Triple-decker club sandwich with fries', 179.00, 3, 'Classic Homemade Club Sandwich.jpg', 10, false, true, true, true),
(20, 'Spaghetti Aglio e Olio', 'Italian garlic and olive oil pasta', 169.00, 3, 'Spaghetti Aglio e Olio _ Provecho.jpg', 10, false, true, false, false),
(21, 'Avocado Toast', 'Sourdough with smashed avocado and poached egg', 159.00, 3, 'Avocado Toast Brunch Goals.jpg', 10, false, true, true, false),
(22, 'Garlic Bread', 'Toasted garlic bread with herb butter and cheese', 89.00, 3, 'garlic.jpg', 10, false, true, false, true),
(23, 'Smoked Salmon Salad', 'Fresh smoked salmon with caper dressing', 199.00, 3, 'Smoked Salmon Salad in Creamy Caper Chive Dressing.jpg', 10, false, true, false, false),
(24, 'Fruit Salad', 'Mixed tropical fruits with yogurt', 149.00, 3, 'Fruit Salad.jpg', 10, false, true, false, false),
(25, 'French Fries', 'Golden crispy fries served hot and lightly salted', 99.00, 3, 'French Fries.jpg', 10, false, true, false, true),
(26, 'Pancakes', 'Fluffy pancakes with syrup and butter', 129.00, 3, 'Pancakes.jpg', 10, false, true, true, false),

-- Desserts (cat_id = 4)
(27, 'Chocolate Cake', 'Decadent triple-layer chocolate cake', 199.00, 4, 'Chocolate Cake.jpg', 10, false, true, true, true),
(28, 'Cheesecake', 'Creamy New York-style cheesecake', 189.00, 4, '𝐜𝐡𝐞𝐞𝐬𝐞𝐜𝐚𝐤𝐞.jpg', 10, false, true, true, true),
(29, 'Red Velvet Cake', 'Velvety red cake with cream cheese frosting', 209.00, 4, 'Red velvet.jpg', 10, false, true, true, false),
(30, 'Black Forest Cake', 'Classic Black Forest with cherries and cream', 219.00, 4, 'Black Forest.jpg', 10, false, true, false, true),
(31, 'Mango Cake', 'Light sponge cake with fresh mango layers', 199.00, 4, 'Mango cake.jpg', 10, false, true, false, false),
(32, 'Japanese Cake Roll', 'Fluffy Japanese-style cake roll', 169.00, 4, 'Japanese Cake Roll.jpg', 10, false, true, true, false),
(33, 'Vanilla Cake', 'Classic Madagascar vanilla bean cake', 179.00, 4, 'vanilla cake.jpg', 10, false, true, false, false),
(34, 'Leche Flan', 'Traditional Filipino caramel custard', 129.00, 4, 'Leche Flan.jpg', 10, false, true, false, true),
(35, 'Chocolate Brownies', 'Fudgy chocolate brownies with walnuts', 99.00, 4, 'Chocolate brownies.jpg', 10, false, true, false, true),
(36, 'Halo Halo', 'Classic Filipino shaved ice dessert', 139.00, 4, 'Halo Halo.jpg', 10, false, true, false, false),
(37, 'Tiramisu', 'Classic coffee-soaked dessert with mascarpone cream', 189.00, 4, 'Tiramisu.jpg', 10, false, true, true, true),

-- Pastries (cat_id = 5)
(10, 'Spanish Bread', 'Soft sweet bread with a lightly glazed finish', 79.00, 5, 'Spanish.jpg', 10, false, true, false, false),
(38, 'Butter Croissant', 'Freshly baked buttery croissants with crispy layers', 79.00, 5, 'Freshly Baked Buttery Croissants With Crispy Layers.jpg', 10, false, true, true, true),
(39, 'Waffles', 'Golden waffles served warm with syrup and butter', 129.00, 5, 'Waffles.jpg', 10, false, true, true, false),
(40, 'Chocolate Donuts', 'Rich chocolate-glazed donuts', 69.00, 5, 'Chocolate Donuts.jpg', 10, false, true, false, false),
(41, 'Glazed Donuts', 'Classic sugar-glazed ring donuts', 59.00, 5, 'Glazed Donuts.jpg', 10, false, true, false, true),
(42, 'Bavarian Donuts', 'Cream-filled Bavarian donuts', 79.00, 5, 'Bavarian  Donuts.jpg', 10, false, true, false, false),
(43, 'Sprinkle Donuts', 'Colorful sprinkle-topped donuts', 69.00, 5, 'Sprinkle Donuts.jpg', 10, false, true, false, false),
(44, 'Strawberry Donuts', 'Fresh strawberry-glazed donuts', 79.00, 5, 'Strawberry Donuts.jpg', 10, false, true, false, false),
(45, 'Pandesal', 'Warm Filipino bread rolls, soft and sweet', 29.00, 5, 'Pandesal.jpg', 10, false, true, false, true),
(46, 'Whole Wheat Bread', 'Hearty whole wheat artisan bread', 89.00, 5, 'Whole Wheat.jpg', 10, false, true, false, false),
(47, 'Biscotti', 'Crunchy Italian almond biscotti', 89.00, 5, 'Biscotti.jpg', 10, false, true, false, false),
(48, 'Oatmeal Almond Biscotti', 'Wholesome oatmeal biscotti with almonds', 99.00, 5, 'Oatmeal Almond Biscotti.jpg', 10, false, true, false, false),
(49, 'Cheese Bread', 'Warm cheese-filled bread rolls', 79.00, 5, 'cheese.jpg', 10, false, true, false, false),
(50, 'Banana Bread', 'Soft banana bread with a moist, sweet crumb', 169.00, 5, 'Banana Cake.jpg', 10, false, true, true, false),
(51, 'Ham and Cheese Croissant', 'Buttery croissant filled with ham and melted cheese', 149.00, 5, 'Ham and Cheese Croissant.jpg', 10, false, true, true, false),

-- Cookies (cat_id = 6)
(52, 'Chocolate Chip Cookies', 'Classic chewy chocolate chip cookies', 69.00, 6, 'Chocolate Chip Cookies.jpg', 10, false, true, false, false),
(53, 'Butter Cookies', 'Danish-style butter cookies', 79.00, 6, 'Butter Cookies.jpg', 10, false, true, false, false),
(54, 'Sugar Cookies', 'Amish-style sugar cookies with vanilla glaze', 69.00, 6, 'Amish Sugar Cookies.jpg', 10, false, true, false, false),
(55, 'Blueberry White Chocolate Cookies', 'Soft cookies with blueberries', 89.00, 6, 'Blueberry White Chocolate Chip Cookie.jpg', 10, false, true, false, false),
(56, 'Oatmeal Raisin Cookies', 'Chewy oatmeal cookies with raisins', 69.00, 6, 'Oatmeal Raisin Cookies - AngelaLynne.jpg', 10, false, true, false, false),
(57, 'Macadamia Cookies', 'White chocolate macadamia nut cookies', 99.00, 6, 'macadamia.jpg', 10, false, true, false, false)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description, 
    base_price = EXCLUDED.base_price, 
    category_id = EXCLUDED.category_id, 
    image_filename = EXCLUDED.image_filename, 
    stock = EXCLUDED.stock, 
    has_sizes = EXCLUDED.has_sizes, 
    is_available = EXCLUDED.is_available, 
    is_featured = EXCLUDED.is_featured, 
    is_best_seller = EXCLUDED.is_best_seller;

-- === PRODUCT SIZES ===
INSERT INTO product_sizes (product_id, size_label, volume_ml, price) VALUES
-- Espresso (1)
(1, 'Small', 250, 89.00), (1, 'Medium', 350, 109.00), (1, 'Large', 500, 129.00),
-- Cappuccino (2)
(2, 'Small', 250, 129.00), (2, 'Medium', 350, 149.00), (2, 'Large', 500, 169.00),
-- Caffe Americano (3)
(3, 'Small', 250, 109.00), (3, 'Medium', 350, 129.00), (3, 'Large', 500, 149.00),
-- Caramel Iced Coffee (4)
(4, 'Small', 250, 139.00), (4, 'Medium', 350, 159.00), (4, 'Large', 500, 179.00),
-- Flat White (5)
(5, 'Small', 250, 139.00), (5, 'Medium', 350, 159.00), (5, 'Large', 500, 179.00),
-- Mocha (6)
(6, 'Small', 250, 149.00), (6, 'Medium', 350, 169.00), (6, 'Large', 500, 189.00),
-- Iced Americano (7)
(7, 'Small', 250, 119.00), (7, 'Medium', 350, 139.00), (7, 'Large', 500, 159.00),
-- Tiramisu Iced Latte (8)
(8, 'Small', 250, 159.00), (8, 'Medium', 350, 179.00), (8, 'Large', 500, 199.00),
-- Caramel Biscoff Iced Latte (9)
(9, 'Small', 250, 169.00), (9, 'Medium', 350, 189.00), (9, 'Large', 500, 209.00),
-- Creamy Vanilla Latte (11)
(11, 'Small', 250, 149.00), (11, 'Medium', 350, 169.00), (11, 'Large', 500, 189.00),
-- Iced Caramel Macchiato (12)
(12, 'Small', 250, 159.00), (12, 'Medium', 350, 179.00), (12, 'Large', 500, 199.00),
-- Hot Chocolate (13)
(13, 'Small', 250, 129.00), (13, 'Medium', 350, 149.00), (13, 'Large', 500, 169.00),
-- Iced Matcha Latte (14)
(14, 'Small', 250, 149.00), (14, 'Medium', 350, 169.00), (14, 'Large', 500, 189.00),
-- Chai Tea (15)
(15, 'Small', 250, 119.00), (15, 'Medium', 350, 139.00), (15, 'Large', 500, 159.00),
-- Fresh Fruit Juice (16)
(16, 'Small', 250, 109.00), (16, 'Medium', 350, 129.00), (16, 'Large', 500, 149.00),
-- Mango Soda Float (17)
(17, 'Small', 250, 129.00), (17, 'Medium', 350, 149.00), (17, 'Large', 500, 169.00),
-- Thai Iced Tea (18)
(18, 'Small', 250, 129.00), (18, 'Medium', 350, 149.00), (18, 'Large', 500, 169.00)
ON CONFLICT (product_id, size_label) DO UPDATE SET 
    volume_ml = EXCLUDED.volume_ml, 
    price = EXCLUDED.price;

-- === RESET AUTOCREMENT SEQUENCES ===
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 1), true);
SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1), true);
SELECT setval('product_sizes_id_seq', COALESCE((SELECT MAX(id) FROM product_sizes), 1), true);
