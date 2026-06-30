const db = require('../db');

async function run() {
  try {
    console.log('Querying database for booking ID 129...');
    
    // Check orders_v2
    const [rowsV2] = await db.query('SELECT * FROM orders_v2 WHERE id = 129');
    console.log('orders_v2 rows:', rowsV2);

    // Check orders
    const [rowsAdmin] = await db.query('SELECT * FROM orders WHERE id = 129');
    console.log('orders rows:', rowsAdmin);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
