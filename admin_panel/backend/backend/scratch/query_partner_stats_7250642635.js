const jwt = require('jsonwebtoken');

async function run() {
  try {
    const partnerId = 57;
    const mobile = '7250642635';
    // Generate token with correct secret
    const token = jwt.sign({ id: partnerId, mobile: mobile }, 'home_faciliti_partner_secret_key_2026', { expiresIn: '7d' });
    console.log('Generated Token:', token);

    // Hit live partner dashboard
    console.log('\nHitting live partner dashboard...');
    const liveRes = await fetch('https://partner-backend-2.onrender.com/api/partner/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const liveBody = await liveRes.json();
    console.log('Live Response bookingsStats:', liveBody.bookingsStats);

    // Hit live bookings list
    console.log('\nHitting live bookings list...');
    const liveBookingsRes = await fetch('https://partner-backend-2.onrender.com/api/bookings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const liveBookingsBody = await liveBookingsRes.json();
    console.log('Live bookings count:', liveBookingsBody.length);
    console.log('Live bookings detail:', JSON.stringify(liveBookingsBody, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
