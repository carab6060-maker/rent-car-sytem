import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = getTenantId(req, user);
    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with account' }, { status: 400 });
    }

    const totalCars = await pool.query('SELECT COUNT(*) FROM cars WHERE company_id = $1', [companyId]);
    const available = await pool.query("SELECT COUNT(*) FROM cars WHERE company_id = $1 AND status = 'Available'", [companyId]);
    const rented = await pool.query("SELECT COUNT(*) FROM cars WHERE company_id = $1 AND status = 'Rented'", [companyId]);
    const totalCustomers = await pool.query('SELECT COUNT(*) FROM customers WHERE company_id = $1', [companyId]);

    const fleetStatus = await pool.query(
      'SELECT status, COUNT(*)::int as count FROM cars WHERE company_id = $1 GROUP BY status ORDER BY count DESC',
      [companyId]
    );

    const recentRentals = await pool.query(`
      SELECT r.id, r.start_date, r.return_date, r.total_price, r.status,
             c.name as car_name, c.model as car_model,
             cust.full_name as customer_name
      FROM rentals r
      LEFT JOIN cars c ON r.car_id = c.id
      LEFT JOIN customers cust ON r.customer_id = cust.id
      WHERE r.company_id = $1
      ORDER BY r.id DESC
      LIMIT 5
    `, [companyId]);

    const rentalsByMonth = await pool.query(`
      SELECT TO_CHAR(start_date, 'Mon YYYY') as month_label,
             DATE_TRUNC('month', start_date) as sort_month,
             COUNT(*)::int as rental_count,
             COALESCE(SUM(total_price), 0)::numeric as total_amount
      FROM rentals
      WHERE company_id = $1
      GROUP BY month_label, sort_month
      ORDER BY sort_month ASC
      LIMIT 6
    `, [companyId]);

    const revenueSummary = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric as total_revenue
      FROM payments
      WHERE company_id = $1 AND status = 'Paid'
    `, [companyId]);

    const expenseSummary = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric as total_expenses
      FROM expenses
      WHERE company_id = $1
    `, [companyId]);

    const rev = parseFloat(revenueSummary.rows[0]?.total_revenue || 0);
    const exp = parseFloat(expenseSummary.rows[0]?.total_expenses || 0);

    return NextResponse.json({
      totalCars: parseInt(totalCars.rows[0]?.count || 0),
      availableCars: parseInt(available.rows[0]?.count || 0),
      rentedCars: parseInt(rented.rows[0]?.count || 0),
      totalCustomers: parseInt(totalCustomers.rows[0]?.count || 0),
      totalRevenue: rev,
      totalExpenses: exp,
      netProfit: rev - exp,
      fleetStatus: fleetStatus.rows,
      recentRentals: recentRentals.rows,
      rentalsByMonth: rentalsByMonth.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard data: ' + err.message }, { status: 500 });
  }
}
