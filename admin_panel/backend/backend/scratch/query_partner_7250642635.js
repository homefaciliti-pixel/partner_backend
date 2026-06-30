const db = require('../db');

async function run() {
  try {
    const [partners] = await db.query("SELECT * FROM partners WHERE mobile = '7250642635'");
    console.log('Partner details:', JSON.stringify(partners, null, 2));

    if (partners.length > 0) {
      const partnerName = partners[0].name;
      const [orders] = await db.query("SELECT * FROM orders WHERE vendorName = ?", [partnerName]);
      console.log('\nOrders assigned to partner:', JSON.stringify(orders, null, 2));
    } else {
      console.log('No partner found with mobile 7250642635');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
