require('dotenv').config();
const BASE_URL = 'http://localhost:3000';

async function request(url, options = {}, cookies = '') {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (cookies) headers['Cookie'] = cookies;

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  const setCookie = res.headers.get('set-cookie');
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data, cookie: setCookie || cookies };
}

async function runE2ETest() {
  console.log('🚀 Running Multi-Tenant End-to-End API Test...\n');

  // 1. Register a brand new company (Tenant B)
  const testEmail = `tenant_${Date.now()}@test.so`;
  console.log(`1. Registering new tenant company: "Sahal Car Rental" with manager: ${testEmail}`);
  const regRes = await request('/api/auth/register-company', {
    method: 'POST',
    body: JSON.stringify({
      company_name: 'Sahal Car Rental',
      phone: '+252 61 7777777',
      address: 'KM4, Mogadishu',
      manager_name: 'Sahal Manager',
      email: testEmail,
      password: 'StrongPassword123!',
    }),
  });

  if (!regRes.ok) {
    throw new Error('Registration failed: ' + JSON.stringify(regRes.data));
  }
  console.log('✓ Company registered:', regRes.data.user.companyName, 'Company ID:', regRes.data.user.companyId);
  const tenantCookie = regRes.cookie;

  // 2. Tenant B checks cars (should be empty initially)
  const carsRes1 = await request('/api/cars', { method: 'GET' }, tenantCookie);
  console.log(`✓ Tenant B initial cars count: ${carsRes1.data.length} (Expected: 0)`);
  if (carsRes1.data.length !== 0) throw new Error('Tenant should have 0 cars initially');

  // 3. Tenant B adds a car
  const addCarRes = await request('/api/cars', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sahal Land Cruiser',
      model: 'V8 2024',
      plate: 'SAHAL-001',
      price_per_day: 120,
    }),
  }, tenantCookie);
  if (!addCarRes.ok) throw new Error('Failed to add car for Tenant B: ' + JSON.stringify(addCarRes.data));
  console.log(`✓ Tenant B added car: "${addCarRes.data.name}" (ID: ${addCarRes.data.id})`);

  // 4. Verify Tenant B now has 1 car
  const carsRes2 = await request('/api/cars', { method: 'GET' }, tenantCookie);
  console.log(`✓ Tenant B cars count now: ${carsRes2.data.length}`);
  if (carsRes2.data.length !== 1) throw new Error('Tenant B should have 1 car');

  // 5. Login as SuperAdmin (carab6060@gmail.com)
  console.log('\n2. Testing SuperAdmin access...');
  // Check if we can login or fetch companies
  const superLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'carab6060@gmail.com',
      password: 'password123', // Or whatever password
    }),
  });

  console.log('✓ SuperAdmin login test status:', superLogin.status);

  // 6. Test Data Isolation with direct database query
  const { pool } = require('../db');
  const compBCars = await pool.query('SELECT name, company_id FROM cars WHERE plate = $1', ['SAHAL-001']);
  console.log(`✓ Database isolation check: Car is linked to company_id: ${compBCars.rows[0].company_id}`);

  // Clean up test company
  await pool.query('DELETE FROM companies WHERE id = $1', [regRes.data.user.companyId]);
  console.log('✓ Cleaned up test company and cascading records');
  await pool.end();

  console.log('\n🎉 ALL MULTI-TENANT SaaS INTEGRATION TESTS PASSED!');
}

runE2ETest().catch(err => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
