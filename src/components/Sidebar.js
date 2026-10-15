'use client';

import React from 'react';
import {
  LayoutDashboard,
  Car,
  Users,
  FileText,
  CreditCard,
  Receipt,
  UserCheck,
  Building2,
  LogOut,
} from 'lucide-react';

export default function Sidebar({
  currentPage,
  onNavigate,
  currentUser,
  companyName,
  onLogout,
  isOpen,
  onCloseMobile,
}) {
  const isManager = currentUser && (currentUser.role === 'manager' || currentUser.role === 'superadmin');
  const isSuperAdmin = currentUser && (currentUser.role === 'superadmin' || currentUser.isSuperAdmin);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cars', label: 'Cars', icon: Car },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'rentals', label: 'Rentals', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
  ];

  if (isManager) {
    navItems.push({ id: 'users', label: 'Users', icon: UserCheck });
  }

  if (isSuperAdmin) {
    navItems.push({ id: 'companies', label: 'Companies', icon: Building2 });
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <Car className="brand-icon-svg" />
        </div>
        <div className="brand-text-wrapper">
          <span className="brand-title">CarRent SaaS</span>
          <span className="brand-company" id="brandCompany">
            {companyName || currentUser?.companyName || 'Loading...'}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <Icon className="nav-icon" size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name" title={currentUser?.fullName}>
              {currentUser?.fullName || 'User'}
            </span>
            <span className={`sidebar-user-role role-pill role-${currentUser?.role || 'staff'}`}>
              {currentUser?.role || 'staff'}
            </span>
          </div>
        </div>
        <button className="btn-logout" onClick={onLogout} title="Sign out" type="button">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
