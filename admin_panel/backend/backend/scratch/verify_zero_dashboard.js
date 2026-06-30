const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const partnerRouter = require('../routes/partner');

const JWT_SECRET = 'home_faciliti_partner_secret_key_2026';

async function runTest() {
  console.log('🧪 Starting integration tests for dynamic dashboard counts & earnings...');

  // Start express server
  const app = express();
  app.use(express.json());
  app.use('/api', partnerRouter);

  const server = app.listen(3003, async () => {
    console.log('📡 Temporary test server running on port 3003...');

    try {
      // 1. Generate auth tokens for Himanshu (ID 79) and Rahul (ID 89)
      // Both partners are paid (1) and approved (1) in the DB
      const tokenHimanshu = jwt.sign({ id: 79, mobile: '7250642698' }, JWT_SECRET);
      const tokenRahul = jwt.sign({ id: 89, mobile: '7250642678' }, JWT_SECRET);

      console.log('\n--- Test Case 1: Verify Initial Dashboard and Earnings are 0 ---');
      
      // Fetch Himanshu dashboard
      const resDashHimanshu = await fetch('http://localhost:3003/api/partner/dashboard', {
        headers: { 'Authorization': `Bearer ${tokenHimanshu}` }
      });
      const dataDashHimanshu = await resDashHimanshu.json();
      console.log('Himanshu Dashboard Status:', resDashHimanshu.status);
      console.log('Himanshu Booking Stats:', dataDashHimanshu.bookingsStats);
      console.log('Himanshu Earnings Stats:', dataDashHimanshu.earningsStats);

      // Fetch Himanshu earnings
      const resEarnHimanshu = await fetch('http://localhost:3003/api/earnings', {
        headers: { 'Authorization': `Bearer ${tokenHimanshu}` }
      });
      const dataEarnHimanshu = await resEarnHimanshu.json();
      console.log('Himanshu Earnings API:', dataEarnHimanshu);

      // Assert zero values
      if (
        dataDashHimanshu.bookingsStats.totalBooking !== 0 ||
        dataDashHimanshu.bookingsStats.completedBooking !== 0 ||
        dataDashHimanshu.earningsStats.totalEarning !== 0 ||
        dataEarnHimanshu.totalEarning !== 0
      ) {
        throw new Error('Himanshu dashboard/earnings are not 0 after database reset!');
      }
      console.log('✅ Himanshu initial state verified as 0.');

      // Fetch Rahul dashboard
      const resDashRahul = await fetch('http://localhost:3003/api/partner/dashboard', {
        headers: { 'Authorization': `Bearer ${tokenRahul}` }
      });
      const dataDashRahul = await resDashRahul.json();
      console.log('Rahul Dashboard Booking Stats:', dataDashRahul.bookingsStats);
      console.log('Rahul Dashboard Earnings Stats:', dataDashRahul.earningsStats);

      if (
        dataDashRahul.bookingsStats.totalBooking !== 0 ||
        dataDashRahul.bookingsStats.completedBooking !== 0 ||
        dataDashRahul.earningsStats.totalEarning !== 0
      ) {
        throw new Error('Rahul dashboard/earnings are not 0 after database reset!');
      }
      console.log('✅ Rahul initial state verified as 0.');


      console.log('\n--- Test Case 2: Simulating Completed Bookings (Admin Order + V2 Order) for Himanshu ---');
      
      const todayStrAdmin = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
      const todayStrV2 = new Date().toISOString().split('T')[0];

      // A. Insert Completed Admin Order (orders table)
      // serviceAmount = 400.00, partnerShare = 300.00
      await db.query(
        `INSERT INTO orders 
         (serviceRequestNumber, serviceName, serviceAmount, slotTime, serviceDate, city, locality, status, vendorName, vendorMobile, paymentMethod) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['REQ-TEST-ADMIN', 'Test AC Repair', 400.00, '12:00 PM - 02:00 PM', todayStrAdmin, 'Delhi', 'Connaught Place', 'Completed', 'Himanshu', '7250642698', 'Cash']
      );

      // B. Insert Completed V2 Order (orders_v2 table)
      // price = 800.00, partnerShare = 600.00
      await db.query(
        `INSERT INTO orders_v2 
         (userPhone, serviceName, price, date, status, bookingStatus, partnerName, timeSlot, payment) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['9999999999', 'Test Sofa Deep Clean', 800.00, todayStrV2, 'Completed', 'completed', 'Himanshu', '4:00 PM - 5:00 PM', '{"paymentMethod":"Online","amountPaid":800}']
      );

      console.log('Inserted 1 Completed Admin order and 1 Completed V2 order for Himanshu.');

      // Fetch Himanshu dashboard again
      const resDashHimanshu2 = await fetch('http://localhost:3003/api/partner/dashboard', {
        headers: { 'Authorization': `Bearer ${tokenHimanshu}` }
      });
      const dataDashHimanshu2 = await resDashHimanshu2.json();
      console.log('\nHimanshu Booking Stats (After Completion):', dataDashHimanshu2.bookingsStats);
      console.log('Himanshu Earnings Stats (After Completion):', dataDashHimanshu2.earningsStats);

      // Fetch Himanshu earnings again
      const resEarnHimanshu2 = await fetch('http://localhost:3003/api/earnings', {
        headers: { 'Authorization': `Bearer ${tokenHimanshu}` }
      });
      const dataEarnHimanshu2 = await resEarnHimanshu2.json();
      console.log('Himanshu Earnings API (After Completion):', dataEarnHimanshu2);

      // Expectations:
      // totalBooking = 2 (1 admin + 1 v2)
      // completedBooking = 2
      // totalEarning = 300 (admin share) + 600 (v2 share) = 900
      // cashEarning = 300 (admin order was cash)
      // onlineEarning = 600 (v2 order was online)
      // todayEarning = 900 (both were today)
      
      console.log('\nAsserting post-completion stats...');
      if (dataDashHimanshu2.bookingsStats.totalBooking !== 2) {
        throw new Error(`Expected totalBooking = 2, got ${dataDashHimanshu2.bookingsStats.totalBooking}`);
      }
      if (dataDashHimanshu2.bookingsStats.completedBooking !== 2) {
        throw new Error(`Expected completedBooking = 2, got ${dataDashHimanshu2.bookingsStats.completedBooking}`);
      }
      if (dataDashHimanshu2.earningsStats.totalEarning !== 900) {
        throw new Error(`Expected totalEarning = 900, got ${dataDashHimanshu2.earningsStats.totalEarning}`);
      }
      if (dataDashHimanshu2.earningsStats.todayEarning !== 900) {
        throw new Error(`Expected todayEarning = 900, got ${dataDashHimanshu2.earningsStats.todayEarning}`);
      }
      if (dataDashHimanshu2.earningsStats.cashEarning !== 300) {
        throw new Error(`Expected cashEarning = 300, got ${dataDashHimanshu2.earningsStats.cashEarning}`);
      }
      if (dataDashHimanshu2.earningsStats.onlineEarning !== 600) {
        throw new Error(`Expected onlineEarning = 600, got ${dataDashHimanshu2.earningsStats.onlineEarning}`);
      }

      console.log('✅ Dynamic dashboard booking and earning counts verified perfectly!');
      console.log('✅ Earnings combine orders and orders_v2 tables successfully!');
      console.log('✅ Cash vs Online split is parsed and calculated correctly!');

    } catch (err) {
      console.error('\n❌ Test execution failed:', err);
      process.exit(1);
    } finally {
      console.log('\nCleaning up test data...');
      try {
        await db.query("DELETE FROM orders WHERE serviceRequestNumber = 'REQ-TEST-ADMIN'");
        await db.query("DELETE FROM orders_v2 WHERE userPhone = '9999999999' AND serviceName = 'Test Sofa Deep Clean'");
        console.log('Deleted test bookings.');
      } catch (cleanErr) {
        console.error('Failed to clean up test bookings:', cleanErr);
      }

      server.close(() => {
        console.log('📡 Test server stopped.');
        process.exit(0);
      });
    }
  });
}

runTest();
