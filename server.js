/* =====================================================
   server.js — Express API Server
   =====================================================
   Serves the static frontend files and provides REST
   API endpoints for Cars, Customers, Rentals, Payments,
   Dashboard statistics, and Authentication.
   All data is stored in the Neon PostgreSQL database.
   ===================================================== */

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const { pool, testConnection, initTables } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy (Vercel) for secure cookies over HTTPS
app.set('trust proxy', 1);

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fast Health Check Endpoint (does not require DB or Session)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    databaseConfigured: !!process.env.DATABASE_URL,
    sessionSecretConfigured: !!process.env.SESSION_SECRET,
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

// Guard: if DATABASE_URL is missing, return friendly 500 error immediately
// instead of letting session store or DB pool hang/crash
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is missing. Please add DATABASE_URL in Vercel Project Settings > Environment Variables.'
      });
    }
  }
  next();
});

// Session configuration — uses PostgreSQL as session store
const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false,
  }),
  secret: process.env.SESSION_SECRET || 'car-rental-default-session-secret-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'lax',
  },
});

// Only attach session if DATABASE_URL is present
app.use((req, res, next) => {
  if (!process.env.DATABASE_URL) {
    return next();
  }
  sessionMiddleware(req, res, next);
});

let isInitialized = false;

// Middleware to ensure DB is initialized on API requests
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    if (!isInitialized && process.env.DATABASE_URL) {
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
// AUTH HELPERS
// =====================================================

/**
 * requireAuth — blocks unauthenticated requests.
 * Returns 401 so the frontend can redirect to /login.html
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

/**
 * requireManager — allows only users with role 'manager'.
 */
function requireManager(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  if (req.session.userRole !== 'manager') {
    return res.status(403).json({ error: 'Forbidden. Manager access required.' });
  }
  next();
}

// =====================================================
// AUTH ROUTES
// =====================================================

/** POST /api/auth/login */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Store minimal info in session
    req.session.userId   = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.full_name;

    res.json({
      id:       user.id,
      email:    user.email,
      fullName: user.full_name,
      role:     user.role,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/** POST /api/auth/logout */
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

/** GET /api/auth/me — returns the current session user (or 401) */
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (result.rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session invalid.' });
    }
    const user = result.rows[0];
    res.json({
      id:       user.id,
      email:    user.email,
      fullName: user.full_name,
      role:     user.role,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// =====================================================
// USER MANAGEMENT (Manager only)
// =====================================================

/** GET /api/users — list all users */
app.get('/api/users', requireManager, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

/** POST /api/users — create a staff account (Manager only) */
app.post('/api/users', requireManager, async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Managers can only create 'staff' or 'manager' accounts but cannot self-escalate via this route
    const allowedRoles = ['staff', 'manager'];
    const assignedRole = allowedRoles.includes(role) ? role : 'staff';

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, created_at',
      [email.trim().toLowerCase(), passwordHash, full_name.trim(), assignedRole]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

/** DELETE /api/users/:id — delete a staff account (Manager only) */
app.delete('/api/users/:id', requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent manager from deleting themselves
    if (parseInt(id) === req.session.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

/** PUT /api/users/:id/role — change a user's role (Manager only, cannot change own role) */
app.put('/api/users/:id/role', requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Prevent manager from changing their own role (to avoid accidental lockout)
    if (parseInt(id) === req.session.userId) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const allowedRoles = ['staff', 'manager'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name, role',
      [role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Change role error:', err);
    res.status(500).json({ error: 'Failed to change role.' });
  }
});

// =====================================================
// DASHBOARD (requireAuth)
// =====================================================
app.get('/api/dashboard', requireAuth, async (req, res) => {
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
// CARS (requireAuth; add/edit/delete require manager)
// =====================================================
app.get('/api/cars', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get cars error:', err);
    res.status(500).json({ error: 'Failed to load cars' });
  }
});

app.post('/api/cars', requireManager, async (req, res) => {
  try {
    const { name, model, plate, price_per_day, image_url } = req.body;
    const result = await pool.query(
      'INSERT INTO cars (name, model, plate, price_per_day, status, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, model, plate, price_per_day, 'Available', image_url ? image_url.trim() : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add car error:', err);
    res.status(500).json({ error: 'Failed to add car' });
  }
});

app.put('/api/cars/:id', requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, plate, price_per_day, image_url } = req.body;
    const result = await pool.query(
      'UPDATE cars SET name = $1, model = $2, plate = $3, price_per_day = $4, image_url = $5 WHERE id = $6 RETURNING *',
      [name, model, plate, price_per_day, image_url !== undefined ? (image_url ? image_url.trim() : null) : null, id]
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

app.delete('/api/cars/:id', requireManager, async (req, res) => {
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
// CUSTOMERS (requireAuth; add/edit/delete require manager)
// =====================================================
app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

app.post('/api/customers', requireAuth, async (req, res) => {
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

app.put('/api/customers/:id', requireAuth, async (req, res) => {
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

app.delete('/api/customers/:id', requireManager, async (req, res) => {
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
// RENTALS (requireAuth for all)
// =====================================================
app.get('/api/rentals', requireAuth, async (req, res) => {
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

app.post('/api/rentals', requireAuth, async (req, res) => {
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

app.put('/api/rentals/:id/return', requireAuth, async (req, res) => {
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

app.delete('/api/rentals/:id', requireManager, async (req, res) => {
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
// RENTALS WITH OUTSTANDING BALANCE (Helper for recording payments)
// =====================================================
app.get('/api/rentals/unpaid', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.total_price, r.start_date, r.return_date, r.status,
             c.id AS customer_id, c.full_name AS customer_name, c.phone AS customer_phone,
             ca.name AS car_name, ca.plate AS car_plate,
             COALESCE(p_paid.total_paid, 0) AS total_paid,
             GREATEST(0, r.total_price - COALESCE(p_paid.total_paid, 0)) AS balance_due
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      LEFT JOIN (
        SELECT rental_id, SUM(amount) AS total_paid
        FROM payments
        WHERE status = 'Paid'
        GROUP BY rental_id
      ) p_paid ON r.id = p_paid.rental_id
      WHERE GREATEST(0, r.total_price - COALESCE(p_paid.total_paid, 0)) > 0
      ORDER BY r.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get unpaid rentals error:', err);
    res.status(500).json({ error: 'Failed to load pending rentals' });
  }
});

// =====================================================
// PAYMENTS & INCOME MANAGEMENT
// =====================================================

/** GET /api/payments — List all payments */
app.get('/api/payments', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
             c.full_name AS customer_name,
             c.phone AS customer_phone,
             ca.name AS car_name,
             ca.plate AS car_plate,
             r.start_date AS rental_start_date,
             r.return_date AS rental_return_date,
             r.total_price AS rental_total_price,
             u.full_name AS recorded_by_name
      FROM payments p
      LEFT JOIN rentals r ON p.rental_id = r.id
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      LEFT JOIN users u ON p.recorded_by = u.id
      ORDER BY p.payment_date DESC, p.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

/** POST /api/payments — Record a new payment received for a rental */
app.post('/api/payments', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rental_id, amount, payment_method, payment_date, reference_no, notes } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!rental_id || isNaN(parsedAmount) || parsedAmount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Valid rental ID and a positive payment amount are required.' });
    }

    const validMethods = ['Cash', 'Bank Transfer', 'Mobile Money'];
    const method = validMethods.includes(payment_method) ? payment_method : 'Cash';
    const dateVal = payment_date || new Date().toISOString().split('T')[0];

    // Check rental existence and outstanding balance
    const rentalRes = await client.query(`
      SELECT r.id, r.customer_id, r.total_price,
             COALESCE(p_paid.total_paid, 0) AS total_paid
      FROM rentals r
      LEFT JOIN (
        SELECT rental_id, SUM(amount) AS total_paid
        FROM payments
        WHERE status = 'Paid'
        GROUP BY rental_id
      ) p_paid ON r.id = p_paid.rental_id
      WHERE r.id = $1
    `, [rental_id]);

    if (rentalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental not found.' });
    }

    const rental = rentalRes.rows[0];
    const totalCharged = parseFloat(rental.total_price);
    const alreadyPaid = parseFloat(rental.total_paid);
    const remainingBalance = Math.max(0, totalCharged - alreadyPaid);

    if (remainingBalance <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This rental is already fully paid.' });
    }

    if (parsedAmount > remainingBalance + 0.009) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Payment amount ($${parsedAmount.toFixed(2)}) exceeds the remaining balance ($${remainingBalance.toFixed(2)}).`
      });
    }

    // Duplicate transaction prevention check
    const dupCheck = await client.query(`
      SELECT id FROM payments
      WHERE rental_id = $1 AND amount = $2 AND status = 'Paid'
        AND (
          (reference_no IS NOT NULL AND reference_no <> '' AND reference_no = $3)
          OR (payment_date = $4::DATE AND created_at >= NOW() - INTERVAL '3 minutes')
        )
    `, [rental_id, parsedAmount, reference_no ? reference_no.trim() : null, dateVal]);

    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Duplicate payment detected. An identical payment for this rental was recorded moments ago or has the same reference number.'
      });
    }

    // Insert payment record
    const result = await client.query(`
      INSERT INTO payments (
        rental_id, customer_id, amount, status,
        payment_method, payment_date, notes, reference_no, recorded_by
      ) VALUES ($1, $2, $3, 'Paid', $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      rental_id,
      rental.customer_id,
      parsedAmount,
      method,
      dateVal,
      notes ? notes.trim() : null,
      reference_no ? reference_no.trim() : null,
      req.session.userId || null
    ]);

    // If total paid now covers the rental, mark any placeholder 'Unpaid' row as 'Paid' or remove it
    const newTotalPaid = alreadyPaid + parsedAmount;
    if (newTotalPaid >= totalCharged - 0.009) {
      // Clean up placeholder unpaid payment records for this rental
      await client.query(
        "DELETE FROM payments WHERE rental_id = $1 AND status = 'Unpaid'",
        [rental_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create payment error:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  } finally {
    client.release();
  }
});

/** PUT /api/payments/:id/pay — Mark an existing payment row as paid */
app.put('/api/payments/:id/pay', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, payment_date, reference_no, notes } = req.body || {};

    const validMethods = ['Cash', 'Bank Transfer', 'Mobile Money'];
    const method = validMethods.includes(payment_method) ? payment_method : 'Cash';
    const dateVal = payment_date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      UPDATE payments
      SET status = 'Paid',
          payment_method = $1,
          payment_date = $2,
          reference_no = COALESCE($3, reference_no),
          notes = COALESCE($4, notes),
          recorded_by = COALESCE($5, recorded_by)
      WHERE id = $6
      RETURNING *
    `, [
      method,
      dateVal,
      reference_no ? reference_no.trim() : null,
      notes ? notes.trim() : null,
      req.session.userId || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark paid error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

/** DELETE /api/payments/:id — Manager only (Staff cannot delete financial records) */
app.delete('/api/payments/:id', requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM payments WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ message: 'Payment record deleted' });
  } catch (err) {
    console.error('Delete payment error:', err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});


// =====================================================
// AVAILABLE CARS (for rental form dropdown)
// =====================================================
app.get('/api/cars/available', requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cars WHERE status = 'Available' ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error('Get available cars error:', err);
    res.status(500).json({ error: 'Failed to load available cars' });
  }
});

// =====================================================
// SETUP — create the FIRST manager account
// Protected by SETUP_SECRET environment variable.
// POST /api/setup  { email, password, full_name }
// =====================================================
app.post('/api/setup', async (req, res) => {
  try {
    // Require a setup secret to prevent public access
    const setupSecret = process.env.SETUP_SECRET;
    if (!setupSecret) {
      return res.status(403).json({ error: 'Setup is disabled. Set SETUP_SECRET in environment variables to enable it.' });
    }

    const { secret, email, password, full_name } = req.body;
    if (secret !== setupSecret) {
      return res.status(403).json({ error: 'Invalid setup secret.' });
    }

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check if a manager already exists
    const existing = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'manager'");
    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(409).json({ error: 'A manager account already exists. Use the manager panel to create more accounts.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'manager') RETURNING id, email, full_name, role",
      [email.trim().toLowerCase(), passwordHash, full_name.trim()]
    );

    res.status(201).json({
      message: 'Manager account created successfully. You can now log in.',
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Setup failed: ' + err.message });
  }
});

// =====================================================
// FRONTEND ROUTING
// Serve login.html for /login, index.html for everything else
// =====================================================
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
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
