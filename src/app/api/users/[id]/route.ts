import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function DELETE(req, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'manager' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyId = getTenantId(req, user);
    const { id } = params;

    if (parseInt(id) === user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found in your company' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
