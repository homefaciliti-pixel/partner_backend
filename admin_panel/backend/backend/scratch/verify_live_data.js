const jwt = require('jsonwebtoken');
const https = require('https');

const JWT_SECRET = 'home_faciliti_partner_secret_key_2026';
const partnerId = 57;
const mobile = '7250642635';

// Generate token
const token = jwt.sign({ id: partnerId, mobile: mobile }, JWT_SECRET, { expiresIn: '30d' });
console.log("Generated JWT Token:", token);

function makeRequest(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'partner-backend-2.onrender.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function run() {
  try {
    console.log("\nFetching live /api/partner/dashboard...");
    const dashboardRes = await makeRequest('GET', '/api/partner/dashboard');
    console.log("Dashboard Status:", dashboardRes.statusCode);
    console.log("Dashboard BookingsStats:", dashboardRes.body.bookingsStats);

    console.log("\nFetching live /api/bookings...");
    const bookingsRes = await makeRequest('GET', '/api/bookings');
    console.log("Bookings Status:", bookingsRes.statusCode);
    console.log("Bookings length:", Array.isArray(bookingsRes.body) ? bookingsRes.body.length : 'not an array');
    console.log("Bookings data:", bookingsRes.body);

    console.log("\nFetching live /api/bookings/stats...");
    const statsRes = await makeRequest('GET', '/api/bookings/stats');
    console.log("Stats Status:", statsRes.statusCode);
    console.log("Stats Body:", statsRes.body);

    process.exit(0);
  } catch (err) {
    console.error("Error making requests:", err);
    process.exit(1);
  }
}

run();
