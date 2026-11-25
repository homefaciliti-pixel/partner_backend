const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { saveFileToDb } = require('../filePersistence');
const { JWT_SECRET } = require('../middleware/auth');
const {
  getIPSubnetPrefix,
  getRazorpayKeyId,
  createRazorpayOrder,
  formatPhoneForSMS,
  sendSMS,
  resolveDocUrl,
  mapPartnerForApp
} = require('../utils/helpers');

// Multer storage for registration documents
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
  
  if (ext === '.svg' || (file.mimetype && file.mimetype.toLowerCase().includes('svg'))) {
    return cb(new Error('SVG files are not allowed! Only PNG, JPG, and JPEG images are allowed.'), false);
  }

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPG, and JPEG images are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const partnerUpload = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  { name: 'panImage', maxCount: 1 },
  { name: 'policeVerification', maxCount: 1 }
]);

function getFileUrl(req, fileName) {
  if (!fileName) return '';
  return `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
}

// -------------------------------------------------------------
// POST /api/auth/register - Register a new partner
// -------------------------------------------------------------
exports.register = (req, res) => {
  partnerUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const normalizedBody = {};
    for (const key in req.body) {
      if (req.body[key] !== undefined && req.body[key] !== null) {
        const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]/g, '');
        normalizedBody[normalizedKey] = req.body[key];
      }
    }

    const nameVal = req.body.name || normalizedBody['name'] || '';
    const phoneRaw = req.body.phone || req.body.mobile || normalizedBody['phone'] || normalizedBody['mobile'] || '';
    let phoneVal = phoneRaw;
    if (phoneRaw) {
      let cleanedPhone = phoneRaw.replace(/\D/g, '');
      if (cleanedPhone.length > 10 && cleanedPhone.startsWith('91')) {
        cleanedPhone = cleanedPhone.substring(2);
      }
      if (cleanedPhone.length > 10) {
        cleanedPhone = cleanedPhone.slice(-10);
      }
      phoneVal = cleanedPhone;
    }
    const countryCodeVal = req.body.countryCode || req.body.countrycode || normalizedBody['countrycode'] || '+91';
    const emailVal = req.body.email || normalizedBody['email'] || '';
    const passwordVal = req.body.password || normalizedBody['password'] || '';
    const cityVal = req.body.city || normalizedBody['city'] || '';
    const stateVal = req.body.state || normalizedBody['state'] || '';
    const localityVal = req.body.locality || normalizedBody['locality'] || '';
    const addressVal = req.body.address || normalizedBody['address'] || '';

    const genderVal = req.body.gender || normalizedBody['gender'] || 'Male';
    const categoryVal = req.body.category || normalizedBody['category'] || '';
    const subCategoryVal = req.body.subCategory || normalizedBody['subcategory'] || '';
    const hasVehicleVal = req.body.hasVehicle || normalizedBody['hasvehicle'] || 'No';
    const servicesVal = req.body.services || normalizedBody['services'] || '';

    const aadharVal = req.body.aadharNumber || req.body.aadhaarNumber || normalizedBody['aadharnumber'] || normalizedBody['aadhaarnumber'] || normalizedBody['aadhar'] || normalizedBody['aadhaar'] || '';
    const panVal = req.body.panNumber || normalizedBody['pannumber'] || normalizedBody['pan'] || normalizedBody['pancard'] || '';
    const bankVal = req.body.bankName || normalizedBody['bankname'] || normalizedBody['bank'] || '';
    const accHolderVal = req.body.accountHolder || normalizedBody['accountholder'] || normalizedBody['accountholdername'] || normalizedBody['holdername'] || '';
    const accNumVal = req.body.accountNumber || normalizedBody['accountnumber'] || normalizedBody['accountno'] || normalizedBody['accnumber'] || normalizedBody['accno'] || '';
    const ifscVal = req.body.ifscCode || normalizedBody['ifsccode'] || normalizedBody['ifsc'] || '';

    if (!nameVal || !phoneVal || !emailVal || !passwordVal || !cityVal || !stateVal) {
      return res.status(400).json({ success: false, error: 'All primary fields (name, phone, email, password, city, state) are required' });
    }

    const profileImageName = req.files && req.files['profileImage'] ? req.files['profileImage'][0].filename : '';
    const aadharFrontName = req.files && req.files['aadharFront'] ? req.files['aadharFront'][0].filename : '';
    const aadharBackName = req.files && req.files['aadharBack'] ? req.files['aadharBack'][0].filename : '';
    const panImageName = req.files && req.files['panImage'] ? req.files['panImage'][0].filename : '';
    const policeVerificationName = req.files && req.files['policeVerification'] ? req.files['policeVerification'][0].filename : '';

    if (!profileImageName) {
      return res.status(400).json({ success: false, error: 'Profile image is required' });
    }
    if (!aadharFrontName) {
      return res.status(400).json({ success: false, error: 'Aadhaar Card Front image is required' });
    }
    if (!aadharBackName) {
      return res.status(400).json({ success: false, error: 'Aadhaar Card Back image is required' });
    }
    if (!panImageName) {
      return res.status(400).json({ success: false, error: 'PAN Card image is required' });
    }

    try {
      // Save uploaded files to DB for persistence
      const uploadPromises = [];
      if (req.files) {
        ['profileImage', 'aadharFront', 'aadharBack', 'panImage', 'policeVerification'].forEach(field => {
          if (req.files[field]) {
            const file = req.files[field][0];
            uploadPromises.push(saveFileToDb(file.filename, file.path, file.mimetype));
          }
        });
      }
      await Promise.all(uploadPromises);

      // Check if phone already exists
      const [existing] = await db.query('SELECT id FROM partners WHERE mobile = ? AND countryCode = ?', [phoneVal, countryCodeVal]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'Phone number already registered with this country code' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(passwordVal, 10);

      const profileImageUrl = getFileUrl(req, profileImageName);
      const aadharFrontUrl = getFileUrl(req, aadharFrontName);
      const aadharBackUrl = getFileUrl(req, aadharBackName);
      const panImageUrl = getFileUrl(req, panImageName);
      const policeVerificationUrl = getFileUrl(req, policeVerificationName);

      const docUrls = [aadharFrontUrl, aadharBackUrl, panImageUrl, policeVerificationUrl].filter(Boolean).join(',');
      const createdDate = new Date().toLocaleDateString('en-IN');

      const [result] = await db.query(
        `INSERT INTO partners (
          name, email, mobile, countryCode, city, state, locality, address, image,
          status, isApproved, gender, experience, services,
          aadhaarNumber, panNumber, bankName, accountNumber, ifscCode, documents,
          walletBalance, totalEarnings, withdrawnAmount,
          totalBookings, completedBookings, cancelledBookings, pendingBookings,
          rating, totalReviews, createdAt, password, aadharFront, aadharBack,
          panImage, policeVerificationImage, hasVehicle, category, subCategory, accountHolder, isPaid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, '0 Years', ?, ?, ?, ?, ?, ?, ?, 0.00, 0.00, 0.00, 0, 0, 0, 0, 0.0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          nameVal, emailVal, phoneVal, countryCodeVal, cityVal, stateVal, localityVal, addressVal, profileImageUrl,
          genderVal || 'Male', servicesVal || '', aadharVal, panVal,
          bankVal, accNumVal, ifscVal, docUrls, createdDate,
          hashedPassword, aadharFrontUrl, aadharBackUrl, panImageUrl, policeVerificationUrl,
          hasVehicleVal || 'No', categoryVal || '', subCategoryVal || '', accHolderVal
        ]
      );

      const newPartnerId = result.insertId;
      const [newPartnerRows] = await db.query('SELECT * FROM partners WHERE id = ?', [newPartnerId]);
      const mappedPartner = mapPartnerForApp(newPartnerRows[0], req);

      const token = jwt.sign({ id: mappedPartner.id, mobile: mappedPartner.phone }, JWT_SECRET);

      let razorpayOrderId = null;
      let paymentUrl = null;
      if (!mappedPartner.isPaid) {
        razorpayOrderId = await createRazorpayOrder(mappedPartner.id);
        paymentUrl = `${req.protocol}://${req.get('host')}/api/partner/pay-redirect?partnerId=${mappedPartner.id}`;
      }

      // Referral system integration
      const newPartnerCode = 'HF' + String(newPartnerId).padStart(6, '0');
      try {
        await db.query('UPDATE node_partners SET referral_code = ? WHERE id = ?', [newPartnerCode, newPartnerId]);
      } catch (e) {
        console.error('[REFERRAL] Error setting referral code:', e.message);
      }

      let referralCodeInput = req.body.referralCode || req.body.referral_code || normalizedBody['referralcode'] || '';
      if (!referralCodeInput || !referralCodeInput.trim()) {
        try {
          const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
          const ip = clientIp.split(',')[0].trim();
          const ipPrefix = getIPSubnetPrefix(ip);
          const [ipMatches] = await db.query(
            `SELECT referral_code FROM node_referrer_clicks 
             WHERE (ip_address = ? OR ip_address LIKE ?) AND created_at >= NOW() - INTERVAL 2 HOUR 
             ORDER BY created_at DESC LIMIT 1`,
            [ip, ipPrefix]
          );
          if (ipMatches.length > 0) {
            referralCodeInput = ipMatches[0].referral_code;
          }
        } catch (ipErr) {
          console.error('[REFERRAL AUTO-DETECT] IP lookup failed:', ipErr.message);
        }
      }

      if (referralCodeInput) {
        const refCode = referralCodeInput.trim().toUpperCase();
        if (refCode !== newPartnerCode) {
          try {
            const [refRows] = await db.query(
              `SELECT id FROM node_partners 
               WHERE (referral_code = ? OR CONCAT('HF', LPAD(id, 6, '0')) = ?) 
                 AND isApproved = 1 
               LIMIT 1`,
              [refCode, refCode]
            );
            if (refRows.length) {
              const referrerId = refRows[0].id;
              const deadline = new Date('9999-12-31T23:59:59Z');

              await db.query(
                `INSERT IGNORE INTO node_referrals
                  (referrer_id, referred_id, referral_code, status, locked_reward, orders_done, unlock_deadline)
                  VALUES (?, ?, ?, 'pending', 500.00, 0, ?)`,
                [referrerId, newPartnerId, refCode, deadline]
              );

              await db.query('UPDATE node_partners SET referredBy = ? WHERE id = ?', [referrerId, newPartnerId]);

              const [refInsert] = await db.query(
                'SELECT id FROM node_referrals WHERE referrer_id = ? AND referred_id = ? LIMIT 1',
                [referrerId, newPartnerId]
              );
              if (refInsert.length) {
                await db.query(
                  `INSERT INTO node_referral_earnings
                    (partner_id, from_partner_id, type, amount, status, referral_id, level)
                    VALUES (?, ?, 'referral_bonus', 500.00, 'locked', ?, 1)`,
                  [referrerId, newPartnerId, refInsert[0].id]
                );
                await db.query(
                  'UPDATE node_partners SET lockedWallet = lockedWallet + 500.00 WHERE id = ?',
                  [referrerId]
                );
              }
            }
          } catch (refErr) {
            console.error('[REFERRAL] Error processing referral on register:', refErr.message);
          }
        }
      }

      res.status(201).json({
        success: true,
        token,
        amount: 500,
        partnerId: mappedPartner.id,
        razorpayKeyId: getRazorpayKeyId(),
        razorpayOrderId: razorpayOrderId,
        paymentUrl: paymentUrl,
        partner: mappedPartner,
        countryCode: countryCodeVal
      });
    } catch (dbErr) {
      console.error('Error registering partner:', dbErr);
      res.status(500).json({ success: false, error: 'Database error occurred: ' + dbErr.message });
    }
  });
};

// -------------------------------------------------------------
// POST /api/auth/login - Login partner
// -------------------------------------------------------------
exports.login = async (req, res) => {
  const { phone, password, countryCode } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ success: false, error: 'Please enter phone number and password' });
  }

  const countryCodeVal = countryCode || '+91';

  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) {
    cleanPhone = cleanPhone.substring(2);
  }
  if (cleanPhone.length > 10) {
    cleanPhone = cleanPhone.slice(-10);
  }

  try {
    let [rows] = await db.query('SELECT * FROM partners WHERE mobile = ? AND countryCode = ?', [cleanPhone, countryCodeVal]);
    
    // Fallback: match without countryCode if not found
    if (rows.length === 0) {
      const [altRows] = await db.query('SELECT * FROM partners WHERE mobile = ?', [cleanPhone]);
      if (altRows.length > 0) {
        rows = altRows;
      }
    }

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid phone number or password' });
    }

    const partner = rows[0];
    
    let isMatch = false;
    if (partner.password && partner.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, partner.password);
    } else {
      isMatch = (password === partner.password || partner.password === '');
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid phone number or password' });
    }

    const mappedPartner = mapPartnerForApp(partner, req);
    const token = jwt.sign({ id: mappedPartner.id, mobile: mappedPartner.phone }, JWT_SECRET);

    let razorpayOrderId = null;
    let paymentUrl = null;
    if (!mappedPartner.isPaid) {
      razorpayOrderId = await createRazorpayOrder(mappedPartner.id);
      paymentUrl = `${req.protocol}://${req.get('host')}/api/partner/pay-redirect?partnerId=${mappedPartner.id}`;
    }

    res.json({
      success: true,
      token,
      partnerId: mappedPartner.id,
      razorpayKeyId: getRazorpayKeyId(),
      razorpayOrderId: razorpayOrderId,
      paymentUrl: paymentUrl,
      partner: mappedPartner,
      countryCode: countryCodeVal
    });
  } catch (error) {
    console.error('Error logging in partner:', error);
    res.status(500).json({ success: false, error: 'Database error occurred: ' + error.message });
  }
};

// -------------------------------------------------------------
// POST /api/auth/send-otp - Generate and send OTP via SMS Gateway Hub
// -------------------------------------------------------------
exports.sendOtp = async (req, res) => {
  const { phone, type, countryCode } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const countryCodeVal = countryCode || '+91';

  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpType = type || 'register_account';

    await db.query(
      'INSERT INTO otps (mobile_number, otp, status, type, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [phone, otp, '0', otpType]
    );

    console.log(`[OTP DB Server] Generated OTP for ${phone} is ${otp} (Type: ${otpType})`);

    await sendSMS(phone, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      otp: otp,
      countryCode: countryCodeVal
    });
  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({ success: false, error: 'Failed to generate OTP: ' + error.message });
  }
};

// -------------------------------------------------------------
// POST /api/auth/verify-otp - Verify OTP from otps table
// -------------------------------------------------------------
exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: 'Phone number and OTP are required' });
  }

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const [rows] = await db.query(
      'SELECT * FROM otps WHERE (mobile_number = ? OR mobile_number = ? OR mobile_number LIKE ?) ORDER BY id DESC LIMIT 1',
      [phone, cleanPhone, `%${cleanPhone.slice(-10)}`]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No OTP requested for this phone number' });
    }

    const record = rows[0];
    const otpCreatedTime = new Date(record.created_at).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (now - otpCreatedTime > tenMinutes) {
      return res.status(400).json({ success: false, error: 'OTP has expired' });
    }

    if (record.otp.toString().trim() !== otp.toString().trim()) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    await db.query('UPDATE otps SET status = ?, updated_at = NOW() WHERE id = ?', ['1', record.id]);

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ success: false, error: 'Failed to verify OTP: ' + error.message });
  }
};

// -------------------------------------------------------------
// POST /api/auth/forgot-password - Reset password
// -------------------------------------------------------------
exports.forgotPassword = async (req, res) => {
  const { phone, otp } = req.body;

  // Accept both password and newPassword from Flutter/Postman
  const password = req.body.password || req.body.newPassword;

  // Required field validation
  if (!phone || !password) {
    return res.status(400).json({
      success: false,
      error: 'Phone and new password are required'
    });
  }

  // Convert phone to string and clean it
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);

  if (cleanPhone.length !== 10) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number'
    });
  }

  try {
    // OTP validation (if provided)
    if (otp) {
      const [otpRows] = await db.query(
        `SELECT * FROM otps
         WHERE mobile_number LIKE ?
            OR mobile_number = ?
         ORDER BY id DESC
         LIMIT 1`,
        [`%${cleanPhone}`, phone]
      );

      if (
        otpRows.length > 0 &&
        otpRows[0].otp.toString().trim() !==
        otp.toString().trim()
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP entered'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update partner password
    const [result] = await db.query(
      `UPDATE partners
       SET password = ?
       WHERE mobile LIKE ? OR mobile = ?`,
      [hashedPassword, `%${cleanPhone}`, phone]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found with this phone number'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Error in forgot-password:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to reset password: ' + error.message
    });
  }
};

// -------------------------------------------------------------
// POST /api/auth/logout - Partner logout
// -------------------------------------------------------------
exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

// -------------------------------------------------------------
// DELETE /api/auth/delete-account - Delete partner account
// -------------------------------------------------------------
exports.deleteAccount = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    await db.query('UPDATE partners SET status = 0, isApproved = 0 WHERE id = ?', [partnerId]);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting partner account:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account: ' + error.message });
  }
};

// -------------------------------------------------------------
// POST /api/auth/check-mobile (and /api/partner/check-mobile, /api/partners/check-mobile)
// Check whether partner mobile number is already registered
// -------------------------------------------------------------
exports.checkMobile = async (req, res) => {
  try {
    const mobile = req.body.mobile || req.body.phone;

    if (!mobile || String(mobile).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }

    const cleanMobile = String(mobile).trim();
    const digits = cleanMobile.replace(/\D/g, '');
    const last10 = digits.slice(-10);

    if (last10.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10 digit mobile number'
      });
    }

    const mobileFormats = [
      last10,
      '+91' + last10,
      '91' + last10,
      '0' + last10
    ];

    const [nodeRows] = await db.query(
      `SELECT id FROM partners WHERE mobile IN (?, ?, ?, ?) LIMIT 1`,
      mobileFormats
    );

    const isRegistered = nodeRows.length > 0;

    return res.status(200).json({
      success: true,
      isRegistered: isRegistered,
      message: isRegistered
        ? 'Mobile number already registered'
        : 'Mobile number not registered'
    });
  } catch (error) {
    console.error('Error checking partner mobile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check mobile number',
      error: error.message
    });
  }
};
