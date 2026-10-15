import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PUT(req, { params }) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

    const { id } = params;
    const { name, email, phone, address, plan, status, logo_url } = await req.json();

    const result = await pool.query(`
      UPDATE companies
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          plan = COALESCE($5, plan),
          status = COALESCE($6, status),
          logo_url = COALESCE($7, logo_url),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [name, email, phone, address, plan, status, logo_url, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

    const { id } = params;
    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    return NextResponse.json({ message: `Company "${result.rows[0].name}" deleted.` });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
