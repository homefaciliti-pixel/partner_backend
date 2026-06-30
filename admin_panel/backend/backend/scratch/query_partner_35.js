const db = require('../db');

async function run() {
  try {
    const [rows] = await db.query('SELECT id, name, mobile, isApproved, isPaid FROM partners WHERE mobile = "7250642635"');
    console.log('Partner 7250642635:', rows);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
