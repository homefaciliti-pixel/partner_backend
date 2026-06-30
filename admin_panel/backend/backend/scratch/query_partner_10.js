const db = require('../db');

async function run() {
  try {
    const [rows] = await db.query('SELECT * FROM partners WHERE id = 10');
    console.log('Partner 10:', rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
