const db = require('../db');

async function run() {
  try {
    const [settings] = await db.query('SELECT * FROM settings LIMIT 50');
    console.log('settings:', settings);
    
    const [settingsConfig] = await db.query('SELECT * FROM settings_config LIMIT 50');
    console.log('settings_config:', settingsConfig);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
