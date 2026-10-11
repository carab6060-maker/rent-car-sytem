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

// Disable autoSelectFamily and ensure IPv4 is used to prevent IPv6 timeout issues on Windows
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        plate VARCHAR(100) NOT NULL,
        price_per_day NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'Available',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(100) NOT NULL,
        license VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rentals (
        id SERIAL PRIMARY KEY,
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
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✓ Database tables ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection, initTables };
