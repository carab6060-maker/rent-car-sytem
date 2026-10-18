'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Calendar,
  Printer,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
  Wallet,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { AccountingSummary, LedgerTransaction, User } from '@/types';

interface AccountingViewProps {
  currentUser: User | null;
  companyName?: string;
  showToast: (msg: string, isError?: boolean) => void;
}

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export default function AccountingView({
  currentUser,
  companyName,
  showToast,
}: AccountingViewProps) {
  const [data, setData] = useState<AccountingSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    accountsReceivable: 0,
    revenueByMethod: {},
    expensesByCategory: {},
    transactions: [],
  });

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Ledger Filter & Search
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Print Preview Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Calculate Date Ranges
  const getDateRange = (filter: PeriodFilter) => {
    const now = new Date();
    const toDateStr = now.toISOString().split('T')[0];

    if (filter === 'all') return { from: '', to: '' };
    if (filter === 'today') return { from: toDateStr, to: toDateStr };
    if (filter === 'week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return { from: monday.toISOString().split('T')[0], to: toDateStr };
    }
    if (filter === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: firstDay.toISOString().split('T')[0], to: toDateStr };
    }
    if (filter === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      return { from: firstDay.toISOString().split('T')[0], to: toDateStr };
    }
    if (filter === 'custom') {
      return { from: customFrom, to: customTo };
    }
    return { from: '', to: '' };
  };

  const fetchAccounting = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(period);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch(`/api/accounting?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load accounting data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      showToast(err.message || 'Error fetching data', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom' || (customFrom && customTo)) {
      fetchAccounting();
    }
  }, [period, customFrom, customTo]);

  // Filtered transactions for the ledger
  const filteredTransactions = useMemo(() => {
    return (data.transactions || []).filter((tx) => {
      const matchesType = ledgerTypeFilter === 'all' || tx.type === ledgerTypeFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        tx.title?.toLowerCase().includes(q) ||
        tx.category?.toLowerCase().includes(q) ||
        tx.payment_method?.toLowerCase().includes(q) ||
        tx.reference_no?.toLowerCase().includes(q) ||
        tx.customer_name?.toLowerCase().includes(q) ||
        tx.car_name?.toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [data.transactions, ledgerTypeFilter, searchQuery]);

  const activeCompanyName = companyName || currentUser?.companyName || 'Car Rental SaaS';

  return (
    <div className="accounting-content" style={{ paddingBottom: '40px' }}>
      {/* Top Header & Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: '#ecfdf5',
              color: '#059669',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            <Wallet size={14} />
            <span>Accounting & Financial Statements</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Xisaabaadka & Warbixinnada Maaliyadda
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Bayaanka dakhliga (P&L), kharashaadka, faa'iidada saafiga ah iyo diiwaanka xisaabta guud
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Period Filter Buttons */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            {(
              [
                { id: 'all', label: 'Dhammaan' },
                { id: 'today', label: 'Maanta' },
                { id: 'week', label: 'Todobaadkan' },
                { id: 'month', label: 'Bishan' },
                { id: 'year', label: 'Sannadkan' },
                { id: 'custom', label: 'Taariikh Gaar ah' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                style={{
                  border: 'none',
                  background: period === item.id ? '#ffffff' : 'transparent',
                  color: period === item.id ? '#0f172a' : '#64748b',
                  fontWeight: period === item.id ? 700 : 500,
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  boxShadow: period === item.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-outline"
            onClick={fetchAccounting}
            disabled={loading}
            title="Refresh"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Cusboonaysii</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsPrintModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={16} />
            <span>Daabac Xisaab-xirka</span>
          </button>
        </div>
      </div>

      {/* Custom Date Pickers (if chosen) */}
      {period === 'custom' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            background: '#ffffff',
            padding: '12px 18px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          <Calendar size={18} color="#64748b" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Laga bilaabo:</span>
          <input
            type="date"
            className="form-control"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            style={{ width: 'auto' }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Ilaa:</span>
          <input
            type="date"
            className="form-control"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>
      )}

      {/* KPI Cards (4 Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Total Revenue */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                Dakhliga Guud (Revenue)
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                ${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={22} color="#059669" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
            <ArrowUpRight size={14} />
            <span>Lacagaha kirada ee la qabtay</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                Kharashaadka Guud (Expenses)
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e11d48', marginTop: '4px' }}>
                ${data.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#fff1f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={22} color="#e11d48" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#e11d48', fontWeight: 600 }}>
            <ArrowDownRight size={14} />
            <span>Dayactir, Shidaal, Mushahar, iwm</span>
          </div>
        </div>

        {/* Net Profit */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                Faa'iidada Saafiga ah (Net Profit)
              </span>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  color: data.netProfit >= 0 ? '#2563eb' : '#dc2626',
                  marginTop: '4px',
                }}
              >
                ${data.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: data.netProfit >= 0 ? '#eff6ff' : '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {data.netProfit >= 0 ? (
                <TrendingUp size={22} color="#2563eb" />
              ) : (
                <TrendingDown size={22} color="#dc2626" />
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                background: data.netProfit >= 0 ? '#dbeafe' : '#fee2e2',
                color: data.netProfit >= 0 ? '#1d4ed8' : '#b91c1c',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {data.profitMargin}% Margin
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Faa'iido / Khasaare</span>
          </div>
        </div>

        {/* Accounts Receivable */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                Daymaha Maqan (Receivables)
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                ${data.accountsReceivable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={22} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>
            Lacagta macaamiisha laga sugayo
          </div>
        </div>
      </div>

      {/* Analytics: 2 Columns (Revenue by Method vs Expenses by Category) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* Revenue by Method */}
        <div
          style={{
            background: '#ffffff',
            padding: '22px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="#059669" />
              Dakhliga Qaabka Lacag-bixinta
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Wadarta: ${data.totalRevenue.toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.keys(data.revenueByMethod || {}).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
                Wax dakhli ah lagama helin xilligan la doortay
              </div>
            ) : (
              Object.entries(data.revenueByMethod).map(([method, amount]) => {
                const pct = data.totalRevenue > 0 ? (amount / data.totalRevenue) * 100 : 0;
                return (
                  <div key={method}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{method}</span>
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        ${amount.toFixed(2)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: '#10b981',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expenses by Category */}
        <div
          style={{
            background: '#ffffff',
            padding: '22px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} color="#e11d48" />
              Kharashaadka Qaybaha (Expense Breakdown)
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Wadarta: ${data.totalExpenses.toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.keys(data.expensesByCategory || {}).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
                Wax kharash ah lama qorin xilligan la doortay
              </div>
            ) : (
              Object.entries(data.expensesByCategory).map(([cat, amount]) => {
                const pct = data.totalExpenses > 0 ? (amount / data.totalExpenses) * 100 : 0;
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{cat}</span>
                      <span style={{ fontWeight: 700, color: '#e11d48' }}>
                        ${amount.toFixed(2)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: '#f43f5e',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* General Ledger Table (Diiwaanka Guud ee Xisaabaadka) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Table Header Controls */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={18} color="#2563eb" />
              Diiwaanka Guud ee Xisaabaadka (General Ledger)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Dhaqdhaqaaqa lacageed ee dakhli (+) iyo kharash (-) oo isku xiga
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Type Filter Pills */}
            <div
              style={{
                display: 'flex',
                background: '#f8fafc',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              {(
                [
                  { id: 'all', label: 'Dhammaan' },
                  { id: 'income', label: 'Dakhli (+)' },
                  { id: 'expense', label: 'Kharash (-)' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLedgerTypeFilter(f.id)}
                  style={{
                    border: 'none',
                    background: ledgerTypeFilter === f.id ? '#ffffff' : 'transparent',
                    color: ledgerTypeFilter === f.id ? '#0f172a' : '#64748b',
                    fontWeight: ledgerTypeFilter === f.id ? 700 : 500,
                    fontSize: '0.78rem',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: ledgerTypeFilter === f.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                placeholder="Raadi xisaab..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Taariikh</th>
                <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Nooca</th>
                <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Faahfaahinta / Cinwaanka</th>
                <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Qeybta</th>
                <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Qaabka & Ref</th>
                <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Qoraha</th>
                <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Qadarka ($)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    Wax diiwaan xisaabeed ah lagama helin xilligan
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <tr
                      key={`${tx.type}-${tx.id}-${idx}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 18px', color: '#334155', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {tx.date}
                      </td>

                      <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isIncome ? '#ecfdf5' : '#fff1f2',
                            color: isIncome ? '#059669' : '#e11d48',
                          }}
                        >
                          {isIncome ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {isIncome ? 'Dakhli' : 'Kharash'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 18px', color: '#0f172a', fontWeight: 600 }}>
                        <div>{tx.title}</div>
                        {(tx.customer_name || tx.car_name) && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {tx.customer_name && `Macaamil: ${tx.customer_name}`}
                            {tx.car_name && ` • Gaari: ${tx.car_name}`}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 18px', color: '#475569' }}>
                        <span
                          style={{
                            background: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                          }}
                        >
                          {tx.category}
                        </span>
                      </td>

                      <td style={{ padding: '12px 18px', color: '#475569', fontSize: '0.8rem' }}>
                        <div>{tx.payment_method}</div>
                        {tx.reference_no && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                            Ref: {tx.reference_no}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '0.8rem' }}>
                        {tx.recorded_by || 'Staff'}
                      </td>

                      <td
                        style={{
                          padding: '12px 18px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: isIncome ? '#059669' : '#e11d48',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isIncome ? `+$${tx.amount.toFixed(2)}` : `-$${tx.amount.toFixed(2)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Statement Modal */}
      {isPrintModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #cbd5e1',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Bayaanka Xisaab-xirka (Financial Statement)
              </h3>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Printable Content */}
            <div id="printable-statement" style={{ padding: '32px' }}>
              {/* Document Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                  {activeCompanyName}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                  Car Rental Management System • Financial Report
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    padding: '4px 12px',
                    background: '#f1f5f9',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#1e293b',
                  }}
                >
                  Xilliga: {period.toUpperCase()} ({new Date().toLocaleDateString()})
                </div>
              </div>

              {/* P&L Statement Grid */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  1. Dakhliga & Kharashka (Income & Expenditure)
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', color: '#334155', fontWeight: 600 }}>Dakhliga Kirada (Rental Income)</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        ${data.totalRevenue.toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', color: '#334155', fontWeight: 600 }}>Kharashaadka Howlgalka (Operating Expenses)</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#e11d48' }}>
                        -${data.totalExpenses.toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #0f172a', background: '#f8fafc' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                        Faa'iidada Saafiga ah (Net Profit)
                      </td>
                      <td
                        style={{
                          padding: '10px 8px',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          color: data.netProfit >= 0 ? '#2563eb' : '#dc2626',
                        }}
                      >
                        ${data.netProfit.toFixed(2)} ({data.profitMargin}%)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Receivables Summary */}
              <div style={{ marginBottom: '24px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309' }}>
                    Daymaha Macaamiisha ku Maqan (Uncollected Receivables):
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>
                    ${data.accountsReceivable.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px', paddingTop: '16px' }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                    Diyaariyey (Prepared By):<br />
                    <strong>{currentUser?.fullName || 'User'}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                    Ansixiyey (Authorized By):<br />
                    <strong>Manager / Director</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                background: '#f8fafc',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsPrintModalOpen(false)}
              >
                Xir (Close)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Daabac Hadda (Print / Save PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
