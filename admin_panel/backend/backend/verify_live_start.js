const jwt = require('jsonwebtoken');
const https = require('https');

const JWT_SECRET = 'home_faciliti_partner_secret_key_2026';
const partnerId = 79;
const mobile = '7250642698';

// Generate token
const token = jwt.sign({ id: partnerId, mobile: mobile }, JWT_SECRET, { expiresIn: '30d' });

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'partner-backend-2.onrender.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`
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

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    console.log("Sending POST /api/bookings/5/start...");
    const res = await makeRequest('POST', '/api/bookings/5/start');
    console.log("Status Code:", res.statusCode);
    console.log("Response Body:", res.body);
    process.exit(0);
  } catch (err) {
    console.error("Error making request:", err);
    process.exit(1);
  }
}

run();
