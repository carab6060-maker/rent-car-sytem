import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const result = await pool.query(
      'SELECT * FROM customers WHERE company_id = $1 ORDER BY id ASC',
      [companyId]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const { full_name, phone, license } = await req.json();

    const result = await pool.query(
      'INSERT INTO customers (company_id, full_name, phone, license) VALUES ($1, $2, $3, $4) RETURNING *',
      [companyId, full_name, phone, license]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add customer' }, { status: 500 });
  }
}
