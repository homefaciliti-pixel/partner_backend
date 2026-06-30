const db = require('../db');

async function run() {
  try {
    const [rows] = await db.query('SELECT * FROM node_banners');
    console.log('Banners:', rows);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
