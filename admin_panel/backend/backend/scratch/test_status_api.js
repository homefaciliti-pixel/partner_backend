const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const partnerRouter = require('../routes/partner');

async function runTest() {
  console.log('🧪 Starting local integration tests for partner status and location toggle APIs...');

  const app = express();
  app.use(express.json());
  app.use('/api', partnerRouter);

  // Start temporary server
  const server = app.listen(3003, async () => {
    console.log('📡 Temporary test server running on port 3003...');

    try {
      // Use target test partner ID = 10
      const partnerId = 10;
      const targetToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsIm1vYmlsZSI6IjgzMDc1MTEzODYiLCJpYXQiOjE3ODA0NjYyNjUsImV4cCI6MTc4MzA1ODI2NX0.awNvtVFKJ-_4ZzeU6Idba7xUMPX_TEqQ1GCYXVx-2d0';

      console.log('\n--- Test Case 1: GET initial status (Verify we start clean) ---');
      const [initRows] = await db.query('SELECT status FROM partners WHERE id = ?', [partnerId]);
      console.log('Initial DB Status:', initRows[0].status);

      console.log('\n--- Test Case 2: POST status ON (true) with Location Coordinates ---');
      const testLat = '28.123456';
      const testLon = '76.654321';
      const testTime = new Date().toISOString();

      const postOnRes = await fetch('http://localhost:3003/api/partner/status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${targetToken}`
        },
        body: JSON.stringify({
          status: true,
          lat: testLat,
          lon: testLon,
          time: testTime
        })
      });

      const onData = await postOnRes.json();
      console.log('Response Status:', postOnRes.status);
      console.log('Response Body:', JSON.stringify(onData, null, 2));

      if (postOnRes.status !== 200 || !onData.success) {
        throw new Error('POST status ON failed');
      }

      if (onData.data.status !== true || onData.data.latitude !== testLat || onData.data.longitude !== testLon) {
        throw new Error('Data verification failed for status ON update');
      }
      console.log('✅ POST status ON test passed!');

      console.log('\n--- Test Case 3: Verify in DB ---');
      const [dbRowsOn] = await db.query('SELECT status, latitude, longitude, locationTime FROM partners WHERE id = ?', [partnerId]);
      console.log('DB Status:', dbRowsOn[0].status);
      console.log('DB Latitude:', dbRowsOn[0].latitude);
      console.log('DB Longitude:', dbRowsOn[0].longitude);
      if (dbRowsOn[0].status !== 1 || dbRowsOn[0].latitude !== testLat || dbRowsOn[0].longitude !== testLon) {
        throw new Error('Database check failed for status ON');
      }
      console.log('✅ Database verification for status ON passed!');

      console.log('\n--- Test Case 4: POST status OFF (false) without Coordinates ---');
      const postOffRes = await fetch('http://localhost:3003/api/partner/status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${targetToken}`
        },
        body: JSON.stringify({
          status: false
        })
      });

      const offData = await postOffRes.json();
      console.log('Response Status:', postOffRes.status);
      console.log('Response Body:', JSON.stringify(offData, null, 2));

      if (postOffRes.status !== 200 || !offData.success) {
        throw new Error('POST status OFF failed');
      }

      if (offData.data.status !== false) {
        throw new Error('Data verification failed for status OFF update');
      }
      console.log('✅ POST status OFF test passed!');

      console.log('\n--- Test Case 5: Verify OFF in DB ---');
      const [dbRowsOff] = await db.query('SELECT status FROM partners WHERE id = ?', [partnerId]);
      console.log('DB Status:', dbRowsOff[0].status);
      if (dbRowsOff[0].status !== 0) {
        throw new Error('Database check failed for status OFF');
      }
      console.log('✅ Database verification for status OFF passed!');

      console.log('\n--- Test Case 6: PUT status request (Alternative method) ---');
      const putRes = await fetch('http://localhost:3003/api/partner/status', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${targetToken}`
        },
        body: JSON.stringify({
          status: 1, // sending as integer 1 (online)
          lat: '29.999999',
          lon: '77.777777'
        })
      });

      const putData = await putRes.json();
      console.log('Response Status:', putRes.status);
      console.log('Response Body:', JSON.stringify(putData, null, 2));

      if (putRes.status !== 200 || !putData.success) {
        throw new Error('PUT status request failed');
      }
      console.log('✅ PUT status test passed!');

      console.log('\n🎉 All local status toggle API integration tests completed successfully!');

    } catch (err) {
      console.error('\n❌ Test execution failed:', err);
    } finally {
      server.close(() => {
        console.log('📡 Test server stopped.');
        process.exit(0);
      });
    }
  });
}

runTest();
