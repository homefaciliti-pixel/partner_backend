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

function makeUploadRequest(fileName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'partner-backend-2.onrender.com',
      port: 443,
      path: '/uploads/' + fileName,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const phone = '9999988888';
  console.log('🧪 Starting live Render fallback placeholder verification...');

  // Setup test partner directly into database with empty images/documents
  await db.query('DELETE FROM partners WHERE mobile = ?', [phone]);
  const [insertRes] = await db.query(
    `INSERT INTO partners (
      name, email, mobile, password, city, state, locality, address, status, isApproved, isPaid, image, gender, experience, services, aadhaarNumber, panNumber, bankName, accountNumber, ifscCode, documents, aadharFront, aadharBack, panImage, policeVerificationImage, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, '', 'Male', '3 years', 'Repair', '123456789012', 'ABCDE1234F', 'Test Bank', '1234567890', 'UTIB0000123', null, '', '', null, null, '09-06-2026')`,
    [
      'Test Fallback Partner', 'testfallback@gmail.com', phone, 'secure123',
      'Narnaul', 'Haryana', 'Nnl', 'Koriawas'
    ]
  );
  console.log(`\n✅ Step 1: Inserted test partner in database. ID: ${insertRes.insertId}`);

  try {
    // Step 2: Poll live server until partners query returns the fallback URL instead of empty strings (meaning the build is deployed)
    console.log('\nStep 2: Polling Render server until build is deployed...');
    let isLive = false;
    let attempts = 0;
    const maxAttempts = 40;

    while (!isLive && attempts < maxAttempts) {
      attempts++;
      console.log(`Checking /api/partners?mobile=${phone} (attempt ${attempts}/${maxAttempts})...`);
      
      const searchRes = await makeRequest('GET', `/partners?mobile=${phone}`);

      if (searchRes.statusCode === 200 && searchRes.body.success && searchRes.body.data.length > 0) {
        const partner = searchRes.body.data[0];
        console.log('Live partner profile image returned:', partner.image);
        if (partner.image && partner.image.includes('default-profile.svg')) {
          console.log('✅ Received fallback placeholder URL! The new build is live.');
          isLive = true;
        } else {
          console.log('Old server code still active (returned empty or legacy image URL). Sleeping 15s...');
          await sleep(15000);
        }
      } else {
        console.log(`Status: ${searchRes.statusCode}. Sleeping 15s...`);
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

    // Step 4: GET Profile via Partner App Endpoint
    console.log('\nStep 4: Checking partner profile via mobile app API...');
    const profileRes = await makeRequest('GET', '/partner/profile', null, {
      'Authorization': `Bearer ${token}`
    });

    console.log('Status code:', profileRes.statusCode);
    console.log('Response body:', JSON.stringify(profileRes.body, null, 2));

    const p = profileRes.body.partner;
    if (p.profileImage.includes('default-profile.svg') && p.aadharFront.includes('default-document.svg')) {
      console.log('✅ Mobile app API returns fallback placeholders successfully.');
    } else {
      throw new Error('Fallback URLs not matched in mobile app API');
    }

    // Step 5: GET actual missing image from static server
    console.log('\nStep 5: Testing static file server fallback for missing files...');
    const imgRes = await makeUploadRequest('1781073093842-missing-profile-pic.jpg');
    console.log('Missing file request status:', imgRes.statusCode);
    console.log('Content-Type:', imgRes.headers['content-type']);
    console.log('Content Starts With:', imgRes.body.substring(0, 100));

    if (imgRes.statusCode === 200 && imgRes.body.includes('id="profileGrad"')) {
      console.log('✅ Static file server fallback returns default vector SVG successfully.');
    } else {
      throw new Error('Static fallback did not return default SVG');
    }

    console.log('\n🎉 ALL LIVE FALLBACK PLACEHOLDER VERIFICATION TESTS PASSED SUCCESSFULLY!');

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
