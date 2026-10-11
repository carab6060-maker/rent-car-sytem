require('dotenv').config();
const { pool, testConnection, initTables } = require('../db');

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE NEON DB TESTS ---');

  // 1. Connection
  await testConnection();
  await initTables();

  // Clean test data if any leftovers from previous test run
  await pool.query("DELETE FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE full_name LIKE 'TEST_%')");
  await pool.query("DELETE FROM rentals WHERE customer_id IN (SELECT id FROM customers WHERE full_name LIKE 'TEST_%')");
  await pool.query("DELETE FROM customers WHERE full_name LIKE 'TEST_%'");
  await pool.query("DELETE FROM cars WHERE name LIKE 'TEST_%'");

  // 2. Add Car
  const carInsert = await pool.query(
    "INSERT INTO cars (name, model, plate, price_per_day, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    ['TEST_Camry', '2024', 'TEST-1234', 50.00, 'Available']
  );
  const testCar = carInsert.rows[0];
  console.log('✓ Added Car:', testCar.name, 'Price/Day:', testCar.price_per_day, 'Status:', testCar.status);
  if (testCar.status !== 'Available') throw new Error('Car status should be Available');

  // 3. Edit Car
  const carUpdate = await pool.query(
    "UPDATE cars SET price_per_day = $1 WHERE id = $2 RETURNING *",
    [60.00, testCar.id]
  );
  console.log('✓ Updated Car Price to:', carUpdate.rows[0].price_per_day);
  if (parseFloat(carUpdate.rows[0].price_per_day) !== 60.00) throw new Error('Car price update failed');

  // 4. Add Customer
  const custInsert = await pool.query(
    "INSERT INTO customers (full_name, phone, license) VALUES ($1, $2, $3) RETURNING *",
    ['TEST_John Doe', '+1 555-9999', 'DL-TEST-001']
  );
  const testCust = custInsert.rows[0];
  console.log('✓ Added Customer:', testCust.full_name, 'License:', testCust.license);

  // 5. Create Rental and test automatic calculations
  const startDate = '2026-11-01';
  const returnDate = '2026-11-06'; // 5 days
  const totalDays = 5;
  const pricePerDay = parseFloat(carUpdate.rows[0].price_per_day);
  const expectedTotal = totalDays * pricePerDay; // 5 * 60 = 300

  const rentalInsert = await pool.query(
    `INSERT INTO rentals (customer_id, car_id, start_date, return_date, total_days, price_per_day, total_price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'Rented') RETURNING *`,
    [testCust.id, testCar.id, startDate, returnDate, totalDays, pricePerDay, expectedTotal]
  );
  const testRental = rentalInsert.rows[0];
  console.log('✓ Created Rental:', 'Days:', testRental.total_days, 'Total Price:', testRental.total_price);
  if (parseFloat(testRental.total_price) !== 300.00) throw new Error('Total price calculation mismatch');

  // Update car status to Rented
  await pool.query("UPDATE cars SET status = 'Rented' WHERE id = $1", [testCar.id]);
  const carStatusCheck = await pool.query("SELECT status FROM cars WHERE id = $1", [testCar.id]);
  console.log('✓ Car status updated to:', carStatusCheck.rows[0].status);
  if (carStatusCheck.rows[0].status !== 'Rented') throw new Error('Car status not updated to Rented');

  // Auto-create payment
  const paymentInsert = await pool.query(
    `INSERT INTO payments (rental_id, customer_id, amount, status)
     VALUES ($1, $2, $3, 'Unpaid') RETURNING *`,
    [testRental.id, testCust.id, expectedTotal]
  );
  const testPayment = paymentInsert.rows[0];
  console.log('✓ Auto-created Payment:', 'Amount:', testPayment.amount, 'Status:', testPayment.status);
  if (testPayment.status !== 'Unpaid' || parseFloat(testPayment.amount) !== 300.00) {
    throw new Error('Payment creation mismatch');
  }

  // 6. Test Prevent Overlapping Rental
  const overlapCheck = await pool.query(
    `SELECT COUNT(*) FROM rentals
     WHERE car_id = $1 AND status = 'Rented'
     AND start_date <= $3 AND return_date >= $2`,
    [testCar.id, '2026-11-03', '2026-11-08']
  );
  console.log('✓ Overlap check detected conflicting active rentals:', overlapCheck.rows[0].count);
  if (parseInt(overlapCheck.rows[0].count) <= 0) throw new Error('Overlap check failed to detect conflict');

  // 7. Test Return Rental
  await pool.query("UPDATE rentals SET status = 'Returned' WHERE id = $1", [testRental.id]);
  await pool.query("UPDATE cars SET status = 'Available' WHERE id = $1", [testCar.id]);
  const carReturnedCheck = await pool.query("SELECT status FROM cars WHERE id = $1", [testCar.id]);
  console.log('✓ After return, car status restored to:', carReturnedCheck.rows[0].status);
  if (carReturnedCheck.rows[0].status !== 'Available') throw new Error('Car status not restored to Available');

  // 8. Test Mark Payment as Paid
  const payUpdate = await pool.query(
    "UPDATE payments SET status = 'Paid' WHERE id = $1 RETURNING *",
    [testPayment.id]
  );
  console.log('✓ Payment marked as:', payUpdate.rows[0].status);
  if (payUpdate.rows[0].status !== 'Paid') throw new Error('Payment status not updated to Paid');

  // 9. Test Dashboard Statistics Query
  const totalCars = await pool.query('SELECT COUNT(*) FROM cars');
  const availableCars = await pool.query("SELECT COUNT(*) FROM cars WHERE status = 'Available'");
  const rentedCars = await pool.query("SELECT COUNT(*) FROM cars WHERE status = 'Rented'");
  const totalCustomers = await pool.query('SELECT COUNT(*) FROM customers');
  console.log('✓ Dashboard Stats:', {
    totalCars: parseInt(totalCars.rows[0].count),
    availableCars: parseInt(availableCars.rows[0].count),
    rentedCars: parseInt(rentedCars.rows[0].count),
    totalCustomers: parseInt(totalCustomers.rows[0].count)
  });

  // 10. Clean up test records
  await pool.query("DELETE FROM payments WHERE id = $1", [testPayment.id]);
  await pool.query("DELETE FROM rentals WHERE id = $1", [testRental.id]);
  await pool.query("DELETE FROM customers WHERE id = $1", [testCust.id]);
  await pool.query("DELETE FROM cars WHERE id = $1", [testCar.id]);
  console.log('✓ Cleaned up test records');

  console.log('--- ALL BACKEND DATABASE TESTS PASSED! ---');
  await pool.end();
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
