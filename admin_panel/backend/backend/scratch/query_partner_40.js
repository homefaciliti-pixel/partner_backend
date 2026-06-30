const db = require('../db');

async function run() {
  try {
    const [rows] = await db.query('SELECT id, name, mobile, isApproved, isPaid FROM partners WHERE id = 40');
    console.log('Partner 40:', JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
