'use client';

import React, { useEffect, useState } from 'react';
import {
  Car,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { DashboardData, Rental } from '@/types';

interface DashboardViewProps {
  onNavigate: (page: string) => void;
  onOpenNewRental: () => void;
}

export default function DashboardView({ onNavigate, onOpenNewRental }: DashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalCars: 0,
    availableCars: 0,
    rentedCars: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    recentRentals: [],
  });

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const totalCars = data.totalCars || 0;
  const availableCars = data.availableCars || 0;
  const rentedCars = data.rentedCars || 0;
  const totalCustomers = data.totalCustomers || 0;
  const totalRevenue = parseFloat(String(data.totalRevenue || 0));
  const utilization = totalCars > 0 ? Math.round((rentedCars / totalCars) * 100) : 0;
  const recentRentals = Array.isArray(data.recentRentals) ? data.recentRentals : [];

  return (
    <div className="dashboard-content">
      <div className="section-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Fleet & Operations Overview</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Live summary of vehicles, bookings, and customer activity</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboard} disabled={loading} type="button">
            <RefreshCw size={14} className={loading ? 'spin' : ''} style={{ marginRight: '6px' }} />
            Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('rentals')} type="button">
            <PlusCircle size={14} style={{ marginRight: '6px' }} />
            New Rental
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Total Vehicles</span>
            <Car size={20} color="#2563eb" />
          </div>
          <span className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a' }}>{totalCars}</span>
        </div>

        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Available Cars</span>
            <CheckCircle2 size={20} color="#16a34a" />
          </div>
          <span className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a' }}>{availableCars}</span>
        </div>

        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ea580c', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Rented Out</span>
            <Clock size={20} color="#ea580c" />
          </div>
          <span className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ea580c' }}>{rentedCars}</span>
        </div>

        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Total Customers</span>
            <Users size={20} color="#0284c7" />
          </div>
          <span className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a' }}>{totalCustomers}</span>
        </div>
      </div>

      {/* Fleet Utilization & Financial Highlight */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Fleet Utilization</h3>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb' }}>{utilization}% Active</span>
          </div>
          <div style={{ background: '#f1f5f9', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
            <div
              style={{
                width: `${utilization}%`,
                background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                height: '100%',
                borderRadius: '6px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
            <span>Available: {availableCars}</span>
            <span>Rented: {rentedCars}</span>
            <span>Fleet Total: {totalCars}</span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Total Invoiced Revenue</h3>
            <TrendingUp size={20} color="#16a34a" />
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#16a34a', margin: '8px 0' }}>
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Total bookings value tracked in database</p>
        </div>
      </div>

      {/* Recent Rentals Section */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>Recent Rental Contracts</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Latest car rental bookings and their current status</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('rentals')} type="button">
            View All Rentals
          </button>
        </div>

        {recentRentals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <Car size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
            <p>No rental contracts recorded yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Car</th>
                  <th>Start Date</th>
                  <th>Return Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRentals.map((r: Rental) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td style={{ fontWeight: 600 }}>{r.customer_name || 'Customer #' + r.customer_id}</td>
                    <td>{r.car_name ? `${r.car_name} (${r.car_plate || ''})` : `Car #${r.car_id}`}</td>
                    <td>{String(r.start_date).split('T')[0]}</td>
                    <td>{String(r.return_date).split('T')[0]}</td>
                    <td style={{ fontWeight: 600 }}>${parseFloat(String(r.total_price || 0)).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${r.status === 'Rented' ? 'badge-warning' : 'badge-success'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
