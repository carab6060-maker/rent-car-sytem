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
const printModalOverlay = $('#printModalOverlay');
const printDocTitle     = $('#printDocTitle');
const printModalBody    = $('#printModalBody');
const printModalCloseBtn= $('#printModalCloseBtn');

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
    expenses:  'Operating Expenses & Fleet Costs',
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
    case 'expenses':   renderExpenses();  break;
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

// Print Modal Helpers
function openPrintModal(title, bodyHTML) {
  if (printDocTitle) printDocTitle.textContent = title;
  if (printModalBody) printModalBody.innerHTML = bodyHTML;
  if (printModalOverlay) printModalOverlay.classList.add('open');
}

function closePrintModal() {
  if (printModalOverlay) printModalOverlay.classList.remove('open');
}

if (printModalOverlay) {
  printModalOverlay.addEventListener('click', (e) => {
    if (e.target === printModalOverlay) closePrintModal();
  });
}
window.closePrintModal = closePrintModal;

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
                <span class="dashboard-kpi-title">Gross Revenue Collected</span>
                <span class="dashboard-kpi-val" style="color:var(--color-navy);">$${totalRevenue.toFixed(2)}</span>
              </div>
              <span style="font-size:0.75rem;color:var(--color-text-secondary);">Verified income from completed customer payments</span>
            </div>

            <div class="dashboard-kpi-item">
              <div class="dashboard-kpi-top">
                <span class="dashboard-kpi-title">Total Operating Expenses</span>
                <span class="dashboard-kpi-val" style="color:var(--color-danger);">$${(typeof data.totalExpenses === 'number' ? data.totalExpenses : parseFloat(data.totalExpenses || 0)).toFixed(2)}</span>
              </div>
              <span style="font-size:0.75rem;color:var(--color-text-secondary);">Fleet fuel, service, maintenance & staff expenses</span>
            </div>

            <div class="dashboard-kpi-item" style="border-left: 4px solid ${(typeof data.netProfit === 'number' ? data.netProfit : (totalRevenue - (data.totalExpenses || 0))) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; background: #f8fafc;">
              <div class="dashboard-kpi-top">
                <span class="dashboard-kpi-title" style="color:var(--color-navy);font-weight:700">Net Profit (Faa'iidada Saafiga ah)</span>
                <span class="dashboard-kpi-val" style="color:${(typeof data.netProfit === 'number' ? data.netProfit : (totalRevenue - (data.totalExpenses || 0))) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};font-size:1.25rem;">
                  $${(typeof data.netProfit === 'number' ? data.netProfit : (totalRevenue - (data.totalExpenses || 0))).toFixed(2)}
                </span>
              </div>
              <span style="font-size:0.75rem;color:var(--color-text-secondary);font-weight:500;">Net Profit = Gross Revenue &minus; Total Operating Expenses</span>
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
        ${isMgr ? `<button class="btn btn-primary" onclick="openCarForm()" style="margin-top:14px">${Icons.plus}<span>Add First Car</span></button>` : ''}
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
        <button class="btn btn-primary" onclick="openCustomerForm()">${Icons.plus}<span>Add Customer</span></button>
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

        const printBtn = `<button class="btn-icon" onclick="openRentalAgreementModal(${r.id})" title="Print Rental Agreement / Heshiiska">${Icons.printer}</button>`;
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
                ${printBtn}
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
        <button class="btn btn-primary" onclick="openRentalForm()">${Icons.plus}<span>New Rental</span></button>
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
        const createdRental = await API.post('/api/rentals', body);
        showToast('Rental created successfully');
        closeModal();
        renderRentals();
        if (createdRental && createdRental.id) {
          setTimeout(() => openRentalAgreementModal(createdRental.id), 200);
        }
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
// PRINTABLE AGREEMENT & RECEIPT GENERATORS
// =====================================================
async function openRentalAgreementModal(rentalId) {
  try {
    let r = null;
    try {
      r = await API.get(`/api/rentals/${rentalId}`);
    } catch (e) {
      const list = await API.get('/api/rentals');
      r = list.find(x => x.id === rentalId);
    }

    if (!r) {
      showToast('Rental record not found', true);
      return;
    }

    const startDate = r.start_date ? r.start_date.split('T')[0] : '—';
    const returnDate = r.return_date ? r.return_date.split('T')[0] : '—';
    const issueDate = r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const totalDays = r.total_days || 1;
    const pricePerDay = Number(r.price_per_day || 0).toFixed(2);
    const totalPrice = Number(r.total_price || 0).toFixed(2);
    const agrNo = `AGR-${String(r.id).padStart(5, '0')}`;
    const custId = `CUST-${String(r.customer_id).padStart(4, '0')}`;
    const statusClass = (r.status || 'Rented').toLowerCase();

    const docHTML = `
      <div class="printable-document rental-agreement-doc">
        <!-- Top Header -->
        <div class="doc-header">
          <div class="doc-brand">
            <img src="/images/logo.png?v=2" alt="CarRent Logo" class="doc-logo" />
            <div>
              <h1 class="doc-company-name">CarRent Management</h1>
              <p class="doc-company-tagline">Official Vehicle Rental Agreement & Contract</p>
              <p class="doc-company-meta">Mogadishu, Somalia | Tel: +252 61 000 0000 | Email: rentals@carrent.so</p>
            </div>
          </div>
          <div class="doc-meta-badge">
            <span class="doc-type-label">RENTAL CONTRACT</span>
            <span class="doc-number">${agrNo}</span>
            <span class="doc-date">Issue Date: ${issueDate}</span>
            <span class="doc-status-badge ${statusClass}">${(r.status || 'Active').toUpperCase()}</span>
          </div>
        </div>

        <div class="doc-divider"></div>

        <!-- 2-Column Info Cards -->
        <div class="doc-grid-2">
          <div class="doc-section-card">
            <h3 class="doc-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Customer Information / Macmiilka
            </h3>
            <table class="doc-info-table">
              <tr><th>Full Name:</th><td><strong>${esc(r.customer_name || '—')}</strong></td></tr>
              <tr><th>Phone Number:</th><td>${esc(r.customer_phone || '—')}</td></tr>
              <tr><th>Driver License #:</th><td><code>${esc(r.customer_license || '—')}</code></td></tr>
              <tr><th>Customer Ref:</th><td>${custId}</td></tr>
            </table>
          </div>

          <div class="doc-section-card">
            <h3 class="doc-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Vehicle Information / Gaariga
            </h3>
            <table class="doc-info-table">
              <tr><th>Vehicle:</th><td><strong>${esc(r.car_name || '—')}</strong></td></tr>
              <tr><th>Model / Type:</th><td>${esc(r.car_model || 'Standard')}</td></tr>
              <tr><th>Plate Number:</th><td><span class="doc-plate">${esc(r.car_plate || '—')}</span></td></tr>
              <tr><th>Daily Rate:</th><td>$${pricePerDay} / day</td></tr>
            </table>
          </div>
        </div>

        <!-- Rental Period & Financials -->
        <div class="doc-section-card" style="margin-top: 16px;">
          <h3 class="doc-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Rental Schedule & Charges / Muddada & Xisaabta
          </h3>
          <table class="doc-financial-table">
            <thead>
              <tr>
                <th>Start Date (Bilow)</th>
                <th>Return Date (Dhammaad)</th>
                <th>Total Days</th>
                <th>Daily Rate</th>
                <th style="text-align:right">Total Cost (Wadarta)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${startDate}</strong></td>
                <td><strong>${returnDate}</strong></td>
                <td><strong>${totalDays} day(s)</strong></td>
                <td>$${pricePerDay}</td>
                <td style="text-align:right"><strong class="doc-total-price">$${totalPrice}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Terms & Conditions -->
        <div class="doc-terms-box">
          <h4>Heshiiska & Shuruudaha Kirada (Terms & Conditions):</h4>
          <ol>
            <li><strong>Mas'uuliyadda Gaariga:</strong> Macmiilku wuxuu si buuxda mas'uul uga yahay xaaladda iyo ilaalinta gaariga laga bilaabo saacadda wareejinta ilaa dib u soo celinta.</li>
            <li><strong>Soo Celinta Xilligii Lagu Heshiiyay:</strong> Gaariga waa in lagu soo celiyaa taariikhda heshiiska ku xusan. Dib u dhac kasta oo aan hore loo ogeysiin waxaa laga qaadayaa khidmad maalinle ah oo dheeraad ah.</li>
            <li><strong>Shidaalka (Fuel Policy):</strong> Gaariga waxaa lagu wareejiyay heer shidaal oo cayiman, waana in lagu soo celiyaa isla heerkaas ama ka badan.</li>
            <li><strong>Shilalka & Waxyeellada:</strong> Wixii shil ama khasaare ah ee ku yimaada gaariga, macmiilka ayaa si degdeg ah ugu war-gelinaya shirkadda iyo booliska, wixii dayactir ahna dusha u ridanaya.</li>
          </ol>
        </div>

        <!-- Signatures -->
        <div class="doc-signatures-grid">
          <div class="doc-signature-block">
            <div class="sig-line"></div>
            <p class="sig-name">Authorized Signature (Shirkadda)</p>
            <p class="sig-sub">CarRent Management Representative</p>
            <p class="sig-date">Date: ________________________</p>
          </div>
          <div class="doc-signature-block">
            <div class="sig-line"></div>
            <p class="sig-name">${esc(r.customer_name || 'Customer')} (Macmiilka)</p>
            <p class="sig-sub">Renter Signature / Saxiixa Macmiilka</p>
            <p class="sig-date">Date: ________________________</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="doc-footer">
          <p>Waad ku mahadsan tahay doorashadaada CarRent! | Thank you for choosing CarRent.</p>
          <small>This agreement is legally binding once signed by both parties.</small>
        </div>
      </div>
    `;

    openPrintModal(`Rental Agreement — ${agrNo}`, docHTML);
  } catch (err) {
    console.error('Error opening rental agreement:', err);
    showToast('Failed to generate rental agreement', true);
  }
}
window.openRentalAgreementModal = openRentalAgreementModal;

async function openPaymentReceiptModal(paymentId) {
  try {
    let p = null;
    try {
      p = await API.get(`/api/payments/${paymentId}`);
    } catch (e) {
      const list = await API.get('/api/payments');
      p = list.find(x => x.id === paymentId);
    }

    if (!p) {
      showToast('Payment record not found', true);
      return;
    }

    const recNo = `REC-${String(p.id).padStart(5, '0')}`;
    const dateStr = p.payment_date ? p.payment_date.split('T')[0] : (p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    const amount = Number(p.amount || 0).toFixed(2);
    const method = p.payment_method || 'Cash';
    const isPaid = p.status === 'Paid';
    const refNo = p.reference_no || 'N/A';
    const startDate = p.rental_start_date ? p.rental_start_date.split('T')[0] : '—';
    const returnDate = p.rental_return_date ? p.rental_return_date.split('T')[0] : '—';
    const carText = p.car_name ? `${p.car_name} ${p.car_model || ''} (${p.car_plate || ''})` : `Rental #${p.rental_id}`;

    const docHTML = `
      <div class="printable-document payment-receipt-doc">
        <!-- Header -->
        <div class="doc-header">
          <div class="doc-brand">
            <img src="/images/logo.png?v=2" alt="CarRent Logo" class="doc-logo" />
            <div>
              <h1 class="doc-company-name">CarRent Management</h1>
              <p class="doc-company-tagline">Official Payment Receipt & Invoice</p>
              <p class="doc-company-meta">Mogadishu, Somalia | Tel: +252 61 000 0000 | accounts@carrent.so</p>
            </div>
          </div>
          <div class="doc-meta-badge">
            <span class="doc-type-label">OFFICIAL RECEIPT</span>
            <span class="doc-number">${recNo}</span>
            <span class="doc-date">Date: ${dateStr}</span>
            ${isPaid ? '<span class="receipt-paid-stamp">PAID</span>' : '<span class="doc-status-badge rented">PENDING</span>'}
          </div>
        </div>

        <div class="doc-divider"></div>

        <!-- 2-column info cards -->
        <div class="doc-grid-2">
          <div class="doc-section-card">
            <h3 class="doc-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Received From / Laga Qabtay:
            </h3>
            <table class="doc-info-table">
              <tr><th>Customer:</th><td><strong>${esc(p.customer_name || '—')}</strong></td></tr>
              <tr><th>Phone Number:</th><td>${esc(p.customer_phone || '—')}</td></tr>
              <tr><th>License #:</th><td><code>${esc(p.customer_license || '—')}</code></td></tr>
              <tr><th>Rental Ref:</th><td>Rental #${p.rental_id}</td></tr>
            </table>
          </div>

          <div class="doc-section-card">
            <h3 class="doc-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Payment Details / Qaabka Bixinta:
            </h3>
            <table class="doc-info-table">
              <tr><th>Method:</th><td><strong>${esc(method)}</strong></td></tr>
              <tr><th>Reference #:</th><td><code>${esc(refNo)}</code></td></tr>
              <tr><th>Collected By:</th><td>${esc(p.recorded_by_name || 'System Cashier')}</td></tr>
              <tr><th>Payment Date:</th><td>${dateStr}</td></tr>
            </table>
          </div>
        </div>

        <!-- Breakdown table -->
        <div class="doc-section-card" style="margin-top: 16px;">
          <h3 class="doc-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Payment Breakdown / Xisaabta
          </h3>
          <table class="doc-financial-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Vehicle</th>
                <th>Rental Schedule</th>
                <th style="text-align:right">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Vehicle Rental Payment #${p.rental_id}</strong></td>
                <td>${esc(carText)}</td>
                <td>${startDate} to ${returnDate}</td>
                <td style="text-align:right"><strong class="doc-total-price">$${amount}</strong></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align:right"><strong>Total Received / Wadarta:</strong></td>
                <td style="text-align:right"><strong class="doc-total-price" style="font-size:1.15rem">$${amount}</strong></td>
              </tr>
            </tfoot>
          </table>
          ${p.notes ? `<p class="receipt-notes"><strong>Notes:</strong> ${esc(p.notes)}</p>` : ''}
        </div>

        <!-- Signatures -->
        <div class="doc-signatures-grid" style="margin-top: 40px;">
          <div class="doc-signature-block">
            <div class="sig-line"></div>
            <p class="sig-name">${esc(p.recorded_by_name || 'Cashier')}</p>
            <p class="sig-sub">Authorized Cashier / Qasnajiga</p>
          </div>
          <div class="doc-signature-block">
            <div class="sig-line"></div>
            <p class="sig-name">${esc(p.customer_name || 'Customer')}</p>
            <p class="sig-sub">Customer Signature / Macmiilka</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="doc-footer">
          <p>Bixintaadu way xaqiijisan tahay | Thank you for your payment!</p>
          <small>Official electronic receipt issued by CarRent Management System.</small>
        </div>
      </div>
    `;

    openPrintModal((isPaid ? 'Payment Receipt — ' : 'Rental Invoice — ') + recNo, docHTML);
  } catch (err) {
    console.error('Error opening receipt:', err);
    showToast('Failed to generate payment receipt', true);
  }
}
window.openPaymentReceiptModal = openPaymentReceiptModal;

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

      const printReceiptBtn = `<button class="btn-icon" onclick="openPaymentReceiptModal(${p.id})" title="${isPaid ? 'Print Official Receipt / Rasiid' : 'Print Invoice / Qaansheeg'}">${isPaid ? Icons.printer : Icons.receipt}</button>`;

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
              ${printReceiptBtn}
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
        const createdPay = await API.post('/api/payments', body);
        showToast('Payment received and recorded successfully.');
        closeModal();
        renderPayments();
        if (createdPay && createdPay.id) {
          setTimeout(() => openPaymentReceiptModal(createdPay.id), 200);
        }
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
      setTimeout(() => openPaymentReceiptModal(paymentId), 200);
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
// 6. OPERATING EXPENSES & FLEET COSTS
// =====================================================
let expensesData = [];
let expensesSummary = { totalExpenses: 0, thisMonthExpenses: 0, byCategory: [] };
let expensesSearchQuery = '';
let expensesCategoryFilter = 'all';

async function renderExpenses() {
  pageContainer.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;color:#64748b;padding:40px 0;">
      <div class="spinner"></div>
      <p>Loading operating expenses & fleet costs...</p>
    </div>
  `;

  try {
    const [expenses, summary] = await Promise.all([
      API.get('/api/expenses'),
      API.get('/api/expenses/summary').catch(() => ({ totalExpenses: 0, thisMonthExpenses: 0, byCategory: [] }))
    ]);

    expensesData = expenses;
    expensesSummary = summary;
    renderExpensesView();
  } catch (err) {
    pageContainer.innerHTML = `
      <div class="empty-state">
        <p style="color:var(--color-danger)">Failed to load expenses: ${esc(err.message)}</p>
        <button class="btn btn-secondary" onclick="renderExpenses()" style="margin-top:12px">Try Again</button>
      </div>
    `;
  }
}

function renderExpensesView() {
  const isMgr = isManager();
  const topCat = (expensesSummary.byCategory && expensesSummary.byCategory[0]) 
    ? `${expensesSummary.byCategory[0].category} ($${parseFloat(expensesSummary.byCategory[0].total).toFixed(0)})`
    : 'None';

  // Filter expensesData
  const filtered = expensesData.filter(e => {
    if (expensesCategoryFilter !== 'all' && e.category !== expensesCategoryFilter) {
      return false;
    }
    if (expensesSearchQuery) {
      const q = expensesSearchQuery.toLowerCase();
      const title = (e.title || '').toLowerCase();
      const desc = (e.description || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || cat.includes(q);
    }
    return true;
  });

  const categories = ['all', 'Fuel', 'Maintenance', 'Insurance', 'Staff Salaries', 'Other'];
  const pillsHTML = categories.map(cat => {
    const active = expensesCategoryFilter === cat ? 'active' : '';
    const label = cat === 'all' ? 'All Expenses' : cat;
    return `<button type="button" class="cars-filter-pill ${active}" onclick="setExpensesCategoryFilter('${cat}')">${label}</button>`;
  }).join('');

  let tableRows = '';
  if (filtered.length === 0) {
    tableRows = `<tr><td colspan="7">${emptyStateHTML(expensesSearchQuery || expensesCategoryFilter !== 'all' ? 'No matching expenses found.' : 'No operating expenses recorded yet.')}</td></tr>`;
  } else {
    tableRows = filtered.map(e => {
      const catBadgeClass = 'badge-cat-' + (e.category || 'other').toLowerCase().replace(/\s+/g, '-');
      const dateStr = e.expense_date ? String(e.expense_date).split('T')[0] : '—';
      const method = e.payment_method || 'Cash';
      const userLabel = e.recorded_by_name ? esc(e.recorded_by_name) : 'Staff';
      const editBtn = `<button class="btn-icon" onclick="openExpenseForm(${e.id})" title="Edit Expense">${Icons.edit}</button>`;
      const deleteBtn = isMgr 
        ? `<button class="btn-icon danger" onclick="deleteExpense(${e.id})" title="Delete Expense">${Icons.trash}</button>`
        : '';

      return `
        <tr>
          <td><span style="font-weight:600;color:var(--color-navy)">${dateStr}</span></td>
          <td>
            <div>
              <div style="font-weight:600;color:var(--color-text)">${esc(e.title)}</div>
              ${e.description ? `<small class="text-muted" style="display:block;margin-top:2px">${esc(e.description)}</small>` : ''}
            </div>
          </td>
          <td><span class="badge ${catBadgeClass}">${esc(e.category)}</span></td>
          <td><span class="method-badge ${(method || '').toLowerCase().replace(/\s+/g, '-')}">${esc(method)}</span></td>
          <td><strong style="color:var(--color-danger);font-size:0.95rem;">-$${Number(e.amount).toFixed(2)}</strong></td>
          <td><span class="text-muted" style="font-size:0.84rem">${userLabel}</span></td>
          <td>
            <div class="actions-cell">
              ${editBtn}
              ${deleteBtn}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  pageContainer.innerHTML = `
    <div class="cars-view-wrapper">
      <!-- Section Header -->
      <div class="cars-page-header">
        <div class="cars-header-title">
          <h2>Operating Expenses & Fleet Costs</h2>
          <span class="cars-header-badge">${expensesData.length} records</span>
        </div>
        <button class="btn btn-primary" onclick="openExpenseForm()">
          ${Icons.plus}
          <span>Record Expense</span>
        </button>
      </div>

      <!-- Financial Metrics Cards -->
      <div class="stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
        <div class="stat-card" style="border-left-color: var(--color-danger);">
          <span class="stat-label">Total Operating Expenses</span>
          <span class="stat-value" style="color:var(--color-danger)">$${expensesSummary.totalExpenses.toFixed(2)}</span>
        </div>
        <div class="stat-card warning">
          <span class="stat-label">Expenses This Month</span>
          <span class="stat-value" style="color:var(--color-warning)">$${expensesSummary.thisMonthExpenses.toFixed(2)}</span>
        </div>
        <div class="stat-card info">
          <span class="stat-label">Top Expense Category</span>
          <span class="stat-value" style="font-size:1.1rem;margin-top:4px;">${esc(topCat)}</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="cars-toolbar">
        <div class="cars-search-box">
          <span class="cars-search-icon">${Icons.search}</span>
          <input 
            type="text" 
            id="expenseSearchInput" 
            class="cars-search-input" 
            placeholder="Search by expense title, category, or note..." 
            value="${esc(expensesSearchQuery)}"
          />
          <button 
            id="expenseSearchClear" 
            class="cars-search-clear ${expensesSearchQuery ? 'visible' : ''}" 
            onclick="clearExpenseSearch()" 
            type="button"
          >
            ${Icons.clear}
          </button>
        </div>

        <div class="cars-filters-row">
          <div class="cars-status-pills">
            ${pillsHTML}
          </div>
        </div>
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Expense Item / Reason</th>
              <th>Category</th>
              <th>Payment Method</th>
              <th>Amount ($)</th>
              <th>Recorded By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind Search events
  const searchInput = $('#expenseSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      expensesSearchQuery = e.target.value.trim();
      const clearBtn = $('#expenseSearchClear');
      if (clearBtn) clearBtn.classList.toggle('visible', !!expensesSearchQuery);
      renderExpensesView();
    });
  }
}

function setExpensesCategoryFilter(cat) {
  expensesCategoryFilter = cat;
  renderExpensesView();
}

function clearExpenseSearch() {
  expensesSearchQuery = '';
  renderExpensesView();
}

function openExpenseForm(expenseId = null) {
  const isEdit = typeof expenseId === 'number';
  const expense = isEdit ? expensesData.find(e => e.id === expenseId) : null;
  const today = new Date().toISOString().split('T')[0];

  const defaultDate = expense && expense.expense_date ? String(expense.expense_date).split('T')[0] : today;
  const defaultTitle = expense ? (expense.title || '') : '';
  const defaultCategory = expense ? (expense.category || 'Maintenance') : 'Maintenance';
  const defaultAmount = expense ? (expense.amount || '') : '';
  const defaultMethod = expense ? (expense.payment_method || 'Cash') : 'Cash';
  const defaultDesc = expense ? (expense.description || '') : '';

  const formHTML = `
    <form id="expenseForm">
      <div class="form-group">
        <label for="expTitle">Expense Title / Item <span class="required">*</span></label>
        <input 
          type="text" 
          id="expTitle" 
          placeholder="e.g. Engine oil change & filter for Toyota Camry" 
          value="${esc(defaultTitle)}" 
          required 
        />
      </div>

      <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group">
          <label for="expCategory">Category <span class="required">*</span></label>
          <select id="expCategory" required>
            <option value="Maintenance" ${defaultCategory === 'Maintenance' ? 'selected' : ''}>Maintenance (Dayactirka)</option>
            <option value="Fuel" ${defaultCategory === 'Fuel' ? 'selected' : ''}>Fuel (Shidaalka)</option>
            <option value="Insurance" ${defaultCategory === 'Insurance' ? 'selected' : ''}>Insurance (Caymiska)</option>
            <option value="Staff Salaries" ${defaultCategory === 'Staff Salaries' ? 'selected' : ''}>Staff Salaries (Mushaaraadka)</option>
            <option value="Other" ${defaultCategory === 'Other' ? 'selected' : ''}>Other (Kharashyo Kale)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="expAmount">Amount ($ USD) <span class="required">*</span></label>
          <input 
            type="number" 
            id="expAmount" 
            step="0.01" 
            min="0.01" 
            placeholder="0.00" 
            value="${esc(String(defaultAmount))}" 
            required 
          />
        </div>
      </div>

      <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group">
          <label for="expDate">Expense Date <span class="required">*</span></label>
          <input type="date" id="expDate" value="${defaultDate}" required />
        </div>

        <div class="form-group">
          <label for="expMethod">Payment Method <span class="required">*</span></label>
          <select id="expMethod" required>
            <option value="Cash" ${defaultMethod === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="Bank Transfer" ${defaultMethod === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
            <option value="Mobile Money" ${defaultMethod === 'Mobile Money' ? 'selected' : ''}>Mobile Money</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="expDesc">Notes & Details (Optional)</label>
        <textarea 
          id="expDesc" 
          rows="3" 
          placeholder="Receipt notes, garage name, vendor invoice number..."
        >${esc(defaultDesc)}</textarea>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Record Expense'}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? 'Edit Operating Expense' : 'Record New Operating Expense', formHTML);

  $('#expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      title: $('#expTitle').value.trim(),
      category: $('#expCategory').value,
      amount: parseFloat($('#expAmount').value),
      expense_date: $('#expDate').value,
      payment_method: $('#expMethod').value,
      description: $('#expDesc').value.trim() || null,
    };

    try {
      if (isEdit) {
        await API.put(`/api/expenses/${expenseId}`, body);
        showToast('Expense updated successfully');
      } else {
        await API.post('/api/expenses', body);
        showToast('Expense recorded successfully');
      }
      closeModal();
      renderExpenses();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

function deleteExpense(id) {
  openConfirm('Are you sure you want to delete this expense record?', async () => {
    try {
      await API.delete(`/api/expenses/${id}`);
      showToast('Expense record deleted');
      renderExpenses();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

window.openExpenseForm = openExpenseForm;
window.deleteExpense = deleteExpense;
window.setExpensesCategoryFilter = setExpensesCategoryFilter;
window.clearExpenseSearch = clearExpenseSearch;
window.renderExpenses = renderExpenses;

// =====================================================
// 7. USERS (Manager only)
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
        <button class="btn btn-primary" onclick="openCreateUserForm()">${Icons.plus}<span>Add Staff Account</span></button>
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
window.openCarForm              = openCarForm;
window.openCustomerForm         = openCustomerForm;
window.openRentalForm           = openRentalForm;
window.openCreateUserForm       = openCreateUserForm;
window.closeModal               = closeModal;
window.openRentalAgreementModal = openRentalAgreementModal;
window.openPaymentReceiptModal  = openPaymentReceiptModal;
window.closePrintModal          = closePrintModal;
window.openExpenseForm          = openExpenseForm;
window.deleteExpense            = deleteExpense;
window.renderExpenses           = renderExpenses;

// =====================================================
// INIT — check auth, then render
// =====================================================
initAuth();
