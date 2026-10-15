import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

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

    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load companies' }, { status: 500 });
  }
}

export async function POST(req) {
  const client = await pool.connect();
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

    await client.query('BEGIN');
    const { name, email, phone, address, plan, status, manager_name, manager_email, manager_password } = await req.json();

    if (!name) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
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
    return NextResponse.json(company, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  } finally {
    client.release();
  }
}
