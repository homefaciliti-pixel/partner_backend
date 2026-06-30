const jwt = require('jsonwebtoken');

const JWT_SECRET = 'home_faciliti_partner_secret_key_2026';

async function run() {
  try {
    const token = jwt.sign({ id: 57, mobile: '7250642635' }, JWT_SECRET);

    const liveUrl = 'https://partner-backend-2.onrender.com';

    console.log("Calling live bookings list...");
    const resList = await fetch(`${liveUrl}/api/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const bookings = await resList.json();
    console.log("Bookings List Length:", bookings.length);
    console.log("Bookings List:", bookings);

    console.log("\nCalling live dashboard...");
    const resDash = await fetch(`${liveUrl}/api/partner/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dash = await resDash.json();
    console.log("Dashboard Booking Stats:", dash.bookingsStats);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
