const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const partnerRouter = require('../routes/partner');
const partnersRouter = require('../routes/partners');
const path = require('path');
const fs = require('fs');

async function runTest() {
  console.log('🧪 Starting local verification for partner profile image / document fallbacks...');

  const app = express();
  app.use(express.json());

  // Setup same custom fallback static middleware as in server.js
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(__dirname, '..', 'uploads', req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return express.static(path.join(__dirname, '..', 'uploads'))(req, res, next);
    } else {
      const lowerPath = req.path.toLowerCase();
      if (lowerPath.includes('profile') || lowerPath.includes('avatar') || lowerPath.includes('user') || lowerPath.includes('image')) {
        return res.sendFile(path.join(__dirname, '..', 'uploads', 'default-profile.svg'));
      } else {
        return res.sendFile(path.join(__dirname, '..', 'uploads', 'default-document.svg'));
      }
    }
  });

  app.use('/api', partnerRouter);
  app.use('/api/partners', partnersRouter);

  const server = app.listen(3004, async () => {
    console.log('📡 Temporary test server running on port 3004...');

    try {
      const partnerId = 10;
      const targetToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsIm1vYmlsZSI6IjgzMDc1MTEzODYiLCJpYXQiOjE3ODA0NjYyNjUsImV4cCI6MTc4MzA1ODI2NX0.awNvtVFKJ-_4ZzeU6Idba7xUMPX_TEqQ1GCYXVx-2d0';

      // Temporarily clear columns for partner 10 in database to test the empty fallback resolution
      const [[originalRecord]] = await db.query(
        'SELECT image, aadharFront, aadharBack, panImage FROM partners WHERE id = ?',
        [partnerId]
      );

      console.log('\n--- Setup: Clearing document columns for partner 10 ---');
      await db.query(
        'UPDATE partners SET image = "", aadharFront = "", aadharBack = "", panImage = null WHERE id = ?',
        [partnerId]
      );

      console.log('\n--- Test Case 1: GET profile from partner app (Verify empty fields return default SVGs) ---');
      const profileRes = await fetch('http://localhost:3004/api/partner/profile', {
        headers: { 'Authorization': `Bearer ${targetToken}` }
      });
      const profileData = await profileRes.json();
      console.log('Profile Response Status:', profileRes.status);
      console.log('Profile image:', profileData.partner.profileImage);
      console.log('Aadhar Front:', profileData.partner.aadharFront);
      console.log('Pan Image:', profileData.partner.panImage);

      if (!profileData.partner.profileImage.includes('default-profile.svg')) {
        throw new Error('profileImage did not resolve to default-profile.svg');
      }
      if (!profileData.partner.aadharFront.includes('default-document.svg') || !profileData.partner.panImage.includes('default-document.svg')) {
        throw new Error('aadharFront or panImage did not resolve to default-document.svg');
      }
      console.log('✅ Empty field fallback resolution passed!');

      console.log('\n--- Test Case 2: GET single partner from Admin Panel API ---');
      const adminRes = await fetch(`http://localhost:3004/api/partners/${partnerId}`);
      const adminData = await adminRes.json();
      console.log('Admin Response Status:', adminRes.status);
      console.log('Admin Aadhar Front Image:', adminData.data.aadharFront);
      console.log('Admin Profile Image:', adminData.data.image);

      if (!adminData.data.image.includes('default-profile.svg')) {
        throw new Error('Admin image did not resolve to default-profile.svg');
      }
      console.log('✅ Admin Panel fallback resolution passed!');

      console.log('\n--- Test Case 3: GET actual image URL (Verify static server fallback for missing files) ---');
      // Requesting a non-existing image
      const imgRes = await fetch('http://localhost:3004/uploads/1781073093842-missing-profile-pic.jpg');
      console.log('Missing file request status:', imgRes.status);
      const text = await imgRes.text();
      console.log('Content Starts With:', text.substring(0, 100));

      if (imgRes.status !== 200 || !text.includes('id="profileGrad"')) {
        throw new Error('Static fallback failed to serve default-profile.svg');
      }
      console.log('✅ Missing file static server fallback passed!');

      // Restore original database values
      console.log('\n--- Cleanup: Restoring original values for partner 10 ---');
      await db.query(
        'UPDATE partners SET image = ?, aadharFront = ?, aadharBack = ?, panImage = ? WHERE id = ?',
        [originalRecord.image, originalRecord.aadharFront, originalRecord.aadharBack, originalRecord.panImage, partnerId]
      );
      console.log('✅ Restored original values.');

      console.log('\n🎉 ALL LOCAL FALLBACK VERIFICATION TESTS PASSED SUCCESSFULLY!');

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
