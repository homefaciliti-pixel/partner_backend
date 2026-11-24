const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const compression = require('compression');
require('dotenv').config();

const db = require('./db');
const { loadFileFromDb } = require('./filePersistence');
const apiRoutes = require('./routes/index');
const referralController = require('./controllers/referralController');

const server = express();
server.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

// Middleware
server.use(cors());
server.use(compression());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// Body parser fallback for non-standard headers
server.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return next();
    }
    if (req.body === undefined) {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        if (data) {
          try { req.body = JSON.parse(data); } catch (e) {}
        }
        next();
      });
    } else {
      next();
    }
  } else {
    next();
  }
});

// Avatar colors for dynamic fallback
const avatarColors = ['0B5FA5', 'E11D48', 'DB2777', '7C3AED', '2563EB', '0D9488', '059669', 'D97706', 'EA580C', '4B5563'];
function getColorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// Static /uploads route with database file restoration & avatar fallback
server.use('/uploads', async (req, res, next) => {
  const filePath = path.join(__dirname, 'uploads', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return express.static(path.join(__dirname, 'uploads'))(req, res, next);
  } else {
    const filename = req.path.replace(/^\//, '');
    if (!filename) return res.status(404).send('Not Found');

    const dbFile = await loadFileFromDb(filename, filePath);
    if (dbFile) {
      return res.sendFile(filePath);
    }

    const ext = path.extname(filename).toLowerCase();
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    if (videoExtensions.includes(ext)) {
      return res.status(404).json({ error: 'Video file not found: ' + filename });
    }

    try {
      const [rows] = await db.query('SELECT name FROM partners WHERE image LIKE ?', [`%${filename}`]);
      if (rows.length > 0) {
        const partnerName = rows[0].name || 'Partner';
        const color = getColorForName(partnerName);
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=${color}&color=fff&size=250&bold=true`;
        
        return https.get(avatarUrl, (apiRes) => {
          res.setHeader('Content-Type', 'image/png');
          apiRes.pipe(res);
        }).on('error', () => {
          res.sendFile(path.join(__dirname, 'defaults', 'default-profile.png'));
        });
      }
    } catch (err) {}

    return res.sendFile(path.join(__dirname, 'defaults', 'default-document.png'));
  }
});

// Refer & Earn Smart Redirect Link
server.get('/partner/join', referralController.joinRedirect);

// Root Route / Health Check Dashboard
server.get('/', async (req, res) => {
  try {
    const [[partnersRow]] = await db.query('SELECT COUNT(*) AS count FROM partners');
    const [[bookingsRow]] = await db.query('SELECT COUNT(*) AS count FROM orders_v2');
    const [[completedRow]] = await db.query("SELECT COUNT(*) AS count FROM orders_v2 WHERE status = 'completed'");
    const [[earningsRow]] = await db.query("SELECT SUM(totalEarnings) AS total FROM partners");
    const [[withdrawalsRow]] = await db.query("SELECT SUM(withdrawnAmount) AS total FROM partners");

    const partnersCount = partnersRow ? partnersRow.count : 0;
    const bookingsCount = bookingsRow ? bookingsRow.count : 0;
    const completedCount = completedRow ? completedRow.count : 0;
    const totalEarnings = earningsRow ? (earningsRow.total || 0) : 0;
    const totalWithdrawals = withdrawalsRow ? (withdrawalsRow.total || 0) : 0;

    const formatCurrency = (val) => '₹' + Math.round(Number(val || 0)).toLocaleString('en-IN');

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Home Services Partner API Backend</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 20px; font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
    .card { background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border-top: 4px solid #10B981; padding: 40px; max-width: 850px; width: 100%; text-align: left; }
    .badge { display: inline-flex; align-items: center; background-color: #D1FAE5; color: #059669; font-size: 14px; font-weight: 500; padding: 6px 16px; border-radius: 20px; margin-bottom: 24px; }
    .badge-dot { width: 8px; height: 8px; background-color: #10B981; border-radius: 50%; margin-right: 8px; }
    h1 { font-size: 32px; color: #1E293B; margin: 0 0 16px 0; font-weight: 700; }
    p { color: #64748B; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; }
    .stats-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; text-align: center; }
    .stat-number { font-size: 32px; font-weight: 700; color: #10B981; margin-bottom: 8px; }
    .stat-label { font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="badge-dot"></span> Server Online</div>
    <h1>Home Services Partner API Backend</h1>
    <p>Partner backend running cleanly with modular MVC architecture.</p>
    <div class="stats-container">
      <div class="stat-card"><div class="stat-number">${partnersCount}</div><div class="stat-label">Registered Partners</div></div>
      <div class="stat-card"><div class="stat-number">${bookingsCount}</div><div class="stat-label">Total Bookings</div></div>
      <div class="stat-card"><div class="stat-number">${completedCount}</div><div class="stat-label">Completed Bookings</div></div>
      <div class="stat-card"><div class="stat-number">${formatCurrency(totalEarnings)}</div><div class="stat-label">Total Earnings</div></div>
      <div class="stat-card"><div class="stat-number">${formatCurrency(totalWithdrawals)}</div><div class="stat-label">Total Settlements</div></div>
    </div>
  </div>
</body>
</html>
    `);
  } catch (error) {
    res.status(500).json({ status: 'Error', message: 'Failed to retrieve database stats', error: error.message });
  }
});

// Mount all API endpoints
server.use('/api', apiRoutes);

// Android App Links / assetlinks.json
server.get('/.well-known/assetlinks.json', (req, res) => {
  const package_name = process.env.APP_PACKAGE_NAME || 'com.homefaciliti.partner';
  const fingerprints = process.env.SHA256_FINGERPRINTS 
    ? process.env.SHA256_FINGERPRINTS.split(',').map(f => f.trim())
    : ['41:79:BC:A0:E1:AF:0F:38:19:E1:6D:00:CC:A1:3E:EA:79:A3:EB:F0:3D:CF:E7:F0:44:68:19:D4:3D:D8:A9:FD'];

  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: package_name, sha256_cert_fingerprints: fingerprints }
    }
  ]);
});

// 404 Handler
server.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Endpoint Not Found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
server.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred',
    error: err.message
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Partner API Server running on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/`);
  console.log(`⚡ Available endpoints under: http://localhost:${PORT}/api/`);

  // Ensure default pages table exists
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`pages\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (err) {}
});

module.exports = server;
