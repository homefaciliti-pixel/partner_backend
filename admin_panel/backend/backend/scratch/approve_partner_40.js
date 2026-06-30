const db = require('../db');

async function run() {
  try {
    const [result] = await db.query('UPDATE partners SET isPaid = 1, isApproved = 1 WHERE id = 40');
    console.log('Update result:', result);
    
    const [rows] = await db.query('SELECT id, name, mobile, isApproved, isPaid FROM partners WHERE id = 40');
    console.log('Partner 40 updated status:', JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
