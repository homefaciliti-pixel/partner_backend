const jwt = require('jsonwebtoken');
const https = require('https');

const JWT_SECRET = 'home_faciliti_partner_secret_key_2026';
const payload = { id: 79, mobile: '7250642698' };
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

console.log('Generated JWT Token for Himanshu:', token);

function makeRequest() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'partner-backend-2.onrender.com',
      port: 443,
      path: '/api/bookings',
      method: 'GET',
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

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function run() {
  try {
    console.log('📡 Fetching Himanshu\'s bookings from live Render server...');
    const res = await makeRequest();
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', JSON.stringify(res.body, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
