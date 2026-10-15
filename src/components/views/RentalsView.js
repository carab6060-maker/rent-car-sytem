'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  RotateCcw,
  Printer,
  Calendar,
  DollarSign,
  Car,
  User,
} from 'lucide-react';
import Modal from '../Modal';

export default function RentalsView({
  currentUser,
  preselectedCar,
  onClearPreselectedCar,
  onOpenPrint,
  showToast,
}) {
  const [rentals, setRentals] = useState([]);
  const [cars, setCars] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Rental Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newRentalForm, setNewRentalForm] = useState({
    customer_id: '',
    car_id: '',
    start_date: new Date().toISOString().split('T')[0],
    return_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  });
  const [creating, setCreating] = useState(false);

  // Return Rental Modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [returnForm, setReturnForm] = useState({
    actual_return_date: new Date().toISOString().split('T')[0],
    extra_charges: 0,
  });
  const [returning, setReturning] = useState(false);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rentals');
      if (res.ok) {
        const data = await res.json();
        setRentals(data);
      }
    } catch (err) {
      showToast('Failed to load rentals', true);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [carsRes, custRes] = await Promise.all([
        fetch('/api/cars'),
        fetch('/api/customers'),
      ]);
      if (carsRes.ok) setCars(await carsRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRentals();
    fetchAuxData();
  }, []);

  // Handle preselected car from CarsView
  useEffect(() => {
    if (preselectedCar) {
      setNewRentalForm((prev) => ({
        ...prev,
        car_id: String(preselectedCar.id),
      }));
      setIsNewModalOpen(true);
      if (onClearPreselectedCar) onClearPreselectedCar();
    }
  }, [preselectedCar]);

  // Calculations for new rental
  const selectedCarObj = cars.find((c) => String(c.id) === String(newRentalForm.car_id));
  const calcDays = () => {
    if (!newRentalForm.start_date || !newRentalForm.return_date) return 0;
    const diff = new Date(newRentalForm.return_date) - new Date(newRentalForm.start_date);
    const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return d > 0 ? d : 0;
  };
  const totalDays = calcDays();
  const totalPrice = selectedCarObj ? totalDays * parseFloat(selectedCarObj.price_per_day || 0) : 0;

  const handleCreateRental = async (e) => {
    e.preventDefault();
    if (!newRentalForm.customer_id || !newRentalForm.car_id) {
      showToast('Please select both a customer and an available car.', true);
      return;
    }
    if (totalDays <= 0) {
      showToast('Return date must be after start date.', true);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRentalForm),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create rental');

      showToast('Rental contract created successfully!');
      setIsNewModalOpen(false);
      fetchRentals();
      fetchAuxData();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenReturn = (rental) => {
    setSelectedRental(rental);
    setReturnForm({
      actual_return_date: new Date().toISOString().split('T')[0],
      extra_charges: 0,
    });
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!selectedRental) return;

    setReturning(true);
    try {
      const res = await fetch(`/api/rentals/${selectedRental.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnForm),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to process vehicle return');

      showToast('Vehicle returned and contract closed successfully');
      setIsReturnModalOpen(false);
      fetchRentals();
      fetchAuxData();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setReturning(false);
    }
  };

  const availableCars = cars.filter((c) => c.status === 'Available');

  const filtered = rentals.filter((r) => {
    const matchSearch =
      (r.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.car_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.car_plate || '').toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="rentals-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Rental Contracts</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Manage booking agreements, vehicle dispatch, and returns</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            fetchAuxData();
            setIsNewModalOpen(true);
          }}
          type="button"
        >
          <Plus size={16} style={{ marginRight: '6px' }} />
          New Rental Contract
        </button>
      </div>

      {/* Filter / Search */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by customer, car, or plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'Rented', 'Returned'].map((st) => (
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

      {/* Rentals Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading rental contracts...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No rental contracts found.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Dates</th>
                  <th>Duration</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td style={{ fontWeight: 600 }}>{r.customer_name || 'Customer #' + r.customer_id}</td>
                    <td>
                      <div>
                        <strong>{r.car_name || 'Car #' + r.car_id}</strong>
                        {r.car_plate && (
                          <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>
                            {r.car_plate}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div>{String(r.start_date).split('T')[0]}</div>
                      <div style={{ color: '#64748b' }}>to {String(r.return_date).split('T')[0]}</div>
                    </td>
                    <td>{r.total_days} days</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      ${(parseFloat(r.total_price || 0) + parseFloat(r.extra_charges || 0)).toFixed(2)}
                      {r.extra_charges ? (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#ef4444' }}>
                          +${parseFloat(r.extra_charges).toFixed(2)} fees
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'Rented' ? 'badge-warning' : 'badge-success'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {r.status === 'Rented' && (
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => handleOpenReturn(r)}
                            title="Return Vehicle"
                            type="button"
                          >
                            <RotateCcw size={14} style={{ marginRight: '4px' }} />
                            Return
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenPrint(r, 'agreement')}
                          title="Print Rental Agreement"
                          type="button"
                        >
                          <Printer size={14} style={{ marginRight: '4px' }} />
                          Contract
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Rental Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Create New Rental Contract"
        maxWidth="620px"
      >
        <form onSubmit={handleCreateRental}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Select Customer *</label>
            <select
              className="form-control"
              value={newRentalForm.customer_id}
              onChange={(e) => setNewRentalForm({ ...newRentalForm, customer_id: e.target.value })}
              required
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.phone} • {c.license})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Select Available Vehicle *</label>
            <select
              className="form-control"
              value={newRentalForm.car_id}
              onChange={(e) => setNewRentalForm({ ...newRentalForm, car_id: e.target.value })}
              required
            >
              <option value="">-- Choose Vehicle --</option>
              {availableCars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.model || ''} - {c.plate} (${parseFloat(c.price_per_day).toFixed(2)}/day)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Rental Start Date *</label>
              <input
                type="date"
                className="form-control"
                value={newRentalForm.start_date}
                onChange={(e) => setNewRentalForm({ ...newRentalForm, start_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Expected Return Date *</label>
              <input
                type="date"
                className="form-control"
                value={newRentalForm.return_date}
                onChange={(e) => setNewRentalForm({ ...newRentalForm, return_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Pricing Summary Box */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: '#64748b' }}>
              <span>Duration:</span>
              <strong style={{ color: '#0f172a' }}>{totalDays} Days</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: '#64748b' }}>
              <span>Rate Per Day:</span>
              <strong style={{ color: '#0f172a' }}>${selectedCarObj ? parseFloat(selectedCarObj.price_per_day).toFixed(2) : '0.00'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontSize: '1.05rem', fontWeight: 700, color: '#2563eb' }}>
              <span>Total Contract Price:</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsNewModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? 'Creating Contract...' : 'Generate Contract'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Return Rental Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Process Vehicle Return"
        maxWidth="500px"
      >
        <form onSubmit={handleConfirmReturn}>
          {selectedRental && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem' }}>
              <div><strong>Car:</strong> {selectedRental.car_name} ({selectedRental.car_plate})</div>
              <div><strong>Customer:</strong> {selectedRental.customer_name}</div>
              <div><strong>Contract Total:</strong> ${parseFloat(selectedRental.total_price || 0).toFixed(2)}</div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Actual Return Date *</label>
            <input
              type="date"
              className="form-control"
              value={returnForm.actual_return_date}
              onChange={(e) => setReturnForm({ ...returnForm, actual_return_date: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Extra Charges (Damage / Late Fees $)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-control"
              value={returnForm.extra_charges}
              onChange={(e) => setReturnForm({ ...returnForm, extra_charges: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsReturnModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn btn-warning" type="submit" disabled={returning}>
              {returning ? 'Processing Return...' : 'Confirm Return & Free Car'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
