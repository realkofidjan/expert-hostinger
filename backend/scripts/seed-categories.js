require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/config/db');

const data = [
  {
    name: 'Cabinets',
    slug: 'cabinets',
    subcategories: [
      { name: 'Metal Cabinets', slug: 'metal-cabinets' },
      { name: 'Wooden Cabinets', slug: 'wooden-cabinets' },
    ],
  },
  {
    name: 'Office Chairs',
    slug: 'office-chairs',
    subcategories: [
      { name: 'Ergonomic Chairs', slug: 'ergonomic-chairs' },
      { name: 'Executive Chairs', slug: 'executive-chairs' },
      { name: 'Task Chairs', slug: 'task-chairs' },
    ],
  },
];

(async () => {
  try {
    for (const cat of data) {
      // Check if category already exists
      const [existing] = await db.query(
        'SELECT id FROM categories WHERE name = ? OR slug = ?',
        [cat.name, cat.slug]
      );

      let catId;
      if (existing.length > 0) {
        catId = existing[0].id;
        console.log(`  Category already exists: "${cat.name}" (id=${catId})`);
      } else {
        const [res] = await db.query(
          'INSERT INTO categories (name, slug) VALUES (?, ?)',
          [cat.name, cat.slug]
        );
        catId = res.insertId;
        console.log(`✓ Created category: "${cat.name}" (id=${catId})`);
      }

      for (const sub of cat.subcategories) {
        const [existingSub] = await db.query(
          'SELECT id FROM subcategories WHERE category_id = ? AND (name = ? OR slug = ?)',
          [catId, sub.name, sub.slug]
        );

        if (existingSub.length > 0) {
          console.log(`    Subcategory already exists: "${sub.name}"`);
        } else {
          await db.query(
            'INSERT INTO subcategories (category_id, name, slug) VALUES (?, ?, ?)',
            [catId, sub.name, sub.slug]
          );
          console.log(`  ✓ Created subcategory: "${sub.name}"`);
        }
      }
    }

    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
