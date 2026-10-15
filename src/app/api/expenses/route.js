import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, getTenantId } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const result = await pool.query(`
      SELECT e.*, u.full_name AS recorded_by_name
      FROM expenses e
      LEFT JOIN users u ON e.recorded_by = u.id
      WHERE e.company_id = $1
      ORDER BY e.expense_date DESC, e.id DESC
    `, [companyId]);

    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getTenantId(req, user);
    const { title, category, amount, expense_date, payment_method, description } = await req.json();

    if (!title || !category || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Title, category, and amount are required' }, { status: 400 });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }
    const validCategories = ['Fuel', 'Maintenance', 'Insurance', 'Staff Salaries', 'Other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    const validMethods = ['Cash', 'Bank Transfer', 'Mobile Money'];
    const method = validMethods.includes(payment_method) ? payment_method : 'Cash';
    const dateVal = expense_date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      INSERT INTO expenses (company_id, title, category, amount, expense_date, payment_method, description, recorded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [companyId, title.trim(), category, numAmount, dateVal, method, description ? description.trim() : null, user.id]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to record expense' }, { status: 500 });
  }
}
