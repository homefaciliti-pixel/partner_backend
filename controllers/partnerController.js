const db = require('../db');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { saveFileToDb } = require('../filePersistence');
const {
  getRazorpayKeyId,
  createRazorpayOrder,
  resolveDocUrl,
  mapPartnerForApp,
  getFilteredBookingsList
} = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'home_faciliti_partner_secret_key_2026';

// Multer storage for profile image updates
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.png', '.jpg', '.jpeg'];
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPG, and JPEG images are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// GET /api/partner/profile
exports.getProfile = (req, res) => {
  res.json({
    partner: mapPartnerForApp(req.partner, req)
  });
};

// PUT /api/partner/profile
exports.updateProfile = (req, res) => {
  upload.single('profileImage')(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { name, email, address, state, city, locality, category, subCategory, services } = req.body;
    const partnerId = req.partner.id;

    try {
      const fields = [];
      const values = [];

      if (name !== undefined) { fields.push('`name` = ?'); values.push(name); }
      if (email !== undefined) { fields.push('`email` = ?'); values.push(email); }
      if (address !== undefined) { fields.push('`address` = ?'); values.push(address); }
      if (state !== undefined) { fields.push('`state` = ?'); values.push(state); }
      if (city !== undefined) { fields.push('`city` = ?'); values.push(city); }
      if (locality !== undefined) { fields.push('`locality` = ?'); values.push(locality); }
      if (category !== undefined) { fields.push('`category` = ?'); values.push(category); }
      if (subCategory !== undefined) { fields.push('`subCategory` = ?'); values.push(subCategory); }
      if (services !== undefined) { fields.push('`services` = ?'); values.push(services); }

      if (req.file) {
        await saveFileToDb(req.file.filename, req.file.path, req.file.mimetype);
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        fields.push('`image` = ?');
        values.push(imageUrl);
      }

      if (fields.length === 0) {
        const [updatedRows] = await db.query('SELECT * FROM partners WHERE id = ?', [partnerId]);
        return res.json({
          partner: mapPartnerForApp(updatedRows[0], req)
        });
      }

      values.push(partnerId);
      const query = `UPDATE partners SET ${fields.join(', ')} WHERE id = ?`;
      await db.query(query, values);

      const [updatedRows] = await db.query('SELECT * FROM partners WHERE id = ?', [partnerId]);
      res.json({
        partner: mapPartnerForApp(updatedRows[0], req)
      });
    } catch (dbErr) {
      console.error('Error updating partner profile:', dbErr);
      res.status(500).json({ error: 'Database update failed: ' + dbErr.message });
    }
  });
};

// POST /api/partner/pay-registration
exports.payRegistration = async (req, res) => {
  const { partnerId: bodyPartnerId, paymentMethod: bodyPaymentMethod, transactionId: bodyTransactionId } = req.body;
  const partnerId = bodyPartnerId || req.partner.id;

  if (!partnerId) {
    return res.status(400).json({ error: 'partnerId is required to process the registration fee' });
  }

  const paymentMethod = bodyPaymentMethod || 'Razorpay';
  const transactionId = bodyTransactionId;

  try {
    const [partnerRows] = await db.query('SELECT * FROM partners WHERE id = ?', [partnerId]);
    if (partnerRows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    const partner = partnerRows[0];
    const partnerName = partner.name;
    const todayStr = new Date().toLocaleDateString('en-IN');

    const razorpayOrderId = await createRazorpayOrder(partnerId);
    const paymentUrl = `${req.protocol}://${req.get('host')}/api/partner/pay-redirect?partnerId=${partnerId}`;

    if (transactionId) {
      await db.query('UPDATE partners SET isPaid = 1 WHERE id = ?', [partnerId]);
      await db.query(
        `INSERT INTO subscription_earnings (partnerName, amount, paymentMethod, purchaseDate, status) 
         VALUES (?, 500.00, ?, ?, 'Paid')`,
        [partnerName, paymentMethod, todayStr]
      );
      const [rows] = await db.query('SELECT * FROM partners WHERE id = ?', [partnerId]);

      res.json({
        success: true,
        message: '₹500 registration payment received successfully! You can access the dashboard once approved by the admin.',
        amount: 500,
        razorpayKeyId: getRazorpayKeyId(),
        razorpayOrderId: razorpayOrderId,
        paymentUrl: null,
        partner: mapPartnerForApp(rows[0], req)
      });
    } else {
      res.json({
        success: true,
        message: 'Registration fee checkout initiated successfully.',
        amount: 500,
        razorpayKeyId: getRazorpayKeyId(),
        razorpayOrderId: razorpayOrderId,
        paymentUrl: paymentUrl,
        partner: mapPartnerForApp(partner, req)
      });
    }
  } catch (error) {
    console.error('Error processing registration payment:', error);
    res.status(500).json({ error: 'Failed to process payment: ' + error.message });
  }
};

// GET & POST /api/payments/verify
exports.verifyPayment = async (req, res) => {
  const params = { ...req.query, ...req.body };
  const razorpay_payment_id = params.razorpay_payment_id || params.payment_id;
  const razorpay_order_id = params.razorpay_order_id || params.order_id || params.razorpayOrderId || params.orderId;
  const razorpay_signature = params.razorpay_signature || params.signature;
  const razorpay_payment_link_id = params.razorpay_payment_link_id || params.payment_link_id;
  const razorpay_payment_link_reference_id = params.razorpay_payment_link_reference_id || params.payment_link_reference_id;
  const razorpay_payment_link_status = params.razorpay_payment_link_status || params.payment_link_status;
  
  let partnerId = params.partnerId;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const keyId = getRazorpayKeyId();

  const renderHtmlResponse = (isSuccess, title, message) => {
    res.setHeader('Content-Type', 'text/html');
    res.status(isSuccess ? 200 : 400).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Superhome</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Outfit', sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; color: #1e293b; }
    .card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 40px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); text-align: center; max-width: 420px; width: 90%; }
    .icon-container { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 24px; }
    .success-icon { background-color: #dcfce7; color: #22c55e; }
    .error-icon { background-color: #fee2e2; color: #ef4444; }
    h1 { font-size: 26px; font-weight: 700; margin: 0 0 12px; color: ${isSuccess ? '#0b5fa5' : '#ef4444'}; }
    p { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0 0 32px; }
    .btn { display: inline-block; background-color: ${isSuccess ? '#0b5fa5' : '#64748b'}; color: white; text-decoration: none; padding: 14px 36px; border-radius: 30px; font-weight: 600; font-size: 16px; cursor: pointer; border: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container ${isSuccess ? 'success-icon' : 'error-icon'}">${isSuccess ? '✓' : '✕'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <button onclick="window.close();" class="btn">Close</button>
  </div>
</body>
</html>
    `);
  };

  let verified = false;
  let resolvedPartnerId = partnerId;

  if (razorpay_order_id) {
    const isMockOrder = !secret || secret === 'your_razorpay_secret_key' || razorpay_order_id.startsWith('order_mock_') || razorpay_order_id.startsWith('order_failed_') || razorpay_order_id.startsWith('order_error_');
    if (isMockOrder) {
      verified = true;
      const match = razorpay_order_id.match(/^order_mock_(\d+)_/);
      if (match) resolvedPartnerId = parseInt(match[1], 10);
    } else {
      try {
        const authBase64 = Buffer.from(`${keyId}:${secret}`).toString('base64');
        const fetchResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
          headers: { 'Authorization': `Basic ${authBase64}` }
        });
        if (fetchResponse.ok) {
          const orderData = await fetchResponse.json();
          if (orderData.status === 'paid') {
            verified = true;
            if (orderData.notes && orderData.notes.partnerId) {
              resolvedPartnerId = parseInt(orderData.notes.partnerId, 10);
            } else if (orderData.notes && orderData.notes.partner_id) {
              resolvedPartnerId = parseInt(orderData.notes.partner_id, 10);
            } else if (orderData.receipt) {
              const match = orderData.receipt.match(/^receipt_partner_(\d+)/);
              if (match) resolvedPartnerId = parseInt(match[1], 10);
            }
          }
        }
      } catch (fetchErr) {
        console.error('Error verifying order status from Razorpay:', fetchErr);
      }
    }
  }

  if (!verified && secret && razorpay_signature) {
    if (razorpay_order_id && razorpay_payment_id) {
      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const expected = crypto.createHmac('sha256', secret).update(text).digest('hex');
      if (expected === razorpay_signature) verified = true;
    }
  }

  if (!verified) {
    if (req.method === 'GET') {
      return renderHtmlResponse(false, 'Verification Failed', 'The payment verification failed. If your payment was deducted, please contact support.');
    }
    return res.status(400).json({ error: 'Invalid Razorpay payment verification failed' });
  }

  if (!resolvedPartnerId && razorpay_payment_id && secret) {
    try {
      const authBase64 = Buffer.from(`${keyId}:${secret}`).toString('base64');
      const fetchResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: { 'Authorization': `Basic ${authBase64}` }
      });
      if (fetchResponse.ok) {
        const payment = await fetchResponse.json();
        if (payment.notes && payment.notes.partner_id) {
          resolvedPartnerId = parseInt(payment.notes.partner_id, 10);
        } else if (payment.contact) {
          const last10 = payment.contact.replace(/\D/g, '').slice(-10);
          const [lookupRows] = await db.query('SELECT id FROM partners WHERE mobile LIKE ?', [`%${last10}`]);
          if (lookupRows.length > 0) resolvedPartnerId = lookupRows[0].id;
        }
      }
    } catch (e) {}
  }

  if (!resolvedPartnerId) {
    if (req.method === 'GET') {
      return renderHtmlResponse(false, 'Partner Resolution Failed', 'We could not resolve your partner account from payment details.');
    }
    return res.status(400).json({ error: 'partnerId is required or could not be resolved from payment' });
  }

  const todayStr = new Date().toLocaleDateString('en-IN');
  try {
    const [partnerRows] = await db.query('SELECT * FROM partners WHERE id = ?', [resolvedPartnerId]);
    if (partnerRows.length === 0) {
      if (req.method === 'GET') return renderHtmlResponse(false, 'Partner Not Found', 'Account not found.');
      return res.status(404).json({ error: 'Partner not found' });
    }
    const partner = partnerRows[0];

    await db.query('UPDATE partners SET isPaid = 1 WHERE id = ?', [resolvedPartnerId]);
    await db.query(
      `INSERT INTO subscription_earnings (partnerName, amount, paymentMethod, purchaseDate, status) 
       VALUES (?, 500.00, 'Razorpay', ?, 'Paid')`,
      [partner.name, todayStr]
    );

    const [rows] = await db.query('SELECT * FROM partners WHERE id = ?', [resolvedPartnerId]);

    if (req.method === 'GET') {
      return renderHtmlResponse(true, 'Payment Successful!', 'Your registration fee of ₹500 has been successfully received. You can now return to the app.');
    }

    const razorpayOrderId = await createRazorpayOrder(resolvedPartnerId);
    res.json({
      success: true,
      message: 'Razorpay payment verified and partner account activated successfully!',
      amount: 500,
      razorpayKeyId: getRazorpayKeyId(),
      razorpayOrderId: razorpayOrderId,
      partner: mapPartnerForApp(rows[0], req)
    });
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    if (req.method === 'GET') return renderHtmlResponse(false, 'Server Error', error.message);
    res.status(500).json({ error: 'Failed to verify payment: ' + error.message });
  }
};

// GET /api/partner/pay-redirect
exports.payRedirect = async (req, res) => {
  const { partnerId } = req.query;
  if (!partnerId) {
    return res.status(400).send('partnerId query parameter is required');
  }

  try {
    const [rows] = await db.query('SELECT * FROM partners WHERE id = ?', [partnerId]);
    if (rows.length === 0) {
      return res.status(404).send('Partner not found');
    }

    const partner = rows[0];
    const keyId = getRazorpayKeyId();
    const secret = process.env.RAZORPAY_KEY_SECRET;

    const razorpayOrderId = await createRazorpayOrder(partner.id);
    const isMockOrder = !secret || secret === 'your_razorpay_secret_key' || razorpayOrderId.startsWith('order_mock_') || razorpayOrderId.startsWith('order_failed_') || razorpayOrderId.startsWith('order_error_');

    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment - Superhome Partner</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Outfit', sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; color: #1e293b; padding: 20px; box-sizing: border-box; }
    .card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 40px 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); max-width: 400px; width: 100%; text-align: center; }
    .spinner { border: 4px solid rgba(0, 0, 0, 0.05); width: 50px; height: 50px; border-radius: 50%; border-left-color: #0b5fa5; animation: spin 1s linear infinite; margin: 0 auto 24px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
    p { font-size: 15px; color: #64748b; line-height: 1.6; margin: 0 0 24px; }
    .btn { background: linear-gradient(135deg, #0b5fa5 0%, #1e40af 100%); color: white; border: none; padding: 14px 28px; font-size: 16px; font-weight: 600; border-radius: 14px; cursor: pointer; width: 100%; box-sizing: border-box; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <h1 id="status-title">Preparing Checkout</h1>
    <p id="status-desc">Please wait while we connect to secure payment gateway...</p>
    <button id="pay-btn" class="btn" style="display: none;">Pay ₹500 Now</button>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    const isMock = ${isMockOrder};
    if (isMock) {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('status-title').innerText = 'Payment Simulator';
      document.getElementById('status-desc').innerText = 'Click below to simulate payment.';
      const card = document.querySelector('.card');
      const successBtn = document.createElement('button');
      successBtn.className = 'btn';
      successBtn.innerText = 'Simulate Success';
      successBtn.onclick = function() {
        window.location.href = '/api/payments/verify?razorpay_payment_id=pay_mock_' + Math.random().toString(36).substring(2, 10) + '&razorpay_order_id=${razorpayOrderId}&partnerId=${partner.id}';
      };
      card.appendChild(successBtn);
    } else {
      const options = {
        key: "${keyId}",
        amount: 50000,
        currency: "INR",
        name: "Superhome",
        description: "Partner Registration Fee",
        order_id: "${razorpayOrderId}",
        prefill: {
          name: "${partner.name || ''}",
          email: "${partner.email || ''}",
          contact: "${partner.mobile || ''}"
        },
        handler: function (response) {
          window.location.href = '/api/payments/verify?razorpay_payment_id=' + encodeURIComponent(response.razorpay_payment_id) + '&razorpay_order_id=' + encodeURIComponent(response.razorpay_order_id) + '&razorpay_signature=' + encodeURIComponent(response.razorpay_signature) + '&partnerId=${partner.id}';
        }
      };
      const rzp = new Razorpay(options);
      window.onload = function() { rzp.open(); };
    }
  </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('Error in payRedirect:', error);
    res.status(500).send('Failed to redirect to payment: ' + error.message);
  }
};

// GET /api/partner/dashboard
exports.getDashboard = async (req, res) => {
  const partnerId = req.partner.id;
  const partnerName = req.partner.name;
  const isPaid = req.partner.isPaid === 1;
  const isApproved = req.partner.isApproved === 1;

  let banners = [];
  try {
    const [bannersRes] = await db.query('SELECT image FROM banners WHERE status = 1');
    banners = bannersRes.map(b => {
      if (!b.image) return '';
      if (b.image.startsWith('http://') || b.image.startsWith('https://')) return b.image;
      return `${req.protocol}://${req.get('host')}/uploads/banners/${b.image}`;
    }).filter(Boolean);
  } catch (err) {
    console.error('Error fetching banners:', err);
  }

  if (!isPaid || !isApproved) {
    let razorpayOrderId = null;
    let paymentUrl = null;
    if (!isPaid) {
      razorpayOrderId = await createRazorpayOrder(partnerId);
      paymentUrl = `${req.protocol}://${req.get('host')}/api/partner/pay-redirect?partnerId=${partnerId}`;
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
        cancelBooking: 0,
        amcBooking: 0
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
    const allFiltered = await getFilteredBookingsList(req.partner);

    const totalBooking = allFiltered.length;
    const upcomingBooking = allFiltered.filter(b => b.status === 'pending').length;
    const acceptedBooking = allFiltered.filter(b => b.status === 'accepted' || b.status === 'in_progress').length;
    const inProgressBooking = allFiltered.filter(b => b.status === 'accepted' || b.status === 'in_progress').length;
    const completedBooking = allFiltered.filter(b => b.status === 'completed').length;
    const cancelBooking = allFiltered.filter(b => b.status === 'cancel').length;
    const amcBooking = allFiltered.filter(b => b.status === 'amc').length;

    const partnerMobile = req.partner.mobile;
    const dbWalletBalance = parseFloat(req.partner.walletBalance || 0);
    const dbTotalEarnings = parseFloat(req.partner.totalEarnings || 0);
    const dbPayToCompany = parseFloat(req.partner.payToCompany || 0);

    const [adminOrders] = await db.query(
      "SELECT serviceAmount, paymentMethod, serviceDate FROM orders WHERE (LOWER(TRIM(vendorName)) = LOWER(TRIM(?)) OR vendorMobile = ?) AND LOWER(status) = 'completed'",
      [partnerName, partnerMobile]
    );

    const [v2Orders] = await db.query(
      "SELECT price, payment, date FROM orders_v2 WHERE LOWER(TRIM(partnerName)) = LOWER(TRIM(?)) AND LOWER(status) = 'completed'",
      [partnerName]
    );

    let totalEarningsCalculated = 0;
    let todayEarning = 0;
    let cashEarning = 0;
    let onlineEarning = 0;

    for (const o of adminOrders) {
      const amount = parseFloat(o.serviceAmount || 0);
      const partnerShare = amount * 0.75;
      const isCash = (o.paymentMethod || '').toLowerCase() === 'cash';
      totalEarningsCalculated += partnerShare;
      if (isCash) cashEarning += partnerShare; else onlineEarning += partnerShare;
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
      if (isCash) cashEarning += partnerShare; else onlineEarning += partnerShare;
    }

    const finalTotalEarning = Math.max(Math.round(totalEarningsCalculated), Math.round(dbTotalEarnings));
    const finalMonthlyEarning = finalTotalEarning;
    const finalOnlineEarning = Math.max(Math.round(onlineEarning), Math.round(dbWalletBalance));
    const finalCashEarning = Math.max(Math.round(cashEarning), Math.round(dbPayToCompany));

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
        cancelBooking,
        amcBooking
      },
      earningsStats: {
        totalEarning: finalTotalEarning,
        todayEarning: Math.round(todayEarning),
        monthlyEarning: finalMonthlyEarning,
        onlineEarning: finalOnlineEarning,
        cashEarning: finalCashEarning,
        payToCompany: dbPayToCompany,
        walletBalance: dbWalletBalance
      },
      banners
    });
  } catch (error) {
    console.error('Error loading partner dashboard:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard: ' + error.message });
  }
};

// GET & POST /api/partner/approval-status
exports.checkApprovalStatus = async (req, res) => {
  try {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    if (!token) token = req.headers['token'] || req.headers['x-token'] || req.query.token || req.body.token;

    if (!token) return res.status(401).json({ error: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      decoded = jwt.decode(token);
      if (!decoded) return res.status(401).json({ error: 'Invalid token' });
    }

    const partnerId = decoded.id;
    const [rows] = await db.query('SELECT * FROM partners WHERE id = ?', [partnerId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Partner not found' });

    const partner = rows[0];
    const isApproved = partner.isApproved === 1;
    const isPaid = partner.isPaid === 1;

    res.json({
      success: true,
      id: parseInt(partner.id),
      name: partner.name,
      mobile: partner.mobile,
      email: partner.email,
      isApproved,
      isPaid,
      status: isApproved ? 'Approved' : 'Pending Approval',
      message: isApproved 
        ? 'Your account has been approved. You can now access the full dashboard.' 
        : 'Your documents are currently under review by the admin team. Please check back later.'
    });
  } catch (error) {
    console.error('Error checking approval status:', error);
    res.status(500).json({ error: 'Failed to retrieve approval status: ' + error.message });
  }
};

// POST & PUT /api/partner/status
exports.updatePartnerStatus = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { status, lat, lon, latitude, longitude, lng, time, locationTime, timestamp } = req.body;

    if (status === undefined) {
      return res.status(400).json({ error: 'Status field is required' });
    }

    const statusVal = (status === true || status === 'true' || status === 1 || status === '1' || status === 'active') ? 1 : 0;
    const latitudeVal = lat !== undefined ? lat : (latitude !== undefined ? latitude : req.query.lat);
    const longitudeVal = lon !== undefined ? lon : (longitude !== undefined ? longitude : (lng !== undefined ? lng : req.query.lon));
    const timeVal = time || locationTime || timestamp || req.query.time || new Date().toISOString();

    if (latitudeVal !== undefined && longitudeVal !== undefined) {
      await db.query(
        'UPDATE partners SET status = ?, latitude = ?, longitude = ?, locationTime = ? WHERE id = ?',
        [statusVal, String(latitudeVal), String(longitudeVal), String(timeVal), partnerId]
      );
    } else {
      await db.query('UPDATE partners SET status = ? WHERE id = ?', [statusVal, partnerId]);
    }

    const [rows] = await db.query(
      'SELECT id, name, mobile, email, status, latitude, longitude, locationTime FROM partners WHERE id = ?',
      [partnerId]
    );

    const updatedPartner = rows[0];
    return res.json({
      success: true,
      message: `Status updated to ${statusVal === 1 ? 'Online' : 'Offline'} successfully`,
      data: {
        id: updatedPartner.id,
        name: updatedPartner.name,
        mobile: updatedPartner.mobile,
        email: updatedPartner.email,
        status: updatedPartner.status === 1,
        latitude: updatedPartner.latitude,
        longitude: updatedPartner.longitude,
        locationTime: updatedPartner.locationTime
      }
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status: ' + error.message });
  }
};

// POST /api/partner/location
exports.updatePartnerLocation = async (req, res) => {
  try {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    if (!token) token = req.headers['token'] || req.headers['x-token'] || req.query.token || req.body.token;

    if (!token) return res.status(401).json({ error: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      decoded = jwt.decode(token);
      if (!decoded) return res.status(401).json({ error: 'Invalid token' });
    }

    const partnerId = req.body.partnerId || req.body.id || decoded.id;
    const lat = req.body.lat !== undefined ? req.body.lat : req.body.latitude;
    const lon = req.body.lon !== undefined ? req.body.lon : req.body.longitude;
    const timeVal = req.body.time || req.body.locationTime || new Date().toISOString();

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ error: 'Latitude and Longitude are required' });
    }

    await db.query(
      'UPDATE partners SET latitude = ?, longitude = ?, locationTime = ? WHERE id = ?',
      [String(lat), String(lon), String(timeVal), partnerId]
    );

    const [rows] = await db.query(
      'SELECT id, name, mobile, email, latitude, longitude, locationTime FROM partners WHERE id = ?',
      [partnerId]
    );

    return res.json({
      success: true,
      message: 'Location updated successfully',
      data: { ...rows[0], id: parseInt(rows[0].id) }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location: ' + error.message });
  }
};

// GET /api/partner/location
exports.getPartnerLocation = async (req, res) => {
  try {
    let partnerId = req.params.id || req.query.partnerId || req.query.id;
    if (!partnerId) {
      let token = null;
      const authHeader = req.headers['authorization'];
      if (authHeader) token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      if (!token) token = req.headers['token'] || req.query.token;
      if (token) {
        const decoded = jwt.decode(token);
        if (decoded) partnerId = decoded.id;
      }
    }

    if (!partnerId) return res.status(400).json({ error: 'Partner ID or token is required' });

    const [rows] = await db.query(
      'SELECT id, name, mobile, email, latitude, longitude, locationTime FROM partners WHERE id = ?',
      [partnerId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Partner not found' });

    const partner = rows[0];
    return res.json({
      success: true,
      id: parseInt(partner.id),
      name: partner.name,
      mobile: partner.mobile,
      email: partner.email,
      latitude: partner.latitude,
      longitude: partner.longitude,
      locationTime: partner.locationTime
    });
  } catch (error) {
    console.error('Error retrieving location:', error);
    res.status(500).json({ error: 'Failed to retrieve location: ' + error.message });
  }
};

// POST /api/partner/change-password
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'oldPassword and newPassword are required' });
  }

  const partnerId = req.partner.id;
  const currentHashed = req.partner.password;

  try {
    let isMatch = false;
    if (currentHashed && currentHashed.startsWith('$2')) {
      isMatch = await bcrypt.compare(oldPassword, currentHashed);
    } else {
      isMatch = (oldPassword === currentHashed || currentHashed === '');
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE partners SET password = ? WHERE id = ?', [hashedNew, partnerId]);
    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to update password: ' + error.message });
  }
};
