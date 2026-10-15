import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function PUT(req, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'manager' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyId = getTenantId(req, user);
    const { id } = params;
    const { name, model, plate, price_per_day, image_url } = await req.json();

    const result = await pool.query(
      'UPDATE cars SET name = $1, model = $2, plate = $3, price_per_day = $4, image_url = $5 WHERE id = $6 AND company_id = $7 RETURNING *',
      [name, model, plate, price_per_day, image_url !== undefined ? (image_url ? image_url.trim() : null) : null, id, companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update car' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'manager' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyId = getTenantId(req, user);
    const { id } = params;

    const car = await pool.query('SELECT status FROM cars WHERE id = $1 AND company_id = $2', [id, companyId]);
    if (car.rows.length === 0) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }
    if (car.rows[0].status === 'Rented') {
      return NextResponse.json({ error: 'Cannot delete a car that is currently rented' }, { status: 400 });
    }

    await pool.query('DELETE FROM cars WHERE id = $1 AND company_id = $2', [id, companyId]);
    return NextResponse.json({ message: 'Car deleted' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete car' }, { status: 500 });
  }
}
