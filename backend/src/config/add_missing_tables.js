require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require('./db');

const addMissingTables = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('--- Checking for missing tables ---');

        // Check for brands table
        const [brandsExist] = await connection.query("SHOW TABLES LIKE 'brands'");
        if (brandsExist.length === 0) {
            console.log('Creating brands table...');
            await connection.query(`
                CREATE TABLE brands (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL UNIQUE,
                    logo VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        }

        // Check for blogs table
        const [blogsExist] = await connection.query("SHOW TABLES LIKE 'blogs'");
        if (blogsExist.length === 0) {
            console.log('Creating blogs table...');
            await connection.query(`
                CREATE TABLE blogs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL UNIQUE,
                    content TEXT NOT NULL,
                    excerpt TEXT,
                    image_url VARCHAR(255),
                    author_id INT,
                    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        }

        // Check for logs table
        const [logsExist] = await connection.query("SHOW TABLES LIKE 'logs'");
        if (logsExist.length === 0) {
            console.log('Creating logs table...');
            await connection.query(`
                CREATE TABLE logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    action VARCHAR(255) NOT NULL,
                    context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        }

        // Check for discounts table
        const [discountsExist] = await connection.query("SHOW TABLES LIKE 'discounts'");
        if (discountsExist.length === 0) {
            console.log('Creating discounts table...');
            await connection.query(`
                CREATE TABLE discounts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
                    value DECIMAL(10,2) NOT NULL,
                    min_order_amount DECIMAL(10,2) DEFAULT 0,
                    max_uses INT DEFAULT NULL,
                    uses_count INT DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    expires_at TIMESTAMP NULL,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            console.log('Discounts table created.');
        }

        // Check for sales table
        const [salesExist] = await connection.query("SHOW TABLES LIKE 'sales'");
        if (salesExist.length === 0) {
            console.log('Creating sales table...');
            await connection.query(`
                CREATE TABLE sales (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
                    value DECIMAL(10,2) NOT NULL,
                    starts_at TIMESTAMP NOT NULL,
                    ends_at TIMESTAMP NOT NULL,
                    scope ENUM('all', 'categories', 'products') DEFAULT 'all',
                    target_ids JSON,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            console.log('Sales table created.');
        }

        // Check for settings table
        const [settingsExist] = await connection.query("SHOW TABLES LIKE 'settings'");
        if (settingsExist.length === 0) {
            console.log('Creating settings table...');
            await connection.query(`
                CREATE TABLE settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    setting_key VARCHAR(100) NOT NULL UNIQUE,
                    setting_value TEXT,
                    updated_by INT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            await connection.query(`
                INSERT INTO settings (setting_key, setting_value) VALUES
                    ('paystack_enabled', 'true'),
                    ('store_address', ''),
                    ('check_payable_to', ''),
                    ('manual_payment_instructions', '')
                ON DUPLICATE KEY UPDATE setting_key = setting_key;
            `);
            console.log('Settings table created with defaults.');
        } else {
            // Ensure default keys exist even if table already exists
            const defaultSettings = [
                ['paystack_enabled', 'true'],
                ['store_address', ''],
                ['check_payable_to', ''],
                ['manual_payment_instructions', ''],
            ];
            for (const [key, val] of defaultSettings) {
                await connection.query(
                    'INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)',
                    [key, val]
                );
            }
        }

        // Add payment_method column to quotes if missing
        const [pmCol] = await connection.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'payment_method'"
        );
        if (pmCol.length === 0) {
            await connection.query(
                "ALTER TABLE quotes ADD COLUMN payment_method VARCHAR(50) DEFAULT NULL AFTER status"
            );
            console.log('Added payment_method column to quotes table.');
        }

        // ─── Orders table: add new columns for direct checkout ───────────────────
        const orderCols = [
            ['order_number',          "ALTER TABLE orders ADD COLUMN order_number VARCHAR(60) UNIQUE AFTER id"],
            ['customer_name',         "ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255) AFTER order_number"],
            ['customer_email',        "ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255) AFTER customer_name"],
            ['customer_phone',        "ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(30) AFTER customer_email"],
            ['payment_method',        "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash' AFTER customer_phone"],
            ['delivery_mode',         "ALTER TABLE orders ADD COLUMN delivery_mode VARCHAR(50) DEFAULT 'pickup' AFTER payment_method"],
            ['region',                "ALTER TABLE orders ADD COLUMN region VARCHAR(100) AFTER delivery_mode"],
            ['delivery_fee',          "ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0.00 AFTER region"],
            ['subtotal',              "ALTER TABLE orders ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0.00 AFTER delivery_fee"],
            ['bank_receipt_path',     "ALTER TABLE orders ADD COLUMN bank_receipt_path VARCHAR(500) AFTER shipping_address"],
            ['bank_receipt_verified', "ALTER TABLE orders ADD COLUMN bank_receipt_verified TINYINT(1) DEFAULT 0 AFTER bank_receipt_path"],
        ];
        for (const [col, sql] of orderCols) {
            const [exists] = await connection.query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = ?",
                [col]
            );
            if (exists.length === 0) {
                await connection.query(sql);
                console.log(`Added column '${col}' to orders table.`);
            }
        }
 
        // ─── Order Items: add variant_id and color ──────────────────────────────
        const itemCols = [
            ['variant_id', "ALTER TABLE order_items ADD COLUMN variant_id INT AFTER product_id"],
            ['color', "ALTER TABLE order_items ADD COLUMN color VARCHAR(100) AFTER variant_id"]
        ];
        for (const [col, sql] of itemCols) {
            const [exists] = await connection.query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = ?",
                [col]
            );
            if (exists.length === 0) {
                await connection.query(sql);
                console.log(`Added column '${col}' to order_items table.`);
            }
        }

        // ─── Delivery Regions table ───────────────────────────────────────────────
        const [drExist] = await connection.query("SHOW TABLES LIKE 'delivery_regions'");
        if (drExist.length === 0) {
            console.log('Creating delivery_regions table...');
            await connection.query(`
                CREATE TABLE delivery_regions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    region_name VARCHAR(100) NOT NULL UNIQUE,
                    delivery_fee DECIMAL(10,2) DEFAULT 0.00,
                    is_free TINYINT(1) DEFAULT 0,
                    is_active TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            await connection.query(`
                INSERT INTO delivery_regions (region_name, delivery_fee, is_free) VALUES
                    ('Greater Accra', 0.00, 1),
                    ('Ashanti', 0.00, 0),
                    ('Western', 0.00, 0),
                    ('Eastern', 0.00, 0),
                    ('Central', 0.00, 0),
                    ('Northern', 0.00, 0),
                    ('Upper East', 0.00, 0),
                    ('Upper West', 0.00, 0),
                    ('Volta', 0.00, 0),
                    ('Brong-Ahafo', 0.00, 0),
                    ('Savannah', 0.00, 0),
                    ('North East', 0.00, 0),
                    ('Oti', 0.00, 0),
                    ('Western North', 0.00, 0),
                    ('Ahafo', 0.00, 0),
                    ('Bono East', 0.00, 0)
            `);
            console.log('delivery_regions table created and seeded.');
        }

        // ─── Payments table (linked to orders) ───────────────────────────────────
        const [paymentsExist] = await connection.query("SHOW TABLES LIKE 'payments'");
        if (paymentsExist.length === 0) {
            console.log('Creating payments table...');
            await connection.query(`
                CREATE TABLE payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id INT,
                    user_id INT,
                    quote_id INT,
                    reference VARCHAR(255),
                    amount DECIMAL(10,2),
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            console.log('Payments table created.');
        } else {
            // Ensure order_id column exists on payments table
            const [orderIdCol] = await connection.query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'order_id'"
            );
            if (orderIdCol.length === 0) {
                await connection.query("ALTER TABLE payments ADD COLUMN order_id INT AFTER id");
                console.log('Added order_id column to payments table.');
            }
        }

        // ─── Bank / MoMo settings ─────────────────────────────────────────────────
        const newSettings = [
            ['bank_name', ''],
            ['bank_account_number', ''],
            ['bank_account_name', ''],
            ['momo_number', ''],
            ['momo_network', 'MTN'],
            ['pickup_address', ''],
        ];
        for (const [key, val] of newSettings) {
            await connection.query(
                'INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)',
                [key, val]
            );
        }
        console.log('Bank/MoMo settings keys ensured.');

        // ─── Proforma Invoices table ───────────────────────────────────────────────
        const [proformaExist] = await connection.query("SHOW TABLES LIKE 'proforma_invoices'");
        if (proformaExist.length === 0) {
            console.log('Creating proforma_invoices table...');
            await connection.query(`
                CREATE TABLE proforma_invoices (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    invoice_number VARCHAR(100) NOT NULL UNIQUE,
                    client_name VARCHAR(255) NOT NULL,
                    client_address TEXT,
                    client_email VARCHAR(255),
                    items JSON NOT NULL,
                    subtotal DECIMAL(10,2) DEFAULT 0.00,
                    vat_percentage DECIMAL(5,2) DEFAULT 0.00,
                    vat_amount DECIMAL(10,2) DEFAULT 0.00,
                    grand_total DECIMAL(10,2) DEFAULT 0.00,
                    warranty VARCHAR(255),
                    delivery_terms VARCHAR(255),
                    payment_terms VARCHAR(255),
                    validity_days VARCHAR(100),
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            console.log('Proforma Invoices table created.');
        }

        console.log('--- Verification Complete ---');
    } catch (error) {
        console.error('Error adding missing tables:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
};

addMissingTables();
