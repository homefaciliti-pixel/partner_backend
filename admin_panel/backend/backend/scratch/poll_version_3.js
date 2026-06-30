const https = require('https');

function check() {
  return new Promise((resolve) => {
    https.get('https://partner-backend-2.onrender.com/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ error: 'Failed to parse JSON', raw: data });
        }
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function run() {
  for (let i = 1; i <= 30; i++) {
    console.log(`Attempt ${i}/30: Checking live version...`);
    const res = await check();
    console.log('Response:', JSON.stringify(res));
    if (res.version === '1.0.3-verify') {
      console.log('SUCCESS! Version changed to 1.0.3-verify.');
      process.exit(0);
    }
    // Wait 30 seconds before next check
    await new Promise(r => setTimeout(r, 30000));
  }
  console.log('FAILED: Version did not change to 1.0.3-verify.');
  process.exit(1);
}

run();
