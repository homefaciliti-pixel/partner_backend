const db = require('../db');

async function run() {
  const dbName = process.env.DB_NAME || 'homef4fw_homefaci';
  console.log(`Checking columns of support_tickets in database...`);

  try {
    const [columns] = await db.query('SHOW COLUMNS FROM support_tickets');
    const hasPartnerId = columns.some(col => col.Field === 'partnerId');

    if (hasPartnerId) {
      console.log('✅ Column partnerId already exists in support_tickets table.');
    } else {
      console.log('Adding partnerId column to support_tickets table...');
      await db.query('ALTER TABLE support_tickets ADD COLUMN partnerId INT DEFAULT NULL');
      console.log('✅ Successfully added partnerId column to support_tickets table.');
    }

    // Double check the column list
    const [finalColumns] = await db.query('SHOW COLUMNS FROM support_tickets');
    console.log('Columns in support_tickets table:', finalColumns.map(col => col.Field));
  } catch (error) {
    console.error('Error executing query/alter:', error);
  } finally {
    process.exit(0);
  }
}

run();
