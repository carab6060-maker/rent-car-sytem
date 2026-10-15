import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const result = await pool.query(`
      SELECT p.*,
             c.full_name AS customer_name,
             c.phone AS customer_phone,
             c.license AS customer_license,
             ca.name AS car_name,
             ca.model AS car_model,
             ca.plate AS car_plate,
             r.start_date AS rental_start_date,
             r.return_date AS rental_return_date,
             r.total_price AS rental_total_price,
             u.full_name AS recorded_by_name
      FROM payments p
      LEFT JOIN rentals r ON p.rental_id = r.id
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.company_id = $1
      ORDER BY p.payment_date DESC, p.id DESC
    `, [companyId]);

    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 });
  }
}

export async function POST(req) {
  const client = await pool.connect();
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    await client.query('BEGIN');

    const { rental_id, amount, payment_method, payment_date, reference_no, notes } = await req.json();

    const parsedAmount = parseFloat(amount);
    if (!rental_id || isNaN(parsedAmount) || parsedAmount <= 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Valid rental ID and positive amount required.' }, { status: 400 });
    }

    const validMethods = ['Cash', 'Bank Transfer', 'Mobile Money'];
    const method = validMethods.includes(payment_method) ? payment_method : 'Cash';
    const dateVal = payment_date || new Date().toISOString().split('T')[0];

    const rentalRes = await client.query(`
      SELECT r.id, r.customer_id, r.total_price,
             COALESCE(p_paid.total_paid, 0) AS total_paid
      FROM rentals r
      LEFT JOIN (
        SELECT rental_id, SUM(amount) AS total_paid
        FROM payments
        WHERE status = 'Paid' AND company_id = $2
        GROUP BY rental_id
      ) p_paid ON r.id = p_paid.rental_id
      WHERE r.id = $1 AND r.company_id = $2
    `, [rental_id, companyId]);

    if (rentalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Rental not found.' }, { status: 404 });
    }

    const rental = rentalRes.rows[0];
    const totalCharged = parseFloat(rental.total_price);
    const alreadyPaid = parseFloat(rental.total_paid);
    const remainingBalance = Math.max(0, totalCharged - alreadyPaid);

    if (remainingBalance <= 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'This rental is already fully paid.' }, { status: 400 });
    }

    if (parsedAmount > remainingBalance + 0.009) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        error: `Payment amount ($${parsedAmount.toFixed(2)}) exceeds remaining balance ($${remainingBalance.toFixed(2)}).`
      }, { status: 400 });
    }

    const result = await client.query(`
      INSERT INTO payments (
        company_id, rental_id, customer_id, amount, status,
        payment_method, payment_date, notes, reference_no, recorded_by
      ) VALUES ($1, $2, $3, $4, 'Paid', $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      companyId,
      rental_id,
      rental.customer_id,
      parsedAmount,
      method,
      dateVal,
      notes ? notes.trim() : null,
      reference_no ? reference_no.trim() : null,
      user.id
    ]);

    const newTotalPaid = alreadyPaid + parsedAmount;
    if (newTotalPaid >= totalCharged - 0.009) {
      await client.query(
        "DELETE FROM payments WHERE rental_id = $1 AND company_id = $2 AND status = 'Unpaid'",
        [rental_id, companyId]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create payment error:', err);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  } finally {
    client.release();
  }
}
