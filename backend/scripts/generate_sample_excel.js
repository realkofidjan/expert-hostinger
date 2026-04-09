const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs-extra');

const generateSample = () => {
    const data = [
        ["Name", "SKU", "Price", "Stock", "Category_ID", "Subcategory_ID", "Brand", "Color", "Dimensions", "Variants", "Images", "Description"],
        [
            "Executive Mesh Chair", 
            "FUR-CH-001", 
            1250.00, 
            0, 
            1, 
            1, 
            "Expert", 
            "Black", 
            "60x60x120cm", 
            "Black:10, White:5, Blue:2", 
            "https://photos.app.goo.gl/example1, https://photos.app.goo.gl/example2", 
            "High-back ergonomic mesh chair with adjustable headrest and lumbar support."
        ],
        [
            "Modern Office Desk", 
            "FUR-DK-005", 
            2400.00, 
            15, 
            2, 
            4, 
            "Expert", 
            "Oak", 
            "140x70x75cm", 
            "", 
            "https://photos.app.goo.gl/example3", 
            "Minimalist oak wood desk with cable management."
        ],
        [
            "Invalid Product Test", 
            "ERR-001", 
            "PriceError", 
            5, 
            1, 
            1, 
            "Test", 
            "Red", 
            "N/A", 
            "InvalidFormat", 
            "", 
            "This row is designed to show how errors are caught in the preflight table."
        ]
    ];

    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Inventory Template");

    // Ensure scripts directory exists
    const templatePath = path.join(__dirname, '..', 'product_upload_template.xlsx');
    xlsx.writeFile(wb, templatePath);

    console.log(`Sample Excel generated at: ${templatePath}`);
};

generateSample();
