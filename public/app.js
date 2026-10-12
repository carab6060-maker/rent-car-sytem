/* =====================================================
   Car Rental Management System — Frontend Logic
   =====================================================
   All data operations go through the Express API,
   which connects to the Neon PostgreSQL database.
   No data is stored in localStorage.
   ===================================================== */

// =====================================================
// AUTH GUARD — redirect to login if not authenticated
// =====================================================
let currentUser = null; // { id, email, fullName, role }

async function initAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      window.location.replace('/login.html');
      return;
    }
    currentUser = await res.json();
    applyUserUI();
    navigateTo('dashboard');
  } catch (err) {
    window.location.replace('/login.html');
  }
}

function applyUserUI() {
  if (!currentUser) return;

  // Sidebar user info
  const nameEl   = document.getElementById('sidebarUserName');
  const roleEl   = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('sidebarAvatar');

  if (nameEl)   nameEl.textContent   = currentUser.fullName;
  if (roleEl)   roleEl.textContent   = currentUser.role;
  if (avatarEl) avatarEl.textContent = currentUser.fullName.charAt(0);

  // Topbar
  const topbarName = document.getElementById('topbarUserName');
  const topbarBadge = document.getElementById('topbarRoleBadge');
  if (topbarName)  topbarName.textContent  = currentUser.fullName;
  if (topbarBadge) {
    topbarBadge.textContent = currentUser.role;
    topbarBadge.className   = 'topbar-role-badge ' + currentUser.role;
  }

  // Show "Users" nav item for managers only
  if (currentUser.role === 'manager') {
    document.querySelectorAll('.nav-item-manager').forEach(el => el.style.display = '');
  }
}

// =====================================================
// LOGOUT
// =====================================================
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (_) {}
  window.location.replace('/login.html');
});

// =====================================================
// API CLIENT — all database calls go through here
// Handles 401 → redirect to login automatically
// =====================================================
const API = {
  async _handleResponse(res) {
    if (res.status === 401) {
      window.location.replace('/login.html');
      throw new Error('Session expired. Redirecting to login…');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  async get(url) {
    const res = await fetch(url);
    return this._handleResponse(res);
  },

  async post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return this._handleResponse(res);
  },

  async put(url, body = {}) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return this._handleResponse(res);
  },

  async delete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    return this._handleResponse(res);
  },
};

// =====================================================
// SVG ICONS
// =====================================================
const Icons = {
  edit:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  plus:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  empty:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
  undo:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  user:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  clear:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  grid:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  list:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  plate:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>`,
  car:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  dollar:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  wallet:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>`,
  receipt:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>`,
  trendUp:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  trendDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  download:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  printer:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
};

// =====================================================
// DOM REFERENCES
// =====================================================
const $ = (sel) => document.querySelector(sel);
const pageContainer  = $('#pageContainer');
const pageTitle      = $('#pageTitle');
const modalOverlay   = $('#modalOverlay');
const modalTitle     = $('#modalTitle');
const modalBody      = $('#modalBody');
const modalClose     = $('#modalClose');
const confirmOverlay = $('#confirmOverlay');
const confirmMessage = $('#confirmMessage');
const confirmOk      = $('#confirmOk');
const confirmCancel  = $('#confirmCancel');
const confirmClose   = $('#confirmClose');
const sidebar        = $('#sidebar');
const menuToggle     = $('#menuToggle');

// =====================================================
// NAVIGATION
// =====================================================
let currentPage = 'dashboard';

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeNav) activeNav.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    cars:      'Cars',
    customers: 'Customers',
    rentals:   'Rentals',
    payments:  'Payments',
    users:     'User Management',
  };
  pageTitle.textContent = titles[page] || page;

  sidebar.classList.remove('open');
  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard':  renderDashboard(); break;
    case 'cars':       renderCars();      break;
    case 'customers':  renderCustomers(); break;
    case 'rentals':    renderRentals();   break;
    case 'payments':   renderPayments();  break;
    case 'users':      renderUsers();     break;
  }
}

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// =====================================================
// MODAL HELPERS
// =====================================================
function openModal(title, bodyHTML) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalOverlay.classList.add('open');
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// =====================================================
// CONFIRM DIALOG
// =====================================================
let confirmCallback = null;

function openConfirm(message, callback) {
  confirmMessage.textContent = message;
  confirmCallback = callback;
  confirmOverlay.classList.add('open');
}

function closeConfirm() {
  confirmOverlay.classList.remove('open');
  confirmCallback = null;
}

confirmOk.addEventListener('click', () => {
  if (confirmCallback) confirmCallback();
  closeConfirm();
});
confirmCancel.addEventListener('click', closeConfirm);
confirmClose.addEventListener('click', closeConfirm);
confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) closeConfirm();
});

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================
function showToast(message, isError = false) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => { toast.remove(); }, 3000);
}

// =====================================================
// HELPER
// =====================================================
function emptyStateHTML(text) {
  return `<div class="empty-state">${Icons.empty}<p>${text}</p></div>`;
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Helper: check if current user is manager
function isManager() {
  return currentUser && currentUser.role === 'manager';
}

// =====================================================
// 1. DASHBOARD & ANALYTICS CHARTS
// =====================================================
let fleetChartInstance = null;
let rentalsTrendChartInstance = null;

function formatDashDate(str) {
  if (!str) return '-';
  return String(str).split('T')[0];
}

async function renderDashboard() {
  pageContainer.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;color:#64748b;padding:40px 0;">
      <div class="spinner"></div>
      <p>Loading fleet metrics & live charts...</p>
    </div>
  `;

  try {
    const data = await API.get('/api/dashboard');

    const totalCars = data.totalCars || 0;
    const availableCars = data.availableCars || 0;
    const rentedCars = data.rentedCars || 0;
    const totalCustomers = data.totalCustomers || 0;
    const totalRevenue = typeof data.totalRevenue === 'number' ? data.totalRevenue : parseFloat(data.totalRevenue || 0);
    const utilizationRate = totalCars > 0 ? Math.round((rentedCars / totalCars) * 100) : 0;
    const recentRentals = Array.isArray(data.recentRentals) ? data.recentRentals : [];

    pageContainer.innerHTML = `
      <div class="dashboard-section-header" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h3 style="font-size:1.2rem;font-weight:700;color:var(--color-navy)">Fleet & Operations Overview</h3>
          <p style="font-size:0.83rem;color:var(--color-text-secondary);margin-top:2px;">Live database summary of vehicles, bookings, and customer activity</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="renderDashboard()" style="display:flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Refresh
        </button>
      </div>

      <!-- Top Stat Cards -->
      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-label">Total Vehicles</span>
          <span class="stat-value">${totalCars}</span>
        </div>
        <div class="stat-card success">
          <span class="stat-label">Available Cars</span>
          <span class="stat-value">${availableCars}</span>
        </div>
        <div class="stat-card warning">
          <span class="stat-label">Rented Cars</span>
          <span class="stat-value">${rentedCars}</span>
        </div>
        <div class="stat-card info">
          <span class="stat-label">Total Customers</span>
          <span class="stat-value">${totalCustomers}</span>
        </div>
      </div>

      <!-- Live Analytics Charts -->
      <div class="dashboard-charts-grid">
        <!-- Fleet Status Donut Chart -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <h4 class="dashboard-card-title">Fleet Availability</h4>
              <p class="dashboard-card-subtitle">Real-time vehicle status distribution</p>
            </div>
            <span class="badge badge-available">${availableCars} Available</span>
          </div>
          <div class="chart-canvas-container">
            <canvas id="fleetStatusChart"></canvas>
          </div>
          <div class="chart-legend-row" id="fleetLegendRow"></div>
        </div>

        <!-- Rental Booking Trends Chart -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <h4 class="dashboard-card-title">Rental Booking Activity</h4>
              <p class="dashboard-card-subtitle">Monthly rental volume and collected revenue</p>
            </div>
            <span class="badge badge-returned">${recentRentals.length} Recent Contracts</span>
          </div>
          <div class="chart-canvas-container">
            <canvas id="rentalsTrendChart"></canvas>
          </div>
          <div class="chart-legend-row">
            <div class="chart-legend-item">
              <span class="chart-legend-dot" style="background:#358dd5"></span>
              <span>Rentals Count</span>
            </div>
            <div class="chart-legend-item">
              <span class="chart-legend-dot" style="background:#20225d"></span>
              <span>Revenue ($)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Operations & Recent Rentals Grid -->
      <div class="dashboard-bottom-grid">
        <!-- Recent Rentals Table -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <h4 class="dashboard-card-title">Recent Rental Agreements</h4>
              <p class="dashboard-card-subtitle">Latest active & completed contracts</p>
            </div>
            <a href="#" class="dashboard-view-all-link" onclick="navigateTo('rentals');return false;">View All &rarr;</a>
          </div>
          <div class="dashboard-table-wrapper">
            ${recentRentals.length === 0 ? `
              <p style="color:var(--color-text-secondary);padding:20px 0;font-size:0.88rem;text-align:center;">No rental records found yet.</p>
            ` : `
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Car</th>
                    <th>Rental Period</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentRentals.map(r => {
                    const statusClass = (r.status || '').toLowerCase() === 'rented' ? 'badge-rented' : 'badge-returned';
                    const customerInitial = (r.customer_name || 'C').charAt(0).toUpperCase();
                    return `
                      <tr>
                        <td>
                          <div class="dashboard-cust-cell">
                            <span class="dashboard-cust-avatar">${esc(customerInitial)}</span>
                            <div>
                              <div style="font-weight:600;color:var(--color-navy)">${esc(r.customer_name || 'Unknown')}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style="font-weight:500;">${esc(r.car_name || 'Car')}</span>
                          ${r.car_model ? `<span style="font-size:0.75rem;color:var(--color-text-secondary);display:block;">${esc(r.car_model)}</span>` : ''}
                        </td>
                        <td style="font-size:0.82rem;color:var(--color-text-secondary);">
                          ${formatDashDate(r.start_date)} &rarr; ${formatDashDate(r.return_date)}
                        </td>
                        <td style="font-weight:700;color:var(--color-navy);">
                          $${parseFloat(r.total_price || 0).toFixed(2)}
                        </td>
                        <td>
                          <span class="badge ${statusClass}">${esc(r.status || 'Active')}</span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- Operations Summary KPI Card -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <h4 class="dashboard-card-title">Fleet KPI Highlights</h4>
              <p class="dashboard-card-subtitle">Key performance indicators</p>
            </div>
          </div>
          <div class="dashboard-kpi-list">
            <div class="dashboard-kpi-item">
              <div class="dashboard-kpi-top">
                <span class="dashboard-kpi-title">Fleet Utilization</span>
                <span class="dashboard-kpi-val">${utilizationRate}%</span>
              </div>
              <div class="dashboard-progress-track">
                <div class="dashboard-progress-fill" style="width: ${utilizationRate}%;"></div>
              </div>
              <span style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:2px;">${rentedCars} of ${totalCars} cars currently rented</span>
            </div>

            <div class="dashboard-kpi-item">
              <div class="dashboard-kpi-top">
                <span class="dashboard-kpi-title">Total Revenue Collected</span>
                <span class="dashboard-kpi-val" style="color:var(--color-success);">$${totalRevenue.toFixed(2)}</span>
              </div>
              <span style="font-size:0.75rem;color:var(--color-text-secondary);">Paid payments verified in Neon database</span>
            </div>

            <div class="dashboard-kpi-item">
              <div class="dashboard-kpi-top">
                <span class="dashboard-kpi-title">Active Fleet Status</span>
                <span class="dashboard-kpi-val" style="font-size:0.95rem;color:var(--color-primary);">${availableCars} Ready to Rent</span>
              </div>
              <span style="font-size:0.75rem;color:var(--color-text-secondary);">${rentedCars} currently out with customers</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render Chart.js charts
    initDashboardCharts(data);

  } catch (err) {
    pageContainer.innerHTML = `
      <div class="empty-state">
        <p style="color:var(--color-danger)">Failed to load dashboard: ${esc(err.message)}</p>
        <button class="btn btn-secondary" onclick="renderDashboard()" style="margin-top:12px">Try Again</button>
      </div>
    `;
  }
}

function initDashboardCharts(data) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet');
    return;
  }

  // Destroy previous instances if any
  if (fleetChartInstance) {
    fleetChartInstance.destroy();
    fleetChartInstance = null;
  }
  if (rentalsTrendChartInstance) {
    rentalsTrendChartInstance.destroy();
    rentalsTrendChartInstance = null;
  }

  const available = data.availableCars || 0;
  const rented = data.rentedCars || 0;
  const total = data.totalCars || (available + rented);
  const maint = Math.max(0, total - (available + rented));

  // 1. Fleet Availability Donut Chart
  const fleetCtx = document.getElementById('fleetStatusChart');
  if (fleetCtx) {
    const labels = ['Available', 'Rented'];
    const chartData = [available, rented];
    const colors = ['#059669', '#d97706'];

    if (maint > 0) {
      labels.push('Maintenance');
      chartData.push(maint);
      colors.push('#64748b');
    }

    fleetChartInstance = new Chart(fleetCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: chartData,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#20225d',
            titleFont: { family: 'Inter', size: 13, weight: '600' },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(ctx) {
                const val = ctx.raw || 0;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    const legendRow = document.getElementById('fleetLegendRow');
    if (legendRow) {
      const availPct = total > 0 ? Math.round((available / total) * 100) : 0;
      const rentPct = total > 0 ? Math.round((rented / total) * 100) : 0;
      legendRow.innerHTML = `
        <div class="chart-legend-item">
          <span class="chart-legend-dot" style="background:#059669"></span>
          <span>Available: <strong>${available}</strong> (${availPct}%)</span>
        </div>
        <div class="chart-legend-item">
          <span class="chart-legend-dot" style="background:#d97706"></span>
          <span>Rented: <strong>${rented}</strong> (${rentPct}%)</span>
        </div>
        ${maint > 0 ? `
          <div class="chart-legend-item">
            <span class="chart-legend-dot" style="background:#64748b"></span>
            <span>Maintenance: <strong>${maint}</strong></span>
          </div>
        ` : ''}
      `;
    }
  }

  // 2. Rental Trends Bar Chart
  const trendCtx = document.getElementById('rentalsTrendChart');
  if (trendCtx) {
    const monthData = (data.rentalsByMonth && data.rentalsByMonth.length)
      ? data.rentalsByMonth
      : [{ month_label: 'Current', rental_count: (data.recentRentals ? data.recentRentals.length : 0), total_amount: data.totalRevenue || 0 }];

    const monthLabels = monthData.map(m => m.month_label);
    const rentalCounts = monthData.map(m => m.rental_count);
    const revenueAmounts = monthData.map(m => parseFloat(m.total_amount || 0));

    rentalsTrendChartInstance = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Rentals Booked',
            data: rentalCounts,
            backgroundColor: '#358dd5',
            borderRadius: 6,
            barThickness: 26,
            yAxisID: 'y'
          },
          {
            label: 'Total Revenue ($)',
            data: revenueAmounts,
            backgroundColor: '#20225d',
            borderRadius: 6,
            barThickness: 26,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#20225d',
            titleFont: { family: 'Inter', size: 13, weight: '600' },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { family: 'Inter', size: 11 },
              color: '#64748b'
            },
            grid: { color: 'rgba(226, 232, 240, 0.6)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            ticks: {
              callback: val => '$' + val,
              font: { family: 'Inter', size: 11 },
              color: '#64748b'
            },
            grid: { display: false }
          }
        }
      }
    });
  }
}

// =====================================================
// 2. CARS FLEET MANAGEMENT
// =====================================================
let carsData = [];
let carSearchQuery = '';
let carStatusFilter = 'all'; // 'all' | 'available' | 'rented'
let carViewMode = localStorage.getItem('carViewMode') || 'grid'; // 'grid' | 'table'

function getCarImageUrl(car) {
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

async function renderCars() {
  pageContainer.innerHTML = `
    <div class="cars-loading-state">
      <div class="spinner"></div>
      <p>Loading fleet records from database...</p>
    </div>
  `;

  try {
    carsData = await API.get('/api/cars');
    drawCarsPage();
  } catch (err) {
    pageContainer.innerHTML = `
      <div class="empty-state">
        <p style="color:var(--color-danger)">Failed to load cars: ${esc(err.message)}</p>
        <button class="btn btn-secondary" onclick="renderCars()" style="margin-top:12px">Try Again</button>
      </div>
    `;
  }
}

function drawCarsPage() {
  const isMgr = isManager();

  pageContainer.innerHTML = `
    <div class="cars-view-wrapper">
      <!-- Header row with Fleet title & Add button -->
      <div class="cars-page-header">
        <div class="cars-header-title">
          <h2>Vehicle Fleet</h2>
          <span class="cars-header-badge" id="carsHeaderCount">${carsData.length} total cars</span>
        </div>
        ${isMgr ? `
          <button class="btn btn-primary" onclick="openCarForm()">
            ${Icons.plus}
            <span>Add Vehicle</span>
          </button>
        ` : ''}
      </div>

      <!-- Toolbar: Search box, Status filter pills, View mode toggle -->
      <div class="cars-toolbar">
        <div class="cars-search-box">
          <span class="cars-search-icon">${Icons.search}</span>
          <input 
            type="text" 
            id="carSearchInput" 
            class="cars-search-input" 
            placeholder="Search by car name, model, plate number..." 
            value="${esc(carSearchQuery)}"
            autocomplete="off"
          />
          <button 
            id="carSearchClear" 
            class="cars-search-clear ${carSearchQuery ? 'visible' : ''}" 
            onclick="clearCarSearch()" 
            title="Clear search"
            type="button"
          >
            ${Icons.clear}
          </button>
        </div>

        <div class="cars-filters-row">
          <div class="cars-status-pills" id="carsStatusPills">
            <!-- Filter pills injected here -->
          </div>

          <div class="cars-view-toggle">
            <button 
              type="button"
              class="btn-view-mode ${carViewMode === 'grid' ? 'active' : ''}" 
              onclick="setCarViewMode('grid')" 
              title="Grid View"
              aria-label="Grid View"
            >
              ${Icons.grid}
            </button>
            <button 
              type="button"
              class="btn-view-mode ${carViewMode === 'table' ? 'active' : ''}" 
              onclick="setCarViewMode('table')" 
              title="Table View"
              aria-label="Table View"
            >
              ${Icons.list}
            </button>
          </div>
        </div>
      </div>

      <!-- Cars content container -->
      <div id="carsContentArea" class="cars-content-area">
        <!-- Rendered by updateCarsView() -->
      </div>
    </div>
  `;

  // Search input live event listener
  const searchInput = document.getElementById('carSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      carSearchQuery = e.target.value;
      const clearBtn = document.getElementById('carSearchClear');
      if (clearBtn) {
        if (carSearchQuery.trim()) clearBtn.classList.add('visible');
        else clearBtn.classList.remove('visible');
      }
      updateCarsView();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearCarSearch();
      }
    });
  }

  renderFilterPills();
  updateCarsView();
}

function renderFilterPills() {
  const container = document.getElementById('carsStatusPills');
  if (!container) return;

  const total = carsData.length;
  const available = carsData.filter(c => c.status === 'Available').length;
  const rented = carsData.filter(c => c.status === 'Rented').length;

  container.innerHTML = `
    <button 
      type="button" 
      class="filter-pill ${carStatusFilter === 'all' ? 'active' : ''}" 
      onclick="setCarStatusFilter('all')"
    >
      <span>All</span>
      <span class="pill-count">${total}</span>
    </button>
    <button 
      type="button" 
      class="filter-pill pill-available ${carStatusFilter === 'available' ? 'active' : ''}" 
      onclick="setCarStatusFilter('available')"
    >
      <span class="status-dot green"></span>
      <span>Available</span>
      <span class="pill-count">${available}</span>
    </button>
    <button 
      type="button" 
      class="filter-pill pill-rented ${carStatusFilter === 'rented' ? 'active' : ''}" 
      onclick="setCarStatusFilter('rented')"
    >
      <span class="status-dot amber"></span>
      <span>Rented</span>
      <span class="pill-count">${rented}</span>
    </button>
  `;
}

function getFilteredCars() {
  const q = carSearchQuery.trim().toLowerCase();
  return carsData.filter(car => {
    // Status filter
    if (carStatusFilter === 'available' && car.status !== 'Available') return false;
    if (carStatusFilter === 'rented' && car.status !== 'Rented') return false;

    // Search query
    if (q) {
      const matchName = (car.name || '').toLowerCase().includes(q);
      const matchModel = (car.model || '').toLowerCase().includes(q);
      const matchPlate = (car.plate || '').toLowerCase().includes(q);
      return matchName || matchModel || matchPlate;
    }
    return true;
  });
}

function updateCarsView() {
  const contentArea = document.getElementById('carsContentArea');
  if (!contentArea) return;

  const filtered = getFilteredCars();
  const isMgr = isManager();

  // If no cars exist at all in database
  if (carsData.length === 0) {
    contentArea.innerHTML = `
      <div class="empty-state">
        ${Icons.empty}
        <p>No vehicles in your fleet yet.</p>
        ${isMgr ? `<button class="btn btn-primary" onclick="openCarForm()" style="margin-top:14px">${Icons.plus} Add First Car</button>` : ''}
      </div>
    `;
    return;
  }

  // If search/filter returns no results
  if (filtered.length === 0) {
    contentArea.innerHTML = `
      <div class="empty-state">
        ${Icons.empty}
        <p>No cars found matching your current filter.</p>
        <button class="btn btn-secondary btn-sm" onclick="clearCarSearch(true)" style="margin-top:12px">
          Reset Filters
        </button>
      </div>
    `;
    return;
  }

  if (carViewMode === 'grid') {
    // Render Grid Cards
    let cardsHTML = '';
    filtered.forEach(car => {
      const isAvail = car.status === 'Available';
      const statusClass = isAvail ? 'status-available' : 'status-rented';
      const imgSrc = getCarImageUrl(car);

      cardsHTML += `
        <article class="car-card" data-id="${car.id}">
          <div class="car-card-media">
            <img 
              src="${esc(imgSrc)}" 
              alt="${esc(car.name)}" 
              class="car-card-img" 
              loading="lazy" 
              onerror="this.src='/images/cars/default-car.jpg'"
            />
            <span class="car-card-status ${statusClass}">
              <span class="status-indicator-dot"></span>
              ${car.status}
            </span>
          </div>

          <div class="car-card-content">
            <div class="car-card-header">
              <h3 class="car-name" title="${esc(car.name)}">${esc(car.name)}</h3>
              <span class="car-model-tag">${esc(car.model)}</span>
            </div>

            <div class="car-card-specs">
              <div class="car-plate-pill" title="Registration Plate">
                ${Icons.plate}
                <span>${esc(car.plate)}</span>
              </div>
            </div>

            <div class="car-card-footer">
              <div class="car-price-block">
                <span class="price-caption">Daily Rate</span>
                <div class="price-figure">
                  <span class="price-currency">$</span>
                  <span class="price-number">${Number(car.price_per_day).toFixed(2)}</span>
                  <span class="price-period">/ day</span>
                </div>
              </div>

              ${isMgr ? `
                <div class="car-action-buttons">
                  <button 
                    type="button"
                    class="btn-car-action edit" 
                    onclick="editCar(${car.id})" 
                    title="Edit vehicle"
                    aria-label="Edit vehicle"
                  >
                    ${Icons.edit}
                  </button>
                  <button 
                    type="button"
                    class="btn-car-action delete" 
                    onclick="deleteCar(${car.id})" 
                    title="Delete vehicle"
                    aria-label="Delete vehicle"
                  >
                    ${Icons.trash}
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        </article>
      `;
    });

    contentArea.innerHTML = `<div class="cars-grid">${cardsHTML}</div>`;
  } else {
    // Render Table View
    let rowsHTML = '';
    filtered.forEach(car => {
      const isAvail = car.status === 'Available';
      const statusClass = isAvail ? 'status-available' : 'status-rented';
      const imgSrc = getCarImageUrl(car);

      rowsHTML += `
        <tr>
          <td>
            <div class="table-car-item">
              <img 
                src="${esc(imgSrc)}" 
                alt="${esc(car.name)}" 
                class="table-car-thumb" 
                onerror="this.src='/images/cars/default-car.jpg'"
              />
              <div class="table-car-details">
                <span class="table-car-name">${esc(car.name)}</span>
              </div>
            </div>
          </td>
          <td><span class="table-model-tag">${esc(car.model)}</span></td>
          <td>
            <div class="car-plate-pill table-plate">
              ${Icons.plate}
              <span>${esc(car.plate)}</span>
            </div>
          </td>
          <td>
            <div class="table-price-cell">
              <strong>$${Number(car.price_per_day).toFixed(2)}</strong>
              <small>/ day</small>
            </div>
          </td>
          <td>
            <span class="car-card-status ${statusClass} inline">
              <span class="status-indicator-dot"></span>
              ${car.status}
            </span>
          </td>
          ${isMgr ? `
            <td>
              <div class="actions-cell">
                <button 
                  type="button"
                  class="btn-car-action edit" 
                  onclick="editCar(${car.id})" 
                  title="Edit"
                >
                  ${Icons.edit}
                </button>
                <button 
                  type="button"
                  class="btn-car-action delete" 
                  onclick="deleteCar(${car.id})" 
                  title="Delete"
                >
                  ${Icons.trash}
                </button>
              </div>
            </td>
          ` : ''}
        </tr>
      `;
    });

    contentArea.innerHTML = `
      <div class="table-wrapper">
        <table class="cars-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Model / Year</th>
              <th>License Plate</th>
              <th>Daily Rate</th>
              <th>Status</th>
              ${isMgr ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
    `;
  }
}

function setCarStatusFilter(filter) {
  carStatusFilter = filter;
  renderFilterPills();
  updateCarsView();
}

function setCarViewMode(mode) {
  carViewMode = mode;
  localStorage.setItem('carViewMode', mode);
  const btns = document.querySelectorAll('.btn-view-mode');
  btns.forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.btn-view-mode[onclick*="${mode}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  updateCarsView();
}

function clearCarSearch(resetAll = false) {
  carSearchQuery = '';
  if (resetAll) {
    carStatusFilter = 'all';
    renderFilterPills();
  }
  const input = document.getElementById('carSearchInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  const clearBtn = document.getElementById('carSearchClear');
  if (clearBtn) clearBtn.classList.remove('visible');
  updateCarsView();
}

function openCarForm(car = null) {
  const isEdit = car !== null;
  const initialImg = isEdit ? (car.image_url || getCarImageUrl(car)) : '/images/cars/default-car.jpg';

  const formHTML = `
    <form id="carForm" class="car-modal-form">
      <div class="form-preview-card">
        <div class="form-preview-img-wrapper">
          <img 
            id="carFormImgPreview" 
            src="${esc(initialImg)}" 
            alt="Vehicle preview" 
            onerror="this.src='/images/cars/default-car.jpg'"
          />
        </div>
        <div class="form-preview-meta">
          <span class="preview-title">Real-Time Vehicle Photo Preview</span>
          <span class="preview-subtitle">Auto-matches model (Mercedes, Surf, Prado) or uses custom URL below.</span>
        </div>
      </div>

      <div class="form-grid-2col">
        <div class="form-group">
          <label for="carName">Vehicle Name <span class="required">*</span></label>
          <input 
            type="text" 
            id="carName" 
            placeholder="e.g. Mercedes C-Class, Toyota Prado" 
            value="${isEdit ? esc(car.name) : ''}" 
            required 
          />
        </div>
        <div class="form-group">
          <label for="carModel">Model / Year <span class="required">*</span></label>
          <input 
            type="text" 
            id="carModel" 
            placeholder="e.g. 2024" 
            value="${isEdit ? esc(car.model) : ''}" 
            required 
          />
        </div>
      </div>

      <div class="form-grid-2col">
        <div class="form-group">
          <label for="carPlate">License Plate <span class="required">*</span></label>
          <input 
            type="text" 
            id="carPlate" 
            placeholder="e.g. MC-7777" 
            value="${isEdit ? esc(car.plate) : ''}" 
            required 
          />
        </div>
        <div class="form-group">
          <label for="carPrice">Daily Rental Price ($) <span class="required">*</span></label>
          <input 
            type="number" 
            id="carPrice" 
            placeholder="e.g. 100.00" 
            step="0.01" 
            min="0" 
            value="${isEdit ? car.price_per_day : ''}" 
            required 
          />
        </div>
      </div>

      <div class="form-group">
        <label for="carImageUrl">Custom Image URL <span class="optional-label">(optional)</span></label>
        <input 
          type="url" 
          id="carImageUrl" 
          placeholder="https://... (leave blank for automatic image)" 
          value="${isEdit && car.image_url ? esc(car.image_url) : ''}" 
        />
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Vehicle'}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? 'Edit Vehicle Details' : 'Add New Vehicle', formHTML);

  // Dynamic image preview
  const nameInput = $('#carName');
  const urlInput = $('#carImageUrl');
  const previewImg = $('#carFormImgPreview');

  function updatePreview() {
    if (!previewImg) return;
    const customUrl = urlInput ? urlInput.value.trim() : '';
    if (customUrl) {
      previewImg.src = customUrl;
    } else {
      const name = nameInput ? nameInput.value : '';
      previewImg.src = getCarImageUrl({ name, image_url: '' });
    }
  }

  if (nameInput) nameInput.addEventListener('input', updatePreview);
  if (urlInput) urlInput.addEventListener('input', updatePreview);

  $('#carForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: $('#carName').value.trim(),
      model: $('#carModel').value.trim(),
      plate: $('#carPlate').value.trim().toUpperCase(),
      price_per_day: parseFloat($('#carPrice').value),
      image_url: ($('#carImageUrl').value.trim()) || null,
    };

    try {
      if (isEdit) {
        await API.put(`/api/cars/${car.id}`, body);
        showToast('Vehicle updated successfully');
      } else {
        await API.post('/api/cars', body);
        showToast('Vehicle added to fleet');
      }
      closeModal();
      renderCars();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

window.editCar = async function(id) {
  try {
    let car = carsData.find(c => c.id === id);
    if (!car) {
      const all = await API.get('/api/cars');
      car = all.find(c => c.id === id);
    }
    if (car) openCarForm(car);
  } catch (err) {
    showToast(err.message, true);
  }
};

window.deleteCar = function(id) {
  const car = carsData.find(c => c.id === id);
  const name = car ? car.name : 'this vehicle';
  openConfirm(`Are you sure you want to delete ${name}? This cannot be undone.`, async () => {
    try {
      await API.delete(`/api/cars/${id}`);
      showToast('Vehicle deleted from fleet');
      renderCars();
    } catch (err) {
      showToast(err.message, true);
    }
  });
};

window.openCarForm = openCarForm;
window.setCarStatusFilter = setCarStatusFilter;
window.setCarViewMode = setCarViewMode;
window.clearCarSearch = clearCarSearch;

// =====================================================
// 3. CUSTOMERS
// =====================================================
async function renderCustomers() {
  pageContainer.innerHTML = '<p style="color:#999">Loading...</p>';
  try {
    const customers = await API.get('/api/customers');

    let tableRows = '';
    if (customers.length === 0) {
      tableRows = `<tr><td colspan="4">${emptyStateHTML('No customers added yet. Click "Add Customer" to get started.')}</td></tr>`;
    } else {
      customers.forEach(cust => {
        const actionButtons = isManager() ? `
          <button class="btn-icon" onclick="editCustomer(${cust.id})" title="Edit">${Icons.edit}</button>
          <button class="btn-icon danger" onclick="deleteCustomer(${cust.id})" title="Delete">${Icons.trash}</button>
        ` : `
          <button class="btn-icon" onclick="editCustomer(${cust.id})" title="Edit">${Icons.edit}</button>
        `;

        tableRows += `
          <tr>
            <td>${esc(cust.full_name)}</td>
            <td>${esc(cust.phone)}</td>
            <td>${esc(cust.license)}</td>
            <td>
              <div class="actions-cell">${actionButtons}</div>
            </td>
          </tr>`;
      });
    }

    pageContainer.innerHTML = `
      <div class="page-header">
        <h2>All Customers</h2>
        <button class="btn btn-primary" onclick="openCustomerForm()">${Icons.plus} Add Customer</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Full Name</th><th>Phone Number</th><th>Driving License</th><th>Actions</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    pageContainer.innerHTML = `<p style="color:red">Error: ${esc(err.message)}</p>`;
  }
}

function openCustomerForm(cust = null) {
  const isEdit = cust !== null;
  const formHTML = `
    <form id="custForm">
      <div class="form-group">
        <label for="custName">Full Name</label>
        <input type="text" id="custName" placeholder="e.g. John Smith" value="${isEdit ? esc(cust.full_name) : ''}" required />
      </div>
      <div class="form-group">
        <label for="custPhone">Phone Number</label>
        <input type="text" id="custPhone" placeholder="e.g. +1 555-0123" value="${isEdit ? esc(cust.phone) : ''}" required />
      </div>
      <div class="form-group">
        <label for="custLicense">Driving License Number</label>
        <input type="text" id="custLicense" placeholder="e.g. DL-12345678" value="${isEdit ? esc(cust.license) : ''}" required />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Customer</button>
      </div>
    </form>
  `;

  openModal(isEdit ? 'Edit Customer' : 'Add Customer', formHTML);

  $('#custForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      full_name: $('#custName').value.trim(),
      phone: $('#custPhone').value.trim(),
      license: $('#custLicense').value.trim(),
    };

    try {
      if (isEdit) {
        await API.put(`/api/customers/${cust.id}`, body);
        showToast('Customer updated successfully');
      } else {
        await API.post('/api/customers', body);
        showToast('Customer added successfully');
      }
      closeModal();
      renderCustomers();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

window.editCustomer = async function(id) {
  try {
    const customers = await API.get('/api/customers');
    const cust = customers.find(c => c.id === id);
    if (cust) openCustomerForm(cust);
  } catch (err) {
    showToast(err.message, true);
  }
};

window.deleteCustomer = function(id) {
  openConfirm('Are you sure you want to delete this customer?', async () => {
    try {
      await API.delete(`/api/customers/${id}`);
      showToast('Customer deleted');
      renderCustomers();
    } catch (err) {
      showToast(err.message, true);
    }
  });
};

// =====================================================
// 4. RENTALS
// =====================================================
async function renderRentals() {
  pageContainer.innerHTML = '<p style="color:#999">Loading...</p>';
  try {
    const rentals = await API.get('/api/rentals');

    let tableRows = '';
    if (rentals.length === 0) {
      tableRows = `<tr><td colspan="9">${emptyStateHTML('No rentals yet. Click "New Rental" to create one.')}</td></tr>`;
    } else {
      rentals.forEach(r => {
        const statusBadge = r.status === 'Rented' ? 'badge-rented' : 'badge-returned';
        const carLabel = r.car_name ? `${r.car_name} (${r.car_plate})` : 'Unknown';
        const custLabel = r.customer_name || 'Unknown';

        const returnBtn = r.status === 'Rented'
          ? `<button class="btn-icon" onclick="returnRental(${r.id})" title="Return Car">${Icons.undo}</button>`
          : '';
        const deleteBtn = isManager()
          ? `<button class="btn-icon danger" onclick="deleteRental(${r.id})" title="Delete">${Icons.trash}</button>`
          : '';

        tableRows += `
          <tr>
            <td>${esc(custLabel)}</td>
            <td>${esc(carLabel)}</td>
            <td>${r.start_date ? r.start_date.split('T')[0] : ''}</td>
            <td>${r.return_date ? r.return_date.split('T')[0] : ''}</td>
            <td>${r.total_days}</td>
            <td>$${Number(r.price_per_day).toFixed(2)}</td>
            <td>$${Number(r.total_price).toFixed(2)}</td>
            <td><span class="badge ${statusBadge}">${r.status}</span></td>
            <td>
              <div class="actions-cell">
                ${returnBtn}
                ${deleteBtn}
              </div>
            </td>
          </tr>`;
      });
    }

    pageContainer.innerHTML = `
      <div class="page-header">
        <h2>All Rentals</h2>
        <button class="btn btn-primary" onclick="openRentalForm()">${Icons.plus} New Rental</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Customer</th><th>Car</th><th>Start Date</th><th>Return Date</th><th>Days</th><th>Price/Day</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    pageContainer.innerHTML = `<p style="color:red">Error: ${esc(err.message)}</p>`;
  }
}

async function openRentalForm() {
  try {
    const [cars, customers] = await Promise.all([
      API.get('/api/cars/available'),
      API.get('/api/customers'),
    ]);

    if (customers.length === 0) {
      showToast('Please add a customer first.', true);
      return;
    }
    if (cars.length === 0) {
      showToast('No available cars to rent.', true);
      return;
    }

    const carOptions  = cars.map(c => `<option value="${c.id}" data-price="${c.price_per_day}">${esc(c.name)} — ${esc(c.plate)} ($${Number(c.price_per_day).toFixed(2)}/day)</option>`).join('');
    const custOptions = customers.map(c => `<option value="${c.id}">${esc(c.full_name)}</option>`).join('');
    const today = new Date().toISOString().split('T')[0];

    const formHTML = `
      <form id="rentalForm">
        <div class="form-group">
          <label for="rentalCustomer">Customer</label>
          <select id="rentalCustomer" required>${custOptions}</select>
        </div>
        <div class="form-group">
          <label for="rentalCar">Car</label>
          <select id="rentalCar" required>${carOptions}</select>
        </div>
        <div class="form-group">
          <label for="rentalStart">Start Date</label>
          <input type="date" id="rentalStart" value="${today}" required />
        </div>
        <div class="form-group">
          <label for="rentalReturn">Return Date</label>
          <input type="date" id="rentalReturn" required />
        </div>
        <div class="form-group">
          <label>Price Per Day</label>
          <input type="text" id="rentalPrice" class="read-only" readonly />
        </div>
        <div class="form-group">
          <label>Total Days</label>
          <input type="text" id="rentalDays" class="read-only" readonly />
        </div>
        <div class="form-group">
          <label>Total Price</label>
          <input type="text" id="rentalTotal" class="read-only" readonly />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Rental</button>
        </div>
      </form>
    `;

    openModal('New Rental', formHTML);

    function updateCalc() {
      const carSelect = $('#rentalCar');
      const selectedOption = carSelect.options[carSelect.selectedIndex];
      const price = parseFloat(selectedOption.dataset.price) || 0;
      const start = new Date($('#rentalStart').value);
      const end   = new Date($('#rentalReturn').value);

      $('#rentalPrice').value = '$' + price.toFixed(2);

      if ($('#rentalStart').value && $('#rentalReturn').value && end > start) {
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        $('#rentalDays').value  = days;
        $('#rentalTotal').value = '$' + (days * price).toFixed(2);
      } else {
        $('#rentalDays').value  = '';
        $('#rentalTotal').value = '';
      }
    }

    $('#rentalCar').addEventListener('change', updateCalc);
    $('#rentalStart').addEventListener('change', updateCalc);
    $('#rentalReturn').addEventListener('change', updateCalc);
    updateCalc();

    $('#rentalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        customer_id: parseInt($('#rentalCustomer').value),
        car_id:      parseInt($('#rentalCar').value),
        start_date:  $('#rentalStart').value,
        return_date: $('#rentalReturn').value,
      };

      try {
        await API.post('/api/rentals', body);
        showToast('Rental created successfully');
        closeModal();
        renderRentals();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  } catch (err) {
    showToast(err.message, true);
  }
}

window.returnRental = function(id) {
  openConfirm('Mark this rental as returned?', async () => {
    try {
      await API.put(`/api/rentals/${id}/return`);
      showToast('Car returned successfully');
      renderRentals();
    } catch (err) {
      showToast(err.message, true);
    }
  });
};

window.deleteRental = function(id) {
  openConfirm('Are you sure you want to delete this rental?', async () => {
    try {
      await API.delete(`/api/rentals/${id}`);
      showToast('Rental deleted');
      renderRentals();
    } catch (err) {
      showToast(err.message, true);
    }
  });
};

// =====================================================
// 5. PAYMENTS
// =====================================================
let paymentsData = [];
let paymentsSearchQuery = '';
let paymentsStatusFilter = 'all'; // 'all' | 'Paid' | 'Unpaid'
let paymentsMethodFilter = 'all'; // 'all' | 'Cash' | 'Bank Transfer' | 'Mobile Money'

async function renderPayments() {
  pageContainer.innerHTML = '<p style="color:#999">Loading...</p>';
  try {
    paymentsData = await API.get('/api/payments');
    renderPaymentsTable();
  } catch (err) {
    pageContainer.innerHTML = `<p style="color:red">Error: ${esc(err.message)}</p>`;
  }
}

function renderPaymentsTable() {
  const isMgr = isManager();

  // Filter payments
  const q = paymentsSearchQuery.trim().toLowerCase();
  const filtered = paymentsData.filter(p => {
    if (paymentsStatusFilter !== 'all' && p.status !== paymentsStatusFilter) {
      return false;
    }
    if (paymentsMethodFilter !== 'all' && (p.payment_method || 'Cash') !== paymentsMethodFilter) {
      return false;
    }
    if (q) {
      const cust = (p.customer_name || '').toLowerCase();
      const car = (p.car_name || '').toLowerCase();
      const plate = (p.car_plate || '').toLowerCase();
      const ref = (p.reference_no || '').toLowerCase();
      const id = String(p.id);
      return cust.includes(q) || car.includes(q) || plate.includes(q) || ref.includes(q) || id.includes(q);
    }
    return true;
  });

  let rowsHTML = '';
  if (filtered.length === 0) {
    rowsHTML = `<tr><td colspan="10">${emptyStateHTML('No payments found.')}</td></tr>`;
  } else {
    filtered.forEach(p => {
      const isPaid = p.status === 'Paid';
      const statusClass = isPaid ? 'badge-paid' : 'badge-unpaid';
      const method = p.payment_method || 'Cash';
      const carLabel = p.car_name ? `${p.car_name} (${p.car_plate || '—'})` : `Rental #${p.rental_id}`;
      const custName = p.customer_name || 'Customer';
      const custPhone = p.customer_phone ? `<small class="text-muted">${esc(p.customer_phone)}</small>` : '';
      const dateStr = p.payment_date ? p.payment_date.split('T')[0] : (p.created_at ? p.created_at.split('T')[0] : '—');
      const refStr = p.reference_no ? `<span class="ref-pill">${esc(p.reference_no)}</span>` : '<span class="text-muted">—</span>';
      const userLabel = p.recorded_by_name ? esc(p.recorded_by_name) : '<span class="text-muted">System</span>';

      const actionBtn = !isPaid 
        ? `<button class="btn btn-sm btn-primary" onclick="markPaidWithModal(${p.id}, ${p.amount}, ${p.rental_id})">Receive Payment</button>`
        : '';

      const deleteBtn = isMgr 
        ? `<button class="btn-icon danger" onclick="deletePayment(${p.id})" title="Delete Payment Record">${Icons.trash}</button>`
        : '';

      rowsHTML += `
        <tr>
          <td><strong>#${p.id}</strong></td>
          <td>
            <div class="customer-info-cell">
              <span>${esc(custName)}</span>
              ${custPhone}
            </div>
          </td>
          <td>
            <div class="rental-info-cell">
              <span>${esc(carLabel)}</span>
              <small class="text-muted">Rental #${p.rental_id}</small>
            </div>
          </td>
          <td><strong class="text-amount">$${Number(p.amount).toFixed(2)}</strong></td>
          <td><span class="method-badge ${method.toLowerCase().replace(/\s+/g, '-')}">${esc(method)}</span></td>
          <td>${dateStr}</td>
          <td>${refStr}</td>
          <td><span class="badge ${statusClass}">${p.status}</span></td>
          <td>${userLabel}</td>
          <td>
            <div class="actions-cell">
              ${actionBtn}
              ${deleteBtn}
            </div>
          </td>
        </tr>
      `;
    });
  }

  pageContainer.innerHTML = `
    <div class="page-header">
      <div class="cars-header-title">
        <h2>Payments</h2>
        <span class="cars-header-badge">${filtered.length} records</span>
      </div>
      <button class="btn btn-primary" onclick="openRecordPaymentModal()">
        ${Icons.plus}
        <span>Record Payment</span>
      </button>
    </div>

    <!-- Search & Filter Controls -->
    <div class="cars-toolbar finance-toolbar">
      <div class="cars-search-box">
        <span class="cars-search-icon">${Icons.search}</span>
        <input 
          type="text" 
          id="paymentsSearchInput" 
          class="cars-search-input" 
          placeholder="Search by customer, car, or reference #..." 
          value="${esc(paymentsSearchQuery)}"
        />
      </div>

      <div class="finance-filter-controls">
        <div class="finance-select-wrapper">
          <label>Status:</label>
          <select id="paymentsStatusSelect" class="finance-filter-select" onchange="setPaymentsStatusFilter(this.value)">
            <option value="all" ${paymentsStatusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="Paid" ${paymentsStatusFilter === 'Paid' ? 'selected' : ''}>Paid Only</option>
            <option value="Unpaid" ${paymentsStatusFilter === 'Unpaid' ? 'selected' : ''}>Unpaid Only</option>
          </select>
        </div>

        <div class="finance-select-wrapper">
          <label>Method:</label>
          <select id="paymentsMethodSelect" class="finance-filter-select" onchange="setPaymentsMethodFilter(this.value)">
            <option value="all" ${paymentsMethodFilter === 'all' ? 'selected' : ''}>All Methods</option>
            <option value="Cash" ${paymentsMethodFilter === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="Bank Transfer" ${paymentsMethodFilter === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
            <option value="Mobile Money" ${paymentsMethodFilter === 'Mobile Money' ? 'selected' : ''}>Mobile Money</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Payments Table -->
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Vehicle / Rental</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Date</th>
            <th>Reference #</th>
            <th>Status</th>
            <th>Recorded By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>
  `;

  const searchInput = document.getElementById('paymentsSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      paymentsSearchQuery = e.target.value;
      renderPaymentsTable();
    });
  }
}

function setPaymentsStatusFilter(val) {
  paymentsStatusFilter = val;
  renderPaymentsTable();
}

function setPaymentsMethodFilter(val) {
  paymentsMethodFilter = val;
  renderPaymentsTable();
}

// Modal to record payment for rental
async function openRecordPaymentModal(preselectedRentalId = null) {
  try {
    const unpaidRentals = await API.get('/api/rentals/unpaid');
    const today = new Date().toISOString().split('T')[0];

    let rentalOptions = '';
    if (unpaidRentals.length === 0) {
      rentalOptions = `<option value="">-- No pending rentals (All rentals fully settled) --</option>`;
    } else {
      rentalOptions = unpaidRentals.map(r => {
        const selected = preselectedRentalId && r.id === parseInt(preselectedRentalId) ? 'selected' : '';
        return `
          <option value="${r.id}" data-due="${r.balance_due}" ${selected}>
            Rental #${r.id}: ${esc(r.customer_name)} — ${esc(r.car_name)} (Due: $${Number(r.balance_due).toFixed(2)})
          </option>
        `;
      }).join('');
    }

    const firstDue = unpaidRentals.length > 0 ? unpaidRentals[0].balance_due : '';

    const formHTML = `
      <form id="recordPaymentForm" class="finance-modal-form">
        <div class="form-group">
          <label for="payRentalId">Rental Agreement <span class="required">*</span></label>
          <select id="payRentalId" required ${unpaidRentals.length === 0 ? 'disabled' : ''}>
            ${rentalOptions}
          </select>
          <small class="form-hint">Select the rental contract receiving payment.</small>
        </div>

        <div class="form-grid-2col">
          <div class="form-group">
            <label for="payAmount">Payment Amount ($) <span class="required">*</span></label>
            <input 
              type="number" 
              id="payAmount" 
              placeholder="0.00" 
              step="0.01" 
              min="0.01" 
              value="${firstDue}" 
              required 
            />
          </div>

          <div class="form-group">
            <label for="payMethod">Payment Method <span class="required">*</span></label>
            <select id="payMethod" required>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Mobile Money">Mobile Money</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2col">
          <div class="form-group">
            <label for="payDate">Payment Date <span class="required">*</span></label>
            <input type="date" id="payDate" value="${today}" required />
          </div>

          <div class="form-group">
            <label for="payRef">Reference / Receipt Number</label>
            <input type="text" id="payRef" placeholder="e.g. TX-9842, WIRE-101" />
          </div>
        </div>

        <div class="form-group">
          <label for="payNotes">Notes / Description <span class="optional-label">(optional)</span></label>
          <input type="text" id="payNotes" placeholder="Additional details..." />
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" id="btnSubmitPayment" class="btn btn-primary" ${unpaidRentals.length === 0 ? 'disabled' : ''}>
            Confirm Payment
          </button>
        </div>
      </form>
    `;

    openModal('Record Rental Payment Received', formHTML);

    const selectEl = $('#payRentalId');
    if (selectEl && unpaidRentals.length > 0) {
      selectEl.addEventListener('change', () => {
        const opt = selectEl.options[selectEl.selectedIndex];
        if (opt && opt.dataset.due) {
          $('#payAmount').value = opt.dataset.due;
        }
      });
    }

    $('#recordPaymentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = $('#btnSubmitPayment');
      if (submitBtn) submitBtn.disabled = true;

      const body = {
        rental_id: parseInt($('#payRentalId').value),
        amount: parseFloat($('#payAmount').value),
        payment_method: $('#payMethod').value,
        payment_date: $('#payDate').value,
        reference_no: $('#payRef').value.trim() || null,
        notes: $('#payNotes').value.trim() || null,
      };

      try {
        await API.post('/api/payments', body);
        showToast('Payment received and recorded successfully.');
        closeModal();
        renderPayments();
      } catch (err) {
        showToast(err.message, true);
        if (submitBtn) submitBtn.disabled = false;
      }
    });

  } catch (err) {
    showToast('Failed to load pending rentals: ' + err.message, true);
  }
}

// Mark existing unpaid payment as paid with confirmation of method & date
function markPaidWithModal(paymentId, amount, rentalId) {
  const today = new Date().toISOString().split('T')[0];
  const formHTML = `
    <form id="markPaidForm" class="finance-modal-form">
      <p style="margin-bottom:14px;color:var(--color-text)">
        Receive settlement of <strong>$${Number(amount).toFixed(2)}</strong> for Rental #${rentalId}:
      </p>

      <div class="form-group">
        <label for="markMethod">Payment Method <span class="required">*</span></label>
        <select id="markMethod" required>
          <option value="Cash">Cash</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Mobile Money">Mobile Money</option>
        </select>
      </div>

      <div class="form-group">
        <label for="markDate">Payment Date <span class="required">*</span></label>
        <input type="date" id="markDate" value="${today}" required />
      </div>

      <div class="form-group">
        <label for="markRef">Transaction Reference / Receipt No</label>
        <input type="text" id="markRef" placeholder="e.g. REC-5542" />
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Mark as Paid</button>
      </div>
    </form>
  `;

  openModal('Confirm Payment Receipt', formHTML);

  $('#markPaidForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.put(`/api/payments/${paymentId}/pay`, {
        payment_method: $('#markMethod').value,
        payment_date: $('#markDate').value,
        reference_no: $('#markRef').value.trim(),
      });
      showToast('Payment settled and recorded.');
      closeModal();
      renderPayments();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

function deletePayment(id) {
  if (!isManager()) return;
  openConfirm('Are you sure you want to delete this payment record?', async () => {
    try {
      await API.delete(`/api/payments/${id}`);
      showToast('Payment record deleted');
      renderPayments();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

window.markPaid = async function(id) {
  try {
    await API.put(`/api/payments/${id}/pay`);
    showToast('Payment marked as paid');
    renderPayments();
  } catch (err) {
    showToast(err.message, true);
  }
};

window.openRecordPaymentModal = openRecordPaymentModal;
window.markPaidWithModal = markPaidWithModal;
window.deletePayment = deletePayment;
window.setPaymentsStatusFilter = setPaymentsStatusFilter;
window.setPaymentsMethodFilter = setPaymentsMethodFilter;
// =====================================================
// 6. USERS (Manager only)
// =====================================================
async function renderUsers() {
  if (!isManager()) {
    pageContainer.innerHTML = `<p style="color:red">Access denied. Manager role required.</p>`;
    return;
  }

  pageContainer.innerHTML = '<p style="color:#999">Loading...</p>';
  try {
    const users = await API.get('/api/users');

    let tableRows = '';
    if (users.length === 0) {
      tableRows = `<tr><td colspan="5">${emptyStateHTML('No users found.')}</td></tr>`;
    } else {
      users.forEach(u => {
        const roleBadge = u.role === 'manager'
          ? `<span class="badge" style="background:#eafaf1;color:#27ae60">Manager</span>`
          : `<span class="badge" style="background:#eaf2f8;color:#2980b9">Staff</span>`;

        const isSelf = u.id === currentUser.id;

        const actions = isSelf
          ? `<span style="color:#b2bec3;font-size:0.8rem">Current account</span>`
          : `
            <button class="btn btn-sm btn-secondary" onclick="changeUserRole(${u.id}, '${u.role === 'manager' ? 'staff' : 'manager'}')">
              Make ${u.role === 'manager' ? 'Staff' : 'Manager'}
            </button>
            <button class="btn-icon danger" onclick="deleteUser(${u.id})" title="Delete user">${Icons.trash}</button>
          `;

        tableRows += `
          <tr>
            <td>${esc(u.full_name)}</td>
            <td>${esc(u.email)}</td>
            <td>${roleBadge}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td><div class="actions-cell">${actions}</div></td>
          </tr>`;
      });
    }

    pageContainer.innerHTML = `
      <div class="page-header">
        <h2>System Users</h2>
        <button class="btn btn-primary" onclick="openCreateUserForm()">${Icons.plus} Add Staff Account</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Full Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    pageContainer.innerHTML = `<p style="color:red">Error: ${esc(err.message)}</p>`;
  }
}

function openCreateUserForm() {
  const formHTML = `
    <form id="userForm">
      <div class="form-group">
        <label for="newUserName">Full Name</label>
        <input type="text" id="newUserName" placeholder="e.g. Jane Smith" required />
      </div>
      <div class="form-group">
        <label for="newUserEmail">Email Address</label>
        <input type="email" id="newUserEmail" placeholder="jane@example.com" required />
      </div>
      <div class="form-group">
        <label for="newUserPassword">Password (min. 8 characters)</label>
        <input type="password" id="newUserPassword" placeholder="Minimum 8 characters" minlength="8" required />
      </div>
      <div class="form-group">
        <label for="newUserRole">Role</label>
        <select id="newUserRole">
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Account</button>
      </div>
    </form>
  `;

  openModal('Create Staff Account', formHTML);

  $('#userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      full_name: $('#newUserName').value.trim(),
      email:     $('#newUserEmail').value.trim(),
      password:  $('#newUserPassword').value,
      role:      $('#newUserRole').value,
    };

    try {
      await API.post('/api/users', body);
      showToast('Account created successfully');
      closeModal();
      renderUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

window.changeUserRole = async function(id, newRole) {
  try {
    await API.put(`/api/users/${id}/role`, { role: newRole });
    showToast(`Role updated to ${newRole}`);
    renderUsers();
  } catch (err) {
    showToast(err.message, true);
  }
};

window.deleteUser = function(id) {
  openConfirm('Are you sure you want to delete this user account?', async () => {
    try {
      await API.delete(`/api/users/${id}`);
      showToast('User deleted');
      renderUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  });
};

// =====================================================
// EXPOSE FUNCTIONS FOR INLINE ONCLICK
// =====================================================
window.openCarForm      = openCarForm;
window.openCustomerForm = openCustomerForm;
window.openRentalForm   = openRentalForm;
window.openCreateUserForm = openCreateUserForm;
window.closeModal       = closeModal;

// =====================================================
// INIT — check auth, then render
// =====================================================
initAuth();
