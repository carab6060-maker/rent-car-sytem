'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Users,
  Car,
  FileText,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import Modal from '../Modal';

export default function CompaniesView({
  currentUser,
  activeCompanyId,
  onSwitchCompany,
  showToast,
}) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Company Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    plan: 'pro',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      showToast('Failed to load companies', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleNameChange = (name) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') ? slug : prev.slug,
    }));
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      showToast('Company name and slug are required.', true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create company');

      showToast(`Tenant "${formData.name}" created successfully!`);
      setIsModalOpen(false);
      setFormData({
        name: '',
        slug: '',
        email: '',
        phone: '',
        plan: 'pro',
        admin_name: '',
        admin_email: '',
        admin_password: '',
      });
      fetchCompanies();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="companies-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Multi-Tenant SaaS Companies</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Manage registered car rental companies, subscriptions, and tenant contexts</p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} type="button">
          <Plus size={16} style={{ marginRight: '6px' }} />
          Register New Tenant Company
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading tenant companies...</div>
      ) : companies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <Building2 size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No companies registered yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {companies.map((c) => {
            const isCurrent = String(c.id) === String(activeCompanyId);
            return (
              <div
                key={c.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: isCurrent ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {isCurrent && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle2 size={13} /> Active View
                  </span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563eb',
                    }}
                  >
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{c.name}</h3>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>slug: @{c.slug}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Users</span>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{c.user_count || 0}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Vehicles</span>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{c.car_count || 0}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Rentals</span>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{c.rental_count || 0}</strong>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                    Plan: {(c.plan || 'pro').toUpperCase()}
                  </span>

                  <button
                    className={`btn btn-sm ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => onSwitchCompany(c.id)}
                    type="button"
                  >
                    <ExternalLink size={14} style={{ marginRight: '4px' }} />
                    {isCurrent ? 'Current View' : 'Switch into Tenant'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Company Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Tenant Company"
        maxWidth="560px"
      >
        <form onSubmit={handleCreateCompany}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Company Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Sahal Car Rental, Mogadishu Fleet"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Subdomain / Slug *</label>
              <input
                type="text"
                className="form-control"
                placeholder="sahal-cars"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subscription Plan</label>
              <select
                className="form-control"
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              >
                <option value="starter">Starter (up to 10 cars)</option>
                <option value="pro">Pro (unlimited fleet)</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '14px 0' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
              Tenant Manager Account (Optional)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Manager Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Manager Full Name"
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Manager Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="manager@company.com"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Initial Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Manager account password"
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Creating Tenant...' : 'Create Tenant Company'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
