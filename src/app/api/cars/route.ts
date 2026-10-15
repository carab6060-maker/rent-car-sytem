import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const result = await pool.query(
      'SELECT * FROM cars WHERE company_id = $1 ORDER BY id ASC',
      [companyId]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load cars' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'manager' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyId = getTenantId(req, user);
    const { name, model, plate, price_per_day, image_url } = await req.json();

    const result = await pool.query(
      'INSERT INTO cars (company_id, name, model, plate, price_per_day, status, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [companyId, name, model, plate, price_per_day, 'Available', image_url ? image_url.trim() : null]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add car: ' + err.message }, { status: 500 });
  }
}
