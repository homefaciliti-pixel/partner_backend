const db = require('../db');

async function run() {
  try {
    const [rows] = await db.query('SELECT * FROM orders WHERE vendorName = "Swayam "');
    console.log('Orders for Swayam:', rows);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
