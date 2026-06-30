const jwt = require('jsonwebtoken');

const JWT_SECRET = 'home_faciliti_partner_secret_key_2026';
const partnerId = 57;
const mobile = '7250642635';

// Generate token
const token = jwt.sign({ id: partnerId, mobile: mobile }, JWT_SECRET, { expiresIn: '30d' });
console.log("Generated JWT Token:", token);

async function testLocalBookings() {
  try {
    console.log("Fetching local /api/bookings...");
    const res = await fetch('http://localhost:3000/api/bookings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const body = await res.json();
    console.log("Status Code:", res.status);
    console.log("Bookings data:", JSON.stringify(body, null, 2));

    console.log("\nFetching local /api/bookings/stats...");
    const statsRes = await fetch('http://localhost:3000/api/bookings/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const statsBody = await statsRes.json();
    console.log("Stats Status Code:", statsRes.status);
    console.log("Stats data:", JSON.stringify(statsBody, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error fetching local bookings:", err);
    process.exit(1);
  }
}

testLocalBookings();
