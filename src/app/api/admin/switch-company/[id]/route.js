import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, createSession } from '@/lib/auth';

export async function POST(req, { params }) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

    const { id } = params;
    const comp = await pool.query('SELECT id, name FROM companies WHERE id = $1', [id]);
    if (comp.rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const updatedUser = {
      ...user,
      activeCompanyId: comp.rows[0].id,
      companyId: comp.rows[0].id,
      companyName: comp.rows[0].name,
    };

    await createSession(updatedUser);

    return NextResponse.json({ message: 'Active company switched', company: comp.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to switch company' }, { status: 500 });
  }
}
