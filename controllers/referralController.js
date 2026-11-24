const db = require('../db');
const { getIPSubnetPrefix } = require('../utils/helpers');

const REFERRAL_REWARD = 500;
const ORDER_BONUS = 50;
const ORDER_BONUS_L2 = 20;
const UNLOCK_ORDERS = 5;

// GET /api/referral/code
exports.getReferralCode = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const [rows] = await db.query('SELECT id, name, referral_code FROM node_partners WHERE id = ?', [partnerId]);
    if (!rows.length) return res.status(404).json({ error: 'Partner not found' });

    const partner = rows[0];
    let code = partner.referral_code;
    if (!code) {
      code = 'HF' + String(partnerId).padStart(6, '0');
      await db.query('UPDATE node_partners SET referral_code = ? WHERE id = ?', [code, partnerId]);
    }

    const host = req.protocol + '://' + req.get('host');
    const shareLink = `${host}/partner/join?ref=${code}`;
    const shareMessage = `Join me on Home Faciliti as a service partner and earn money! Use my referral code *${code}* while registering to get started. Sign up here: ${shareLink}`;

    res.json({
      success: true,
      referralCode: code,
      shareLink,
      shareMessage,
      rewards: {
        referralBonus: `₹${REFERRAL_REWARD} (locked — unlocks after referred partner completes ${UNLOCK_ORDERS} orders)`,
        orderBonus: `₹${ORDER_BONUS} per order completed by referred partner (directly withdrawable)`,
        orderBonusL2: `₹${ORDER_BONUS_L2} per order for level 2 referrals`
      }
    });
  } catch (err) {
    console.error('[REFERRAL] /referral/code error:', err.message);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
};

// POST /api/referral/validate
exports.validateReferralCode = async (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode || !referralCode.trim()) {
    return res.status(400).json({ valid: false, error: 'Referral code is required' });
  }

  try {
    const code = referralCode.trim().toUpperCase();
    const [rows] = await db.query(
      `SELECT id, name, referral_code FROM node_partners 
       WHERE (referral_code = ? OR CONCAT('HF', LPAD(id, 6, '0')) = ?) 
         AND isApproved = 1`,
      [code, code]
    );

    if (!rows.length) {
      return res.status(404).json({ valid: false, error: 'Invalid referral code. No approved partner found with this code.' });
    }

    const referrer = rows[0];
    res.json({
      valid: true,
      referralCode: code,
      referrerName: referrer.name,
      message: `Valid referral code by ${referrer.name}. You will both earn rewards after you complete ${UNLOCK_ORDERS} orders!`
    });
  } catch (err) {
    console.error('[REFERRAL] /referral/validate error:', err.message);
    res.status(500).json({ valid: false, error: 'Failed to validate referral code' });
  }
};

// GET /api/referral/detect
exports.detectReferral = async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = clientIp.split(',')[0].trim();
    const ipPrefix = getIPSubnetPrefix(ip);
    const [rows] = await db.query(
      `SELECT referral_code FROM node_referrer_clicks 
       WHERE (ip_address = ? OR ip_address LIKE ?) AND created_at >= NOW() - INTERVAL 2 HOUR 
       ORDER BY created_at DESC LIMIT 1`,
      [ip, ipPrefix]
    );

    if (rows.length > 0) {
      const code = rows[0].referral_code;
      const [refRows] = await db.query(
        `SELECT name FROM node_partners 
         WHERE (referral_code = ? OR CONCAT('HF', LPAD(id, 6, '0')) = ?) 
           AND isApproved = 1 
         LIMIT 1`,
        [code, code]
      );
      return res.json({
        success: true,
        referralCode: code,
        referrerName: refRows.length > 0 ? refRows[0].name : 'Approved Partner'
      });
    }

    res.json({ success: false, message: 'No referral code detected for this IP address' });
  } catch (err) {
    console.error('[REFERRAL] /referral/detect error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to detect referral' });
  }
};

// GET /api/referral/stats
exports.getReferralStats = async (req, res) => {
  try {
    const partnerId = req.partner.id;

    const [myReferrals] = await db.query(
      `SELECT r.*, p.name AS referred_name, p.mobile AS referred_phone, p.isApproved
       FROM node_referrals r
       JOIN node_partners p ON p.id = r.referred_id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC`,
      [partnerId]
    );

    const [earnings] = await db.query(
      `SELECT type, status, SUM(amount) AS total, COUNT(*) AS count
       FROM node_referral_earnings
       WHERE partner_id = ?
       GROUP BY type, status`,
      [partnerId]
    );

    const [wallet] = await db.query(
      'SELECT referral_code, availableWallet, lockedWallet FROM node_partners WHERE id = ?',
      [partnerId]
    );

    const myCode = wallet[0]?.referral_code || ('HF' + String(partnerId).padStart(6, '0'));

    let totalOrderBonus = 0;
    let totalReferralBonus = 0;
    let lockedAmount = 0;

    earnings.forEach(e => {
      if (e.type === 'order_bonus' && e.status === 'available') totalOrderBonus += parseFloat(e.total);
      if (e.type === 'referral_bonus' && e.status === 'available') totalReferralBonus += parseFloat(e.total);
      if (e.status === 'locked') lockedAmount += parseFloat(e.total);
    });

    const referralList = myReferrals.map(r => ({
      referralId: r.id,
      partnerName: r.referred_name,
      phone: r.referred_phone,
      isApproved: r.isApproved === 1,
      status: r.status,
      ordersCompleted: r.orders_done,
      ordersNeeded: UNLOCK_ORDERS,
      unlockDeadline: r.unlock_deadline,
      lockedReward: parseFloat(r.locked_reward),
      createdAt: r.created_at,
      unlockedAt: r.unlocked_at,
      expiredAt: r.expired_at
    }));

    const host = req.protocol + '://' + req.get('host');
    const shareLink = `${host}/partner/join?ref=${myCode}`;
    res.json({
      success: true,
      referralCode: myCode,
      shareLink: shareLink,
      shareMessage: `Join Home Faciliti Partner! Register using my referral link: ${shareLink} or use referral code: ${myCode}`,
      wallet: {
        available: parseFloat(wallet[0]?.availableWallet || 0),
        locked: parseFloat(wallet[0]?.lockedWallet || 0),
        total: parseFloat(wallet[0]?.availableWallet || 0) + parseFloat(wallet[0]?.lockedWallet || 0)
      },
      earnings: {
        orderBonus: totalOrderBonus,
        referralBonus: totalReferralBonus,
        locked: lockedAmount,
        total: totalOrderBonus + totalReferralBonus
      },
      referralCount: myReferrals.length,
      referrals: referralList
    });
  } catch (err) {
    console.error('[REFERRAL] /referral/stats error:', err.message);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
};

// GET /api/referral/history
exports.getReferralHistory = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT re.*, p.name AS from_partner_name
       FROM node_referral_earnings re
       JOIN node_partners p ON p.id = re.from_partner_id
       WHERE re.partner_id = ?
       ORDER BY re.created_at DESC
       LIMIT ? OFFSET ?`,
      [partnerId, limit, offset]
    );

    const [countRows] = await db.query(
      'SELECT COUNT(*) AS total FROM node_referral_earnings WHERE partner_id = ?',
      [partnerId]
    );

    res.json({
      success: true,
      page,
      limit,
      total: countRows[0].total,
      history: rows.map(r => ({
        id: r.id,
        type: r.type,
        amount: parseFloat(r.amount),
        status: r.status,
        level: r.level,
        bookingId: r.booking_id,
        fromPartner: r.from_partner_name,
        createdAt: r.created_at,
        description: r.type === 'referral_bonus'
          ? `₹${r.amount} referral bonus (${r.status})`
          : `₹${r.amount} order bonus from ${r.from_partner_name} (Level ${r.level})`
      }))
    });
  } catch (err) {
    console.error('[REFERRAL] /referral/history error:', err.message);
    res.status(500).json({ error: 'Failed to get referral history' });
  }
};

// GET /partner/join - Web Smart redirect page
exports.joinRedirect = async (req, res) => {
  const ref = req.query.ref || '';

  if (ref) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const ip = clientIp.split(',')[0].trim();
      await db.query(
        'INSERT INTO node_referrer_clicks (ip_address, referral_code) VALUES (?, ?)',
        [ip, ref.trim().toUpperCase()]
      );
    } catch (err) {
      console.error('[REFERRAL CLICK] Error logging click:', err.message);
    }
  }

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Home Faciliti Partner Join</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 20px; font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; box-sizing: border-box; color: #F8FAFC; }
    .card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px 30px; max-width: 420px; width: 100%; text-align: center; }
    .logo-container { width: 80px; height: 80px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 20px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
    .logo-icon { font-size: 40px; font-weight: bold; color: white; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 8px 0; color: #FFFFFF; }
    p { color: #94A3B8; font-size: 15px; line-height: 1.5; margin: 0 0 32px 0; }
    .btn { display: inline-block; width: 100%; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; font-weight: 600; padding: 14px 20px; border-radius: 12px; box-sizing: border-box; margin-bottom: 12px; }
    .btn-secondary { background: transparent; border: 1px solid rgba(255, 255, 255, 0.15); color: #E2E8F0; }
  </style>
  <script>
    window.onload = function() {
      var ref = "${ref}";
      var playStoreUrl = "https://play.google.com/store/apps/details?id=com.homefaciliti.partner"; 
      var appStoreUrl = "https://apps.apple.com/in/app/homeficiliti-partner-app/id6780466527"; 
      var isAndroid = /Android/i.test(navigator.userAgent);
      var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isAndroid) {
        var intentUrl = "intent://join?ref=" + ref + "#Intent;scheme=hfpartner;S.browser_fallback_url=" + encodeURIComponent(playStoreUrl) + ";end";
        window.location.href = intentUrl;
      } else if (isIOS) {
        window.location.href = "hfpartner://join?ref=" + ref;
        setTimeout(function() { window.location.href = appStoreUrl; }, 1500);
      } else {
        window.location.href = "hfpartner://join?ref=" + ref;
        setTimeout(function() { window.location.href = playStoreUrl; }, 1500);
      }
    };
  </script>
</head>
<body>
  <div class="card">
    <div class="logo-container"><span class="logo-icon">HF</span></div>
    <h1>Home Faciliti Partner</h1>
    <p>Opening the partner application on your device...<br>Please wait.</p>
    <a href="hfpartner://join?ref=${ref}" id="openAppBtn" class="btn">Open App Directly</a>
    <a href="https://play.google.com/store/apps/details?id=com.homefaciliti.partner" class="btn btn-secondary">Install from Play Store</a>
  </div>
</body>
</html>
  `);
};
