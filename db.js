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

// Clean connection string (remove channel_binding parameter for pg compatibility)
let connectionString = process.env.DATABASE_URL || '';
try {
  const url = new URL(connectionString);
  url.searchParams.delete('channel_binding');
  connectionString = url.toString();
} catch (e) {
  // Use as-is if parsing fails
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Test connection
async function testConnection() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW()');
    console.log('✓ Database connected at:', res.rows[0].now);
  } finally {
    client.release();
  }
}

// Create tables if they don't exist
async function initTables() {
  const client = await pool.connect();
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
