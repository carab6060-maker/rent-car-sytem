'use client';

import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Plus,
  DollarSign,
  Fuel,
  Wrench,
  Users,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import Modal from '../Modal';

export default function ExpensesView({ currentUser, showToast }) {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, by_category: {} });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Fuel',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const [expRes, sumRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/expenses/summary'),
      ]);
      if (expRes.ok) setExpenses(await expRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch (err) {
      showToast('Failed to load expenses', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenRecord = () => {
    setFormData({
      title: '',
      category: 'Fuel',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'Cash',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount) {
      showToast('Please fill in title and amount.', true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to record expense');

      showToast('Expense recorded successfully');
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const categories = ['ALL', 'Fuel', 'Maintenance', 'Insurance', 'Staff Salaries', 'Other'];

  const filtered = expenses.filter((e) =>
    categoryFilter === 'ALL' || e.category === categoryFilter
  );

  const totalExpenseVal = parseFloat(summary.total || 0);
  const fuelExpenseVal = parseFloat(summary.by_category?.Fuel || 0);
  const maintenanceVal = parseFloat(summary.by_category?.Maintenance || 0);
  const salaryVal = parseFloat(summary.by_category?.['Staff Salaries'] || 0);

  return (
    <div className="expenses-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Operating Expenses & Fleet Costs</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Track vehicle maintenance, fuel, insurance, and payroll costs</p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenRecord} type="button">
          <Plus size={16} style={{ marginRight: '6px' }} />
          Record Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Expenses</span>
            <Receipt size={18} color="#ef4444" />
          </div>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>
            ${totalExpenseVal.toFixed(2)}
          </span>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Fuel Costs</span>
            <Fuel size={18} color="#f97316" />
          </div>
          <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
            ${fuelExpenseVal.toFixed(2)}
          </span>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Fleet Maintenance</span>
            <Wrench size={18} color="#0284c7" />
          </div>
          <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
            ${maintenanceVal.toFixed(2)}
          </span>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Staff Salaries</span>
            <Users size={18} color="#8b5cf6" />
          </div>
          <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
            ${salaryVal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {categories.map((c) => (
          <button
            key={c}
            className={`btn btn-sm ${categoryFilter === c ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCategoryFilter(c)}
            type="button"
          >
            {c}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading expense records...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <Receipt size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No expense records found.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>#{e.id}</td>
                    <td>
                      <div>
                        <strong>{e.title}</strong>
                        {e.description && (
                          <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>
                            {e.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ fontWeight: 500 }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: '#ef4444' }}>
                      ${parseFloat(e.amount || 0).toFixed(2)}
                    </td>
                    <td>{e.payment_method}</td>
                    <td>{String(e.expense_date || '').split('T')[0]}</td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{e.recorded_by_name || 'Staff'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Operating Expense"
        maxWidth="520px"
      >
        <form onSubmit={handleSaveExpense}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Expense Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Fuel for Car SL-12345, Oil change"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Fuel">Fuel</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Insurance">Insurance</option>
                <option value="Staff Salaries">Staff Salaries</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-control"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Description / Receipt Note</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Paid at Hass Petrol Station"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Recording...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
