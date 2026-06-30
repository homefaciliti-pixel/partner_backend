const db = require('../db');
const https = require('https');

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'partner-backend-2.onrender.com',
      port: 443,
      path: '/api' + path,
      method: method,
      headers: { ...headers }
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }

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

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const phone = '9999988888';
  console.log('🧪 Starting live Render status toggle API verification...');

  // Setup test partner directly into database
  await db.query('DELETE FROM partners WHERE mobile = ?', [phone]);
  const [insertRes] = await db.query(
    `INSERT INTO partners (
      name, email, mobile, password, city, state, locality, address, status, isApproved, isPaid, image, gender, experience, services, aadhaarNumber, panNumber, bankName, accountNumber, ifscCode, documents, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 1, '', 'Male', '3 years', 'Repair', '123456789012', 'ABCDE1234F', 'Test Bank', '1234567890', 'UTIB0000123', '', '09-06-2026')`,
    [
      'Test Status Partner', 'teststatus@gmail.com', phone, 'secure123',
      'Narnaul', 'Haryana', 'Nnl', 'Koriawas'
    ]
  );
  console.log(`✅ Step 1: Inserted test partner in database. ID: ${insertRes.insertId}`);

  try {
    // Step 2: Poll live server until /api/partner/status returns 401 instead of 404 (meaning the build is deployed)
    console.log('\nStep 2: Polling Render server until build is deployed...');
    let isLive = false;
    let attempts = 0;
    const maxAttempts = 40;

    while (!isLive && attempts < maxAttempts) {
      attempts++;
      console.log(`Checking /api/partner/status endpoint (attempt ${attempts}/${maxAttempts})...`);
      
      const checkRes = await makeRequest('POST', '/partner/status', { status: true });

      if (checkRes.statusCode === 401) {
        console.log('✅ Received 401 Unauthorized! The new status API endpoint is live.');
        isLive = true;
      } else if (checkRes.statusCode === 404) {
        console.log('Old server code still active (endpoint returned 404). Sleeping 15s...');
        await sleep(15000);
      } else {
        console.log(`Unexpected status code: ${checkRes.statusCode}. Response:`, checkRes.body, 'Sleeping 15s...');
        await sleep(15000);
      }
    }

    if (!isLive) {
      throw new Error('Render deployment timed out or API failed to update.');
    }

    // Step 3: Login to live server to get JWT token
    console.log('\nStep 3: Authenticating with live server...');
    const loginRes = await makeRequest('POST', '/auth/login', {
      phone: phone,
      password: 'secure123'
    });

    const token = loginRes.body.token;
    if (!token) {
      throw new Error('Could not retrieve JWT token: ' + JSON.stringify(loginRes.body));
    }
    console.log('✅ Authenticated successfully.');

    // Step 4: Toggle Status ON (true) with coordinates
    console.log('\nStep 4: Toggling status ON (online) with coordinates...');
    const testLat = '28.888888';
    const testLon = '76.999999';
    const toggleOnRes = await makeRequest('POST', '/partner/status', {
      status: true,
      lat: testLat,
      lon: testLon
    }, {
      'Authorization': `Bearer ${token}`
    });

    console.log('Status code:', toggleOnRes.statusCode);
    console.log('Response body:', JSON.stringify(toggleOnRes.body, null, 2));

    if (toggleOnRes.statusCode !== 200 || !toggleOnRes.body.success) {
      throw new Error('Failed to toggle status ON on live server');
    }

    if (toggleOnRes.body.data.status !== true || toggleOnRes.body.data.latitude !== testLat || toggleOnRes.body.data.longitude !== testLon) {
      throw new Error('Response data mismatch on status ON toggle');
    }
    console.log('✅ Toggle status ON check passed.');

    // Step 5: Verify status in database
    console.log('\nStep 5: Querying database to verify values are updated...');
    const [dbRowsOn] = await db.query('SELECT status, latitude, longitude FROM partners WHERE id = ?', [insertRes.insertId]);
    console.log('DB Status:', dbRowsOn[0].status);
    console.log('DB Latitude:', dbRowsOn[0].latitude);
    console.log('DB Longitude:', dbRowsOn[0].longitude);

    if (dbRowsOn[0].status !== 1 || dbRowsOn[0].latitude !== testLat || dbRowsOn[0].longitude !== testLon) {
      throw new Error('Database check failed for live status ON toggle');
    }
    console.log('✅ Database verification for status ON passed.');

    // Step 6: Toggle Status OFF (false) without coordinates
    console.log('\nStep 6: Toggling status OFF (offline)...');
    const toggleOffRes = await makeRequest('POST', '/partner/status', {
      status: false
    }, {
      'Authorization': `Bearer ${token}`
    });

    console.log('Status code:', toggleOffRes.statusCode);
    console.log('Response body:', JSON.stringify(toggleOffRes.body, null, 2));

    if (toggleOffRes.statusCode !== 200 || !toggleOffRes.body.success) {
      throw new Error('Failed to toggle status OFF on live server');
    }

    if (toggleOffRes.body.data.status !== false) {
      throw new Error('Response data mismatch on status OFF toggle');
    }
    console.log('✅ Toggle status OFF check passed.');

    // Step 7: Verify status OFF in database
    console.log('\nStep 7: Querying database to verify status is offline...');
    const [dbRowsOff] = await db.query('SELECT status FROM partners WHERE id = ?', [insertRes.insertId]);
    console.log('DB Status:', dbRowsOff[0].status);

    if (dbRowsOff[0].status !== 0) {
      throw new Error('Database check failed for live status OFF toggle');
    }
    console.log('✅ Database verification for status OFF passed.');

    console.log('\n🎉 ALL LIVE STATUS TOGGLE API VERIFICATION TESTS PASSED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Live test failed with error:', error);
  } finally {
    // Cleanup database
    await db.query('DELETE FROM partners WHERE mobile = ?', [phone]);
    console.log('🧹 Cleanup completed.');
    process.exit(0);
  }
}

// Execute immediately
run();
