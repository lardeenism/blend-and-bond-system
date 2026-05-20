import db from '../server/config/db.js';

async function test() {
  try {
    await db.query("INSERT INTO categories (name, slug, is_active) VALUES ('test', 'test', 1)");
    console.log('Works!');
    await db.query("DELETE FROM categories WHERE name = 'test'");
    process.exit(0);
  } catch (err) {
    console.log('Fails:', err.message);
    process.exit(1);
  }
}
test();
