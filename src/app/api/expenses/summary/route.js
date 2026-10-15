import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);

    const totalExp = await pool.query('SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM expenses WHERE company_id = $1', [companyId]);
    const thisMonth = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total
      FROM expenses
      WHERE company_id = $1 AND DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)
    `, [companyId]);
    const byCategory = await pool.query(`
      SELECT category, COALESCE(SUM(amount), 0)::numeric AS total, COUNT(*)::int AS count
      FROM expenses
      WHERE company_id = $1
      GROUP BY category
      ORDER BY total DESC
    `, [companyId]);

    return NextResponse.json({
      totalExpenses: parseFloat(totalExp.rows[0]?.total || 0),
      thisMonthExpenses: parseFloat(thisMonth.rows[0]?.total || 0),
      byCategory: byCategory.rows,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load expenses summary' }, { status: 500 });
  }
}
