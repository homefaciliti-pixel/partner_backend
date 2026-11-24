const db = require('../db');

// GET /api/earnings - Get earnings summary for the partner
exports.getEarnings = async (req, res) => {
  const partnerName = req.partner.name;
  const partnerMobile = req.partner.mobile;
  const dbWalletBalance = parseFloat(req.partner.walletBalance || 0);
  const dbTotalEarnings = parseFloat(req.partner.totalEarnings || 0);
  const dbPayToCompany = parseFloat(req.partner.payToCompany || 0);

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
    const [adminOrders] = await db.query(
      "SELECT serviceAmount, paymentMethod, serviceDate FROM orders WHERE (LOWER(TRIM(vendorName)) = LOWER(TRIM(?)) OR vendorMobile = ?) AND LOWER(status) = 'completed'",
      [partnerName, partnerMobile]
    );

    const [v2Orders] = await db.query(
      "SELECT price, payment, date FROM orders_v2 WHERE LOWER(TRIM(partnerName)) = LOWER(TRIM(?)) AND LOWER(status) = 'completed'",
      [partnerName]
    );

    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + istOffset + (new Date().getTimezoneOffset() * 60000));
    
    const yyyy = todayIST.getFullYear();
    const mm = String(todayIST.getMonth() + 1).padStart(2, '0');
    const dd = String(todayIST.getDate()).padStart(2, '0');
    
    const dVal = todayIST.getDate();
    const mVal = todayIST.getMonth() + 1;

    const todayISO1 = yyyy + '-' + mm + '-' + dd;
    const todayISO2 = yyyy + '-' + mVal + '-' + dVal;
    const todayDashed1 = dd + '-' + mm + '-' + yyyy;
    const todayDashed2 = dVal + '-' + mVal + '-' + yyyy;
    const todaySlashed1 = dd + '/' + mm + '/' + yyyy;

    const isToday = (dateStr) => {
      if (!dateStr) return false;
      const clean = dateStr.trim();
      return clean === todayISO1 || clean === todayISO2 || clean === todayDashed1 || clean === todayDashed2 || clean === todaySlashed1;
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
      } catch (e) {}

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

    const finalTotalEarning = Math.max(Math.round(totalEarningsCalculated), Math.round(dbTotalEarnings));
    const finalMonthlyEarning = finalTotalEarning;
    const finalOnlineEarning = Math.max(Math.round(onlineEarning), Math.round(dbWalletBalance));
    const finalCashEarning = Math.max(Math.round(cashEarning), Math.round(dbPayToCompany));

    res.json({
      totalEarning: finalTotalEarning,
      todayEarning: Math.round(todayEarning),
      monthlyEarning: finalMonthlyEarning,
      onlineEarning: finalOnlineEarning,
      cashEarning: finalCashEarning,
      payToCompany: dbPayToCompany,
      walletBalance: dbWalletBalance
    });
  } catch (error) {
    console.error('Error calculating partner earnings:', error);
    res.json({
      totalEarning: Math.round(dbTotalEarnings),
      todayEarning: 0,
      monthlyEarning: Math.round(dbTotalEarnings),
      onlineEarning: Math.round(dbWalletBalance),
      cashEarning: Math.round(dbPayToCompany),
      payToCompany: dbPayToCompany,
      walletBalance: dbWalletBalance
    });
  }
};
