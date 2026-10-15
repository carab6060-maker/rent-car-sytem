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
          <Menu size={22} />
        </button>
        <h1 className="page-title">{PAGE_TITLES[currentPage] || 'Overview'}</h1>
      </div>

      <div className="topbar-user">
        {/* Active Company Badge (Clean static display, no dropdown options) */}
        <div
          className="company-active-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f1f5f9',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            border: '1px solid #e2e8f0',
          }}
        >
          <Building size={15} style={{ color: '#2563eb' }} />
          <span style={{ color: '#64748b', fontWeight: 500 }}>Company:</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>{currentCompany}</span>
        </div>

        <span className={`topbar-role-badge role-${currentUser?.role || 'staff'}`}>
          {currentUser?.role || 'staff'}
        </span>
        <span className="topbar-user-name">{currentUser?.fullName || 'User'}</span>
      </div>
    </header>
  );
}
