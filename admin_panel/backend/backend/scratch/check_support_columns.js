const db = require('../db');

async function run() {
  try {
    const [rows] = await db.query('SHOW COLUMNS FROM support_tickets');
    console.log('Columns in support_tickets:');
    console.log(JSON.stringify(rows, null, 2));
    
    // Also select 5 records to see values
    const [tickets] = await db.query('SELECT * FROM support_tickets LIMIT 5');
    console.log('\nLast 5 support tickets:');
    console.log(JSON.stringify(tickets, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error querying columns:', err);
    process.exit(1);
  }
}
run();
