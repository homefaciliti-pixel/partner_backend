const pool = require('../db');

async function run() {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, mobile, image, aadharFront, aadharBack, panImage, policeVerificationImage FROM partners ORDER BY id DESC LIMIT 5'
    );
    console.log('Latest 5 Partners and their images:');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
