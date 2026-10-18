import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = getTenantId(req, user);
    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with account' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get('from') || null;
    const toDate = searchParams.get('to') || null;

    // 1. Total Revenue in date range
    const revenueRes = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total_revenue
      FROM payments
      WHERE company_id = $1 AND status = 'Paid'
        AND ($2::date IS NULL OR payment_date >= $2::date)
        AND ($3::date IS NULL OR payment_date <= $3::date)
    `, [companyId, fromDate, toDate]);

    // 2. Total Expenses in date range
    const expenseRes = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total_expenses
      FROM expenses
      WHERE company_id = $1
        AND ($2::date IS NULL OR expense_date >= $2::date)
        AND ($3::date IS NULL OR expense_date <= $3::date)
    `, [companyId, fromDate, toDate]);

    // 3. Accounts Receivable (Daymaha maqan) - all unpaid balance
    const receivablesRes = await pool.query(`
      SELECT COALESCE(SUM(GREATEST(0, r.total_price - COALESCE(paid.total_paid, 0))), 0)::numeric AS accounts_receivable
      FROM rentals r
      LEFT JOIN (
        SELECT rental_id, SUM(amount) AS total_paid
        FROM payments
        WHERE status = 'Paid' AND company_id = $1
        GROUP BY rental_id
      ) paid ON r.id = paid.rental_id
      WHERE r.company_id = $1 AND r.status != 'Cancelled'
    `, [companyId]);

    // 4. Revenue breakdown by Payment Method
    const revByMethodRes = await pool.query(`
      SELECT payment_method, COALESCE(SUM(amount), 0)::numeric AS total
      FROM payments
      WHERE company_id = $1 AND status = 'Paid'
        AND ($2::date IS NULL OR payment_date >= $2::date)
        AND ($3::date IS NULL OR payment_date <= $3::date)
      GROUP BY payment_method
      ORDER BY total DESC
    `, [companyId, fromDate, toDate]);

    const revenueByMethod: Record<string, number> = {};
    for (const row of revByMethodRes.rows) {
      revenueByMethod[row.payment_method || 'Cash'] = parseFloat(row.total || 0);
    }

    // 5. Expenses breakdown by Category
    const expByCategoryRes = await pool.query(`
      SELECT category, COALESCE(SUM(amount), 0)::numeric AS total
      FROM expenses
      WHERE company_id = $1
        AND ($2::date IS NULL OR expense_date >= $2::date)
        AND ($3::date IS NULL OR expense_date <= $3::date)
      GROUP BY category
      ORDER BY total DESC
    `, [companyId, fromDate, toDate]);

    const expensesByCategory: Record<string, number> = {};
    for (const row of expByCategoryRes.rows) {
      expensesByCategory[row.category || 'Other'] = parseFloat(row.total || 0);
    }

    // 6. Unified Ledger / Cash In & Out Transactions
    const ledgerRes = await pool.query(`
      SELECT
        'income' AS type,
        p.id,
        p.payment_date::text AS date,
        COALESCE('Rental #' || p.rental_id || ' - ' || c.full_name, 'Payment Received') AS title,
        'Rental Revenue' AS category,
        p.payment_method,
        p.amount::numeric,
        p.reference_no,
        u.full_name AS recorded_by,
        c.full_name AS customer_name,
        ca.name AS car_name,
        p.created_at
      FROM payments p
      LEFT JOIN rentals r ON p.rental_id = r.id
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN cars ca ON r.car_id = ca.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.company_id = $1 AND p.status = 'Paid'
        AND ($2::date IS NULL OR p.payment_date >= $2::date)
        AND ($3::date IS NULL OR p.payment_date <= $3::date)

      UNION ALL

      SELECT
        'expense' AS type,
        e.id,
        e.expense_date::text AS date,
        e.title,
        e.category,
        e.payment_method,
        e.amount::numeric,
        NULL AS reference_no,
        u.full_name AS recorded_by,
        NULL AS customer_name,
        NULL AS car_name,
        e.created_at
      FROM expenses e
      LEFT JOIN users u ON e.recorded_by = u.id
      WHERE e.company_id = $1
        AND ($2::date IS NULL OR e.expense_date >= $2::date)
        AND ($3::date IS NULL OR e.expense_date <= $3::date)

      ORDER BY date DESC, created_at DESC
      LIMIT 150
    `, [companyId, fromDate, toDate]);

    const totalRev = parseFloat(revenueRes.rows[0]?.total_revenue || 0);
    const totalExp = parseFloat(expenseRes.rows[0]?.total_expenses || 0);
    const netProfit = totalRev - totalExp;
    const profitMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;
    const accountsReceivable = parseFloat(receivablesRes.rows[0]?.accounts_receivable || 0);

    return NextResponse.json({
      totalRevenue: totalRev,
      totalExpenses: totalExp,
      netProfit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      accountsReceivable,
      revenueByMethod,
      expensesByCategory,
      transactions: ledgerRes.rows.map((row) => ({
        ...row,
        amount: parseFloat(row.amount || 0),
      })),
    });
  } catch (err: any) {
    console.error('Accounting API Error:', err);
    return NextResponse.json(
      { error: 'Failed to load accounting data: ' + err.message },
      { status: 500 }
    );
  }
}
