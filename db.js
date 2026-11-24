const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
// NOTE: Environment variables take priority. If not set, falls back to BigRock remote database.
let dbPassword = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'Home1184#$%';
// Auto-fix if Render stripped or escaped special characters like $ in env variables
if (dbPassword && dbPassword.includes('Home1184')) {
  dbPassword = 'Home1184#$%';
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'homefaciliti.com',
  user: process.env.DB_USER || process.env.MYSQL_USER || 'homef4fw_homefaci',
  password: dbPassword,
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'homef4fw_homefaci',
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || 'homefaciliti.com';
const dbUser = process.env.DB_USER || process.env.MYSQL_USER || 'homef4fw_homefaci';
const tablePrefix = process.env.DB_PREFIX !== undefined 
  ? process.env.DB_PREFIX 
  : (dbHost === 'homefaciliti.com' || dbHost === '162.241.116.166' || dbUser === 'homef4fw_homefaci' ? 'node_' : '');

if (tablePrefix) {
  console.log(`🔧 SQL Table prefixing active: prepending "${tablePrefix}" to table names.`);
}

function prefixQuery(sql) {
  if (!tablePrefix) return sql;
  
  const tables = [
    'users', 'categories', 'services', 'orders', 'orders_v2', 'pages', 'partners',
    'booking_earnings', 'subscription_earnings', 'banners', 'states',
    'cities', 'localities', 'notifications', 'reviews', 'settings_config',
    'support_tickets', 'uploaded_files', 'otps', 'referrals', 'referral_earnings', 'referrer_clicks'
  ];

  const regex = new RegExp(`\\b(FROM|JOIN|INTO|UPDATE|DESCRIBE|TABLE)\\s+\`?(${tables.join('|')})\`?\\b`, 'gi');
  
  return sql.replace(regex, (match, keyword, tableName) => {
    return `${keyword} \`${tablePrefix}${tableName}\``;
  });
}

// Override query and execute to dynamically translate table references
const originalQuery = pool.query;
pool.query = function (sql, values) {
  if (typeof sql === 'string') {
    sql = prefixQuery(sql);
  } else if (sql && typeof sql.sql === 'string') {
    sql.sql = prefixQuery(sql.sql);
  }
  return originalQuery.call(this, sql, values);
};

const originalExecute = pool.execute;
pool.execute = function (sql, values) {
  if (typeof sql === 'string') {
    sql = prefixQuery(sql);
  } else if (sql && typeof sql.sql === 'string') {
    sql.sql = prefixQuery(sql.sql);
  }
  return originalExecute.call(this, sql, values);
};

// Test connection and initialize essential partner tables on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Remote Database connected successfully through connection pool.');
    
    // Create uploaded_files table if not exists
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS \`${tablePrefix}uploaded_files\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`filename\` VARCHAR(255) NOT NULL UNIQUE,
        \`file_data\` LONGTEXT NOT NULL,
        \`mime_type\` VARCHAR(100) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await connection.query(createTableSql);
    console.log(`✅ Table "${tablePrefix}uploaded_files" verified/created successfully.`);

    // Create otps table if not exists
    const createOtpsSql = `
      CREATE TABLE IF NOT EXISTS \`${tablePrefix}otps\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`mobile_number\` VARCHAR(20) NOT NULL,
        \`otp\` VARCHAR(10) NOT NULL,
        \`status\` VARCHAR(10) DEFAULT '0',
        \`type\` VARCHAR(50) DEFAULT 'register_account',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await connection.query(createOtpsSql);

    // Create node_referrer_clicks if not exists
    const createClicksSql = `
      CREATE TABLE IF NOT EXISTS \`${tablePrefix}referrer_clicks\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`ip_address\` VARCHAR(100) NOT NULL,
        \`referral_code\` VARCHAR(50) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await connection.query(createClicksSql);

    connection.release();
  } catch (error) {
    console.error('❌ Database connection/initialization failed on startup:');
    console.error(error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ETIMEDOUT') {
      console.warn('\n⚠️  FIREWALL WARNING: Remote MySQL connections are likely restricted on this server.');
      console.warn('To resolve this, ensure cPanel Remote MySQL has allowed the current IP address.\n');
    }
  }
})();

module.exports = pool;
