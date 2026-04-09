require('dotenv').config();
const pool = require('../src/config/db');

const updateProductsTable = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Adding specifications column to products table...');
    await connection.query('ALTER TABLE products ADD COLUMN specifications TEXT AFTER description;');
    console.log('Column added successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error updating table:', error);
    }
  } finally {
    connection.release();
    process.exit();
  }
};

updateProductsTable();
