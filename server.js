/* =====================================================
   server.js — Express API Server
   =====================================================
   Serves the static frontend files and provides REST
   API endpoints for Cars, Customers, Rentals, Payments,
   and Dashboard statistics. All data is stored in the
   Neon PostgreSQL database.
   ===================================================== */

require('dotenv').config();

const express = require('express');
const path = require('path');
const { pool, testConnection, initTables } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let isInitialized = false;

// Middleware to ensure DB is initialized on API requests
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is missing. Please add DATABASE_URL in your Vercel Project Settings > Environment Variables.'
      });
    }
    if (!isInitialized) {
      try {
        await initTables();
        isInitialized = true;
      } catch (err) {
        console.error('Failed to initialize database tables:', err);
        return res.status(500).json({ error: 'Database connection failed: ' + err.message });
      }
    }
  }
  next();
});

// =====================================================
// DASHBOARD
// =====================================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const totalCars = await pool.query('SELECT COUNT(*) FROM cars');
    const available = await pool.query("SELECT COUNT(*) FROM cars WHERE status = 'Available'");
    const rented = await pool.query("SELECT COUNT(*) FROM cars WHERE status = 'Rented'");
    const totalCustomers = await pool.query('SELECT COUNT(*) FROM customers');

    res.json({
      totalCars: parseInt(totalCars.rows[0].count),
      availableCars: parseInt(available.rows[0].count),
      rentedCars: parseInt(rented.rows[0].count),
      totalCustomers: parseInt(totalCustomers.rows[0].count),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// =====================================================
// CARS
// =====================================================
app.get('/api/cars', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get cars error:', err);
    res.status(500).json({ error: 'Failed to load cars' });
  }
});

app.post('/api/cars', async (req, res) => {
  try {
    const { name, model, plate, price_per_day } = req.body;
    const result = await pool.query(
      'INSERT INTO cars (name, model, plate, price_per_day, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, model, plate, price_per_day, 'Available']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add car error:', err);
    res.status(500).json({ error: 'Failed to add car' });
  }
});

app.put('/api/cars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, plate, price_per_day } = req.body;
    const result = await pool.query(
      'UPDATE cars SET name = $1, model = $2, plate = $3, price_per_day = $4 WHERE id = $5 RETURNING *',
      [name, model, plate, price_per_day, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update car error:', err);
    res.status(500).json({ error: 'Failed to update car' });
  }
});

app.delete('/api/cars/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if car is currently rented
    const car = await pool.query('SELECT status FROM cars WHERE id = $1', [id]);
    if (car.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    if (car.rows[0].status === 'Rented') {
      return res.status(400).json({ error: 'Cannot delete a car that is currently rented' });
    }

    await pool.query('DELETE FROM cars WHERE id = $1', [id]);
    res.json({ message: 'Car deleted' });
  } catch (err) {
    console.error('Delete car error:', err);
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

// =====================================================
// CUSTOMERS
// =====================================================
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { full_name, phone, license } = req.body;
    const result = await pool.query(
      'INSERT INTO customers (full_name, phone, license) VALUES ($1, $2, $3) RETURNING *',
      [full_name, phone, license]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add customer error:', err);
    res.status(500).json({ error: 'Failed to add customer' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, license } = req.body;
    const result = await pool.query(
      'UPDATE customers SET full_name = $1, phone = $2, license = $3 WHERE id = $4 RETURNING *',
      [full_name, phone, license, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer has active rentals
    const active = await pool.query(
      "SELECT COUNT(*) FROM rentals WHERE customer_id = $1 AND status = 'Rented'",
      [id]
    );
    if (parseInt(active.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete a customer with active rentals' });
    }

    await pool.query('DELETE FROM customers WHERE id = $1', [id]);
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// =====================================================
// RENTALS
// =====================================================
app.get('/api/rentals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*,
             c.full_name AS customer_name,
             ca.name AS car_name,
             ca.plate AS car_plate
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      ORDER BY r.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get rentals error:', err);
    res.status(500).json({ error: 'Failed to load rentals' });
  }
});

app.post('/api/rentals', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_id, car_id, start_date, return_date } = req.body;

    // Check car is available
    const car = await client.query('SELECT * FROM cars WHERE id = $1', [car_id]);
    if (car.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Car not found' });
    }
    if (car.rows[0].status === 'Rented') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This car is already rented' });
    }

    // Check for overlapping rentals
    const overlap = await client.query(
      `SELECT COUNT(*) FROM rentals
       WHERE car_id = $1 AND status = 'Rented'
       AND start_date <= $3 AND return_date >= $2`,
      [car_id, start_date, return_date]
    );
    if (parseInt(overlap.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This car has an overlapping rental for the selected dates' });
    }

    // Calculate price
    const startD = new Date(start_date);
    const endD = new Date(return_date);
    const totalDays = Math.ceil((endD - startD) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Return date must be after start date' });
    }
    const pricePerDay = parseFloat(car.rows[0].price_per_day);
    const totalPrice = totalDays * pricePerDay;

    // Create rental
    const rental = await client.query(
      `INSERT INTO rentals (customer_id, car_id, start_date, return_date, total_days, price_per_day, total_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Rented') RETURNING *`,
      [customer_id, car_id, start_date, return_date, totalDays, pricePerDay, totalPrice]
    );

    // Update car status
    await client.query("UPDATE cars SET status = 'Rented' WHERE id = $1", [car_id]);

    // Create payment record
    await client.query(
      `INSERT INTO payments (rental_id, customer_id, amount, status)
       VALUES ($1, $2, $3, 'Unpaid')`,
      [rental.rows[0].id, customer_id, totalPrice]
    );

    await client.query('COMMIT');
    res.status(201).json(rental.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create rental error:', err);
    res.status(500).json({ error: 'Failed to create rental' });
  } finally {
    client.release();
  }
});

app.put('/api/rentals/:id/return', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const rental = await client.query('SELECT * FROM rentals WHERE id = $1', [id]);
    if (rental.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental not found' });
    }
    if (rental.rows[0].status === 'Returned') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Rental already returned' });
    }

    // Mark rental as returned
    await client.query("UPDATE rentals SET status = 'Returned' WHERE id = $1", [id]);

    // Set car back to available
    await client.query("UPDATE cars SET status = 'Available' WHERE id = $1", [rental.rows[0].car_id]);

    await client.query('COMMIT');
    res.json({ message: 'Rental returned' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Return rental error:', err);
    res.status(500).json({ error: 'Failed to return rental' });
  } finally {
    client.release();
  }
});

app.delete('/api/rentals/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const rental = await client.query('SELECT * FROM rentals WHERE id = $1', [id]);
    if (rental.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental not found' });
    }

    // If rental was active, free the car
    if (rental.rows[0].status === 'Rented') {
      await client.query("UPDATE cars SET status = 'Available' WHERE id = $1", [rental.rows[0].car_id]);
    }

    // Delete payment first (FK constraint), then rental
    await client.query('DELETE FROM payments WHERE rental_id = $1', [id]);
    await client.query('DELETE FROM rentals WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Rental deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete rental error:', err);
    res.status(500).json({ error: 'Failed to delete rental' });
  } finally {
    client.release();
  }
});

// =====================================================
// PAYMENTS
// =====================================================
app.get('/api/payments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
             c.full_name AS customer_name,
             ca.name AS car_name,
             r.start_date AS rental_start_date
      FROM payments p
      LEFT JOIN rentals r ON p.rental_id = r.id
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      ORDER BY p.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

app.put('/api/payments/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE payments SET status = 'Paid' WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark paid error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// =====================================================
// AVAILABLE CARS (for rental form dropdown)
// =====================================================
app.get('/api/cars/available', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cars WHERE status = 'Available' ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error('Get available cars error:', err);
    res.status(500).json({ error: 'Failed to load available cars' });
  }
});

// Fallback route to serve frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =====================================================
// START SERVER (Local Development)
// =====================================================
async function start() {
  try {
    if (process.env.DATABASE_URL) {
      await testConnection();
      await initTables();
      isInitialized = true;
    } else {
      console.warn('⚠️ WARNING: DATABASE_URL is not set.');
    }

    app.listen(PORT, () => {
      console.log(`\n✓ Server running at http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
  }
}

// Export for Vercel serverless deployment
module.exports = app;

// Only start listening if run directly (node server.js)
if (require.main === module) {
  start();
}
