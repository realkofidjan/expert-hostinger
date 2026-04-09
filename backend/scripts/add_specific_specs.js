require('dotenv').config();
const pool = require('../src/config/db');

const addSpecificSpecs = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Adding specific specification columns to products table...');
    const columns = [
      'ALTER TABLE products ADD COLUMN weight_capacity VARCHAR(255) AFTER dimensions;',
      'ALTER TABLE products ADD COLUMN material VARCHAR(255) AFTER weight_capacity;',
      'ALTER TABLE products ADD COLUMN fabric_type VARCHAR(255) AFTER material;',
      'ALTER TABLE products ADD COLUMN warranty VARCHAR(255) AFTER fabric_type;',
      'ALTER TABLE products ADD COLUMN certifications VARCHAR(255) AFTER warranty;'
    ];

    for (const sql of columns) {
      try {
        await connection.query(sql);
        console.log(`Executed: ${sql}`);
      } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`Column already exists for: ${sql.split('ADD COLUMN ')[1].split(' ')[0]}`);
        } else {
          throw err;
        }
      }
    }
    console.log('Columns added successfully.');
  } catch (error) {
    console.error('Error updating table:', error);
  } finally {
    connection.release();
    process.exit();
  }
};

addSpecificSpecs();
