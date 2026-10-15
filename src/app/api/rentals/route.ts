import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const result = await pool.query(`
      SELECT r.*,
             c.full_name AS customer_name,
             c.phone AS customer_phone,
             c.license AS customer_license,
             ca.name AS car_name,
             ca.model AS car_model,
             ca.plate AS car_plate
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      WHERE r.company_id = $1
      ORDER BY r.id DESC
    `, [companyId]);
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load rentals' }, { status: 500 });
  }
}

export async function POST(req) {
  const client = await pool.connect();
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    await client.query('BEGIN');

    const { customer_id, car_id, start_date, return_date } = await req.json();

    const car = await client.query('SELECT * FROM cars WHERE id = $1 AND company_id = $2', [car_id, companyId]);
    if (car.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Car not found in fleet.' }, { status: 404 });
    }
    if (car.rows[0].status === 'Rented') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'This car is already rented' }, { status: 400 });
    }

    const overlap = await client.query(
      `SELECT COUNT(*) FROM rentals
       WHERE car_id = $1 AND company_id = $2 AND status = 'Rented'
       AND start_date <= $4 AND return_date >= $3`,
      [car_id, companyId, start_date, return_date]
    );
    if (parseInt(overlap.rows[0]?.count || 0) > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'This car has an overlapping rental for selected dates' }, { status: 400 });
    }

    const startD = new Date(start_date);
    const endD = new Date(return_date);
    const totalDays = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Return date must be after start date' }, { status: 400 });
    }

    const pricePerDay = parseFloat(car.rows[0].price_per_day);
    const totalPrice = totalDays * pricePerDay;

    const rental = await client.query(
      `INSERT INTO rentals (company_id, customer_id, car_id, start_date, return_date, total_days, price_per_day, total_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Rented') RETURNING *`,
      [companyId, customer_id, car_id, start_date, return_date, totalDays, pricePerDay, totalPrice]
    );

    await client.query("UPDATE cars SET status = 'Rented' WHERE id = $1 AND company_id = $2", [car_id, companyId]);

    await client.query(
      `INSERT INTO payments (company_id, rental_id, customer_id, amount, status)
       VALUES ($1, $2, $3, $4, 'Unpaid')`,
      [companyId, rental.rows[0].id, customer_id, totalPrice]
    );

    await client.query('COMMIT');
    return NextResponse.json(rental.rows[0], { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create rental error:', err);
    return NextResponse.json({ error: 'Failed to create rental: ' + err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
