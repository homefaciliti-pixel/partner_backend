const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../routes/partner.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Target block for /api/earnings
const targetEarnings = `router.get('/earnings', authenticatePartner, async (req, res) => {
  const partnerName = req.partner.name;
  const walletVal = parseFloat(req.partner.walletBalance || 0);
  const totalVal = parseFloat(req.partner.totalEarnings || 0);



  // RULE: Earnings show ZERO until partner has paid AND is approved by the admin
  if (req.partner.isPaid !== 1 || req.partner.isApproved !== 1) {
    return res.json({
      totalEarning: 0,
      todayEarning: 0,
      monthlyEarning: 0,
      onlineEarning: 0,
      cashEarning: 0,
      payToCompany: 0,
      walletBalance: 0
    });
  }

  try {
    const [ordersRes] = await db.query(
      "SELECT SUM(serviceAmount) as totalAmount, COUNT(*) as completedCount FROM orders WHERE vendorName = ? AND status = 'Completed'",
      [partnerName]
    );

    const calculatedTotal = parseFloat(ordersRes[0].totalAmount || 0);
    const totalEarnings = calculatedTotal;
    
    const todayStr = new Date().toLocaleDateString('en-IN');
    const [todayRes] = await db.query(
      "SELECT SUM(serviceAmount) as amount FROM orders WHERE vendorName = ? AND status = 'Completed' AND serviceDate = ?",
      [partnerName, todayStr]
    );
    const todayEarning = Math.round(parseFloat(todayRes[0].amount || 0));

    const [monthRes] = await db.query(
      "SELECT SUM(serviceAmount) as amount FROM orders WHERE vendorName = ? AND status = 'Completed'",
      [partnerName]
    );
    const monthlyEarning = Math.round(parseFloat(monthRes[0].amount || 0));

    // Calculate cash earnings (partner's share, i.e., 75% of cash bookings total)
    const [cashRes] = await db.query(
      "SELECT SUM(serviceAmount) as totalAmount FROM orders WHERE vendorName = ? AND status = 'Completed' AND paymentMethod = 'Cash'",
      [partnerName]
    );
    const cashTotal = parseFloat(cashRes[0].totalAmount || 0);
    const cashEarning = Math.round(cashTotal * 0.75);

    // Calculate online earnings (partner's share, i.e., 75% of online bookings total)
    const [onlineRes] = await db.query(
      "SELECT SUM(serviceAmount) as totalAmount FROM orders WHERE vendorName = ? AND status = 'Completed' AND paymentMethod != 'Cash'",
      [partnerName]
    );
    const onlineTotal = parseFloat(onlineRes[0].totalAmount || 0);
    const onlineEarning = Math.round(onlineTotal * 0.75);

    res.json({
      totalEarning: Math.round(totalEarnings),
      todayEarning: todayEarning,
      monthlyEarning: monthlyEarning,
      onlineEarning: onlineEarning,
      cashEarning: cashEarning,
      payToCompany: parseFloat(req.partner.payToCompany || 0),
      walletBalance: parseFloat(req.partner.walletBalance || 0)
    });
  } catch (error) {
    console.error('Error calculating partner earnings:', error);
    res.json({
      totalEarning: Math.round(totalVal),
      todayEarning: Math.round(totalVal * 0.4),
      monthlyEarning: Math.round(totalVal * 0.6),
      onlineEarning: Math.round(totalVal * 0.6 * 0.75),
      cashEarning: Math.round(totalVal * 0.4 * 0.75),
      payToCompany: parseFloat(req.partner.payToCompany || 0),
      walletBalance: parseFloat(req.partner.walletBalance || 0)
    });
  }
});`;

const replacementEarnings = `router.get('/earnings', authenticatePartner, async (req, res) => {
  const partnerName = req.partner.name;
  const walletVal = parseFloat(req.partner.walletBalance || 0);
  const totalVal = parseFloat(req.partner.totalEarnings || 0);

  // RULE: Earnings show ZERO until partner has paid AND is approved by the admin
  if (req.partner.isPaid !== 1 || req.partner.isApproved !== 1) {
    return res.json({
      totalEarning: 0,
      todayEarning: 0,
      monthlyEarning: 0,
      onlineEarning: 0,
      cashEarning: 0,
      payToCompany: 0,
      walletBalance: 0
    });
  }

  try {
    // 1. Fetch completed admin orders
    const [adminOrders] = await db.query(
      "SELECT serviceAmount, paymentMethod, serviceDate FROM orders WHERE vendorName = ? AND status = 'Completed'",
      [partnerName]
    );

    // 2. Fetch completed app orders (v2)
    const [v2Orders] = await db.query(
      "SELECT price, payment, date FROM orders_v2 WHERE partnerName = ? AND status = 'Completed'",
      [partnerName]
    );

    // Helper functions for date matching in IST
    const today = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + istOffset + (new Date().getTimezoneOffset() * 60000));
    
    const yyyy = todayIST.getFullYear();
    const mm = String(todayIST.getMonth() + 1).padStart(2, '0');
    const dd = String(todayIST.getDate()).padStart(2, '0');
    
    const dVal = todayIST.getDate();
    const mVal = todayIST.getMonth() + 1;

    // ISO formats
    const todayISO1 = yyyy + '-' + mm + '-' + dd;
    const todayISO2 = yyyy + '-' + mVal + '-' + dVal;
    const todayISO3 = yyyy + '-' + mm + '-' + dVal;
    const todayISO4 = yyyy + '-' + mVal + '-' + dd;

    // Dashed formats
    const todayDashed1 = dd + '-' + mm + '-' + yyyy;
    const todayDashed2 = dVal + '-' + mVal + '-' + yyyy;
    const todayDashed3 = dd + '-' + mVal + '-' + yyyy;
    const todayDashed4 = dVal + '-' + mm + '-' + yyyy;

    // Slashed formats
    const todaySlashed1 = dd + '/' + mm + '/' + yyyy;
    const todaySlashed2 = dVal + '/' + mVal + '/' + yyyy;
    const todaySlashed3 = dd + '/' + mVal + '/' + yyyy;
    const todaySlashed4 = dVal + '/' + mm + '/' + yyyy;

    const isToday = (dateStr) => {
      if (!dateStr) return false;
      const clean = dateStr.trim();
      return clean === todayISO1 || 
             clean === todayISO2 || 
             clean === todayISO3 || 
             clean === todayISO4 || 
             clean === todayDashed1 || 
             clean === todayDashed2 || 
             clean === todayDashed3 || 
             clean === todayDashed4 || 
             clean === todaySlashed1 || 
             clean === todaySlashed2 || 
             clean === todaySlashed3 || 
             clean === todaySlashed4;
    };

    let totalEarningsCalculated = 0;
    let todayEarning = 0;
    let cashEarning = 0;
    let onlineEarning = 0;

    for (const o of adminOrders) {
      const amount = parseFloat(o.serviceAmount || 0);
      const partnerShare = amount * 0.75;
      const isCash = (o.paymentMethod || '').toLowerCase() === 'cash';
      
      totalEarningsCalculated += partnerShare;
      if (isToday(o.serviceDate)) {
        todayEarning += partnerShare;
      }
      if (isCash) {
        cashEarning += partnerShare;
      } else {
        onlineEarning += partnerShare;
      }
    }

    for (const o of v2Orders) {
      const amount = parseFloat(o.price || 0);
      const partnerShare = amount * 0.75;
      
      let isCash = false;
      try {
        const payObj = typeof o.payment === 'string' ? JSON.parse(o.payment) : (o.payment || {});
        isCash = (payObj.paymentMethod || '').toLowerCase() === 'cash';
      } catch(e) {}

      totalEarningsCalculated += partnerShare;
      if (isToday(o.date)) {
        todayEarning += partnerShare;
      }
      if (isCash) {
        cashEarning += partnerShare;
      } else {
        onlineEarning += partnerShare;
      }
    }

    res.json({
      totalEarning: Math.round(totalEarningsCalculated),
      todayEarning: Math.round(todayEarning),
      monthlyEarning: Math.round(totalEarningsCalculated),
      onlineEarning: Math.round(onlineEarning),
      cashEarning: Math.round(cashEarning),
      payToCompany: parseFloat(req.partner.payToCompany || 0),
      walletBalance: parseFloat(req.partner.walletBalance || 0)
    });
  } catch (error) {
    console.error('Error calculating partner earnings:', error);
    res.json({
      totalEarning: Math.round(totalVal),
      todayEarning: Math.round(totalVal * 0.4),
      monthlyEarning: Math.round(totalVal * 0.6),
      onlineEarning: Math.round(totalVal * 0.6 * 0.75),
      cashEarning: Math.round(totalVal * 0.4 * 0.75),
      payToCompany: parseFloat(req.partner.payToCompany || 0),
      walletBalance: parseFloat(req.partner.walletBalance || 0)
    });
  }
});`;

// 2. Target block for /partner/dashboard
const targetDashboard = `// GET /api/partner/dashboard - Fetch all partner dashboard details (verification, stats, earnings, banners)
router.get('/partner/dashboard', authenticatePartner, async (req, res) => {
  const partnerId = req.partner.id;
  const partnerName = req.partner.name;
  const isPaid = req.partner.isPaid === 1;
  const isApproved = req.partner.isApproved === 1;

  // 1. Fetch active banners
  let banners = [];
  try {
    const [bannersRes] = await db.query('SELECT image FROM banners WHERE status = 1');
    banners = bannersRes.map(b => {
      if (!b.image) return '';
      if (b.image.startsWith('http://') || b.image.startsWith('https://')) {
        return b.image;
      }
      return \`\${req.protocol}://\${req.get('host')}/uploads/banners/\${b.image}\`;
    }).filter(Boolean);
  } catch (err) {
    console.error('Error fetching banners:', err);
  }



  // If partner is not paid or not approved, return default blank counts
  if (!isPaid || !isApproved) {
    // Generate dynamic Razorpay Order ID for unpaid partners
    let razorpayOrderId = null;
    let paymentUrl = null;
    if (!isPaid) {
      razorpayOrderId = await createRazorpayOrder(partnerId);
      paymentUrl = \`\${req.protocol}://\${req.get('host')}/api/partner/pay-redirect?partnerId=\${partnerId}\`;
    }

    return res.json({
      id: partnerId,
      isPaid,
      isApproved,
      razorpayKeyId: getRazorpayKeyId(),
      razorpayOrderId: razorpayOrderId,
      paymentUrl: paymentUrl,
      bookingsStats: {
        totalBooking: 0,
        upcomingBooking: 0,
        inProgressBooking: 0,
        acceptedBooking: 0,
        completedBooking: 0,
        cancelBooking: 0
      },
      earningsStats: {
        totalEarning: 0,
        todayEarning: 0,
        monthlyEarning: 0,
        onlineEarning: 0,
        cashEarning: 0,
        payToCompany: 0,
        walletBalance: 0
      },
      banners
    });
  }

  try {
    // 2. Fetch booking stats
    const [assignedRes] = await db.query('SELECT status FROM orders WHERE vendorName = ?', [partnerName]);
    const [pendingRes] = await db.query(
      \`SELECT status FROM orders 
       WHERE status = 'Pending' 
         AND (vendorName IS NULL OR vendorName = '-' OR vendorName = '') 
         AND city = ? 
         AND locality = ?\`,
      [req.partner.city, req.partner.locality]
    );

    const totalBooking = assignedRes.length + pendingRes.length;
    const upcomingBooking = pendingRes.length;

    const acceptedBooking = assignedRes.filter(o => {
      const statusLower = (o.status || '').toLowerCase();
      return statusLower === 'assigned' || statusLower === 'upcoming' || statusLower === 'in progress' || statusLower === 'in_progress';
    }).length;

    const inProgressBooking = assignedRes.filter(o => {
      const statusLower = (o.status || '').toLowerCase();
      return statusLower === 'in progress' || statusLower === 'in_progress';
    }).length;

    const completedBooking = assignedRes.filter(o => {
      const statusLower = (o.status || '').toLowerCase();
      return statusLower === 'completed' || statusLower === 'complete';
    }).length;

    const cancelBooking = assignedRes.filter(o => {
      const statusLower = (o.status || '').toLowerCase();
      return statusLower === 'cancelled' || statusLower === 'rejected';
    }).length;

    // 3. Fetch earnings stats
    const walletVal = parseFloat(req.partner.walletBalance || 0);
    const totalVal = parseFloat(req.partner.totalEarnings || 0);

    const [ordersRes] = await db.query(
      "SELECT SUM(serviceAmount) as totalAmount FROM orders WHERE vendorName = ? AND status = 'Completed'",
      [partnerName]
    );

    const calculatedTotal = parseFloat(ordersRes[0].totalAmount || 0);
    const totalEarning = calculatedTotal;
    
    const todayStr = new Date().toLocaleDateString('en-IN');
    const [todayRes] = await db.query(
      "SELECT SUM(serviceAmount) as amount FROM orders WHERE vendorName = ? AND status = 'Completed' AND serviceDate = ?",
      [partnerName, todayStr]
    );
    const todayEarning = Math.round(parseFloat(todayRes[0].amount || 0));

    const [monthRes] = await db.query(
      "SELECT SUM(serviceAmount) as amount FROM orders WHERE vendorName = ? AND status = 'Completed'",
      [partnerName]
    );
    const monthlyEarning = Math.round(parseFloat(monthRes[0].amount || 0));

    // Calculate cash earnings (partner's share, i.e., 75% of cash bookings total)
    const [cashRes] = await db.query(
      "SELECT SUM(serviceAmount) as totalAmount FROM orders WHERE vendorName = ? AND status = 'Completed' AND paymentMethod = 'Cash'",
      [partnerName]
    );
    const cashTotal = parseFloat(cashRes[0].totalAmount || 0);
    const cashEarning = Math.round(cashTotal * 0.75);

    // Calculate online earnings (partner's share, i.e., 75% of online bookings total)
    const [onlineRes] = await db.query(
      "SELECT SUM(serviceAmount) as totalAmount FROM orders WHERE vendorName = ? AND status = 'Completed' AND paymentMethod != 'Cash'",
      [partnerName]
    );
    const onlineTotal = parseFloat(onlineRes[0].totalAmount || 0);
    const onlineEarning = Math.round(onlineTotal * 0.75);

    res.json({
      id: partnerId,
      isPaid,
      isApproved,
      razorpayKeyId: getRazorpayKeyId(),
      bookingsStats: {
        totalBooking,
        upcomingBooking,
        inProgressBooking,
        acceptedBooking,
        completedBooking,
        cancelBooking
      },
      earningsStats: {
        totalEarning: Math.round(totalEarning),
        todayEarning,
        monthlyEarning,
        onlineEarning,
        cashEarning,
        payToCompany: parseFloat(req.partner.payToCompany || 0),
        walletBalance: parseFloat(req.partner.walletBalance || 0)
      },
      banners
    });
  } catch (error) {
    console.error('Error loading partner dashboard data:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard details: ' + error.message });
  }
});`;

const replacementDashboard = `// GET /api/partner/dashboard - Fetch all partner dashboard details (verification, stats, earnings, banners)
router.get('/partner/dashboard', authenticatePartner, async (req, res) => {
  const partnerId = req.partner.id;
  const partnerName = req.partner.name;
  const isPaid = req.partner.isPaid === 1;
  const isApproved = req.partner.isApproved === 1;

  // 1. Fetch active banners
  let banners = [];
  try {
    const [bannersRes] = await db.query('SELECT image FROM banners WHERE status = 1');
    banners = bannersRes.map(b => {
      if (!b.image) return '';
      if (b.image.startsWith('http://') || b.image.startsWith('https://')) {
        return b.image;
      }
      return \`\${req.protocol}://\${req.get('host')}/uploads/banners/\${b.image}\`;
    }).filter(Boolean);
  } catch (err) {
    console.error('Error fetching banners:', err);
  }



  // If partner is not paid or not approved, return default blank counts
  if (!isPaid || !isApproved) {
    // Generate dynamic Razorpay Order ID for unpaid partners
    let razorpayOrderId = null;
    let paymentUrl = null;
    if (!isPaid) {
      razorpayOrderId = await createRazorpayOrder(partnerId);
      paymentUrl = \`\${req.protocol}://\${req.get('host')}/api/partner/pay-redirect?partnerId=\${partnerId}\`;
    }

    return res.json({
      id: partnerId,
      isPaid,
      isApproved,
      razorpayKeyId: getRazorpayKeyId(),
      razorpayOrderId: razorpayOrderId,
      paymentUrl: paymentUrl,
      bookingsStats: {
        totalBooking: 0,
        upcomingBooking: 0,
        inProgressBooking: 0,
        acceptedBooking: 0,
        completedBooking: 0,
        cancelBooking: 0
      },
      earningsStats: {
        totalEarning: 0,
        todayEarning: 0,
        monthlyEarning: 0,
        onlineEarning: 0,
        cashEarning: 0,
        payToCompany: 0,
        walletBalance: 0
      },
      banners
    });
  }

  try {
    // 2. Fetch booking stats (combining both orders and orders_v2 tables)
    const [assignedRowsV2] = await db.query('SELECT status FROM orders_v2 WHERE partnerName = ?', [partnerName]);
    const [assignedRowsAdmin] = await db.query('SELECT status FROM orders WHERE vendorName = ?', [partnerName]);

    // Fetch pending bookings from both tables for proximity check
    const [pendingRowsV2] = await db.query(
      \`SELECT * FROM orders_v2 
       WHERE (status = 'Pending' OR bookingStatus = 'searching') 
         AND (partnerName IS NULL OR partnerName = '')\`
    );
    const [pendingRowsAdmin] = await db.query(
      \`SELECT * FROM orders 
       WHERE status = 'Pending' 
         AND (vendorName IS NULL OR vendorName = '-' OR vendorName = '')\`
    );

    // Proximity helpers
    const partnerLat = parseFloat(req.partner.latitude);
    const partnerLon = parseFloat(req.partner.longitude);
    const hasCoords = !isNaN(partnerLat) && !isNaN(partnerLon);
    const RADIUS_KM = 10;

    function distKm(la1, lo1, la2, lo2) {
      const R = 6371, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180;
      const a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
      return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    }

    function parseAddrV2(o) {
      try { return typeof o.address === 'string' ? JSON.parse(o.address) : (o.address||{}); }
      catch(e) { return {}; }
    }

    function nearbyV2(o) {
      const a = parseAddrV2(o);
      const oLa = parseFloat(a.latitude), oLo = parseFloat(a.longitude);
      if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) return distKm(partnerLat,partnerLon,oLa,oLo)<=RADIUS_KM;
      return ((a.city||'').toLowerCase()).includes((req.partner.city||'').toLowerCase()) ||
             ((req.partner.city||'').toLowerCase()).includes((a.city||'').toLowerCase());
    }

    function nearbyAdmin(o) {
      const oLa = parseFloat(o.latitude), oLo = parseFloat(o.longitude);
      if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) return distKm(partnerLat,partnerLon,oLa,oLo)<=RADIUS_KM;
      return ((o.city||'').toLowerCase()).includes((req.partner.city||'').toLowerCase()) ||
             ((o.city||'').toLowerCase()).includes((o.city||'').toLowerCase());
    }

    const filteredPendingV2 = pendingRowsV2.filter(nearbyV2);
    const filteredPendingAdmin = pendingRowsAdmin.filter(nearbyAdmin);

    const totalBooking = assignedRowsV2.length + assignedRowsAdmin.length + filteredPendingV2.length + filteredPendingAdmin.length;
    const upcomingBooking = filteredPendingV2.length + filteredPendingAdmin.length;

    const allAssigned = [
      ...assignedRowsV2.map(o => ({ status: o.status })),
      ...assignedRowsAdmin.map(o => ({ status: o.status }))
    ];

    const acceptedBooking = allAssigned.filter(o => {
      const statusLower = (o.status || '').toLowerCase();
      return statusLower === 'assigned' || statusLower === 'upcoming' || statusLower === 'in progress' || statusLower === 'in_progress';
    }).length;

    const inProgressBooking = allAssigned.filter(o => {
      const statusLower = (o.status || '').toLowerCase();
      return statusLower === 'in progress' || statusLower === 'in_progress';
    }).length;

    const completedBooking = allAssigned.filter(o => {
      const statusLower = (o.status || '').toLowerCase();
      return statusLower === 'completed' || statusLower === 'complete';
    }).length;

    const cancelBooking = allAssigned.filter(o => {
      const statusLower = (o.status || '').toLowerCase();
      return statusLower === 'cancelled' || statusLower === 'rejected';
    }).length;

    // 3. Fetch earnings stats (combining both orders and orders_v2 tables)
    const [adminOrders] = await db.query(
      "SELECT serviceAmount, paymentMethod, serviceDate FROM orders WHERE vendorName = ? AND status = 'Completed'",
      [partnerName]
    );

    const [v2Orders] = await db.query(
      "SELECT price, payment, date FROM orders_v2 WHERE partnerName = ? AND status = 'Completed'",
      [partnerName]
    );

    // Helper functions for date matching in IST
    const today = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + istOffset + (new Date().getTimezoneOffset() * 60000));
    
    const yyyy = todayIST.getFullYear();
    const mm = String(todayIST.getMonth() + 1).padStart(2, '0');
    const dd = String(todayIST.getDate()).padStart(2, '0');
    
    const dVal = todayIST.getDate();
    const mVal = todayIST.getMonth() + 1;

    // ISO formats
    const todayISO1 = yyyy + '-' + mm + '-' + dd;
    const todayISO2 = yyyy + '-' + mVal + '-' + dVal;
    const todayISO3 = yyyy + '-' + mm + '-' + dVal;
    const todayISO4 = yyyy + '-' + mVal + '-' + dd;

    // Dashed formats
    const todayDashed1 = dd + '-' + mm + '-' + yyyy;
    const todayDashed2 = dVal + '-' + mVal + '-' + yyyy;
    const todayDashed3 = dd + '-' + mVal + '-' + yyyy;
    const todayDashed4 = dVal + '-' + mm + '-' + yyyy;

    // Slashed formats
    const todaySlashed1 = dd + '/' + mm + '/' + yyyy;
    const todaySlashed2 = dVal + '/' + mVal + '/' + yyyy;
    const todaySlashed3 = dd + '/' + mVal + '/' + yyyy;
    const todaySlashed4 = dVal + '/' + mm + '/' + yyyy;

    const isToday = (dateStr) => {
      if (!dateStr) return false;
      const clean = dateStr.trim();
      return clean === todayISO1 || 
             clean === todayISO2 || 
             clean === todayISO3 || 
             clean === todayISO4 || 
             clean === todayDashed1 || 
             clean === todayDashed2 || 
             clean === todayDashed3 || 
             clean === todayDashed4 || 
             clean === todaySlashed1 || 
             clean === todaySlashed2 || 
             clean === todaySlashed3 || 
             clean === todaySlashed4;
    };

    let totalEarningsCalculated = 0;
    let todayEarning = 0;
    let cashEarning = 0;
    let onlineEarning = 0;

    for (const o of adminOrders) {
      const amount = parseFloat(o.serviceAmount || 0);
      const partnerShare = amount * 0.75;
      const isCash = (o.paymentMethod || '').toLowerCase() === 'cash';
      
      totalEarningsCalculated += partnerShare;
      if (isToday(o.serviceDate)) {
        todayEarning += partnerShare;
      }
      if (isCash) {
        cashEarning += partnerShare;
      } else {
        onlineEarning += partnerShare;
      }
    }

    for (const o of v2Orders) {
      const amount = parseFloat(o.price || 0);
      const partnerShare = amount * 0.75;
      
      let isCash = false;
      try {
        const payObj = typeof o.payment === 'string' ? JSON.parse(o.payment) : (o.payment || {});
        isCash = (payObj.paymentMethod || '').toLowerCase() === 'cash';
      } catch(e) {}

      totalEarningsCalculated += partnerShare;
      if (isToday(o.date)) {
        todayEarning += partnerShare;
      }
      if (isCash) {
        cashEarning += partnerShare;
      } else {
        onlineEarning += partnerShare;
      }
    }

    res.json({
      id: partnerId,
      isPaid,
      isApproved,
      razorpayKeyId: getRazorpayKeyId(),
      bookingsStats: {
        totalBooking,
        upcomingBooking,
        inProgressBooking,
        acceptedBooking,
        completedBooking,
        cancelBooking
      },
      earningsStats: {
        totalEarning: Math.round(totalEarningsCalculated),
        todayEarning: Math.round(todayEarning),
        monthlyEarning: Math.round(totalEarningsCalculated),
        onlineEarning: Math.round(onlineEarning),
        cashEarning: Math.round(cashEarning),
        payToCompany: parseFloat(req.partner.payToCompany || 0),
        walletBalance: parseFloat(req.partner.walletBalance || 0)
      },
      banners
    });
  } catch (error) {
    console.error('Error loading partner dashboard data:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard details: ' + error.message });
  }
});`;

// Normalize line endings to avoid matching issues
const norm = (s) => s.replace(/\r\n/g, '\n').trim();

const normCode = norm(code);
const normTargetEarnings = norm(targetEarnings);
const normTargetDashboard = norm(targetDashboard);

if (!normCode.includes(normTargetEarnings)) {
  console.error("Error: Target block for earnings not found!");
  process.exit(1);
}

if (!normCode.includes(normTargetDashboard)) {
  console.error("Error: Target block for dashboard not found!");
  process.exit(1);
}

let newCode = normCode.replace(normTargetEarnings, norm(replacementEarnings));
newCode = newCode.replace(normTargetDashboard, norm(replacementDashboard));

fs.writeFileSync(filePath, newCode, 'utf8');
console.log("Successfully replaced both routes in partner.js!");
process.exit(0);
