'use client';

import React from 'react';
import { Menu, Building } from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Fleet Dashboard & Analytics',
  cars: 'Vehicle Fleet Management',
  customers: 'Customer Registry',
  rentals: 'Rental Contracts & Bookings',
  payments: 'Payment Transactions & Invoices',
  expenses: 'Operating Expenses & Fleet Costs',
  users: 'User Management',
  companies: 'Multi-Tenant Companies (SaaS Admin)',
};

export default function Topbar({
  currentPage,
  currentUser,
  companies,
  selectedCompanyId,
  onSwitchCompany,
  onToggleMobile,
}) {
  const isSuperAdmin = currentUser && (currentUser.role === 'superadmin' || currentUser.isSuperAdmin);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle"
          onClick={onToggleMobile}
          aria-label="Toggle navigation menu"
          type="button"
        >
          <Menu size={22} />
        </button>
        <h1 className="page-title">{PAGE_TITLES[currentPage] || 'Overview'}</h1>
      </div>

      <div className="topbar-user">
        {isSuperAdmin && companies && companies.length > 0 && (
          <div className="company-switch-wrapper">
            <Building size={16} className="switch-icon" />
            <label htmlFor="companySelect" className="switch-label">
              Company:
            </label>
            <select
              id="companySelect"
              className="company-select"
              value={selectedCompanyId || ''}
              onChange={(e) => onSwitchCompany(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status ? `(${c.status})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <span className={`topbar-role-badge role-${currentUser?.role || 'staff'}`}>
          {currentUser?.role || 'staff'}
        </span>
        <span className="topbar-user-name">{currentUser?.fullName || 'User'}</span>
      </div>
    </header>
  );
}
