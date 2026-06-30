const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const partnerRouter = require('../routes/partner');

const JWT_SECRET = 'home_faciliti_partner_secret_key_2026';

async function runTest() {
  console.log('🧪 Verifying bookings list for Rahul Choudhary (mobile 7250642678)...');

  const app = express();
  app.use(express.json());
  app.use('/api', partnerRouter);

  const server = app.listen(3004, async () => {
    try {
      const tokenRahul = jwt.sign({ id: 89, mobile: '7250642678' }, JWT_SECRET);

      const res = await fetch('http://localhost:3004/api/bookings', {
        headers: { 'Authorization': `Bearer ${tokenRahul}` }
      });
      const bookings = await res.json();
      console.log('Rahul Bookings API status:', res.status);
      console.log('Bookings returned for Rahul:', bookings);
      
      const pendingBookings = bookings.filter(b => b.status === 'pending');
      console.log(`\nFound ${pendingBookings.length} pending bookings for Rahul.`);
      console.log('Pending booking details:', pendingBookings.map(b => ({ id: b.id, service: b.service, city: b.city, locality: b.locality })));

      const expectedIds = [297, 299];
      const matched = expectedIds.every(id => pendingBookings.some(b => b.id === id));
      
      if (matched) {
        console.log('\n✅ SUCCESS: Both pending bookings (297 and 299) are now successfully showing for Rahul Choudhary!');
      } else {
        console.error('\n❌ FAILURE: Pending bookings 297 and 299 are NOT showing for Rahul Choudhary.');
      }

    } catch (err) {
      console.error(err);
    } finally {
      server.close(() => {
        process.exit(0);
      });
    }
  });
}
runTest();
