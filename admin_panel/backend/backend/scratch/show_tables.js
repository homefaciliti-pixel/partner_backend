const db = require('../db');

async function run() {
  try {
    const [rows] = await db.query('SHOW TABLES');
    console.log('Tables:', rows);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
