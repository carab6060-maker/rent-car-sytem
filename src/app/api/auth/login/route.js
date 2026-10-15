import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const result = await pool.query(`
      SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.company_id,
             c.name AS company_name, c.status AS company_status, c.logo_url AS company_logo
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE LOWER(u.email) = $1
    `, [email.trim().toLowerCase()]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.role !== 'superadmin' && user.company_status === 'suspended') {
      return NextResponse.json({ error: 'Your company account has been suspended. Please contact support.' }, { status: 403 });
    }

    const userData = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      companyId: user.company_id,
      companyName: user.company_name || 'CarRent SaaS',
      companyLogo: user.company_logo || null,
      isSuperAdmin: user.role === 'superadmin',
    };

    await createSession(userData);

    return NextResponse.json(userData);
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed: ' + err.message }, { status: 500 });
  }
}
