const db = require('../db');

async function run() {
  const phone = '9999988888';
  try {
    await db.query('DELETE FROM partners WHERE mobile = ?', [phone]);
    const [insertRes] = await db.query(
      `INSERT INTO partners (
        name, email, mobile, password, city, state, locality, address, status, isApproved, isPaid, image, gender, experience, services, aadhaarNumber, panNumber, bankName, accountNumber, ifscCode, documents, aadharFront, aadharBack, panImage, policeVerificationImage, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, '', 'Male', '3 years', 'Repair', '123456789012', 'ABCDE1234F', 'Test Bank', '1234567890', 'UTIB0000123', null, '', '', null, null, '09-06-2026')`,
      [
        'Test Status Partner', 'teststatus@gmail.com', phone, 'secure123',
        'Narnaul', 'Haryana', 'Nnl', 'Koriawas'
      ]
    );
    console.log('Inserted test partner ID:', insertRes.insertId);

    const res = await fetch('https://partner-backend-2.onrender.com/api/partners?mobile=' + phone);
    const data = await res.json();
    console.log('Live Server Response:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.query('DELETE FROM partners WHERE mobile = ?', [phone]);
    console.log('Cleanup completed.');
    process.exit(0);
  }
}
run();
