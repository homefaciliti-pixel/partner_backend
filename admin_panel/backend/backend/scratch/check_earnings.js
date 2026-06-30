const db = require('../db');

async function run() {
  try {
    const [rows] = await db.query('SELECT * FROM subscription_earnings WHERE partnerName = "Hira Yadav"');
    console.log('Earnings for Hira Yadav:', JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
