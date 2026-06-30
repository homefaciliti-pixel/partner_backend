const fs = require('fs');
const path = require('path');

const targetFilePath = path.join(__dirname, '../routes/partner.js');
let code = fs.readFileSync(targetFilePath, 'utf8');

// Normalize line endings to \n
code = code.replace(/\r\n/g, '\n');

// 1. mapPartnerForApp mapping
const target1 = `    isApproved: r.mobile === '7250642635' ? true : r.isApproved === 1,
    isPaid: r.mobile === '7250642635' ? true : r.isPaid === 1`;
const repl1 = `    isApproved: r.isApproved === 1,
    isPaid: r.isPaid === 1`;

if (code.includes(target1)) {
  code = code.replace(target1, repl1);
  console.log('Replaced Target 1 (mapPartnerForApp)');
} else {
  console.warn('Could not find Target 1');
}

// 2. authenticatePartner check
const target2 = `    if (req.partner.mobile === '7250642635') {
      req.partner.isPaid = 1;
      req.partner.isApproved = 1;
    }`;
if (code.includes(target2)) {
  code = code.replace(target2, '');
  console.log('Replaced Target 2 (authenticatePartner check)');
} else {
  console.warn('Could not find Target 2');
}

// 3. GET /bookings interceptor
const target3 = `  // Interceptor for Partner ID 10 (Amitkumar, mobile 8307511386) / mobile 7250642635 testing
  if (req.partner.id === 10 || req.partner.mobile === '8307511386' || req.partner.mobile === '7250642635') {
    let list = Object.values(mockBookingsStore);
    if (filterStatus) {
      if (filterStatus === 'upcoming' || filterStatus === 'accepted') {
        list = list.filter(b => b.status === 'accepted' || b.status === 'upcoming' || b.status === 'pending');
      } else {
        list = list.filter(b => b.status === filterStatus);
      }
    }
    return res.json(list);
  }`;
if (code.includes(target3)) {
  code = code.replace(target3, '');
  console.log('Replaced Target 3 (GET /bookings)');
} else {
  console.warn('Could not find Target 3');
}

// 4. GET /bookings/stats interceptor
const target4 = `  // Interceptor for Partner ID 10 (Amitkumar, mobile 8307511386) / mobile 7250642635 testing
  if (req.partner.id === 10 || req.partner.mobile === '8307511386' || req.partner.mobile === '7250642635') {
    const list = Object.values(mockBookingsStore);
    let total = list.length;
    let upcoming = 0;
    let inProgress = 0;
    let completed = 0;
    let cancel = 0;

    list.forEach(o => {
      if (o.status === 'accepted' || o.status === 'upcoming' || o.status === 'pending') upcoming++;
      else if (o.status === 'in_progress') inProgress++;
      else if (o.status === 'completed') completed++;
      else if (o.status === 'cancel') cancel++;
    });

    return res.json({
      totalBooking: total,
      upcomingBooking: upcoming,
      inProgressBooking: inProgress,
      acceptedBooking: upcoming + inProgress,
      completedBooking: completed,
      cancelBooking: cancel
    });
  }`;
if (code.includes(target4)) {
  code = code.replace(target4, '');
  console.log('Replaced Target 4 (GET /bookings/stats)');
} else {
  console.warn('Could not find Target 4');
}

// 5. POST /bookings/:id/accept interceptor
const target5 = `  // Interceptor for Partner ID 10 (Amitkumar, mobile 8307511386) / mobile 7250642635 testing
  if (req.partner.id === 10 || req.partner.mobile === '8307511386' || req.partner.mobile === '7250642635') {
    if (mockBookingsStore[id]) {
      mockBookingsStore[id].status = 'accepted';
      return res.json({ success: true, message: 'Order accepted successfully!' });
    }
    return res.status(404).json({ error: 'Order not found' });
  }`;
if (code.includes(target5)) {
  code = code.replace(target5, '');
  console.log('Replaced Target 5 (POST /bookings/:id/accept)');
} else {
  console.warn('Could not find Target 5');
}

// 6. GET /bookings/:id interceptor
const target6 = `  // Interceptor for Partner ID 10 (Amitkumar, mobile 8307511386) / mobile 7250642635 testing
  if (req.partner.id === 10 || req.partner.mobile === '8307511386' || req.partner.mobile === '7250642635') {
    const b = mockBookingsStore[id];
    if (b) {
      return res.json({
        id: b.id,
        status: b.status,
        service: b.service,
        date: b.date,
        time: b.time,
        serviceAmount: b.serviceAmount,
        serviceRequestNumber: b.serviceRequestNumber,
        address: b.address,
        city: b.city,
        locality: b.locality,
        paymentMethod: 'UPI',
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        createdAt: b.date
      });
    }
    return res.status(404).json({ error: 'Booking not found' });
  }`;
if (code.includes(target6)) {
  code = code.replace(target6, '');
  console.log('Replaced Target 6 (GET /bookings/:id)');
} else {
  console.warn('Could not find Target 6');
}

// 7. PUT /bookings/:id/status interceptor
const target7 = `  // Interceptor for Partner ID 10 (Amitkumar, mobile 8307511386) testing
  if (req.partner.id === 10 || req.partner.mobile === '8307511386') {
    if (mockBookingsStore[id]) {
      mockBookingsStore[id].status = status;
      return res.json({
        success: true,
        message: \`Booking status successfully transitioned to \${status}!\`,
        status: status
      });
    }
    return res.status(404).json({ error: 'Booking not found' });
  }`;
if (code.includes(target7)) {
  code = code.replace(target7, '');
  console.log('Replaced Target 7 (PUT /bookings/:id/status)');
} else {
  console.warn('Could not find Target 7');
}

// 8. GET /earnings interceptor
const target8 = `  // Interceptor for Partner ID 10 (Amitkumar, mobile 8307511386) / mobile 7250642635 testing
  if (req.partner.id === 10 || req.partner.mobile === '8307511386' || req.partner.mobile === '7250642635') {
    if (req.partner.mobile === '7250642635') {
      return res.json({
        totalEarning: 300,
        todayEarning: 300,
        monthlyEarning: 300,
        onlineEarning: 300,
        cashEarning: 300,
        payToCompany: 0,
        walletBalance: 300
      });
    }
    const mockStats = getMockEarningsStats(req.partner, mockBookingsStore);
    return res.json(mockStats);
  }`;
if (code.includes(target8)) {
  code = code.replace(target8, '');
  console.log('Replaced Target 8 (GET /earnings)');
} else {
  console.warn('Could not find Target 8');
}

// 9. POST /bookings/:id/start interceptor
const target9 = `  // Interceptor for Partner ID 10 (Amitkumar, mobile 8307511386) / mobile 7250642635 testing
  if (req.partner.id === 10 || req.partner.mobile === '8307511386' || req.partner.mobile === '7250642635') {
    if (mockBookingsStore[id]) {
      mockBookingsStore[id].status = 'in_progress';
      return res.json({ success: true, message: 'Work started successfully!', status: 'in_progress' });
    }
    return res.status(404).json({ error: 'Order not found' });
  }`;
if (code.includes(target9)) {
  code = code.replace(target9, '');
  console.log('Replaced Target 9 (POST /bookings/:id/start)');
} else {
  console.warn('Could not find Target 9');
}

// 10. POST /bookings/:id/complete interceptor
const target10 = `  // Interceptor for Partner ID 10 (Amitkumar, mobile 8307511386) / mobile 7250642635 testing
  if (req.partner.id === 10 || req.partner.mobile === '8307511386' || req.partner.mobile === '7250642635') {
    if (mockBookingsStore[id]) {
      mockBookingsStore[id].status = 'completed';
      const serviceAmount = parseFloat(mockBookingsStore[id].serviceAmount || 0);
      const commissionAmount = (serviceAmount * 25) / 100;
      const partnerShare = serviceAmount - commissionAmount;

      return res.json({
        success: true,
        message: 'Work completed successfully and earnings updated!',
        status: 'completed',
        earnings: {
          serviceAmount: serviceAmount,
          paymentMethod: 'UPI',
          commissionRate: 25,
          commissionAmount: commissionAmount,
          partnerShare: partnerShare,
          walletBalanceAdded: partnerShare,
          payToCompanyAdded: 0.00
        }
      });
    }
    return res.status(404).json({ error: 'Order not found' });
  }`;
if (code.includes(target10)) {
  code = code.replace(target10, '');
  console.log('Replaced Target 10 (POST /bookings/:id/complete)');
} else {
  console.warn('Could not find Target 10');
}

// 11. GET /partner/dashboard interceptor
const target11 = `  // Interceptor for Partner ID 10 (Amitkumar, mobile 8307511386) / mobile 7250642635 testing
  if (req.partner.id === 10 || req.partner.mobile === '8307511386' || req.partner.mobile === '7250642635') {
    const list = Object.values(mockBookingsStore);
    let totalBooking = list.length;
    let upcomingBooking = 0;
    let inProgressBooking = 0;
    let completedBooking = 0;
    let cancelBooking = 0;

    list.forEach(o => {
      if (o.status === 'accepted' || o.status === 'upcoming' || o.status === 'pending') upcomingBooking++;
      else if (o.status === 'in_progress') inProgressBooking++;
      else if (o.status === 'completed') completedBooking++;
      else if (o.status === 'cancel') cancelBooking++;
    });

    let mockEarnings;
    if (req.partner.mobile === '7250642635') {
      mockEarnings = {
        totalEarning: 300,
        todayEarning: 300,
        monthlyEarning: 300,
        onlineEarning: 300,
        cashEarning: 300,
        payToCompany: 0,
        walletBalance: 300
      };
    } else {
      mockEarnings = getMockEarningsStats(req.partner, mockBookingsStore);
    }

    return res.json({
      id: req.partner.id,
      isPaid: true,
      isApproved: true,
      razorpayKeyId: getRazorpayKeyId(),
      bookingsStats: {
        totalBooking,
        upcomingBooking,
        inProgressBooking,
        acceptedBooking: upcomingBooking + inProgressBooking,
        completedBooking,
        cancelBooking
      },
      earningsStats: mockEarnings,
      banners
    });
  }`;
if (code.includes(target11)) {
  code = code.replace(target11, '');
  console.log('Replaced Target 11 (GET /partner/dashboard)');
} else {
  console.warn('Could not find Target 11');
}

// Write the code back to the file
fs.writeFileSync(targetFilePath, code, 'utf8');
console.log('Updated partner.js successfully!');
