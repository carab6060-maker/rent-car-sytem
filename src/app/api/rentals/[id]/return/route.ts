import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

async function handleReturn(req: Request, params: { id: string }) {
  const client = await pool.connect();
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const { id } = params;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const actualReturnDate = body.actual_return_date || new Date().toISOString().split('T')[0];
    const extraCharges = parseFloat(body.extra_charges) || 0.0;

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

    // Mark rental returned and update actual return date & extra charges
    await client.query(
      `UPDATE rentals 
       SET status = 'Returned', actual_return_date = $1, extra_charges = $2 
       WHERE id = $3 AND company_id = $4`,
      [actualReturnDate, extraCharges, id, companyId]
    );

    // Free the car
    await client.query("UPDATE cars SET status = 'Available' WHERE id = $1 AND company_id = $2", [rental.rows[0].car_id, companyId]);

    // If there are extra charges, update payment total if a payment record exists
    if (extraCharges > 0) {
      const paymentRes = await client.query(
        'SELECT * FROM payments WHERE rental_id = $1 AND company_id = $2 ORDER BY id ASC LIMIT 1',
        [id, companyId]
      );
      if (paymentRes.rows.length > 0) {
        const payment = paymentRes.rows[0];
        const newTotal = parseFloat(payment.amount) + extraCharges;
        await client.query(
          'UPDATE payments SET amount = $1 WHERE id = $2 AND company_id = $3',
          [newTotal, payment.id, companyId]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'Rental returned successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Return rental error:', err);
    return NextResponse.json({ error: 'Failed to return rental: ' + (err.message || '') }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: Request, context: { params: { id: string } }) {
  return handleReturn(req, context.params);
}

export async function PUT(req: Request, context: { params: { id: string } }) {
  return handleReturn(req, context.params);
}

