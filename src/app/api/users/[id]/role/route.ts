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
    const { role } = await req.json();

    if (parseInt(id) === user.id) {
      return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 });
    }

    const allowedRoles = ['staff', 'manager'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 AND company_id = $3 RETURNING id, email, full_name, role',
      [role, id, companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to change role' }, { status: 500 });
  }
}
