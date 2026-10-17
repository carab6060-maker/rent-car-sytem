/* =====================================================
   server.js — Express Multi-Tenant SaaS API Server
   =====================================================
   Multi-Company Car Rental SaaS Management System.
   Supports multiple companies (tenants) with complete
   data isolation across Cars, Customers, Rentals,
   Payments, Expenses, and Staff.
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
    multiTenant: true,
    databaseConfigured: !!process.env.DATABASE_URL,
    sessionSecretConfigured: !!process.env.SESSION_SECRET,
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

// Database connectivity test endpoint (does not require session)
app.get('/api/test-db', async (req, res) => {
  const start = Date.now();
  try {
    const r = await pool.query('SELECT NOW()');
    res.json({ ok: true, now: r.rows[0].now, elapsedMs: Date.now() - start });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, elapsedMs: Date.now() - start });
  }
});

// Guard: if DATABASE_URL is missing, return friendly 500 error immediately
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
// AUTH & TENANCY HELPERS
// =====================================================

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

function requireManager(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  if (req.session.userRole !== 'manager' && req.session.userRole !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden. Manager access required.' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  if (req.session.userRole !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden. SuperAdmin access required.' });
  }
  next();
}

/**
 * getTenantId — extracts active company_id.
 * For SuperAdmin, allows inspecting specific companies via header, query, or active session.
 */
function getTenantId(req) {
  if (req.session && req.session.userRole === 'superadmin') {
    if (req.headers['x-company-id']) {
      const cid = parseInt(req.headers['x-company-id']);
      if (!isNaN(cid)) return cid;
    }
    if (req.query && req.query.company_id) {
      const cid = parseInt(req.query.company_id);
      if (!isNaN(cid)) return cid;
    }
    if (req.session.activeCompanyId) {
      return req.session.activeCompanyId;
    }
  }
  return req.session ? req.session.companyId : null;
}

/**
 * requireTenant — enforces company isolation and status check.
 */
async function requireTenant(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  let companyId = getTenantId(req);

  // If superadmin has no company selected yet, fallback to first company
  if (!companyId && req.session.userRole === 'superadmin') {
    try {
      const firstComp = await pool.query('SELECT id, name FROM companies ORDER BY id ASC LIMIT 1');
      if (firstComp.rows.length > 0) {
        companyId = firstComp.rows[0].id;
        req.session.activeCompanyId = companyId;
        req.session.companyName = firstComp.rows[0].name;
      }
    } catch (e) {
      console.error('Tenant fallback error:', e);
    }
  }

  if (!companyId) {
    return res.status(400).json({ error: 'No company associated with this account.' });
  }

  // Ensure company is active (unless superadmin)
  if (req.session.userRole !== 'superadmin') {
    try {
      const compRes = await pool.query('SELECT status, name FROM companies WHERE id = $1', [companyId]);
      if (compRes.rows.length === 0 || compRes.rows[0].status === 'suspended') {
        return res.status(403).json({ error: 'Your company account has been suspended. Please contact the administrator.' });
      }
    } catch (e) {
      console.error('Check company status error:', e);
    }
  }

  req.companyId = companyId;
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

    const result = await pool.query(`
      SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.company_id,
             c.name AS company_name, c.status AS company_status, c.logo_url AS company_logo
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE LOWER(u.email) = $1
    `, [email.trim().toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.role !== 'superadmin' && user.company_status === 'suspended') {
      return res.status(403).json({ error: 'Your company account has been suspended. Please contact support.' });
    }

    // Set session
    req.session.userId          = user.id;
    req.session.userRole        = user.role;
    req.session.userName        = user.full_name;
    req.session.companyId       = user.company_id;
    req.session.activeCompanyId = user.company_id;
    req.session.companyName     = user.company_name;

    res.json({
      id:          user.id,
      email:       user.email,
      fullName:    user.full_name,
      role:        user.role,
      companyId:   user.company_id,
      companyName: user.company_name || 'Car Rental SaaS',
      companyLogo: user.company_logo || null,
      isSuperAdmin: user.role === 'superadmin',
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/** POST /api/auth/register-company — Public self-service company registration */
app.post('/api/auth/register-company', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { company_name, phone, email, address, manager_name, password } = req.body;

    if (!company_name || !email || !password || !manager_name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Company name, manager name, email, and password are required.' });
    }

    if (password.length < 8) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing email
    const existingUser = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Create Company
    const compResult = await client.query(`
      INSERT INTO companies (name, email, phone, address, status, plan)
      VALUES ($1, $2, $3, $4, 'active', 'standard')
      RETURNING id, name, email, phone, status, plan
    `, [company_name.trim(), cleanEmail, phone ? phone.trim() : null, address ? address.trim() : null]);

    const company = compResult.rows[0];

    // Create Manager
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(`
      INSERT INTO users (company_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, 'manager')
      RETURNING id, email, full_name, role, company_id
    `, [company.id, cleanEmail, passwordHash, manager_name.trim()]);

    const user = userResult.rows[0];

    await client.query('COMMIT');

    // Auto login into session
    req.session.userId          = user.id;
    req.session.userRole        = user.role;
    req.session.userName        = user.full_name;
    req.session.companyId       = company.id;
    req.session.activeCompanyId = company.id;
    req.session.companyName     = company.name;

    res.status(201).json({
      message: 'Company registered successfully!',
      user: {
        id:          user.id,
        email:       user.email,
        fullName:    user.full_name,
        role:        user.role,
        companyId:   company.id,
        companyName: company.name,
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register company error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  } finally {
    client.release();
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

/** GET /api/auth/me — returns current session user with company info */
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.full_name, u.role, u.company_id,
             c.name AS company_name, c.status AS company_status, c.logo_url AS company_logo
      FROM users u
      LEFT JOIN companies c ON (
        CASE
          WHEN u.role = 'superadmin' AND $2::int IS NOT NULL THEN $2::int
          ELSE u.company_id
        END
      ) = c.id
      WHERE u.id = $1
    `, [req.session.userId, req.session.activeCompanyId || null]);

    if (result.rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session invalid.' });
    }

    const user = result.rows[0];
    res.json({
      id:          user.id,
      email:       user.email,
      fullName:    user.full_name,
      role:        user.role,
      companyId:   req.session.activeCompanyId || user.company_id,
      companyName: user.company_name || 'Car Rental SaaS',
      companyLogo: user.company_logo || null,
      isSuperAdmin: user.role === 'superadmin',
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// =====================================================
// SUPERADMIN COMPANY MANAGEMENT
// =====================================================

/** GET /api/admin/companies — List all companies with aggregated stats */
app.get('/api/admin/companies', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
             (SELECT COUNT(*) FROM cars WHERE company_id = c.id)::int as total_cars,
             (SELECT COUNT(*) FROM customers WHERE company_id = c.id)::int as total_customers,
             (SELECT COUNT(*) FROM rentals WHERE company_id = c.id)::int as total_rentals,
             (SELECT COUNT(*) FROM users WHERE company_id = c.id)::int as total_users,
             (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE company_id = c.id AND status = 'Paid')::numeric as total_revenue
      FROM companies c
      ORDER BY c.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin companies error:', err);
    res.status(500).json({ error: 'Failed to load companies.' });
  }
});

/** POST /api/admin/companies — Create a new company with initial manager */
app.post('/api/admin/companies', requireSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, email, phone, address, plan, status, manager_name, manager_email, manager_password } = req.body;

    if (!name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Company name is required.' });
    }

    const compRes = await client.query(`
      INSERT INTO companies (name, email, phone, address, plan, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      name.trim(),
      email ? email.trim() : null,
      phone ? phone.trim() : null,
      address ? address.trim() : null,
      plan || 'standard',
      status || 'active'
    ]);
    const company = compRes.rows[0];

    if (manager_email && manager_password && manager_name) {
      const cleanEmail = manager_email.trim().toLowerCase();
      const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (existing.rows.length === 0) {
        const passwordHash = await bcrypt.hash(manager_password, 12);
        await client.query(`
          INSERT INTO users (company_id, email, password_hash, full_name, role)
          VALUES ($1, $2, $3, $4, 'manager')
        `, [company.id, cleanEmail, passwordHash, manager_name.trim()]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(company);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create company error:', err);
    res.status(500).json({ error: 'Failed to create company.' });
  } finally {
    client.release();
  }
});

/** PUT /api/admin/companies/:id — Update company details or status */
app.put('/api/admin/companies/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, plan, status, logo_url } = req.body;

    const result = await pool.query(`
      UPDATE companies
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          plan = COALESCE($5, plan),
          status = COALESCE($6, status),
          logo_url = COALESCE($7, logo_url),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [name, email, phone, address, plan, status, logo_url, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: 'Failed to update company.' });
  }
});

/** DELETE /api/admin/companies/:id — Delete company and its data */
app.delete('/api/admin/companies/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    res.json({ message: `Company "${result.rows[0].name}" deleted.` });
  } catch (err) {
    console.error('Delete company error:', err);
    res.status(500).json({ error: 'Failed to delete company.' });
  }
});

/** POST /api/admin/switch-company/:id — SuperAdmin switches company view */
app.post('/api/admin/switch-company/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const comp = await pool.query('SELECT id, name FROM companies WHERE id = $1', [id]);
    if (comp.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    req.session.activeCompanyId = comp.rows[0].id;
    req.session.companyName = comp.rows[0].name;
    res.json({ message: 'Active company switched', company: comp.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to switch company.' });
  }
});

// =====================================================
// CURRENT COMPANY PROFILE (Self-management)
// =====================================================
app.get('/api/company/current', requireAuth, requireTenant, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [req.companyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load company profile.' });
  }
});

app.put('/api/company/current', requireManager, requireTenant, async (req, res) => {
  try {
    const { name, phone, email, address, logo_url } = req.body;
    const result = await pool.query(`
      UPDATE companies
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          address = COALESCE($4, address),
          logo_url = COALESCE($5, logo_url),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [name, phone, email, address, logo_url, req.companyId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update company profile.' });
  }
});

// =====================================================
// USER MANAGEMENT (Manager only, tenant-scoped)
// =====================================================

/** GET /api/users — list users of the current company */
app.get('/api/users', requireManager, requireTenant, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE company_id = $1 ORDER BY id ASC',
      [req.companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

/** POST /api/users — create a staff/manager account for current company */
app.post('/api/users', requireManager, requireTenant, async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const allowedRoles = ['staff', 'manager'];
    const assignedRole = allowedRoles.includes(role) ? role : 'staff';
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      'INSERT INTO users (company_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, created_at',
      [req.companyId, email.trim().toLowerCase(), passwordHash, full_name.trim(), assignedRole]
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

/** DELETE /api/users/:id — delete user of current company */
app.delete('/api/users/:id', requireManager, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.session.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, req.companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in your company.' });
    }
    res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

/** PUT /api/users/:id/role — change role of user in current company */
app.put('/api/users/:id/role', requireManager, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (parseInt(id) === req.session.userId) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const allowedRoles = ['staff', 'manager'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 AND company_id = $3 RETURNING id, email, full_name, role',
      [role, id, req.companyId]
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
// DASHBOARD (tenant-scoped)
// =====================================================
app.get('/api/dashboard', requireAuth, requireTenant, async (req, res) => {
  try {
    const companyId = req.companyId;

    const totalCars = await pool.query('SELECT COUNT(*) FROM cars WHERE company_id = $1', [companyId]);
    const available = await pool.query("SELECT COUNT(*) FROM cars WHERE company_id = $1 AND status = 'Available'", [companyId]);
    const rented = await pool.query("SELECT COUNT(*) FROM cars WHERE company_id = $1 AND status = 'Rented'", [companyId]);
    const totalCustomers = await pool.query('SELECT COUNT(*) FROM customers WHERE company_id = $1', [companyId]);

    const fleetStatus = await pool.query(
      'SELECT status, COUNT(*)::int as count FROM cars WHERE company_id = $1 GROUP BY status ORDER BY count DESC',
      [companyId]
    );

    const recentRentals = await pool.query(`
      SELECT r.id, r.start_date, r.return_date, r.total_price, r.status,
             c.name as car_name, c.model as car_model,
             cust.full_name as customer_name
      FROM rentals r
      LEFT JOIN cars c ON r.car_id = c.id
      LEFT JOIN customers cust ON r.customer_id = cust.id
      WHERE r.company_id = $1
      ORDER BY r.id DESC
      LIMIT 5
    `, [companyId]);

    const rentalsByMonth = await pool.query(`
      SELECT TO_CHAR(start_date, 'Mon YYYY') as month_label,
             DATE_TRUNC('month', start_date) as sort_month,
             COUNT(*)::int as rental_count,
             COALESCE(SUM(total_price), 0)::numeric as total_amount
      FROM rentals
      WHERE company_id = $1
      GROUP BY month_label, sort_month
      ORDER BY sort_month ASC
      LIMIT 6
    `, [companyId]);

    const revenueSummary = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric as total_revenue
      FROM payments
      WHERE company_id = $1 AND status = 'Paid'
    `, [companyId]);

    const expenseSummary = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric as total_expenses
      FROM expenses
      WHERE company_id = $1
    `, [companyId]);

    const rev = parseFloat(revenueSummary.rows[0].total_revenue || 0);
    const exp = parseFloat(expenseSummary.rows[0].total_expenses || 0);

    res.json({
      totalCars: parseInt(totalCars.rows[0].count),
      availableCars: parseInt(available.rows[0].count),
      rentedCars: parseInt(rented.rows[0].count),
      totalCustomers: parseInt(totalCustomers.rows[0].count),
      totalRevenue: rev,
      totalExpenses: exp,
      netProfit: rev - exp,
      fleetStatus: fleetStatus.rows,
      recentRentals: recentRentals.rows,
      rentalsByMonth: rentalsByMonth.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// =====================================================
// CARS (tenant-scoped)
// =====================================================
app.get('/api/cars', requireAuth, requireTenant, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cars WHERE company_id = $1 ORDER BY id ASC',
      [req.companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get cars error:', err);
    res.status(500).json({ error: 'Failed to load cars' });
  }
});

app.post('/api/cars', requireManager, requireTenant, async (req, res) => {
  try {
    const { name, model, plate, price_per_day, image_url } = req.body;
    const result = await pool.query(
      'INSERT INTO cars (company_id, name, model, plate, price_per_day, status, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.companyId, name, model, plate, price_per_day, 'Available', image_url ? image_url.trim() : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add car error:', err);
    res.status(500).json({ error: 'Failed to add car' });
  }
});

app.put('/api/cars/:id', requireManager, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, plate, price_per_day, image_url } = req.body;
    const result = await pool.query(
      'UPDATE cars SET name = $1, model = $2, plate = $3, price_per_day = $4, image_url = $5 WHERE id = $6 AND company_id = $7 RETURNING *',
      [name, model, plate, price_per_day, image_url !== undefined ? (image_url ? image_url.trim() : null) : null, id, req.companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found in your fleet.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update car error:', err);
    res.status(500).json({ error: 'Failed to update car' });
  }
});

app.delete('/api/cars/:id', requireManager, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const car = await pool.query('SELECT status FROM cars WHERE id = $1 AND company_id = $2', [id, req.companyId]);
    if (car.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found in your fleet.' });
    }
    if (car.rows[0].status === 'Rented') {
      return res.status(400).json({ error: 'Cannot delete a car that is currently rented' });
    }

    await pool.query('DELETE FROM cars WHERE id = $1 AND company_id = $2', [id, req.companyId]);
    res.json({ message: 'Car deleted' });
  } catch (err) {
    console.error('Delete car error:', err);
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

app.get('/api/cars/available', requireAuth, requireTenant, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM cars WHERE company_id = $1 AND status = 'Available' ORDER BY name ASC",
      [req.companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get available cars error:', err);
    res.status(500).json({ error: 'Failed to load available cars' });
  }
});

// =====================================================
// CUSTOMERS (tenant-scoped)
// =====================================================
app.get('/api/customers', requireAuth, requireTenant, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers WHERE company_id = $1 ORDER BY id ASC',
      [req.companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

app.post('/api/customers', requireAuth, requireTenant, async (req, res) => {
  try {
    const { full_name, phone, license } = req.body;
    const result = await pool.query(
      'INSERT INTO customers (company_id, full_name, phone, license) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.companyId, full_name, phone, license]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add customer error:', err);
    res.status(500).json({ error: 'Failed to add customer' });
  }
});

app.put('/api/customers/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, license } = req.body;
    const result = await pool.query(
      'UPDATE customers SET full_name = $1, phone = $2, license = $3 WHERE id = $4 AND company_id = $5 RETURNING *',
      [full_name, phone, license, id, req.companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', requireManager, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const active = await pool.query(
      "SELECT COUNT(*) FROM rentals WHERE customer_id = $1 AND company_id = $2 AND status = 'Rented'",
      [id, req.companyId]
    );
    if (parseInt(active.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete a customer with active rentals' });
    }

    await pool.query('DELETE FROM customers WHERE id = $1 AND company_id = $2', [id, req.companyId]);
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// =====================================================
// RENTALS (tenant-scoped)
// =====================================================
app.get('/api/rentals', requireAuth, requireTenant, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*,
             c.full_name AS customer_name,
             c.phone AS customer_phone,
             c.license AS customer_license,
             ca.name AS car_name,
             ca.model AS car_model,
             ca.plate AS car_plate
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      WHERE r.company_id = $1
      ORDER BY r.id DESC
    `, [req.companyId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get rentals error:', err);
    res.status(500).json({ error: 'Failed to load rentals' });
  }
});

app.get('/api/rentals/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*,
             c.full_name AS customer_name,
             c.phone AS customer_phone,
             c.license AS customer_license,
             ca.name AS car_name,
             ca.model AS car_model,
             ca.plate AS car_plate
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      WHERE r.id = $1 AND r.company_id = $2
    `, [req.params.id, req.companyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rental not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get rental by id error:', err);
    res.status(500).json({ error: 'Failed to load rental details' });
  }
});

app.post('/api/rentals', requireAuth, requireTenant, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_id, car_id, start_date, return_date } = req.body;

    // Check car belongs to company and is available
    const car = await client.query('SELECT * FROM cars WHERE id = $1 AND company_id = $2', [car_id, req.companyId]);
    if (car.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Car not found in your fleet.' });
    }
    if (car.rows[0].status === 'Rented') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This car is already rented' });
    }

    // Check for overlapping rentals
    const overlap = await client.query(
      `SELECT COUNT(*) FROM rentals
       WHERE car_id = $1 AND company_id = $2 AND status = 'Rented'
       AND start_date <= $4 AND return_date >= $3`,
      [car_id, req.companyId, start_date, return_date]
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
      `INSERT INTO rentals (company_id, customer_id, car_id, start_date, return_date, total_days, price_per_day, total_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Rented') RETURNING *`,
      [req.companyId, customer_id, car_id, start_date, return_date, totalDays, pricePerDay, totalPrice]
    );

    // Update car status
    await client.query("UPDATE cars SET status = 'Rented' WHERE id = $1 AND company_id = $2", [car_id, req.companyId]);

    // Create placeholder payment record
    await client.query(
      `INSERT INTO payments (company_id, rental_id, customer_id, amount, status)
       VALUES ($1, $2, $3, $4, 'Unpaid')`,
      [req.companyId, rental.rows[0].id, customer_id, totalPrice]
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

app.put('/api/rentals/:id/return', requireAuth, requireTenant, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const rental = await client.query('SELECT * FROM rentals WHERE id = $1 AND company_id = $2', [id, req.companyId]);
    if (rental.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental not found' });
    }
    if (rental.rows[0].status === 'Returned') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Rental already returned' });
    }

    // Mark rental returned
    await client.query("UPDATE rentals SET status = 'Returned' WHERE id = $1 AND company_id = $2", [id, req.companyId]);

    // Set car back to available
    await client.query("UPDATE cars SET status = 'Available' WHERE id = $1 AND company_id = $2", [rental.rows[0].car_id, req.companyId]);

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

app.delete('/api/rentals/:id', requireManager, requireTenant, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const rental = await client.query('SELECT * FROM rentals WHERE id = $1 AND company_id = $2', [id, req.companyId]);
    if (rental.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental not found' });
    }

    if (rental.rows[0].status === 'Rented') {
      await client.query("UPDATE cars SET status = 'Available' WHERE id = $1 AND company_id = $2", [rental.rows[0].car_id, req.companyId]);
    }

    await client.query('DELETE FROM payments WHERE rental_id = $1 AND company_id = $2', [id, req.companyId]);
    await client.query('DELETE FROM rentals WHERE id = $1 AND company_id = $2', [id, req.companyId]);

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

app.get('/api/rentals/unpaid', requireAuth, requireTenant, async (req, res) => {
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
        WHERE status = 'Paid' AND company_id = $1
        GROUP BY rental_id
      ) p_paid ON r.id = p_paid.rental_id
      WHERE r.company_id = $1 AND GREATEST(0, r.total_price - COALESCE(p_paid.total_paid, 0)) > 0
      ORDER BY r.id DESC
    `, [req.companyId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get unpaid rentals error:', err);
    res.status(500).json({ error: 'Failed to load pending rentals' });
  }
});

// =====================================================
// PAYMENTS & INCOME MANAGEMENT (tenant-scoped)
// =====================================================

app.get('/api/payments', requireAuth, requireTenant, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
             c.full_name AS customer_name,
             c.phone AS customer_phone,
             c.license AS customer_license,
             ca.name AS car_name,
             ca.model AS car_model,
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
      WHERE p.company_id = $1
      ORDER BY p.payment_date DESC, p.id DESC
    `, [req.companyId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

app.get('/api/payments/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
             c.full_name AS customer_name,
             c.phone AS customer_phone,
             c.license AS customer_license,
             ca.name AS car_name,
             ca.model AS car_model,
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
      WHERE p.id = $1 AND p.company_id = $2
    `, [req.params.id, req.companyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get payment by id error:', err);
    res.status(500).json({ error: 'Failed to load payment details' });
  }
});

app.post('/api/payments', requireAuth, requireTenant, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rental_id, amount, payment_method, payment_date, reference_no, notes } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!rental_id || isNaN(parsedAmount) || parsedAmount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Valid rental ID and positive amount required.' });
    }

    const validMethods = ['Cash', 'Bank Transfer', 'Mobile Money'];
    const method = validMethods.includes(payment_method) ? payment_method : 'Cash';
    const dateVal = payment_date || new Date().toISOString().split('T')[0];

    const rentalRes = await client.query(`
      SELECT r.id, r.customer_id, r.total_price,
             COALESCE(p_paid.total_paid, 0) AS total_paid
      FROM rentals r
      LEFT JOIN (
        SELECT rental_id, SUM(amount) AS total_paid
        FROM payments
        WHERE status = 'Paid' AND company_id = $2
        GROUP BY rental_id
      ) p_paid ON r.id = p_paid.rental_id
      WHERE r.id = $1 AND r.company_id = $2
    `, [rental_id, req.companyId]);

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
        error: `Payment amount ($${parsedAmount.toFixed(2)}) exceeds remaining balance ($${remainingBalance.toFixed(2)}).`
      });
    }

    // Insert payment
    const result = await client.query(`
      INSERT INTO payments (
        company_id, rental_id, customer_id, amount, status,
        payment_method, payment_date, notes, reference_no, recorded_by
      ) VALUES ($1, $2, $3, $4, 'Paid', $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      req.companyId,
      rental_id,
      rental.customer_id,
      parsedAmount,
      method,
      dateVal,
      notes ? notes.trim() : null,
      reference_no ? reference_no.trim() : null,
      req.session.userId || null
    ]);

    // Cleanup placeholder unpaid row if completed
    const newTotalPaid = alreadyPaid + parsedAmount;
    if (newTotalPaid >= totalCharged - 0.009) {
      await client.query(
        "DELETE FROM payments WHERE rental_id = $1 AND company_id = $2 AND status = 'Unpaid'",
        [rental_id, req.companyId]
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

app.put('/api/payments/:id/pay', requireAuth, requireTenant, async (req, res) => {
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
      WHERE id = $6 AND company_id = $7
      RETURNING *
    `, [
      method,
      dateVal,
      reference_no ? reference_no.trim() : null,
      notes ? notes.trim() : null,
      req.session.userId || null,
      id,
      req.companyId
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

app.delete('/api/payments/:id', requireManager, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM payments WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, req.companyId]
    );
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
// EXPENSES & FLEET COSTS (tenant-scoped)
// =====================================================

app.get('/api/expenses', requireAuth, requireTenant, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, u.full_name AS recorded_by_name
      FROM expenses e
      LEFT JOIN users u ON e.recorded_by = u.id
      WHERE e.company_id = $1
      ORDER BY e.expense_date DESC, e.id DESC
    `, [req.companyId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ error: 'Failed to load expenses' });
  }
});

app.get('/api/expenses/summary', requireAuth, requireTenant, async (req, res) => {
  try {
    const totalExp = await pool.query('SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM expenses WHERE company_id = $1', [req.companyId]);
    const thisMonth = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total
      FROM expenses
      WHERE company_id = $1 AND DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)
    `, [req.companyId]);
    const byCategory = await pool.query(`
      SELECT category, COALESCE(SUM(amount), 0)::numeric AS total, COUNT(*)::int AS count
      FROM expenses
      WHERE company_id = $1
      GROUP BY category
      ORDER BY total DESC
    `, [req.companyId]);

    res.json({
      totalExpenses: parseFloat(totalExp.rows[0].total || 0),
      thisMonthExpenses: parseFloat(thisMonth.rows[0].total || 0),
      byCategory: byCategory.rows,
    });
  } catch (err) {
    console.error('Get expenses summary error:', err);
    res.status(500).json({ error: 'Failed to load expenses summary' });
  }
});

app.post('/api/expenses', requireAuth, requireTenant, async (req, res) => {
  try {
    const { title, category, amount, expense_date, payment_method, description } = req.body || {};
    if (!title || !category || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Title, category, and amount are required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }
    const validCategories = ['Fuel', 'Maintenance', 'Insurance', 'Staff Salaries', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const validMethods = ['Cash', 'Bank Transfer', 'Mobile Money'];
    const method = validMethods.includes(payment_method) ? payment_method : 'Cash';
    const dateVal = expense_date || new Date().toISOString().split('T')[0];
    const userId = req.session && req.session.userId ? req.session.userId : null;

    const result = await pool.query(`
      INSERT INTO expenses (company_id, title, category, amount, expense_date, payment_method, description, recorded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [req.companyId, title.trim(), category, numAmount, dateVal, method, description ? description.trim() : null, userId]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Failed to record expense' });
  }
});

app.put('/api/expenses/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, amount, expense_date, payment_method, description } = req.body || {};
    if (!title || !category || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Title, category, and amount are required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }
    const validCategories = ['Fuel', 'Maintenance', 'Insurance', 'Staff Salaries', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const validMethods = ['Cash', 'Bank Transfer', 'Mobile Money'];
    const method = validMethods.includes(payment_method) ? payment_method : 'Cash';

    const result = await pool.query(`
      UPDATE expenses
      SET title = $1, category = $2, amount = $3, expense_date = $4, payment_method = $5, description = $6, updated_at = NOW()
      WHERE id = $7 AND company_id = $8
      RETURNING *
    `, [title.trim(), category, numAmount, expense_date, method, description ? description.trim() : null, id, req.companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', requireManager, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM expenses WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, req.companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    res.json({ message: 'Expense record deleted' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// =====================================================
// FRONTEND ROUTING
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
      console.log(`\n✓ Multi-Tenant Server running at http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
  }
}

module.exports = app;

if (require.main === module) {
  start();
}
