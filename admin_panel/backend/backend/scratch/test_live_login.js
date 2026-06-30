const https = require('https');

async function testLogin() {
  console.log('📡 Attempting login to live Render backend with mobile 8787879850...');

  const payload = JSON.stringify({
    phone: '8787879850',
    password: 'secure123'
  });

  const options = {
    hostname: 'partner-backend-2.onrender.com',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      try {
        const parsed = JSON.parse(data);
        console.log('Response Body:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Raw Response:', data);
      }
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error('Request Error:', err);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

testLogin();
