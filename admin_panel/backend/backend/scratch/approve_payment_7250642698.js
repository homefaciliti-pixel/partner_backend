const db = require('../db');

async function run() {
  const phone = '7250642698';
  console.log(`Checking database for partner with mobile: ${phone}...`);

  try {
    const [rows] = await db.query('SELECT id, name, mobile, isPaid, isApproved FROM partners WHERE mobile = ?', [phone]);
    
    if (rows.length === 0) {
      console.log(`❌ No partner found with mobile number: ${phone}`);
    } else {
      const partner = rows[0];
      console.log(`Found partner: ${partner.name} (ID: ${partner.id}). Current isPaid: ${partner.isPaid}, isApproved: ${partner.isApproved}`);
      
      // Update isPaid to 1 (true)
      await db.query('UPDATE partners SET isPaid = 1 WHERE id = ?', [partner.id]);
      console.log(`✅ Successfully updated partner ID ${partner.id} to isPaid = 1.`);
      
      // Double check the result
      const [updated] = await db.query('SELECT id, name, mobile, isPaid, isApproved FROM partners WHERE id = ?', [partner.id]);
      console.log('Updated DB State:', JSON.stringify(updated[0], null, 2));
    }
  } catch (error) {
    console.error('Error executing query/update:', error);
  } finally {
    process.exit(0);
  }
}

run();
