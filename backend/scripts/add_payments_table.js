require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../src/config/db');

const addPaymentsTable = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('Adding payments table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                quote_id INT,
                order_id INT,
                reference VARCHAR(255) NOT NULL UNIQUE,
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'GHS',
                status VARCHAR(50) DEFAULT 'pending',
                gateway VARCHAR(50) DEFAULT 'paystack',
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Payments table created successfully.');
    } catch (error) {
        console.error('Error adding payments table:', error);
    } finally {
        connection.release();
        process.exit();
    }
};

addPaymentsTable();
