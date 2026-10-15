'use client';

import React, { useEffect, useState } from 'react';
import {
  Car,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
} from 'lucide-react';
import Modal from '../Modal';

export default function CarsView({ currentUser, onRentCar, showToast, openConfirm }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    plate: '',
    price_per_day: '',
    image_url: '',
  });
  const [saving, setSaving] = useState(false);

  const isManager = currentUser && (currentUser.role === 'manager' || currentUser.role === 'superadmin');

  const fetchCars = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cars');
      if (res.ok) {
        const data = await res.json();
        setCars(data);
      }
    } catch (err) {
      showToast('Failed to load cars', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const handleOpenAdd = () => {
    setEditingCar(null);
    setFormData({
      name: '',
      model: '',
      plate: '',
      price_per_day: '',
      image_url: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (car) => {
    setEditingCar(car);
    setFormData({
      name: car.name || '',
      model: car.model || '',
      plate: car.plate || '',
      price_per_day: car.price_per_day || '',
      image_url: car.image_url || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveCar = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.plate.trim() || !formData.price_per_day) {
      showToast('Please fill all required fields.', true);
      return;
    }

    setSaving(true);
    try {
      const url = editingCar ? `/api/cars/${editingCar.id}` : '/api/cars';
      const method = editingCar ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save car');

      showToast(editingCar ? 'Car updated successfully' : 'Car added to fleet');
      setIsModalOpen(false);
      fetchCars();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCar = (car) => {
    if (car.status === 'Rented') {
      showToast('Cannot delete a vehicle that is currently rented out.', true);
      return;
    }

    openConfirm(`Are you sure you want to delete ${car.name} (${car.plate}) from the fleet?`, async () => {
      try {
        const res = await fetch(`/api/cars/${car.id}`, { method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to delete');
        showToast('Vehicle deleted successfully');
        fetchCars();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  };

  const filteredCars = cars.filter((c) => {
    const matchSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.model || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.plate || '').toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="cars-content">
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Fleet Inventory</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Manage company vehicles, rates, and availability</p>
        </div>

        {isManager && (
          <button className="btn btn-primary" onClick={handleOpenAdd} type="button">
            <Plus size={16} style={{ marginRight: '6px' }} />
            Add New Vehicle
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by car name, model, plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'Available', 'Rented'].map((st) => (
            <button
              key={st}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(st)}
              type="button"
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Car Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading fleet vehicles...</div>
      ) : filteredCars.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <Car size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No vehicles found matching criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredCars.map((car) => (
            <div
              key={car.id}
              style={{
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Car Image Preview */}
              <div style={{ height: '160px', background: '#f8fafc', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {car.image_url ? (
                  <img
                    src={car.image_url}
                    alt={car.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <Car size={48} color="#94a3b8" />
                )}
                <span
                  className={`badge ${car.status === 'Available' ? 'badge-success' : 'badge-warning'}`}
                  style={{ position: 'absolute', top: '12px', right: '12px' }}
                >
                  {car.status}
                </span>
              </div>

              {/* Car Details */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{car.name}</h3>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{car.model || 'Standard'}</span>
                  </div>
                  <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.8rem', fontWeight: 600, padding: '3px 8px', borderRadius: '4px' }}>
                    {car.plate}
                  </span>
                </div>

                <div style={{ margin: '14px 0', fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>
                  ${parseFloat(car.price_per_day || 0).toFixed(2)}
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}> / day</span>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                  {car.status === 'Available' && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onRentCar(car)}
                      type="button"
                    >
                      <FileText size={14} style={{ marginRight: '4px' }} />
                      Rent Now
                    </button>
                  )}

                  {isManager && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(car)}
                        title="Edit Vehicle"
                        type="button"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteCar(car)}
                        title="Delete Vehicle"
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Car Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCar ? 'Edit Vehicle Details' : 'Add Vehicle to Fleet'}
      >
        <form onSubmit={handleSaveCar}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Vehicle Make / Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Toyota, Land Cruiser, Hyundai"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Model & Year</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Prado 2023, Elantra 2022"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">License Plate *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. SL-12345"
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Daily Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="form-control"
                placeholder="e.g. 50.00"
                value={formData.price_per_day}
                onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Car Image URL (Optional)</label>
            <input
              type="url"
              className="form-control"
              placeholder="https://example.com/car.jpg"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingCar ? 'Update Vehicle' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
