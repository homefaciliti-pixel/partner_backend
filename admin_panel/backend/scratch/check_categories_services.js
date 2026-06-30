const pool = require('../db');

async function check() {
  try {
    const [categories] = await pool.query('SELECT id, title, parent FROM categories');
    console.log('--- CATEGORIES ---');
    console.table(categories);

    const [services] = await pool.query('SELECT id, title, category_id FROM services LIMIT 50');
    console.log('\n--- SERVICES (First 50) ---');
    console.table(services);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
