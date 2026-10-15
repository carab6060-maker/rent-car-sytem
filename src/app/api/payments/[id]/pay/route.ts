import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function PUT(req, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const { id } = params;
    const { payment_method, payment_date, reference_no, notes } = await req.json().catch(() => ({}));

    const validMethods = ['Cash', 'Bank Transfer', 'Mobile Money'];
    const method = validMethods.includes(payment_method) ? payment_method : 'Cash';
    const dateVal = payment_date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      UPDATE payments
      SET status = 'Paid',
          payment_method = $1,
          payment_date = $2,
          reference_no = COALESCE($3, reference_no),
          notes = COALESCE($4, notes),
          recorded_by = COALESCE($5, recorded_by)
      WHERE id = $6 AND company_id = $7
      RETURNING *
    `, [
      method,
      dateVal,
      reference_no ? reference_no.trim() : null,
      notes ? notes.trim() : null,
      user.id,
      id,
      companyId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
