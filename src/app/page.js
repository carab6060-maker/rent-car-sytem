'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ConfirmModal from '@/components/ConfirmModal';
import PrintModal from '@/components/PrintModal';

import DashboardView from '@/components/views/DashboardView';
import CarsView from '@/components/views/CarsView';
import CustomersView from '@/components/views/CustomersView';
import RentalsView from '@/components/views/RentalsView';
import PaymentsView from '@/components/views/PaymentsView';
import ExpensesView from '@/components/views/ExpensesView';
import UsersView from '@/components/views/UsersView';
import CompaniesView from '@/components/views/CompaniesView';

export default function AppMainPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Multi-tenant companies for SuperAdmin
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Cross-view state (e.g. "Rent this car" from Cars -> Rentals)
  const [preselectedCar, setPreselectedCar] = useState(null);

  // Print Modal State
  const [printModal, setPrintModal] = useState({
    isOpen: false,
    title: '',
    data: null,
    type: 'agreement',
  });

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
    loading: false,
  });

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, isError = false) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Check auth session
  const initAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.replace('/login');
        return;
      }
      const user = await res.json();
      setCurrentUser(user);
      setSelectedCompanyId(user.companyId);

      // If SuperAdmin, fetch company list
      if (user.role === 'superadmin' || user.isSuperAdmin) {
        try {
          const compRes = await fetch('/api/admin/companies');
          if (compRes.ok) {
            const comps = await compRes.json();
            setCompanies(comps);
          }
        } catch (e) {
          console.error('Failed to load companies for switcher:', e);
        }
      }
    } catch (err) {
      router.replace('/login');
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Handle SuperAdmin company switch
  const handleSwitchCompany = async (companyId) => {
    try {
      const res = await fetch(`/api/admin/switch-company/${companyId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to switch company');

      const found = companies.find((c) => String(c.id) === String(companyId));
      setSelectedCompanyId(companyId);
      if (found) {
        setCurrentUser((prev) => ({
          ...prev,
          companyId: found.id,
          companyName: found.name,
        }));
      }

      showToast(`Switched view to ${found ? found.name : 'Company #' + companyId}`);
      // Refresh current page
      setCurrentPage((p) => p);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    router.replace('/login');
  };

  // Open confirm modal helper
  const openConfirm = (message, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      message,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        try {
          await onConfirm();
        } finally {
          setConfirmModal({ isOpen: false, message: '', onConfirm: null, loading: false });
        }
      },
      loading: false,
    });
  };

  // Open print modal helper
  const handleOpenPrint = (data, type = 'agreement') => {
    setPrintModal({
      isOpen: true,
      title: type === 'agreement' ? 'Rental Agreement Contract' : 'Payment Receipt',
      data,
      type,
    });
  };

  // Rent car shortcut from CarsView
  const handleRentCar = (car) => {
    setPreselectedCar(car);
    setCurrentPage('rentals');
  };

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', gap: '12px' }}>
        <div className="spinner"></div>
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Loading Car Rental System...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.isError ? 'error' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        currentUser={currentUser}
        companyName={currentUser?.companyName}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <Topbar
          currentPage={currentPage}
          currentUser={currentUser}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSwitchCompany={handleSwitchCompany}
          onToggleMobile={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <div className="page-container">
          {currentPage === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentPage}
              onOpenNewRental={() => setCurrentPage('rentals')}
            />
          )}

          {currentPage === 'cars' && (
            <CarsView
              currentUser={currentUser}
              onRentCar={handleRentCar}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {currentPage === 'customers' && (
            <CustomersView
              currentUser={currentUser}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {currentPage === 'rentals' && (
            <RentalsView
              currentUser={currentUser}
              preselectedCar={preselectedCar}
              onClearPreselectedCar={() => setPreselectedCar(null)}
              onOpenPrint={handleOpenPrint}
              showToast={showToast}
            />
          )}

          {currentPage === 'payments' && (
            <PaymentsView
              currentUser={currentUser}
              onOpenPrint={handleOpenPrint}
              showToast={showToast}
            />
          )}

          {currentPage === 'expenses' && (
            <ExpensesView
              currentUser={currentUser}
              showToast={showToast}
            />
          )}

          {currentPage === 'users' && (
            <UsersView
              currentUser={currentUser}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {currentPage === 'companies' && (
            <CompaniesView
              currentUser={currentUser}
              activeCompanyId={selectedCompanyId}
              onSwitchCompany={handleSwitchCompany}
              showToast={showToast}
            />
          )}
        </div>
      </main>

      {/* Shared Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        message={confirmModal.message}
        loading={confirmModal.loading}
      />

      <PrintModal
        isOpen={printModal.isOpen}
        onClose={() => setPrintModal({ ...printModal, isOpen: false })}
        title={printModal.title}
        data={printModal.data}
        type={printModal.type}
        companyName={currentUser?.companyName}
      />
    </div>
  );
}
