import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function PUT(req, { params }) {
  const client = await pool.connect();
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const { id } = params;

    await client.query('BEGIN');

    const rental = await client.query('SELECT * FROM rentals WHERE id = $1 AND company_id = $2', [id, companyId]);
    if (rental.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }
    if (rental.rows[0].status === 'Returned') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Rental already returned' }, { status: 400 });
    }

    await client.query("UPDATE rentals SET status = 'Returned' WHERE id = $1 AND company_id = $2", [id, companyId]);
    await client.query("UPDATE cars SET status = 'Available' WHERE id = $1 AND company_id = $2", [rental.rows[0].car_id, companyId]);

    await client.query('COMMIT');
    return NextResponse.json({ message: 'Rental returned' });
  } catch (err) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Failed to return rental' }, { status: 500 });
  } finally {
    client.release();
  }
}
