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
      {/* Page Header */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-badge">
            <span className="live-dot" />
            <span>Live Fleet Operations</span>
          </div>
          <h2 className="dashboard-title">Fleet & Operations Overview</h2>
          <p className="dashboard-subtitle">Real-time metrics for vehicles, active bookings, and customer revenue</p>
        </div>
        <div className="dashboard-actions">
          <button
            className="btn btn-outline"
            onClick={fetchDashboard}
            disabled={loading}
            type="button"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('rentals')}
            type="button"
          >
            <PlusCircle size={16} />
            <span>New Rental</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="stat-cards-grid">
        {/* Total Vehicles */}
        <div className="modern-stat-card card-blue">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Vehicles</span>
            <div className="stat-icon-wrapper icon-blue">
              <Car size={20} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-number">{totalCars}</span>
          </div>
          <div className="stat-card-footer">
            <span className="stat-footer-text">Registered in fleet</span>
          </div>
        </div>

        {/* Available Cars */}
        <div className="modern-stat-card card-green">
          <div className="stat-card-header">
            <span className="stat-card-label">Available Cars</span>
            <div className="stat-icon-wrapper icon-green">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-number number-green">{availableCars}</span>
          </div>
          <div className="stat-card-footer">
            <span className="stat-pill pill-green">
              <span className="pill-dot dot-green" />
              Ready for rental
            </span>
          </div>
        </div>

        {/* Rented Out */}
        <div className="modern-stat-card card-amber">
          <div className="stat-card-header">
            <span className="stat-card-label">Rented Out</span>
            <div className="stat-icon-wrapper icon-amber">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-number number-amber">{rentedCars}</span>
          </div>
          <div className="stat-card-footer">
            <span className="stat-pill pill-amber">
              <span className="pill-dot dot-amber" />
              Active on road
            </span>
          </div>
        </div>

        {/* Total Customers */}
        <div className="modern-stat-card card-purple">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Customers</span>
            <div className="stat-icon-wrapper icon-purple">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-number">{totalCustomers}</span>
          </div>
          <div className="stat-card-footer">
            <span className="stat-footer-text">Verified driver accounts</span>
          </div>
        </div>
      </div>

      {/* Fleet Utilization & Financial Highlight */}
      <div className="analytics-grid">
        {/* Fleet Utilization */}
        <div className="modern-analytics-card">
          <div className="card-top">
            <div>
              <h3 className="card-title">Fleet Utilization</h3>
              <p className="card-desc">Active vehicle usage across all bookings</p>
            </div>
            <span className="utilization-pill">{utilization}% Active</span>
          </div>

          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(Math.max(utilization, 0), 100)}%` }}
            />
          </div>

          <div className="utilization-metrics">
            <div className="metric-item">
              <span className="metric-dot dot-green" />
              <span className="metric-name">Available:</span>
              <strong className="metric-val">{availableCars}</strong>
            </div>
            <div className="metric-item">
              <span className="metric-dot dot-amber" />
              <span className="metric-name">Rented:</span>
              <strong className="metric-val">{rentedCars}</strong>
            </div>
            <div className="metric-item">
              <span className="metric-dot dot-blue" />
              <span className="metric-name">Total Fleet:</span>
              <strong className="metric-val">{totalCars}</strong>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="modern-analytics-card card-revenue">
          <div className="card-top">
            <div>
              <h3 className="card-title">Total Invoiced Revenue</h3>
              <p className="card-desc">Gross contract value from rentals</p>
            </div>
            <div className="revenue-icon-box">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="revenue-body">
            <span className="revenue-currency">$</span>
            <span className="revenue-amount">
              {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="revenue-footer">
            <span className="stat-pill pill-green">
              <span className="pill-dot dot-green" />
              Realtime tracked bookings
            </span>
          </div>
        </div>
      </div>

      {/* Recent Rentals Section */}
      <div className="recent-rentals-card">
        <div className="recent-rentals-header">
          <div>
            <h3 className="card-title">Recent Rental Contracts</h3>
            <p className="card-desc">Latest car rental bookings and agreement statuses</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('rentals')} type="button">
            View All Rentals
          </button>
        </div>

        {recentRentals.length === 0 ? (
          <div className="empty-state-box">
            <Car size={40} className="empty-state-icon" />
            <p className="empty-state-title">No rental contracts recorded yet</p>
            <p className="empty-state-subtitle">Create your first rental to start tracking vehicles and revenue.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-data-table">
              <thead>
                <tr>
                  <th># Contract</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Start Date</th>
                  <th>Return Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRentals.map((r: Rental) => (
                  <tr key={r.id}>
                    <td>
                      <span className="contract-id-pill">#{r.id}</span>
                    </td>
                    <td>
                      <div className="table-customer-cell">
                        <div className="customer-avatar-small">
                          {r.customer_name ? r.customer_name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <span className="customer-cell-name">{r.customer_name || 'Customer #' + r.customer_id}</span>
                      </div>
                    </td>
                    <td>
                      <span className="car-cell-name">
                        {r.car_name ? `${r.car_name}` : `Car #${r.car_id}`}
                      </span>
                      {r.car_plate && <span className="plate-pill">{r.car_plate}</span>}
                    </td>
                    <td>{String(r.start_date).split('T')[0]}</td>
                    <td>{String(r.return_date).split('T')[0]}</td>
                    <td>
                      <strong className="price-text">${parseFloat(String(r.total_price || 0)).toFixed(2)}</strong>
                    </td>
                    <td>
                      <span className={`status-badge ${r.status === 'Rented' ? 'badge-rented' : 'badge-available'}`}>
                        <span className="badge-dot" />
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
