import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function PUT(req, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const { id } = params;
    const { full_name, phone, license } = await req.json();

    const result = await pool.query(
      'UPDATE customers SET full_name = $1, phone = $2, license = $3 WHERE id = $4 AND company_id = $5 RETURNING *',
      [full_name, phone, license, id, companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
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

    const active = await pool.query(
      "SELECT COUNT(*) FROM rentals WHERE customer_id = $1 AND company_id = $2 AND status = 'Rented'",
      [id, companyId]
    );
    if (parseInt(active.rows[0]?.count || 0) > 0) {
      return NextResponse.json({ error: 'Cannot delete customer with active rentals' }, { status: 400 });
    }

    await pool.query('DELETE FROM customers WHERE id = $1 AND company_id = $2', [id, companyId]);
    return NextResponse.json({ message: 'Customer deleted' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
