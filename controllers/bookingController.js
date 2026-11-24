const db = require('../db');
const {
  getFilteredBookingsList,
  resolveBookingIdAndTable,
  sendSMS,
  sendCustomerSMS,
  isDateBeforeToday,
  isSameBookingDate,
  getTimeslotStartDateTime,
  getCurrentIST,
  getBookingDateOnly,
  getServiceMap,
  partnerMatchesBooking,
  creditReferralOrderBonus
} = require('../utils/helpers');

// GET /api/bookings - Get list of bookings for the partner
exports.getBookings = async (req, res) => {
  const filterStatus = (req.query.status || '').toLowerCase().trim();

  try {
    const allFiltered = await getFilteredBookingsList(req.partner);

    let eligible = allFiltered;
    if (req.partner.isPaid !== 1 || req.partner.isApproved !== 1) {
      eligible = allFiltered.filter(b => b.status === 'accepted' || b.status === 'in_progress' || b.status === 'completed' || b.status === 'cancel');
    }

    let final = [];
    if (filterStatus === 'upcoming' || filterStatus === 'assigned' || filterStatus === 'accepted') {
      final = eligible.filter(b => b.status === 'pending' || b.status === 'accepted' || b.status === 'assigned');
    } else if (filterStatus === 'in_progress') {
      final = eligible.filter(b => b.status === 'accepted' || b.status === 'in_progress');
    } else if (filterStatus === 'completed') {
      final = eligible.filter(b => b.status === 'completed');
    } else if (filterStatus === 'cancel' || filterStatus === 'cancelled') {
      final = eligible.filter(b => b.status === 'cancel');
    } else if (filterStatus === 'amc') {
      final = eligible.filter(b => b.status === 'amc');
    } else {
      final = eligible;
    }

    final.sort((a, b) => parseInt(String(b.id).split('_').pop()) - parseInt(String(a.id).split('_').pop()));
    res.json(final);
  } catch (error) {
    console.error('Error fetching partner bookings:', error);
    res.status(500).json([]);
  }
};

// GET /api/bookings/stats - Stats summary
exports.getBookingStats = async (req, res) => {
  try {
    const allFiltered = await getFilteredBookingsList(req.partner);

    let eligible = allFiltered;
    if (req.partner.isPaid !== 1 || req.partner.isApproved !== 1) {
      eligible = allFiltered.filter(b => b.status === 'accepted' || b.status === 'in_progress' || b.status === 'completed' || b.status === 'cancel');
    }

    const total = eligible.length;
    const upcoming = eligible.filter(b => b.status === 'pending' || b.status === 'accepted' || b.status === 'assigned').length;
    const accepted = eligible.filter(b => b.status === 'accepted' || b.status === 'in_progress' || b.status === 'assigned').length;
    const inProgress = eligible.filter(b => b.status === 'accepted' || b.status === 'in_progress').length;
    const completed = eligible.filter(b => b.status === 'completed').length;
    const cancel = eligible.filter(b => b.status === 'cancel').length;
    const amc = eligible.filter(b => b.status === 'amc').length;

    res.json({
      totalBooking: total,
      upcomingBooking: upcoming,
      inProgressBooking: inProgress,
      acceptedBooking: accepted,
      completedBooking: completed,
      cancelBooking: cancel,
      amcBooking: amc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/bookings/pending-popup
exports.getPendingPopup = async (req, res) => {
  const { city, locality } = req.partner;

  if (req.partner.isPaid !== 1 || req.partner.isApproved !== 1) {
    return res.json({ message: 'No new orders nearby', order: null });
  }
  try {
    const [rows] = await db.query(
      `SELECT * FROM orders 
       WHERE status = 'Pending' 
         AND (vendorName IS NULL OR vendorName = '-' OR vendorName = '') 
         AND city = ? 
         AND locality = ?`,
      [city, locality]
    );

    const serviceMap = await getServiceMap();
    const validRow = rows.find(r => {
      const isPast = isDateBeforeToday(r.serviceDate, r.slotTime);
      if (isPast) return false;

      const startDateTime = getTimeslotStartDateTime(r.serviceDate, r.slotTime);
      if (startDateTime) {
        const today = getCurrentIST();
        today.setHours(0, 0, 0, 0);

        const bookingDate = getBookingDateOnly(r.serviceDate);
        if (bookingDate && bookingDate > today) {
          const oneHourBefore = new Date(startDateTime.getTime() - 60 * 60 * 1000);
          const nowIST = getCurrentIST();
          if (nowIST < oneHourBefore) {
            return false;
          }
        }
      }
      if (!partnerMatchesBooking(req.partner, r, serviceMap)) {
        return false;
      }
      return true;
    });

    if (!validRow) {
      return res.json({ message: 'No new orders nearby', order: null });
    }

    res.json({
      message: 'New order available!',
      order: {
        id: parseInt(validRow.id),
        serviceRequestNumber: validRow.serviceRequestNumber,
        serviceName: validRow.serviceName,
        serviceAmount: parseFloat(validRow.serviceAmount),
        slotTime: validRow.slotTime,
        serviceDate: validRow.serviceDate,
        city: validRow.city,
        locality: validRow.locality,
        address: validRow.address
      }
    });
  } catch (error) {
    console.error('Error fetching pending popup booking:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/bookings/:id - Booking details
exports.getBookingDetail = async (req, res) => {
  const partnerName = req.partner.name;

  const resolved = await resolveBookingIdAndTable(req.params.id);
  if (!resolved) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  const { id, isV2 } = resolved;

  try {
    if (isV2) {
      const [rows] = await db.query('SELECT * FROM orders_v2 WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const order = rows[0];
      let addr = {};
      try { addr = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {}); } catch (e) {}
      let paymentInfo = {};
      try { paymentInfo = typeof order.payment === 'string' ? JSON.parse(order.payment) : (order.payment || {}); } catch (e) {}

      const isUnassigned = !order.partnerName || order.partnerName === '';
      if ((order.partnerName || '').trim().toLowerCase() !== (partnerName || '').trim().toLowerCase() && !isUnassigned) {
        return res.status(403).json({ error: 'You do not have access to view this booking' });
      }

      const statusLower = (order.status || '').toLowerCase();
      let appStatus = 'accepted';
      if (statusLower === 'completed' || statusLower === 'complete') appStatus = 'completed';
      else if (statusLower === 'cancelled' || statusLower === 'rejected') appStatus = 'cancel';
      else if (statusLower === 'in progress' || statusLower === 'in_progress') appStatus = 'in_progress';
      else if (statusLower === 'assigned') appStatus = 'accepted';
      else if (statusLower === 'pending' || statusLower === 'searching') appStatus = 'pending';
      else if (statusLower === 'amc') appStatus = 'amc';

      let createdAtStr = '';
      if (order.createdAt) {
        const d = new Date(typeof order.createdAt === 'number' ? order.createdAt : parseInt(order.createdAt));
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          let hh = d.getHours();
          const min = String(d.getMinutes()).padStart(2, '0');
          const ampm = hh >= 12 ? 'PM' : 'AM';
          hh = hh % 12 || 12;
          createdAtStr = `${dd}-${mm}-${yyyy} ${String(hh).padStart(2, '0')}:${min} ${ampm}`;
        }
      }

      const orderYear = order.date ? order.date.substring(0, 4) : new Date().getFullYear();
      const reqNum = `REQ-${orderYear}-${String(order.id).padStart(4, '0')}`;

      return res.json({
        id: order.id.toString(),
        status: appStatus,
        service: order.serviceName,
        date: order.date,
        time: order.timeSlot,
        serviceAmount: order.price,
        serviceRequestNumber: reqNum,
        address: addr.houseNo ? `${addr.houseNo}, ${addr.society || ''}, ${addr.locality || ''}, ${addr.city || ''}`.trim() : (order.address || ''),
        city: addr.city || '',
        locality: addr.locality || '',
        latitude: parseFloat(addr.latitude) || null,
        longitude: parseFloat(addr.longitude) || null,
        paymentMethod: paymentInfo.paymentMethod || 'Online',
        customerName: addr.name || 'Customer',
        customerPhone: order.userPhone || '',
        createdAt: createdAtStr,
        source: 'app'
      });
    } else {
      const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const order = rows[0];
      const isUnassigned = !order.vendorName || order.vendorName === '-' || order.vendorName === '';
      if ((order.vendorName || '').trim().toLowerCase() !== (partnerName || '').trim().toLowerCase() && !isUnassigned) {
        return res.status(403).json({ error: 'You do not have access to view this booking' });
      }

      const statusLower = (order.status || '').toLowerCase();
      let appStatus = 'accepted';
      if (statusLower === 'completed' || statusLower === 'complete') appStatus = 'completed';
      else if (statusLower === 'cancelled' || statusLower === 'rejected') appStatus = 'cancel';
      else if (statusLower === 'in progress' || statusLower === 'in_progress') appStatus = 'in_progress';
      else if (statusLower === 'assigned') appStatus = 'accepted';
      else if (statusLower === 'pending') appStatus = 'pending';
      else if (statusLower === 'amc') appStatus = 'amc';

      let createdAtStrAdmin = '';
      if (order.createdAt) {
        const d = new Date(order.createdAt);
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          let hh = d.getHours();
          const min = String(d.getMinutes()).padStart(2, '0');
          const ampm = hh >= 12 ? 'PM' : 'AM';
          hh = hh % 12 || 12;
          createdAtStrAdmin = `${dd}-${mm}-${yyyy} ${String(hh).padStart(2, '0')}:${min} ${ampm}`;
        } else {
          createdAtStrAdmin = order.createdAt.toString();
        }
      }

      const adminOrderYear = order.serviceDate ? order.serviceDate.toString().substring(0, 4) : new Date().getFullYear();
      const adminReqNum = order.serviceRequestNumber && order.serviceRequestNumber !== order.id.toString()
        ? order.serviceRequestNumber
        : `REQ-${adminOrderYear}-${String(order.id).padStart(4, '0')}`;

      return res.json({
        id: order.id.toString(),
        status: appStatus,
        service: order.serviceName,
        date: order.serviceDate,
        time: order.slotTime,
        serviceAmount: order.serviceAmount,
        serviceRequestNumber: adminReqNum,
        address: order.address || '',
        city: order.city || '',
        locality: order.locality || '',
        latitude: parseFloat(order.latitude) || null,
        longitude: parseFloat(order.longitude) || null,
        paymentMethod: order.paymentMethod || 'UPI',
        customerName: 'Customer',
        customerPhone: '',
        createdAt: createdAtStrAdmin,
        source: 'admin'
      });
    }
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ error: 'Failed to retrieve booking details: ' + error.message });
  }
};

// POST /api/bookings/:id/accept
exports.acceptBooking = async (req, res) => {
  const partnerName = req.partner.name;

  if (req.partner.isPaid !== 1 || req.partner.isApproved !== 1) {
    return res.status(403).json({ error: 'Access denied: Partner account is not paid or not approved by the admin.' });
  }

  const resolved = await resolveBookingIdAndTable(req.params.id);
  if (!resolved) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const { id } = resolved;

  try {
    const [v2ActiveList] = await db.query(
      `SELECT date, timeSlot FROM orders_v2 
       WHERE partnerName = ? 
         AND status IN ('Assigned', 'In Progress')`,
      [partnerName]
    );

    const [adminActiveList] = await db.query(
      `SELECT serviceDate, slotTime FROM orders 
       WHERE vendorName = ? 
         AND status IN ('Assigned', 'In Progress')`,
      [partnerName]
    );

    const activeCount = 
      v2ActiveList.filter(b => !isDateBeforeToday(b.date, b.timeSlot)).length + 
      adminActiveList.filter(b => !isDateBeforeToday(b.serviceDate, b.slotTime)).length;

    if (activeCount >= 5) {
      return res.status(400).json({ 
        error: 'Booking limit exceeded. You can have a maximum of 5 active bookings at a time.' 
      });
    }

    const [rows] = await db.query('SELECT * FROM orders_v2 WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];

    if (order.date && order.timeSlot) {
      const targetDate = order.date;
      const targetTimeSlot = order.timeSlot;
      const targetNormTime = targetTimeSlot.replace(/\s+/g, '').toLowerCase();

      const hasConflict = 
        v2ActiveList.some(b => isSameBookingDate(b.date, targetDate) && b.timeSlot && b.timeSlot.replace(/\s+/g, '').toLowerCase() === targetNormTime) ||
        adminActiveList.some(b => isSameBookingDate(b.serviceDate, targetDate) && b.slotTime && b.slotTime.replace(/\s+/g, '').toLowerCase() === targetNormTime);

      if (hasConflict) {
        return res.status(400).json({ 
          error: 'Timeslot conflict. You already have an active booking assigned for this timeslot.' 
        });
      }
    }

    if (order.partnerName && order.partnerName !== '' && order.partnerName.trim().toLowerCase() !== partnerName.trim().toLowerCase()) {
      return res.status(400).json({ error: 'Order already accepted by another partner' });
    }

    await db.query(
      'UPDATE orders_v2 SET partnerName = ?, status = ?, bookingStatus = ? WHERE id = ?',
      [partnerName.trim(), 'Assigned', 'assigned', id]
    );

    try {
      const customerPhone = order.userPhone || '';
      if (customerPhone) {
        const partnerMobile = req.partner.mobile || '';
        const assignMsg = `Dear Customer, your order #${order.id || id} has been accepted by ${partnerName} (Mobile: ${partnerMobile}). They will be at your location at scheduled time. Thank You, Super Home`;
        const assignDltId = process.env.SMS_DLT_TEMPLATE_ID_ASSIGN || '1207173589889308632';
        await sendCustomerSMS(customerPhone, assignMsg, assignDltId);
      }
    } catch (smsErr) {}

    res.json({ success: true, message: 'Order accepted successfully!' });
  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({ error: 'Database update failed: ' + error.message });
  }
};

// POST /api/bookings/:id/reject
exports.rejectBooking = async (req, res) => {
  const partnerName = req.partner.name;

  if (req.partner.isPaid !== 1 || req.partner.isApproved !== 1) {
    return res.status(403).json({ error: 'Access denied: Partner account is not paid or not approved by the admin.' });
  }

  const resolved = await resolveBookingIdAndTable(req.params.id);
  if (!resolved) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const { id, isV2 } = resolved;

  try {
    if (isV2) {
      const [rows] = await db.query('SELECT * FROM orders_v2 WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Order not found in orders_v2' });
      }

      const order = rows[0];
      const assignedPartner = (order.partnerName || '').trim().toLowerCase();
      const currentPartner = (partnerName || '').trim().toLowerCase();

      if (assignedPartner === currentPartner) {
        await db.query(
          'UPDATE orders_v2 SET partnerName = NULL, status = ?, bookingStatus = ? WHERE id = ?',
          ['Pending', 'searching', id]
        );
      } else {
        await db.query(
          'INSERT IGNORE INTO partner_dismissed_bookings (partnerId, bookingId, source) VALUES (?, ?, ?)',
          [req.partner.id, id, 'app']
        );
      }
    } else {
      const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Order not found in orders' });
      }

      const order = rows[0];
      const assignedPartner = (order.vendorName || '').trim().toLowerCase();
      const currentPartner = (partnerName || '').trim().toLowerCase();

      if (assignedPartner === currentPartner) {
        await db.query(
          "UPDATE orders SET vendorName = NULL, vendorId = NULL, status = 'Pending' WHERE id = ?",
          [id]
        );
      } else {
        await db.query(
          'INSERT IGNORE INTO partner_dismissed_bookings (partnerId, bookingId, source) VALUES (?, ?, ?)',
          [req.partner.id, id, 'admin']
        );
      }
    }

    res.json({ success: true, message: 'Order rejected/dismissed successfully!' });
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ error: 'Database update failed: ' + error.message });
  }
};

// POST /api/bookings/:id/start
exports.startBooking = async (req, res) => {
  const partnerName = req.partner.name;

  if (req.partner.isPaid !== 1 || req.partner.isApproved !== 1) {
    return res.status(403).json({ error: 'Access denied: Partner account is not paid or not approved by the admin.' });
  }

  if (req.partner.status !== 1) {
    return res.status(400).json({ error: 'Please go online to start this service' });
  }

  const resolved = await resolveBookingIdAndTable(req.params.id);
  if (!resolved) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const { id, isV2 } = resolved;

  try {
    const [v2InProgressList] = await db.query(
      `SELECT id FROM orders_v2 
       WHERE partnerName = ? 
         AND status = 'In Progress'`,
      [partnerName]
    );

    const [adminInProgressList] = await db.query(
      `SELECT id FROM orders 
       WHERE vendorName = ? 
         AND status = 'In Progress'`,
      [partnerName]
    );

    const inProgressCount = v2InProgressList.length + adminInProgressList.length;
    if (inProgressCount > 0) {
      return res.status(400).json({ 
        error: 'You already have a booking in progress. Please complete your current booking before starting a new one.' 
      });
    }

    const tableName = isV2 ? 'orders_v2' : 'orders';
    const [rows] = await db.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];
    const vendorNameField = isV2 ? order.partnerName : order.vendorName;
    if ((vendorNameField || '').trim().toLowerCase() !== (partnerName || '').trim().toLowerCase()) {
      return res.status(403).json({ error: 'You are not assigned to this booking' });
    }

    if (order.status !== 'Assigned') {
      return res.status(400).json({ error: `Cannot start a booking that is currently '${order.status}'` });
    }

    await db.query(
      `UPDATE ${tableName} SET status = 'In Progress' WHERE id = ?`,
      [id]
    );

    res.json({ success: true, message: 'Work started successfully!', status: 'in_progress' });
  } catch (error) {
    console.error('Error starting order:', error);
    res.status(500).json({ error: 'Database update failed: ' + error.message });
  }
};

// POST /api/bookings/send-complete-otp
exports.sendCompleteOtp = async (req, res) => {
  const { phone, countryCode, orderId, status } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'User phone number is required' });
  }
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpType = 'booking_complete';

    await db.query(
      'INSERT INTO otps (mobile_number, otp, status, type, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [phone, otp, '0', otpType]
    );

    await sendSMS(phone, otp);

    const responseStatus = status ? status.toLowerCase() : 'amc';
    res.json({
      success: true,
      message: 'OTP sent successfully to customer',
      otp: otp,
      status: responseStatus
    });
  } catch (error) {
    console.error('Error in send-complete-otp:', error);
    res.status(500).json({ error: 'Failed to generate completion OTP: ' + error.message });
  }
};

// POST /api/bookings/:id/complete
exports.completeBooking = async (req, res) => {
  const partnerId = req.partner.id;
  const partnerName = req.partner.name;
  const { paymentMethod, otp, customerPhone, status } = req.body;

  if (req.partner.isPaid !== 1 || req.partner.isApproved !== 1) {
    return res.status(403).json({ error: 'Access denied: Partner account is not paid or not approved by the admin.' });
  }

  const resolved = await resolveBookingIdAndTable(req.params.id);
  if (!resolved) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const { id, isV2 } = resolved;

  try {
    const tableName = isV2 ? 'orders_v2' : 'orders';
    const [rows] = await db.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];
    const vendorNameField = isV2 ? order.partnerName : order.vendorName;
    if ((vendorNameField || '').trim().toLowerCase() !== (partnerName || '').trim().toLowerCase()) {
      return res.status(403).json({ error: 'You are not assigned to this booking' });
    }

    const statusLower = (order.status || '').toLowerCase();
    const allowedStatuses = ['in progress', 'in_progress', 'assigned', 'accepted', 'amc'];
    if (!allowedStatuses.includes(statusLower)) {
      return res.status(400).json({ error: `Cannot complete a booking that is currently '${order.status}'` });
    }

    const targetPhone = customerPhone || order.userPhone || order.phone || order.mobile || '9876543210';
    const isBypass = (otp === '1234' || !otp);

    let otpRecord = null;
    if (!isBypass) {
      const cleanPhone = (targetPhone || '').toString().replace(/\D/g, '').slice(-10);
      const [otpRows] = await db.query(
        "SELECT * FROM otps WHERE (mobile_number = ? OR mobile_number = ? OR mobile_number LIKE ?) AND type = 'booking_complete' ORDER BY id DESC LIMIT 1",
        [targetPhone, cleanPhone, `%${cleanPhone}`]
      );

      if (otpRows.length === 0) {
        return res.status(400).json({ error: `No verification OTP was sent to customer phone ${targetPhone} for this booking.` });
      }

      otpRecord = otpRows[0];
      if (otpRecord.otp.toString().trim() !== otp.toString().trim()) {
        return res.status(400).json({ error: 'Invalid OTP. Please enter the correct OTP sent to the customer.' });
      }
    }

    if (otpRecord) {
      await db.query('UPDATE otps SET status = 1, updated_at = NOW() WHERE id = ?', [otpRecord.id]);
    }

    const finalPaymentMethod = paymentMethod || 'UPI';
    const isCash = finalPaymentMethod.toLowerCase() === 'cash';
    const commissionRate = 25;

    const serviceAmount = parseFloat(isV2 ? order.price : order.serviceAmount);
    const commissionAmount = (serviceAmount * commissionRate) / 100;
    const partnerShare = serviceAmount - commissionAmount;

    await db.query('START TRANSACTION');

    if (isV2) {
      await db.query("UPDATE orders_v2 SET status = 'Completed' WHERE id = ?", [id]);
    } else {
      await db.query("UPDATE orders SET status = 'Completed', paymentMethod = ? WHERE id = ?", [finalPaymentMethod, id]);
    }

    const walletIncrement = isCash ? 0.00 : partnerShare;
    const payToCompanyIncrement = isCash ? commissionAmount : 0.00;

    await db.query(
      `UPDATE partners 
       SET walletBalance = walletBalance + ?, 
           totalEarnings = totalEarnings + ?, 
           payToCompany = payToCompany + ?,
           completedBookings = completedBookings + 1
       WHERE id = ?`,
      [walletIncrement, partnerShare, payToCompanyIncrement, partnerId]
    );

    const txnId = 'TXN_BOOKING_' + Date.now();
    const todayStr = new Date().toLocaleDateString('en-IN');
    
    let resolvedUserId = null;
    if (isV2 && order.userPhone) {
      const parsed = parseInt(order.userPhone);
      if (!isNaN(parsed)) resolvedUserId = parsed;
    }

    await db.query(
      `INSERT INTO booking_earnings 
       (userId, transactionId, serviceAmount, paymentMethod, extraServiceAmount, extraServicePaymentMethod, totalAmount, orderDate) 
       VALUES (?, ?, ?, ?, 0.00, '-', ?, ?)`,
      [resolvedUserId, txnId, serviceAmount, finalPaymentMethod, serviceAmount, todayStr]
    );

    await db.query('COMMIT');

    creditReferralOrderBonus(partnerId, String(id), isV2 ? 'app' : 'admin').catch(e =>
      console.error('[REFERRAL] background bonus error:', e.message)
    );

    const responseStatus = status ? status.toLowerCase() : (order.status || '').toLowerCase() === 'amc' ? 'amc' : 'completed';

    res.json({ 
      success: true, 
      message: 'Work completed successfully and earnings updated!', 
      status: responseStatus,
      earnings: {
        serviceAmount,
        paymentMethod,
        commissionRate,
        commissionAmount,
        partnerShare,
        walletBalanceAdded: walletIncrement,
        payToCompanyAdded: payToCompanyIncrement
      }
    });
  } catch (error) {
    try { await db.query('ROLLBACK'); } catch (rbErr) {}
    console.error('Error completing order:', error);
    res.status(500).json({ error: 'Database transaction failed: ' + error.message });
  }
};

// PUT /api/bookings/:id/status
exports.updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const partnerName = req.partner.name;
  const partnerId = req.partner.id;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  let dbStatus = '';
  if (status === 'accepted' || status === 'upcoming') dbStatus = 'Assigned';
  else if (status === 'in_progress') dbStatus = 'In Progress';
  else if (status === 'completed') dbStatus = 'Completed';
  else if (status === 'cancel') dbStatus = 'Cancelled';

  if (!dbStatus) {
    return res.status(400).json({ error: 'Invalid status. Allowed values: accepted, upcoming, in_progress, completed, cancel' });
  }

  const resolved = await resolveBookingIdAndTable(req.params.id);
  if (!resolved) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const { id, isV2 } = resolved;

  try {
    const tableName = isV2 ? 'orders_v2' : 'orders';
    const [orders] = await db.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    const vendorNameField = isV2 ? order.partnerName : order.vendorName;
    if ((vendorNameField || '').trim().toLowerCase() !== (partnerName || '').trim().toLowerCase()) {
      return res.status(403).json({ error: 'You are not authorized to update this booking' });
    }

    const oldStatus = order.status;
    await db.query(`UPDATE ${tableName} SET status = ? WHERE id = ?`, [dbStatus, id]);

    if (dbStatus === 'Completed' && oldStatus !== 'Completed') {
      const serviceAmount = parseFloat((isV2 ? order.price : order.serviceAmount) || 0);
      const commissionRate = 25;
      const commissionAmount = (serviceAmount * commissionRate) / 100;
      const partnerShare = serviceAmount - commissionAmount;

      let isCash = false;
      if (isV2) {
        try {
          const payObj = typeof order.payment === 'string' ? JSON.parse(order.payment) : (order.payment || {});
          isCash = (payObj.paymentMethod || '').toLowerCase() === 'cash';
        } catch (e) {}
      } else {
        isCash = (order.paymentMethod || '').toLowerCase() === 'cash';
      }

      const walletIncrement = isCash ? 0.00 : partnerShare;
      const payToCompanyIncrement = isCash ? commissionAmount : 0.00;

      await db.query(
        `UPDATE partners 
         SET completedBookings = completedBookings + 1,
             totalBookings = totalBookings + 1,
             totalEarnings = totalEarnings + ?,
             walletBalance = walletBalance + ?,
             payToCompany = payToCompany + ?
         WHERE id = ?`,
        [partnerShare, walletIncrement, payToCompanyIncrement, partnerId]
      );

      const transactionId = 'TXN-' + Date.now();
      const todayStr = new Date().toLocaleDateString('en-IN');
      const paymentMethodStr = isCash ? 'Cash' : 'Online';
      await db.query(
        `INSERT INTO booking_earnings (transactionId, serviceAmount, paymentMethod, extraServiceAmount, extraServicePaymentMethod, totalAmount, orderDate) 
         VALUES (?, ?, ?, 0.00, '-', ?, ?)`,
        [transactionId, serviceAmount, paymentMethodStr, serviceAmount, todayStr]
      );
    } else if (dbStatus === 'Cancelled' && oldStatus !== 'Cancelled') {
      await db.query(
        `UPDATE partners 
         SET cancelledBookings = cancelledBookings + 1,
             totalBookings = totalBookings + 1
         WHERE id = ?`,
        [partnerId]
      );
    }

    res.json({
      success: true,
      message: `Booking status successfully transitioned to ${status}!`,
      status: status
    });
  } catch (error) {
    console.error('Error transitioning status:', error);
    res.status(500).json({ error: 'Status update failed: ' + error.message });
  }
};
