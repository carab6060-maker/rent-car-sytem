'use client';

import React from 'react';
import { Menu, Building } from 'lucide-react';
import { User } from '@/types';

interface TopbarProps {
  currentPage: string;
  currentUser: User | null;
  companyName?: string;
  onToggleMobile: () => void;
}

const PAGE_TITLES: Record<string, string> = {
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
  companyName,
  onToggleMobile,
}: TopbarProps) {
  const currentCompany = companyName || currentUser?.companyName || 'Prime Car Rental';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle"
          onClick={onToggleMobile}
          aria-label="Toggle navigation menu"
          type="button"
        >
          <Menu size={20} />
        </button>
        <div className="topbar-title-wrapper">
          <h1 className="page-title">{PAGE_TITLES[currentPage] || 'Overview'}</h1>
        </div>
      </div>

      <div className="topbar-user">
        <div className="company-active-badge">
          <Building size={14} className="company-badge-icon" />
          <span className="company-badge-label">Company:</span>
          <span className="company-badge-name">{currentCompany}</span>
        </div>

        <div className="topbar-profile-chip">
          <span className={`topbar-role-badge role-${currentUser?.role || 'staff'}`}>
            {currentUser?.role || 'staff'}
          </span>
          <span className="topbar-user-name">{currentUser?.fullName || 'User'}</span>
        </div>
      </div>
    </header>
  );
}
