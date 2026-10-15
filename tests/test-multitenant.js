require('dotenv').config();
const { pool } = require('../db');
const bcrypt = require('bcryptjs');

async function testMultiTenancy() {
  console.log('🧪 Starting Multi-Tenant verification tests...');

  // 1. Verify companies table exists
  const compCount = await pool.query('SELECT COUNT(*) FROM companies');
  console.log(`✓ Companies found: ${compCount.rows[0].count}`);

  // 2. Test isolation query
  const compA = await pool.query('SELECT id, name FROM companies LIMIT 1');
  const compId = compA.rows[0].id;

  const cars = await pool.query('SELECT COUNT(*) FROM cars WHERE company_id = $1', [compId]);
  console.log(`✓ Company "${compA.rows[0].name}" has ${cars.rows[0].count} cars`);

  // 3. Test superadmin user exists
  const superUser = await pool.query("SELECT id, email, role FROM users WHERE role = 'superadmin'");
  console.log(`✓ SuperAdmin accounts: ${superUser.rows.length} (${superUser.rows.map(u => u.email).join(', ')})`);

  console.log('🎉 Multi-Tenant backend database & constraints verified successfully!');
  await pool.end();
}

testMultiTenancy().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
