'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Printer,
} from 'lucide-react';
import Modal from '../Modal';
import { Payment, Rental, User } from '@/types';

interface PaymentsViewProps {
  currentUser: User | null;
  onOpenPrint: (data: any, type: 'agreement' | 'receipt') => void;
  showToast: (msg: string, isError?: boolean) => void;
}

export default function PaymentsView({ currentUser, onOpenPrint, showToast }: PaymentsViewProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidRentals, setUnpaidRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Record Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    rental_id: '',
    amount: '',
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      showToast('Failed to load payments', true);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidRentals = async () => {
    try {
      const res = await fetch('/api/rentals/unpaid');
      if (res.ok) {
        const data = await res.json();
        setUnpaidRentals(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchUnpaidRentals();
  }, []);

  const handleOpenRecord = () => {
    fetchUnpaidRentals();
    setFormData({
      rental_id: '',
      amount: '',
      payment_method: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSelectRental = (rentalId: string) => {
    const r = unpaidRentals.find((item) => String(item.id) === String(rentalId));
    setFormData((prev) => ({
      ...prev,
      rental_id: rentalId,
      amount: r ? parseFloat(String(r.balance_due || r.total_price || 0)).toFixed(2) : prev.amount,
    }));
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rental_id || !formData.amount) {
      showToast('Please select a contract and enter the amount.', true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to record payment');

      showToast('Payment recorded successfully');
      setIsModalOpen(false);
      fetchPayments();
      fetchUnpaidRentals();
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const filtered = payments.filter((p) =>
    (p.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.car_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.reference_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.payment_method || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="payments-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Payment Transactions</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Track incoming customer rental payments, cash, and bank transfers</p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenRecord} type="button">
          <Plus size={16} style={{ marginRight: '6px' }} />
          Record Payment
        </button>
      </div>

      <div style={{ position: 'relative', maxWidth: '420px', marginBottom: '20px' }}>
        <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        <input
          type="text"
          className="form-control"
          placeholder="Search by customer, car, or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '42px', height: '42px', borderRadius: '10px' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading payments...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <CreditCard size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No payment transactions found.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Amount Paid</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Recorded By</th>
                  <th style={{ textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{p.customer_name || 'Customer'}</td>
                    <td>{p.car_name ? `${p.car_name} (${p.car_plate || ''})` : `Rental #${p.rental_id}`}</td>
                    <td style={{ fontWeight: 800, color: '#16a34a', fontSize: '1rem' }}>
                      ${parseFloat(String(p.amount || 0)).toFixed(2)}
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 500 }}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td>{String(p.payment_date || '').split('T')[0]}</td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{p.recorded_by_name || 'Staff'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenPrint(p, 'receipt')}
                        title="Print Official Receipt"
                        type="button"
                      >
                        <Printer size={14} style={{ marginRight: '4px' }} />
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Payment Transaction"
        maxWidth="540px"
      >
        <form onSubmit={handleSavePayment}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Rental Contract *</label>
            <select
              className="form-control"
              value={formData.rental_id}
              onChange={(e) => handleSelectRental(e.target.value)}
              required
            >
              <option value="">-- Select Rental Contract --</option>
              {unpaidRentals.map((r) => (
                <option key={r.id} value={r.id}>
                  Contract #{r.id} - {r.customer_name} ({r.car_name} {r.car_plate}) • Due: ${parseFloat(String(r.balance_due || r.total_price || 0)).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Amount Paid ($) *</label>
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

            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select
                className="form-control"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money (ZAAD / EVC)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reference / Slip No</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. TXN-102938"
                value={formData.reference_no}
                onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Notes (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Remaining balance will be cleared tomorrow"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
