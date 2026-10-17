/* =====================================================
   db.js — Database Connection & Table Setup
   =====================================================
   Connects to Neon PostgreSQL using the DATABASE_URL
   environment variable. Creates tables if they don't
   already exist (safe to run multiple times).
   ===================================================== */

const net = require('net');
const dns = require('dns');
const { Pool, types } = require('pg');

// Return PostgreSQL DATE as 'YYYY-MM-DD' string without timezone shifting
types.setTypeParser(1082, (val) => val);

// Disable autoSelectFamily and ensure IPv4 is used on Windows only
if (process.platform === 'win32') {
  if (net.setDefaultAutoSelectFamily) {
    net.setDefaultAutoSelectFamily(false);
  }
  const origLookup = dns.lookup;
  dns.lookup = function(hostname, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    } else if (typeof options === 'number') {
      options = { family: options };
    }
    options = Object.assign({}, options, { family: 4 });
    return origLookup.call(dns, hostname, options, callback);
  };
}

let _pool = null;

function getPool() {
  if (_pool) return _pool;

  const rawUrl = process.env.DATABASE_URL || '';
  if (!rawUrl) {
    throw new Error('DATABASE_URL environment variable is missing. Please configure it in your environment or Vercel settings.');
  }

  let connectionString = rawUrl;
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete('channel_binding');
    connectionString = url.toString();
  } catch (e) {
    // Keep rawUrl if URL parsing fails
  }

  _pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });

  _pool.on('error', (err) => {
    // Prevent unhandled error crashes when Neon serverless pooler closes idle connections
    console.warn('PostgreSQL pool idle client warning:', err.message);
  });

  return _pool;
}

// Proxy pool so methods like pool.query() work dynamically
const pool = new Proxy({}, {
  get(target, prop) {
    const p = getPool();
    const val = p[prop];
    return typeof val === 'function' ? val.bind(p) : val;
  }
});

// Test connection
async function testConnection() {
  const p = getPool();
  const client = await p.connect();
  try {
    const res = await client.query('SELECT NOW()');
    console.log('✓ Database connected at:', res.rows[0].now);
  } finally {
    client.release();
  }
}

// Create tables if they don't exist
async function initTables() {
  const p = getPool();
  const client = await p.connect();
  try {
    // Companies table for Multi-Tenancy
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE,
        email VARCHAR(255),
        phone VARCHAR(100),
        address TEXT,
        logo_url TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        plan VARCHAR(50) NOT NULL DEFAULT 'standard',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure default company exists
    await client.query(`
      INSERT INTO companies (name, email, phone, status, plan)
      SELECT 'Prime Car Rental', 'info@primerental.com', '+252 61 5000000', 'active', 'premium'
      WHERE NOT EXISTS (SELECT 1 FROM companies);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        plate VARCHAR(100) NOT NULL,
        price_per_day NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'Available',
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE cars ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(100) NOT NULL,
        license VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rentals (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        return_date DATE NOT NULL,
        total_days INTEGER NOT NULL,
        price_per_day NUMERIC(10, 2) NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Rented',
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE rentals ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
        payment_method VARCHAR(50) DEFAULT 'Cash',
        payment_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        reference_no VARCHAR(100),
        recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE payments ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash';
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL CHECK (category IN ('Fuel', 'Maintenance', 'Insurance', 'Staff Salaries', 'Other')),
        amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Mobile Money')),
        description TEXT,
        recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
    `);

    // Users table for authentication
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('superadmin', 'manager', 'staff')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'manager', 'staff'));
    `);

    // Session store table for connect-pg-simple
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
    `);

    console.log('✓ Database tables ready (Multi-Tenant enabled)');
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection, initTables };
