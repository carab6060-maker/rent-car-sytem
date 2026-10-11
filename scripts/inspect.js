require('dotenv').config();
const { pool } = require('../db');

async function inspect() {
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('Tables found in Neon database:');
  for (const row of tables.rows) {
    const countRes = await pool.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
    console.log(`- ${row.table_name} (${countRes.rows[0].count} rows)`);
    const cols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
      [row.table_name]
    );
    cols.rows.forEach(c => console.log(`    ${c.column_name}: ${c.data_type}`));
  }
  await pool.end();
}

inspect().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
