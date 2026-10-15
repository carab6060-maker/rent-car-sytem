import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { company_name, phone, email, address, manager_name, password } = await req.json();

    if (!company_name || !email || !password || !manager_name) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Company name, manager name, email, and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Insert company
    const compResult = await client.query(`
      INSERT INTO companies (name, email, phone, address, status, plan)
      VALUES ($1, $2, $3, $4, 'active', 'standard')
      RETURNING id, name, email, phone, status, plan
    `, [company_name.trim(), cleanEmail, phone ? phone.trim() : null, address ? address.trim() : null]);

    const company = compResult.rows[0];

    // Insert manager
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(`
      INSERT INTO users (company_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, 'manager')
      RETURNING id, email, full_name, role, company_id
    `, [company.id, cleanEmail, passwordHash, manager_name.trim()]);

    const user = userResult.rows[0];

    await client.query('COMMIT');

    const userData = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      companyId: company.id,
      companyName: company.name,
      isSuperAdmin: false,
    };

    await createSession(userData);

    return NextResponse.json({
      message: 'Company registered successfully!',
      user: userData,
    }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register company error:', err);
    return NextResponse.json({ error: 'Registration failed: ' + err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
