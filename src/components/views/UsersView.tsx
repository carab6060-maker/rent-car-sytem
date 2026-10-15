'use client';

import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import Modal from '../Modal';
import { User } from '@/types';

interface UsersViewProps {
  currentUser: User | null;
  showToast: (msg: string, isError?: boolean) => void;
  openConfirm: (msg: string, onConfirm: () => void) => void;
}

export default function UsersView({ currentUser, showToast, openConfirm }: UsersViewProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'staff',
  });
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = currentUser && (currentUser.role === 'superadmin' || currentUser.isSuperAdmin);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      showToast('Failed to load users', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'staff',
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password.trim()) {
      showToast('Please fill all required user fields.', true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create user');

      showToast('User created successfully');
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRole = async (user: any, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update role');

      showToast(`Role changed to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleDeleteUser = (user: any) => {
    if (user.id === currentUser?.id) {
      showToast('You cannot delete your own account.', true);
      return;
    }

    openConfirm(`Are you sure you want to delete ${user.full_name} (${user.email})?`, async () => {
      try {
        const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to delete user');

        showToast('User deleted');
        fetchUsers();
      } catch (err: any) {
        showToast(err.message, true);
      }
    });
  };

  return (
    <div className="users-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>User Management</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Manage company team members, managers, and system roles</p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAdd} type="button">
          <Plus size={16} style={{ marginRight: '6px' }} />
          Add Team Member
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading team members...</div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <UserCheck size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No users found.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`topbar-role-badge role-${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {String(u.created_at || '').split('T')[0] || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                        {u.role !== 'superadmin' && (
                          <select
                            className="form-control"
                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.82rem' }}
                            value={u.role}
                            onChange={(e) => handleChangeRole(u, e.target.value)}
                            disabled={u.id === currentUser?.id}
                          >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                            {isSuperAdmin && <option value="superadmin">SuperAdmin</option>}
                          </select>
                        )}

                        {u.id !== currentUser?.id && u.role !== 'superadmin' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
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

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Team Member"
        maxWidth="500px"
      >
        <form onSubmit={handleSaveUser}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Hassan Jama"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              placeholder="hassan@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Access Role *</label>
            <select
              className="form-control"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="staff">Staff (Rentals, Cars & Customer Ops)</option>
              <option value="manager">Manager (Full Company & Team Control)</option>
              {isSuperAdmin && <option value="superadmin">SuperAdmin (Platform Admin)</option>}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
