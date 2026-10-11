/* =====================================================
   Car Rental Management System — Frontend Logic
   =====================================================
   All data operations go through the Express API,
   which connects to the Neon PostgreSQL database.
   No data is stored in localStorage.
   ===================================================== */

// =====================================================
// API CLIENT — all database calls go through here
// =====================================================
const API = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return res.json();
  },

  async post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  async put(url, body = {}) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  async delete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },
};

// =====================================================
// SVG ICONS
// =====================================================
const Icons = {
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
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

  const titles = { dashboard: 'Dashboard', cars: 'Cars', customers: 'Customers', rentals: 'Rentals', payments: 'Payments' };
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

// =====================================================
// 1. DASHBOARD
// =====================================================
async function renderDashboard() {
  pageContainer.innerHTML = '<p style="color:#999">Loading...</p>';
  try {
    const data = await API.get('/api/dashboard');
    pageContainer.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-label">Total Cars</span>
          <span class="stat-value">${data.totalCars}</span>
        </div>
        <div class="stat-card success">
          <span class="stat-label">Available Cars</span>
          <span class="stat-value">${data.availableCars}</span>
        </div>
        <div class="stat-card warning">
          <span class="stat-label">Rented Cars</span>
          <span class="stat-value">${data.rentedCars}</span>
        </div>
        <div class="stat-card info">
          <span class="stat-label">Total Customers</span>
          <span class="stat-value">${data.totalCustomers}</span>
        </div>
      </div>
    `;
  } catch (err) {
    pageContainer.innerHTML = `<p style="color:red">Error: ${esc(err.message)}</p>`;
  }
}

// =====================================================
// 2. CARS
// =====================================================
async function renderCars() {
  pageContainer.innerHTML = '<p style="color:#999">Loading...</p>';
  try {
    const cars = await API.get('/api/cars');

    let tableRows = '';
    if (cars.length === 0) {
      tableRows = `<tr><td colspan="6">${emptyStateHTML('No cars added yet. Click "Add Car" to get started.')}</td></tr>`;
    } else {
      cars.forEach(car => {
        const badgeClass = car.status === 'Available' ? 'badge-available' : 'badge-rented';
        tableRows += `
          <tr>
            <td>${esc(car.name)}</td>
            <td>${esc(car.model)}</td>
            <td>${esc(car.plate)}</td>
            <td>$${Number(car.price_per_day).toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${car.status}</span></td>
            <td>
              <div class="actions-cell">
                <button class="btn-icon" onclick="editCar(${car.id})" title="Edit">${Icons.edit}</button>
                <button class="btn-icon danger" onclick="deleteCar(${car.id})" title="Delete">${Icons.trash}</button>
              </div>
            </td>
          </tr>`;
      });
    }

    pageContainer.innerHTML = `
      <div class="page-header">
        <h2>All Cars</h2>
        <button class="btn btn-primary" onclick="openCarForm()">${Icons.plus} Add Car</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Car Name</th><th>Model</th><th>Plate Number</th><th>Price / Day</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    pageContainer.innerHTML = `<p style="color:red">Error: ${esc(err.message)}</p>`;
  }
}

function openCarForm(car = null) {
  const isEdit = car !== null;
  const formHTML = `
    <form id="carForm">
      <div class="form-group">
        <label for="carName">Car Name</label>
        <input type="text" id="carName" placeholder="e.g. Toyota Camry" value="${isEdit ? esc(car.name) : ''}" required />
      </div>
      <div class="form-group">
        <label for="carModel">Model</label>
        <input type="text" id="carModel" placeholder="e.g. 2024" value="${isEdit ? esc(car.model) : ''}" required />
      </div>
      <div class="form-group">
        <label for="carPlate">Plate Number</label>
        <input type="text" id="carPlate" placeholder="e.g. ABC-1234" value="${isEdit ? esc(car.plate) : ''}" required />
      </div>
      <div class="form-group">
        <label for="carPrice">Price Per Day ($)</label>
        <input type="number" id="carPrice" placeholder="e.g. 50" step="0.01" min="0" value="${isEdit ? car.price_per_day : ''}" required />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Car</button>
      </div>
    </form>
  `;

  openModal(isEdit ? 'Edit Car' : 'Add Car', formHTML);

  $('#carForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: $('#carName').value.trim(),
      model: $('#carModel').value.trim(),
      plate: $('#carPlate').value.trim(),
      price_per_day: parseFloat($('#carPrice').value),
    };

    try {
      if (isEdit) {
        await API.put(`/api/cars/${car.id}`, body);
        showToast('Car updated successfully');
      } else {
        await API.post('/api/cars', body);
        showToast('Car added successfully');
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
    const cars = await API.get('/api/cars');
    const car = cars.find(c => c.id === id);
    if (car) openCarForm(car);
  } catch (err) {
    showToast(err.message, true);
  }
};

window.deleteCar = function(id) {
  openConfirm('Are you sure you want to delete this car?', async () => {
    try {
      await API.delete(`/api/cars/${id}`);
      showToast('Car deleted');
      renderCars();
    } catch (err) {
      showToast(err.message, true);
    }
  });
};

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
        tableRows += `
          <tr>
            <td>${esc(cust.full_name)}</td>
            <td>${esc(cust.phone)}</td>
            <td>${esc(cust.license)}</td>
            <td>
              <div class="actions-cell">
                <button class="btn-icon" onclick="editCustomer(${cust.id})" title="Edit">${Icons.edit}</button>
                <button class="btn-icon danger" onclick="deleteCustomer(${cust.id})" title="Delete">${Icons.trash}</button>
              </div>
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
                ${r.status === 'Rented' ? `<button class="btn-icon" onclick="returnRental(${r.id})" title="Return Car">${Icons.undo}</button>` : ''}
                <button class="btn-icon danger" onclick="deleteRental(${r.id})" title="Delete">${Icons.trash}</button>
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

    const carOptions = cars.map(c => `<option value="${c.id}" data-price="${c.price_per_day}">${esc(c.name)} — ${esc(c.plate)} ($${Number(c.price_per_day).toFixed(2)}/day)</option>`).join('');
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
      const end = new Date($('#rentalReturn').value);

      $('#rentalPrice').value = '$' + price.toFixed(2);

      if ($('#rentalStart').value && $('#rentalReturn').value && end > start) {
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        $('#rentalDays').value = days;
        $('#rentalTotal').value = '$' + (days * price).toFixed(2);
      } else {
        $('#rentalDays').value = '';
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
        car_id: parseInt($('#rentalCar').value),
        start_date: $('#rentalStart').value,
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
async function renderPayments() {
  pageContainer.innerHTML = '<p style="color:#999">Loading...</p>';
  try {
    const payments = await API.get('/api/payments');

    let tableRows = '';
    if (payments.length === 0) {
      tableRows = `<tr><td colspan="5">${emptyStateHTML('No payments yet. Payments are created automatically when a rental is made.')}</td></tr>`;
    } else {
      payments.forEach(p => {
        const badgeClass = p.status === 'Paid' ? 'badge-paid' : 'badge-unpaid';
        const rentalLabel = p.car_name ? `${p.car_name} (${p.rental_start_date ? p.rental_start_date.split('T')[0] : ''})` : `Rental #${p.rental_id}`;
        const custLabel = p.customer_name || 'Unknown';
        tableRows += `
          <tr>
            <td>${esc(rentalLabel)}</td>
            <td>${esc(custLabel)}</td>
            <td>$${Number(p.amount).toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${p.status}</span></td>
            <td>
              <div class="actions-cell">
                ${p.status === 'Unpaid' ? `<button class="btn btn-sm btn-primary" onclick="markPaid(${p.id})">Mark Paid</button>` : ''}
              </div>
            </td>
          </tr>`;
      });
    }

    pageContainer.innerHTML = `
      <div class="page-header">
        <h2>All Payments</h2>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Rental</th><th>Customer</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    pageContainer.innerHTML = `<p style="color:red">Error: ${esc(err.message)}</p>`;
  }
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

// =====================================================
// EXPOSE FUNCTIONS FOR INLINE ONCLICK
// =====================================================
window.openCarForm = openCarForm;
window.openCustomerForm = openCustomerForm;
window.openRentalForm = openRentalForm;
window.closeModal = closeModal;

// =====================================================
// INIT
// =====================================================
navigateTo('dashboard');
