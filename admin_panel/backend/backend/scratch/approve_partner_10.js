const db = require('../db');

async function run() {
  try {
    const [result] = await db.query('UPDATE partners SET isApproved = 1, status = 1 WHERE id = 10');
    console.log('Approve result:', result);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
