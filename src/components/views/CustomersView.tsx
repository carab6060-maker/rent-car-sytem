'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  FileCheck,
} from 'lucide-react';
import Modal from '../Modal';
import { Customer, User } from '@/types';

interface CustomersViewProps {
  currentUser: User | null;
  showToast: (msg: string, isError?: boolean) => void;
  openConfirm: (msg: string, onConfirm: () => void) => void;
}

export default function CustomersView({ currentUser, showToast, openConfirm }: CustomersViewProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    license: '',
  });
  const [saving, setSaving] = useState(false);

  const isManager = currentUser && (currentUser.role === 'manager' || currentUser.role === 'superadmin');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      showToast('Failed to load customers', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ full_name: '', phone: '', license: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      full_name: customer.full_name || '',
      phone: customer.phone || '',
      license: customer.license || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.phone.trim() || !formData.license.trim()) {
      showToast('Please fill all required customer fields.', true);
      return;
    }

    setSaving(true);
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save customer');

      showToast(editingCustomer ? 'Customer updated' : 'Customer registered');
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (customer: Customer) => {
    openConfirm(`Are you sure you want to delete ${customer.full_name}?`, async () => {
      try {
        const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to delete customer');
        showToast('Customer deleted');
        fetchCustomers();
      } catch (err: any) {
        showToast(err.message, true);
      }
    });
  };

  const filtered = customers.filter((c) =>
    (c.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.license || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="customers-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Customer Registry</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Manage registered drivers and renter contact profiles</p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAdd} type="button">
          <Plus size={16} style={{ marginRight: '6px' }} />
          Add Customer
        </button>
      </div>

      <div style={{ position: 'relative', maxWidth: '420px', marginBottom: '20px' }}>
        <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        <input
          type="text"
          className="form-control"
          placeholder="Search by customer name, phone, or license..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '42px', height: '42px', borderRadius: '10px' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading customer records...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No customers found.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,23,42,0.04)', width: '100%' }}>
          <div className="table-responsive" style={{ width: '100%' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>#</th>
                  <th>Full Name</th>
                  <th>Phone Number</th>
                  <th>Driver License</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>#{c.id}</td>
                    <td style={{ fontWeight: 600 }}>{c.full_name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} color="#64748b" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCheck size={14} color="#358dd5" />
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.license}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Customer"
                          type="button"
                        >
                          <Edit2 size={14} />
                        </button>
                        {isManager && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(c)}
                            title="Delete Customer"
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Details' : 'Register New Customer'}
      >
        <form onSubmit={handleSaveCustomer}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Ahmed Ali Warsame"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Phone Number *</label>
            <input
              type="tel"
              className="form-control"
              placeholder="e.g. +252 61 555 1234"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Driver License Number *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. DL-987654"
              value={formData.license}
              onChange={(e) => setFormData({ ...formData, license: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Register Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
