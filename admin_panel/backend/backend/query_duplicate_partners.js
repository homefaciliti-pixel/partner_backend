const db = require('e:/hf_partner/admin_panel/backend/backend/db');

async function run() {
  try {
    const [rows] = await db.query("SELECT id, name, mobile, city, locality, isPaid, isApproved FROM partners WHERE name LIKE '%Active%' OR mobile = '7250642635'");
    console.log("Partners matching criteria:", rows);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
