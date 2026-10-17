'use client';

import React, { useEffect, useState } from 'react';
import {
  Car as CarIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
} from 'lucide-react';
import Modal from '../Modal';
import { Car, User } from '@/types';

interface CarsViewProps {
  currentUser: User | null;
  onRentCar: (car: Car) => void;
  showToast: (msg: string, isError?: boolean) => void;
  openConfirm: (msg: string, onConfirm: () => void) => void;
}

export function getCarImageUrl(car?: Partial<Car> | null) {
  if (car && car.image_url && typeof car.image_url === 'string' && car.image_url.trim()) {
    return car.image_url.trim();
  }
  const name = ((car && car.name) || '').toLowerCase();
  const model = ((car && car.model) || '').toLowerCase();
  const text = `${name} ${model}`;

  if (text.includes('mercedes') || text.includes('c-class') || text.includes('c class') || text.includes('benz')) {
    return '/images/cars/mercedes-c-class.jpg';
  }
  if (text.includes('surf') || text.includes('hilux') || text.includes('4runner')) {
    return '/images/cars/toyota-surf.jpg';
  }
  if (text.includes('prado') || text.includes('land cruiser') || text.includes('tx')) {
    return '/images/cars/prado-tx.jpg';
  }
  return '/images/cars/default-car.jpg';
}

export default function CarsView({ currentUser, onRentCar, showToast, openConfirm }: CarsViewProps) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
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

  const handleOpenEdit = (car: Car) => {
    setEditingCar(car);
    setFormData({
      name: car.name || '',
      model: car.model || '',
      plate: car.plate || '',
      price_per_day: String(car.price_per_day || ''),
      image_url: car.image_url || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveCar = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCar = (car: Car) => {
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
      } catch (err: any) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Fleet Inventory</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>Manage vehicles, rental rates, and live availability</p>
        </div>

        {isManager && (
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd} type="button" style={{ height: '34px' }}>
            <Plus size={15} style={{ marginRight: '4px' }} />
            Add New Vehicle
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by car name, model, plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '34px', fontSize: '0.84rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          {['ALL', 'Available', 'Rented'].map((st) => (
            <button
              key={st}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(st)}
              type="button"
              style={{ height: '34px', fontSize: '0.78rem', padding: '0 12px', fontWeight: 600 }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Car Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Loading fleet vehicles...</div>
      ) : filteredCars.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <CarIcon size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No vehicles found matching criteria.</p>
        </div>
      ) : (
        <div className="cars-cards-grid">
          {filteredCars.map((car) => (
            <div key={car.id} className="car-inventory-card">
              {/* Car Image Preview */}
              <div className="car-card-image-box">
                <img
                  src={getCarImageUrl(car)}
                  alt={car.name}
                  className="car-card-img"
                  onError={(e: any) => {
                    e.currentTarget.src = '/images/cars/default-car.jpg';
                  }}
                />
                <span
                  className={`badge ${car.status === 'Available' ? 'badge-success' : 'badge-warning'} car-card-badge`}
                >
                  {car.status}
                </span>
              </div>

              {/* Car Details */}
              <div className="car-card-body">
                <div className="car-card-header">
                  <div style={{ overflow: 'hidden' }}>
                    <h3 className="car-card-title" title={car.name}>{car.name}</h3>
                    <span className="car-card-model">{car.model || 'Standard'}</span>
                  </div>
                  <span className="car-card-plate">{car.plate}</span>
                </div>

                <div className="car-card-price">
                  ${parseFloat(String(car.price_per_day || 0)).toFixed(2)}
                  <span className="car-card-period"> / day</span>
                </div>

                <div className="car-card-actions">
                  {car.status === 'Available' && (
                    <button
                      className="btn btn-primary btn-sm car-rent-btn"
                      onClick={() => onRentCar(car)}
                      type="button"
                    >
                      <FileText size={13} />
                      <span>Rent Now</span>
                    </button>
                  )}

                  {isManager && (
                    <div className="car-action-group">
                      <button
                        className="btn btn-secondary btn-sm car-icon-btn"
                        onClick={() => handleOpenEdit(car)}
                        title="Edit Vehicle"
                        type="button"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm car-icon-btn"
                        onClick={() => handleDeleteCar(car)}
                        title="Delete Vehicle"
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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
            <label className="form-label">Vehicle Image (Auto-matched or Custom URL)</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ width: '80px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                <img
                  src={getCarImageUrl({ name: formData.name, model: formData.model, image_url: formData.image_url })}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e: any) => { e.currentTarget.src = '/images/cars/default-car.jpg'; }}
                />
              </div>
              <input
                type="url"
                className="form-control"
                placeholder="Optional custom image URL (e.g. https://...)"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Auto-detects: Mercedes, Surf, Prado, or uses custom URL / default car photo.
            </span>
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
