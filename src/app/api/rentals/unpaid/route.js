import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const result = await pool.query(`
      SELECT r.id, r.total_price, r.start_date, r.return_date, r.status,
             c.id AS customer_id, c.full_name AS customer_name, c.phone AS customer_phone,
             ca.name AS car_name, ca.plate AS car_plate,
             COALESCE(p_paid.total_paid, 0) AS total_paid,
             GREATEST(0, r.total_price - COALESCE(p_paid.total_paid, 0)) AS balance_due
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      LEFT JOIN (
        SELECT rental_id, SUM(amount) AS total_paid
        FROM payments
        WHERE status = 'Paid' AND company_id = $1
        GROUP BY rental_id
      ) p_paid ON r.id = p_paid.rental_id
      WHERE r.company_id = $1 AND GREATEST(0, r.total_price - COALESCE(p_paid.total_paid, 0)) > 0
      ORDER BY r.id DESC
    `, [companyId]);

    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load unpaid rentals' }, { status: 500 });
  }
}
