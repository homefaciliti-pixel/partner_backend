const https = require('https');
const path = require('path');

// Helper to get IP subnet prefix (Class C for IPv4, /64 equivalent for IPv6) to allow robust matching
const getIPSubnetPrefix = (ip) => {
  if (!ip) return '';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.%`;
    }
  } else if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:%`;
    }
  }
  return ip;
};

// Helper to get the correct Razorpay Key ID, overriding default placeholders
const getRazorpayKeyId = () => {
  const key = process.env.RAZORPAY_KEY_ID;
  if (!key || key === 'rzp_live_default_key' || key === 'your_razorpay_key_id') {
    return 'rzp_live_SwFaJKQjU5ZOsH';
  }
  return key;
};

// Helper to dynamically create a Razorpay Order ID for ₹500
const createRazorpayOrder = async (partnerId) => {
  const keyId = getRazorpayKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret || keySecret === 'your_razorpay_secret_key') {
    // Generate a mock order ID starting with 'order_mock_<partnerId>_' for local testing/development
    const rand = Math.random().toString(36).substring(2, 8);
    return `order_mock_${partnerId}_${rand}`;
  }

  try {
    const authBase64 = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authBase64}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 50000, // ₹500 in paise
        currency: 'INR',
        receipt: `receipt_partner_${partnerId}_${Date.now()}`,
        notes: {
          partnerId: partnerId,
          partner_id: partnerId
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.id; // returns order_XXXXXXXXXXXX
    } else {
      const errorText = await response.text();
      console.error('Razorpay Create Order API failed:', errorText);
      const rand = Math.random().toString(36).substring(2, 10);
      return `order_failed_${rand}`;
    }
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    const rand = Math.random().toString(36).substring(2, 10);
    return `order_error_${rand}`;
  }
};

// Helper to format phone number to include 91 prefix (required by SMS Gateway Hub)
function formatPhoneForSMS(phone) {
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean;
  }
  if (clean.length === 10) {
    return '91' + clean;
  }
  return clean;
}

// Helper function to send SMS via SMS Gateway Hub
function sendSMS(phone, otp) {
  return new Promise((resolve) => {
    const apiKey = process.env.SMS_API_KEY || process.env.FAST2SMS_API_KEY || 'b395HRZTRUGZThPOeRSnVg';
    const dltTemplateId = process.env.SMS_DLT_TEMPLATE_ID || '1207173589889308632';
    const entityId = process.env.SMS_ENTITY_ID || '1201173444411453897';
    const senderId = process.env.SMS_SENDER_ID || 'HMFCLI';
    let templateText = process.env.SMS_TEMPLATE_TEXT || 'Your OTP for registering on Superhome is: {#var#}. This code is valid for the next 10 minutes. Thank You, Super Home';

    if (!apiKey) {
      console.warn('[OTP Server] SMS_API_KEY is not configured. Skipping real SMS.');
      return resolve(false);
    }

    // Strip double quotes if present in environment variable
    if (templateText.startsWith('"') && templateText.endsWith('"')) {
      templateText = templateText.substring(1, templateText.length - 1);
    }
    templateText = templateText.replace(/\\n/g, '\n');

    const messageText = templateText.replace(/{otp}/g, otp).replace(/{#var#}/g, otp);
    const formattedPhone = formatPhoneForSMS(phone);

    console.log(`[OTP Server] Prepared SMS for ${formattedPhone}: ${messageText}`);

    const queryParams = new URLSearchParams({
      APIKey: apiKey,
      senderid: senderId,
      channel: '2',
      DCS: '0',
      flashsms: '0',
      number: formattedPhone,
      text: messageText,
      route: 'clickhere',
      EntityId: entityId,
      dlttemplateid: dltTemplateId
    }).toString();

    const url = `https://www.smsgatewayhub.com/api/mt/SendSMS?${queryParams}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          console.log(`[OTP Server] SMS Gateway Hub response:`, data);
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = { raw: data };
          }
          
          if (parsed.ErrorCode === '000' || parsed.ErrorMessage === 'Success' || parsed.status === 'Success' || parsed.JobId) {
            console.log(`[OTP Server] Real SMS successfully sent to ${formattedPhone} via SMS Gateway Hub.`);
            resolve(true);
          } else {
            console.error('[OTP Server] SMS Gateway Hub returned error status:', parsed);
            resolve(false);
          }
        } catch (e) {
          console.error('[OTP Server] Error processing SMS Gateway Hub response:', e.message);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error('[OTP Server] HTTP request to SMS Gateway Hub failed:', err.message);
      resolve(false);
    });
  });
}

// Helper to send a custom transactional SMS (non-OTP) to a customer
async function sendCustomerSMS(phone, messageText, customDltId) {
  const apiKey = process.env.SMS_API_KEY || process.env.FAST2SMS_API_KEY || 'b395HRZTRUGZThPOeRSnVg';
  const senderId = process.env.SMS_SENDER_ID || 'HMFCLI';
  const entityId = process.env.SMS_ENTITY_ID || '1201173444411453897';
  const dltTemplateId = customDltId || process.env.SMS_DLT_TEMPLATE_ID_ASSIGN || process.env.SMS_DLT_TEMPLATE_ID || '1207173589889308632';

  let formattedPhone = formatPhoneForSMS(phone);

  try {
    const queryParams = new URLSearchParams({
      APIKey: apiKey,
      senderid: senderId,
      channel: '2',
      DCS: '0',
      flashsms: '0',
      number: formattedPhone,
      text: messageText,
      route: '2',
      EntityId: entityId,
      dlttemplateid: dltTemplateId
    }).toString();

    const url = `https://www.smsgatewayhub.com/api/mt/SendSMS?${queryParams}`;
    console.log('[Customer SMS] Sending notification to', formattedPhone);

    const response = await fetch(url);
    const rawText = await response.text();
    console.log('[Customer SMS] Response:', rawText);
    return true;
  } catch (err) {
    console.error('[Customer SMS] Failed:', err.message);
    return false;
  }
}

function resolveDocUrl(url, req, type = 'document') {
  const currentBase = `${req.protocol}://${req.get('host')}`;
  if (!url || url.trim() === '') {
    return `${currentBase}/uploads/default-${type}.png`;
  }
  if (url.includes('cloudinary.com')) {
    return url;
  }
  try {
    if (url.startsWith('http')) {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${currentBase}${parsed.pathname}`;
      }
      return url;
    }
  } catch (e) {
    // Fallback if URL parsing fails
  }
  return url;
}

function mapPartnerForApp(r, req) {
  if (!r) return null;
  return {
    id: parseInt(r.id),
    name: r.name || '',
    phone: r.mobile || '', // Mapping mobile -> phone for Flutter app
    countryCode: r.countryCode || '+91',
    email: r.email || '',
    gender: r.gender || '',
    address: r.address || '',
    state: r.state || '',
    city: r.city || '',
    locality: r.locality || '',
    category: r.category || '',
    subCategory: r.subCategory || '',
    hasVehicle: r.hasVehicle || 'No',
    services: r.services || '',
    aadharNumber: r.aadhaarNumber || '',
    aadharFront: resolveDocUrl(r.aadharFront, req, 'document'),
    aadharBack: resolveDocUrl(r.aadharBack, req, 'document'),
    panNumber: r.panNumber || '',
    panImage: resolveDocUrl(r.panImage, req, 'document'),
    bankName: r.bankName || '',
    accountHolder: r.accountHolder || '',
    accountNumber: r.accountNumber || '',
    ifscCode: r.ifscCode || '',
    profileImage: resolveDocUrl(r.image, req, 'profile'),
    status: r.status === 1 || r.status === true || r.status === '1',
    isApproved: r.isApproved === 1 || r.isApproved === true || r.isApproved === '1',
    isPaid: r.isPaid === 1 || r.isPaid === true || r.isPaid === '1'
  };
}

function getCurrentIST() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5)); // Asia/Kolkata timezone is UTC+5.5
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return { hours, minutes };
}

function getBookingDateOnly(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.trim();
  let bookingDate = null;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    bookingDate = new Date(y, m - 1, d);
  }
  // Try DD-MM-YYYY or D-M-YYYY or DD/MM/YYYY or D/M/YYYY
  else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
    const sep = s.includes('-') ? '-' : '/';
    const parts = s.split(sep).map(Number);
    const d = parts[0];
    const m = parts[1];
    const y = parts[2];
    bookingDate = new Date(y, m - 1, d);
  } else {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      bookingDate = d;
    }
  }

  if (bookingDate) {
    bookingDate.setHours(0, 0, 0, 0);
  }
  return bookingDate;
}

function getTimeslotStartDateTime(dateStr, timeSlotStr) {
  const bookingDate = getBookingDateOnly(dateStr);
  if (!bookingDate || !timeSlotStr) return null;

  const parts = timeSlotStr.split('-');
  if (parts.length === 2) {
    const startPart = parts[0].trim();
    const startTime = parseTime(startPart);
    if (startTime) {
      bookingDate.setHours(startTime.hours, startTime.minutes, 0, 0);
      return bookingDate;
    }
  }
  return null;
}

function isDateBeforeToday(dateStr, timeSlotStr) {
  const bookingDate = getBookingDateOnly(dateStr);
  if (!bookingDate) return false;

  const today = getCurrentIST();
  today.setHours(0, 0, 0, 0);

  return bookingDate < today;
}

function isSameBookingDate(dateStr1, dateStr2) {
  const d1 = getBookingDateOnly(dateStr1);
  const d2 = getBookingDateOnly(dateStr2);
  if (!d1 || !d2) return false;
  return d1.getTime() === d2.getTime();
}

module.exports = {
  getIPSubnetPrefix,
  getRazorpayKeyId,
  createRazorpayOrder,
  formatPhoneForSMS,
  sendSMS,
  sendCustomerSMS,
  resolveDocUrl,
  mapPartnerForApp,
  getCurrentIST,
  parseTime,
  getBookingDateOnly,
  getTimeslotStartDateTime,
  isDateBeforeToday,
  isSameBookingDate
};
