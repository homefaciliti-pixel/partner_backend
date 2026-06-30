const db = require('../db');

async function run() {
  const phone = '7250642698';
  console.log(`Checking partner with mobile: ${phone} to insert order...`);

  try {
    const [partners] = await db.query('SELECT id, name, city, locality, address FROM partners WHERE mobile = ?', [phone]);
    
    if (partners.length === 0) {
      console.log(`❌ No partner found with mobile number: ${phone}`);
      process.exit(1);
    }

    const partner = partners[0];
    console.log(`Found partner: ${partner.name} (City: ${partner.city}, Locality: ${partner.locality})`);

    const serviceRequestNumber = `REQ${Date.now().toString().slice(-6)}`;
    const serviceName = 'Sofa Cleaning';
    const serviceAmount = 699.00;
    const slotTime = '12:00 PM - 02:00 PM';
    const serviceDate = new Date().toLocaleDateString('en-IN');
    const createdAt = new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN');
    const status = 'Assigned';
    const vendorName = partner.name;
    const address = partner.address || 'Mock Address, Jaipur';
    const paymentMethod = 'UPI';

    console.log(`Inserting order ${serviceRequestNumber} assigned to ${vendorName}...`);
    const [result] = await db.query(
      `INSERT INTO orders (
        serviceRequestNumber, serviceName, serviceAmount, slotTime, serviceDate, 
        city, locality, status, vendorName, address, createdAt, paymentMethod
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        serviceRequestNumber, serviceName, serviceAmount, slotTime, serviceDate,
        partner.city || 'Jaipur', partner.locality || 'Malviya Nagar', status,
        vendorName, address, createdAt, paymentMethod
      ]
    );

    console.log(`✅ Successfully inserted order! ID: ${result.insertId}, Service Request: ${serviceRequestNumber}`);

    // Double check the orders table for Himanshu
    const [rows] = await db.query('SELECT * FROM orders WHERE vendorName = ?', [vendorName]);
    console.log('Orders assigned to Himanshu:', JSON.stringify(rows, null, 2));

  } catch (error) {
    console.error('Error executing query/insert:', error);
  } finally {
    process.exit(0);
  }
}

run();
