// CaboCRM Application Engine - Core Logic
// Manages routing, dynamic views, CRUD modal logic, filters, and dashboard hooks

// Global State
let currentView = 'dashboard';
let guestSearchQuery = '';
let guestHotelFilter = 'All';
let guestStatusFilter = 'All';
let bookingSearchQuery = '';
let bookingStatusFilter = 'All';

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  // Ensure DB is initialized
  window.CaboDB.init();
  
  // Set default dates on modals
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById("form-guest-checkin").value = todayStr;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  document.getElementById("form-guest-checkout").value = tomorrowStr;
  document.getElementById("form-booking-date").value = tomorrowStr;
  document.getElementById("form-task-date").value = tomorrowStr;

  // Initialize view
  navigate('dashboard');
  
  // Update header counters
  updateHeaderCounters();
});

// Sidebar responsive toggle
function toggleSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  sidebar.classList.toggle("open");
}

// Global DB Reset
window.resetDatabase = () => {
  if (confirm("Are you sure you want to reset the database? All custom entries will be lost.")) {
    window.CaboDB.reset();
    window.CaboComponents.showToast("Database successfully reset to sample data", "info");
    updateHeaderCounters();
    navigate(currentView);
  }
};

// Header Metrics Sync
function updateHeaderCounters() {
  const guests = window.CaboDB.getGuests();
  const bookings = window.CaboDB.getBookings();
  const stats = window.CaboDB.getDashboardStats();

  const todayStr = new Date().toISOString().split('T')[0];

  // Guests arriving today
  const arrivalsCount = guests.filter(g => g.checkIn === todayStr).length;
  document.getElementById("metric-arrivals-val").textContent = `${arrivalsCount} Arrival${arrivalsCount === 1 ? '' : 's'} Today`;
  
  // Guests currently in town
  document.getElementById("metric-intown-val").textContent = `${stats.activeGuests} Guest${stats.activeGuests === 1 ? '' : 's'} In Town`;

  // Action items count
  const actionItems = stats.pendingOperatorConfirmations + stats.pendingPayments;
  document.getElementById("metric-alerts-val").textContent = `${actionItems} Action Alert${actionItems === 1 ? '' : 's'}`;
  
  const alertPill = document.getElementById("badge-alerts");
  if (actionItems > 0) {
    alertPill.classList.add("alert");
  } else {
    alertPill.classList.remove("alert");
  }
}

// SPA Router
window.navigate = (view) => {
  currentView = view;
  
  // Close any open navigation drawers or modals
  hideGuestDrawer();
  
  // Update sidebar active state
  document.querySelectorAll(".sidebar-menu .menu-item").forEach(item => {
    item.classList.remove("active");
  });
  const activeNavItem = document.getElementById(`nav-${view}`);
  if (activeNavItem) activeNavItem.classList.add("active");

  // Close sidebar on mobile after navigation
  const sidebar = document.getElementById("app-sidebar");
  sidebar.classList.remove("open");

  // Update Page Title
  const titleMap = {
    'dashboard': 'Operations Dashboard',
    'guests': 'Guest & Lead Directory',
    'bookings': 'Bookings Manager',
    'concierge': 'Concierge Task Desk',
    'operators': 'Partner Operators Portal'
  };
  document.getElementById("page-title").textContent = titleMap[view] || 'Los Cabos Tours';

  // Render View HTML
  const viewContainer = document.getElementById("app-view");
  
  if (view === 'dashboard') {
    renderDashboardView(viewContainer);
  } else if (view === 'guests') {
    renderGuestsView(viewContainer);
  } else if (view === 'bookings') {
    renderBookingsView(viewContainer);
  } else if (view === 'concierge') {
    renderConciergeView(viewContainer);
  } else if (view === 'operators') {
    renderOperatorsView(viewContainer);
  }
  
  updateHeaderCounters();
};

// ================= VIEW RENDERERS =================

// 1. Dashboard View
function renderDashboardView(container) {
  const stats = window.CaboDB.getDashboardStats();
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  // Get activities happening today (Arrivals, Departures, Scheduled Bookings)
  const todayStr = new Date().toISOString().split('T')[0];
  const guests = window.CaboDB.getGuests();
  const bookings = window.CaboDB.getBookings();
  const tasks = window.CaboDB.getTasks();

  const arrivals = guests.filter(g => g.checkIn === todayStr);
  const departures = guests.filter(g => g.checkOut === todayStr);
  const toursToday = bookings.filter(b => b.date === todayStr && b.bookingStatus !== 'Cancelled');
  const tasksToday = tasks.filter(t => t.date === todayStr);

  let activityItemsHTML = '';

  if (arrivals.length === 0 && departures.length === 0 && toursToday.length === 0 && tasksToday.length === 0) {
    activityItemsHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); font-style: italic; font-size: 13px;">
        <i class="ti ti-calendar-stats" style="font-size: 24px; color: var(--gold); display: block; margin-bottom: 8px;"></i>
        No activities scheduled for today.
      </div>
    `;
  } else {
    // Render arrivals
    arrivals.forEach(g => {
      activityItemsHTML += `
        <div class="activity-item transfer" onclick="openGuestDrawer('${g.id}')" style="cursor:pointer">
          <div class="activity-time">ARRIVAL</div>
          <div class="activity-details">
            <div class="activity-title">Guest Check-In: ${g.name} (${g.guestsCount} guests)</div>
            <div class="activity-meta">Resort: <strong>${g.hotel}</strong> | Room: ${g.room || 'TBD'}</div>
          </div>
        </div>
      `;
    });

    // Render departures
    departures.forEach(g => {
      activityItemsHTML += `
        <div class="activity-item transfer" onclick="openGuestDrawer('${g.id}')" style="cursor:pointer">
          <div class="activity-time" style="color:var(--coral); background-color:rgba(212,88,26,0.1);">DEPART</div>
          <div class="activity-details">
            <div class="activity-title">Guest Departure: ${g.name}</div>
            <div class="activity-meta">Checking out from <strong>${g.hotel}</strong></div>
          </div>
        </div>
      `;
    });

    // Render tours
    toursToday.forEach(b => {
      activityItemsHTML += `
        <div class="activity-item excursion" onclick="openGuestDrawer('${b.guestId}')" style="cursor:pointer">
          <div class="activity-time">${b.time}</div>
          <div class="activity-details">
            <div class="activity-title">${b.serviceName}</div>
            <div class="activity-meta">Guest: ${b.guestName} | Size: ${b.adultsCount} Ad, ${b.childrenCount} Ch | Operator status: <strong>${b.operatorStatus}</strong></div>
          </div>
        </div>
      `;
    });

    // Render concierge tasks
    tasksToday.forEach(t => {
      activityItemsHTML += `
        <div class="activity-item concierge" onclick="navigate('concierge')" style="cursor:pointer">
          <div class="activity-time" style="color: var(--teal); background-color: rgba(77,184,212,0.1);">TASK</div>
          <div class="activity-details">
            <div class="activity-title">${t.title}</div>
            <div class="activity-meta">Category: ${t.category} | Runner: ${t.assignedTo} | Status: <strong>${t.status}</strong></div>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <!-- Top KPIs Grid -->
    <div class="dashboard-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Gross Revenue</span>
          <div class="kpi-icon-box"><i class="ti ti-cash"></i></div>
        </div>
        <div class="kpi-value">${fmt.format(stats.totalRevenue)}</div>
        <div class="kpi-trend">Confirmed bookings value</div>
      </div>
      
      <div class="kpi-card profit">
        <div class="kpi-header">
          <span class="kpi-label">Agency Commission</span>
          <div class="kpi-icon-box"><i class="ti ti-trending-up"></i></div>
        </div>
        <div class="kpi-value">${fmt.format(stats.totalProfit)}</div>
        <div class="kpi-trend">Net profit margin generated</div>
      </div>
      
      <div class="kpi-card guests">
        <div class="kpi-header">
          <span class="kpi-label">Guests in Town</span>
          <div class="kpi-icon-box"><i class="ti ti-users"></i></div>
        </div>
        <div class="kpi-value">${stats.activeGuests}</div>
        <div class="kpi-trend">Currently staying in Cabo</div>
      </div>
      
      <div class="kpi-card alerts">
        <div class="kpi-header">
          <span class="kpi-label">Action Required</span>
          <div class="kpi-icon-box"><i class="ti ti-alert-triangle"></i></div>
        </div>
        <div class="kpi-value">${stats.pendingOperatorConfirmations + stats.pendingPayments}</div>
        <div class="kpi-trend">
          <span class="down">${stats.pendingOperatorConfirmations}</span> partner vouchers | 
          <span class="down">${stats.pendingPayments}</span> unpaid balances
        </div>
      </div>
    </div>

    <!-- Charts and Schedule Dashboard Columns -->
    <div class="dashboard-layout">
      
      <!-- Charts Col -->
      <div>
        <div class="chart-section">
          <div class="section-header">
            <h2 class="serif" style="font-size:13px; color:var(--gold);">Excursion Revenue Trend</h2>
          </div>
          <div class="chart-container">
            <canvas id="chart-revenue"></canvas>
          </div>
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
          <div class="chart-section">
            <div class="section-header">
              <h2 class="serif" style="font-size:12px; color:var(--gold);">Service Mix Shares</h2>
            </div>
            <div class="chart-container" style="height:200px;">
              <canvas id="chart-categories"></canvas>
            </div>
          </div>
          
          <div class="chart-section">
            <div class="section-header">
              <h2 class="serif" style="font-size:12px; color:var(--gold);">Top Operator Share</h2>
            </div>
            <div class="chart-container" style="height:200px;">
              <canvas id="chart-operators"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Today's Schedule Col -->
      <div class="today-panel">
        <h2 class="serif" style="font-size:13px; color:var(--gold); border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">Happening Today</h2>
        <div class="activity-list">
          ${activityItemsHTML}
        </div>
      </div>
      
    </div>
  `;

  // Draw the actual charts
  setTimeout(() => {
    window.CaboCharts.renderAll();
  }, 100);
}

// 2. Guest Directory View
function renderGuestsView(container) {
  const guests = window.CaboDB.getGuests();
  const resorts = window.CaboDB.getResorts();

  // Populate resort filter options
  let resortFilterOptions = '<option value="All">All Resorts</option>';
  resorts.forEach(r => {
    resortFilterOptions += `<option value="${r}" ${guestHotelFilter === r ? 'selected' : ''}>${r}</option>`;
  });

  // Apply filters
  const filteredGuests = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(guestSearchQuery.toLowerCase()) || 
                          g.email.toLowerCase().includes(guestSearchQuery.toLowerCase()) ||
                          g.phone.includes(guestSearchQuery);
    const matchesHotel = guestHotelFilter === 'All' || g.hotel === guestHotelFilter;
    const matchesStatus = guestStatusFilter === 'All' || g.status === guestStatusFilter;
    
    return matchesSearch && matchesHotel && matchesStatus;
  });

  let tableRowsHTML = '';
  if (filteredGuests.length === 0) {
    tableRowsHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted); font-style: italic;">
          No guest records found matching your filters.
        </td>
      </tr>
    `;
  } else {
    filteredGuests.forEach(g => {
      let badgeClass = 'badge-lead';
      if (g.status === 'Active') badgeClass = 'badge-active';
      if (g.status === 'Confirmed') badgeClass = 'badge-confirmed';
      if (g.status === 'Completed') badgeClass = 'badge-completed';

      tableRowsHTML += `
        <tr>
          <td><strong>${g.id}</strong></td>
          <td>
            <div style="font-weight: 600; color: var(--text);">${g.name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${g.email}</div>
          </td>
          <td>${g.phone}</td>
          <td>
            <div style="font-weight: 500;">${g.hotel}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${g.room || 'TBD'}</div>
          </td>
          <td>${g.checkIn} to ${g.checkOut}</td>
          <td><span class="badge ${badgeClass}">${g.status}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button onclick="openGuestDrawer('${g.id}')" class="btn btn-secondary btn-icon-only" title="View Details"><i class="ti ti-eye"></i></button>
              <button onclick="openGuestWizard('${g.id}')" class="btn btn-secondary btn-icon-only" title="Edit Profile"><i class="ti ti-edit"></i></button>
              <button onclick="openBookingWizard('${g.id}')" class="btn btn-primary btn-icon-only" title="Book Excursion"><i class="ti ti-plus"></i></button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div class="filter-row">
      <div class="search-box">
        <i class="ti ti-search"></i>
        <input type="text" class="search-input" id="search-guest-input" placeholder="Search by name, email, phone..." value="${guestSearchQuery}" oninput="handleGuestSearch(this.value)" />
      </div>
      <div class="filter-actions">
        <select class="select-filter" onchange="handleGuestHotelFilter(this.value)">
          ${resortFilterOptions}
        </select>
        <select class="select-filter" onchange="handleGuestStatusFilter(this.value)">
          <option value="All" ${guestStatusFilter === 'All' ? 'selected' : ''}>All Statuses</option>
          <option value="Lead" ${guestStatusFilter === 'Lead' ? 'selected' : ''}>Leads / Inquiries</option>
          <option value="Confirmed" ${guestStatusFilter === 'Confirmed' ? 'selected' : ''}>Confirmed Bookings</option>
          <option value="Active" ${guestStatusFilter === 'Active' ? 'selected' : ''}>Active In Town</option>
          <option value="Completed" ${guestStatusFilter === 'Completed' ? 'selected' : ''}>Trip Completed</option>
        </select>
        <button onclick="openGuestWizard()" class="btn btn-primary"><i class="ti ti-user-plus"></i> Add Guest Lead</button>
      </div>
    </div>

    <div class="table-container">
      <table class="cabo-table">
        <thead>
          <tr>
            <th>Guest ID</th>
            <th>Name &amp; Email</th>
            <th>WhatsApp/Phone</th>
            <th>Resort Stay</th>
            <th>Travel Dates</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHTML}
        </tbody>
      </table>
    </div>
  `;
}

// 3. Bookings Manager View
function renderBookingsView(container) {
  const bookings = window.CaboDB.getBookings();
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  // Apply filters
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.guestName.toLowerCase().includes(bookingSearchQuery.toLowerCase()) || 
                          b.serviceName.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                          b.id.toLowerCase().includes(bookingSearchQuery.toLowerCase());
    const matchesStatus = bookingStatusFilter === 'All' || b.bookingStatus === bookingStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  let tableRowsHTML = '';
  if (filteredBookings.length === 0) {
    tableRowsHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted); font-style: italic;">
          No bookings match your filter criteria.
        </td>
      </tr>
    `;
  } else {
    filteredBookings.forEach(b => {
      const guest = window.CaboDB.getGuest(b.guestId);
      const waLink = guest ? window.CaboComponents.getWhatsAppLink(b, guest) : "#";

      let statusClass = 'badge-pending';
      if (b.bookingStatus === 'Confirmed') statusClass = 'badge-confirmed';
      if (b.bookingStatus === 'Completed') statusClass = 'badge-completed';
      if (b.bookingStatus === 'Cancelled') statusClass = 'badge-cancelled';

      let payClass = 'badge-pending';
      if (b.paymentStatus === 'Paid') payClass = 'badge-confirmed';
      if (b.paymentStatus === 'Deposit') payClass = 'badge-active';

      let opClass = 'badge-pending';
      if (b.operatorStatus === 'Confirmed') opClass = 'badge-confirmed';

      tableRowsHTML += `
        <tr>
          <td><strong>${b.id}</strong></td>
          <td>
            <a onclick="openGuestDrawer('${b.guestId}')" style="cursor:pointer; font-weight:600; color:var(--gold); text-decoration:none;">${b.guestName}</a>
            <div style="font-size: 11px; color: var(--text-muted);">${guest ? guest.hotel : ''}</div>
          </td>
          <td>
            <div style="font-weight: 500; color: var(--text);">${b.serviceName}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${b.date} @ ${b.time}</div>
          </td>
          <td>${b.adultsCount} Ad, ${b.childrenCount} Ch</td>
          <td><strong style="color:var(--text);">${fmt.format(b.totalPrice)}</strong></td>
          <td><span class="badge ${payClass}">${b.paymentStatus}</span></td>
          <td><span class="badge ${opClass}">${b.operatorStatus}</span></td>
          <td><span class="badge ${statusClass}">${b.bookingStatus}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <a href="${waLink}" target="_blank" class="btn btn-whatsapp btn-icon-only" title="Send WhatsApp Confirmation"><i class="ti ti-brand-whatsapp"></i></a>
              <button onclick="openBookingWizard('', '${b.id}')" class="btn btn-secondary btn-icon-only" title="Edit Booking"><i class="ti ti-edit"></i></button>
              <button onclick="confirmDeleteBooking('${b.id}')" class="btn btn-danger btn-icon-only" title="Delete Booking"><i class="ti ti-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div class="filter-row">
      <div class="search-box">
        <i class="ti ti-search"></i>
        <input type="text" class="search-input" id="search-booking-input" placeholder="Search by booking ID, guest, or tour name..." value="${bookingSearchQuery}" oninput="handleBookingSearch(this.value)" />
      </div>
      <div class="filter-actions">
        <select class="select-filter" onchange="handleBookingStatusFilter(this.value)">
          <option value="All" ${bookingStatusFilter === 'All' ? 'selected' : ''}>All Booking Statuses</option>
          <option value="Pending" ${bookingStatusFilter === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Confirmed" ${bookingStatusFilter === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="Completed" ${bookingStatusFilter === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${bookingStatusFilter === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
        <button onclick="openBookingWizard()" class="btn btn-primary"><i class="ti ti-plus"></i> New Excursion Booking</button>
      </div>
    </div>

    <div class="table-container">
      <table class="cabo-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Guest &amp; Hotel</th>
            <th>Excursion Details</th>
            <th>Tickets</th>
            <th>Price</th>
            <th>Payment</th>
            <th>Partner Conf.</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHTML}
        </tbody>
      </table>
    </div>
  `;
}

// 4. Concierge Task Desk (Kanban View)
function renderConciergeView(container) {
  const tasks = window.CaboDB.getTasks();

  // Filter tasks into columns
  const todoTasks = tasks.filter(t => t.status === 'Todo');
  const progressTasks = tasks.filter(t => t.status === 'In Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  // HTML helpers for rendering cards in column
  const buildColumnCards = (columnTasks) => {
    if (columnTasks.length === 0) {
      return `<div style="text-align: center; padding: 30px 10px; color: var(--text-muted); font-size:11px; font-style:italic;">No active requests.</div>`;
    }

    return columnTasks.map(t => {
      let tagClass = 'tag-other';
      if (t.category === 'Transfer') tagClass = 'tag-transfer';
      if (t.category === 'Food Delivery') tagClass = 'tag-food';
      if (t.category === 'Spa') tagClass = 'tag-spa';
      if (t.category === 'Chef') tagClass = 'tag-chef';
      if (t.category === 'Grocery') tagClass = 'tag-grocery';

      // Navigation arrows or move actions
      let actionButtons = '';
      if (t.status === 'Todo') {
        actionButtons = `<button class="btn-task-move" onclick="moveTaskStatus('${t.id}', 'In Progress')">Start Service <i class="ti ti-arrow-narrow-right"></i></button>`;
      } else if (t.status === 'In Progress') {
        actionButtons = `
          <button class="btn-task-move" onclick="moveTaskStatus('${t.id}', 'Todo')"><i class="ti ti-arrow-narrow-left"></i> Todo</button>
          <button class="btn-task-move" onclick="moveTaskStatus('${t.id}', 'Completed')" style="color:var(--teal)">Complete ✓</button>
        `;
      } else if (t.status === 'Completed') {
        actionButtons = `<button class="btn-task-move" onclick="moveTaskStatus('${t.id}', 'In Progress')"><i class="ti ti-refresh"></i> Re-Open</button>`;
      }

      return `
        <div class="task-card" id="card-${t.id}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="task-tag ${tagClass}">${t.category}</span>
            <span style="font-size:10px; color:var(--text-muted);">${t.date}</span>
          </div>
          <h3 class="task-title">${t.title}</h3>
          <p class="task-desc">${t.description}</p>
          <div class="task-footer">
            <span class="task-guest" onclick="openGuestDrawer('${t.guestId}')" style="cursor:pointer"><i class="ti ti-user"></i> ${t.guestName}</span>
            <span class="task-assignee"><i class="ti ti-user-check"></i> ${t.assignedTo.split(' ')[0]}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; border-top:1px dashed rgba(255,255,255,0.05); padding-top:8px;">
            <div class="task-actions-compact">
              ${actionButtons}
            </div>
            <div style="display:flex; gap:6px;">
              <button onclick="openTaskWizard('', '${t.id}')" style="background:none; border:none; color:var(--gold); cursor:pointer;" title="Edit"><i class="ti ti-edit"></i></button>
              <button onclick="confirmDeleteTask('${t.id}')" style="background:none; border:none; color:var(--coral); cursor:pointer;" title="Delete"><i class="ti ti-trash"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  };

  container.innerHTML = `
    <div class="filter-row">
      <div style="font-size:13px; color:var(--text-muted);">
        Visual dispatch console for coordinating airport vehicles, spa runners, grocery deliveries, and in-villa chef requests.
      </div>
      <div>
        <button onclick="openTaskWizard()" class="btn btn-primary"><i class="ti ti-plus"></i> Create Concierge Ticket</button>
      </div>
    </div>

    <div class="kanban-board">
      
      <!-- Todo Column -->
      <div class="kanban-column">
        <div class="column-header">
          <span class="column-title todo">Open Requests</span>
          <span class="column-count">${todoTasks.length}</span>
        </div>
        <div class="kanban-cards-wrapper" id="col-todo">
          ${buildColumnCards(todoTasks)}
        </div>
      </div>

      <!-- In Progress Column -->
      <div class="kanban-column">
        <div class="column-header">
          <span class="column-title progress">In Coordination</span>
          <span class="column-count">${progressTasks.length}</span>
        </div>
        <div class="kanban-cards-wrapper" id="col-progress">
          ${buildColumnCards(progressTasks)}
        </div>
      </div>

      <!-- Completed Column -->
      <div class="kanban-column">
        <div class="column-header">
          <span class="column-title done">Delivered &amp; Paid</span>
          <span class="column-count">${completedTasks.length}</span>
        </div>
        <div class="kanban-cards-wrapper" id="col-completed">
          ${buildColumnCards(completedTasks)}
        </div>
      </div>

    </div>
  `;
}

// 5. Operators View
function renderOperatorsView(container) {
  const operators = window.CaboDB.getOperators();
  const bookings = window.CaboDB.getBookings()
    .filter(b => b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed');

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  // Compile operator performance statistics
  const operatorStats = operators.map(op => {
    const opBookings = bookings.filter(b => b.operatorId === op.id);
    const volume = opBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const cost = opBookings.reduce((sum, b) => sum + b.netCost, 0);
    const margin = opBookings.reduce((sum, b) => sum + b.profitMargin, 0);
    
    return {
      ...op,
      bookingsCount: opBookings.length,
      volume,
      cost,
      margin
    };
  });

  // Calculate gross agency totals
  const totalVolume = operatorStats.reduce((sum, op) => sum + op.volume, 0);
  const totalMargin = operatorStats.reduce((sum, op) => sum + op.margin, 0);

  let tableRowsHTML = '';
  operatorStats.forEach(op => {
    tableRowsHTML += `
      <tr>
        <td><strong>${op.name}</strong></td>
        <td>${op.phone}</td>
        <td>${op.email}</td>
        <td style="text-align:center;">${op.bookingsCount}</td>
        <td>${op.netRate * 100}%</td>
        <td><strong style="color:var(--text);">${fmt.format(op.volume)}</strong></td>
        <td>${fmt.format(op.cost)}</td>
        <td><span style="color:var(--teal); font-weight:600;">${fmt.format(op.margin)}</span></td>
      </tr>
    `;
  });

  container.innerHTML = `
    <!-- Performance Summary KPIs -->
    <div class="op-card-grid">
      <div class="op-mini-card">
        <span class="op-mini-title">Total Active Partners</span>
        <span class="op-mini-val">${operators.length} Operators</span>
      </div>
      <div class="op-mini-card">
        <span class="op-mini-title">Gross Booking Volume Sent</span>
        <span class="op-mini-val">${fmt.format(totalVolume)}</span>
      </div>
      <div class="op-mini-card">
        <span class="op-mini-title">Consolidated Commission Earnings</span>
        <span class="op-mini-val" style="color: var(--teal);">${fmt.format(totalMargin)}</span>
      </div>
    </div>

    <div class="table-container">
      <table class="cabo-table">
        <thead>
          <tr>
            <th>Operator Name</th>
            <th>Direct Dispatch Phone</th>
            <th>Voucher Email</th>
            <th style="text-align:center;">Confirmed Bookings</th>
            <th>Contract Net Rate</th>
            <th>Retail Volume</th>
            <th>Net Operator Cost</th>
            <th>Agency Profit</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHTML}
        </tbody>
      </table>
    </div>
  `;
}

// ================= ACTION HANDLERS =================

// Search / Filtering Handlers
window.handleGuestSearch = (query) => {
  guestSearchQuery = query;
  renderGuestsView(document.getElementById("app-view"));
};

window.handleGuestHotelFilter = (val) => {
  guestHotelFilter = val;
  renderGuestsView(document.getElementById("app-view"));
};

window.handleGuestStatusFilter = (val) => {
  guestStatusFilter = val;
  renderGuestsView(document.getElementById("app-view"));
};

window.handleBookingSearch = (query) => {
  bookingSearchQuery = query;
  renderBookingsView(document.getElementById("app-view"));
};

window.handleBookingStatusFilter = (val) => {
  bookingStatusFilter = val;
  renderBookingsView(document.getElementById("app-view"));
};

// Kanban column updater
window.moveTaskStatus = (taskId, newStatus) => {
  const task = window.CaboDB.getTask(taskId);
  if (task) {
    task.status = newStatus;
    window.CaboDB.saveTask(task);
    window.CaboComponents.showToast(`Task "${task.title}" updated to ${newStatus}`, "success");
    renderConciergeView(document.getElementById("app-view"));
    updateHeaderCounters();
  }
};

// Drawer Controls
window.openGuestDrawer = (guestId) => {
  window.CaboComponents.renderGuestProfileDrawer(guestId);
  document.getElementById("guest-drawer-overlay").classList.add("open");
};

window.hideGuestDrawer = () => {
  document.getElementById("guest-drawer-overlay").classList.remove("open");
};

window.closeGuestDrawer = (event) => {
  if (event.target === document.getElementById("guest-drawer-overlay")) {
    hideGuestDrawer();
  }
};

// ================= CREATE / EDIT MODALS LIFECYCLE =================

// --- Guest Modal ---
window.openGuestWizard = (guestId = '') => {
  const modal = document.getElementById("guest-modal-overlay");
  const title = document.getElementById("guest-modal-title");
  const form = document.getElementById("guest-form");
  
  // Prep resort options
  const resortSelect = document.getElementById("form-guest-hotel");
  resortSelect.innerHTML = window.CaboDB.getResorts().map(r => `<option value="${r}">${r}</option>`).join("");

  form.reset();

  if (guestId) {
    title.textContent = "Edit Guest Profile";
    const guest = window.CaboDB.getGuest(guestId);
    if (guest) {
      document.getElementById("form-guest-id").value = guest.id;
      document.getElementById("form-guest-name").value = guest.name;
      document.getElementById("form-guest-email").value = guest.email;
      document.getElementById("form-guest-phone").value = guest.phone;
      document.getElementById("form-guest-hotel").value = guest.hotel;
      document.getElementById("form-guest-room").value = guest.room || '';
      document.getElementById("form-guest-checkin").value = guest.checkIn;
      document.getElementById("form-guest-checkout").value = guest.checkOut;
      document.getElementById("form-guest-count").value = guest.guestsCount;
      document.getElementById("form-guest-status").value = guest.status;
      document.getElementById("form-guest-notes").value = guest.notes || '';
    }
  } else {
    title.textContent = "Add Guest Lead";
    document.getElementById("form-guest-id").value = '';
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById("form-guest-checkin").value = todayStr;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById("form-guest-checkout").value = tomorrow.toISOString().split('T')[0];
  }

  modal.classList.add("open");
};

window.closeGuestModal = () => {
  document.getElementById("guest-modal-overlay").classList.remove("open");
};

window.handleGuestSubmit = (e) => {
  e.preventDefault();
  
  const guest = {
    id: document.getElementById("form-guest-id").value || null,
    name: document.getElementById("form-guest-name").value,
    email: document.getElementById("form-guest-email").value,
    phone: document.getElementById("form-guest-phone").value,
    hotel: document.getElementById("form-guest-hotel").value,
    room: document.getElementById("form-guest-room").value,
    checkIn: document.getElementById("form-guest-checkin").value,
    checkOut: document.getElementById("form-guest-checkout").value,
    guestsCount: parseInt(document.getElementById("form-guest-count").value),
    status: document.getElementById("form-guest-status").value,
    notes: document.getElementById("form-guest-notes").value
  };

  const saved = window.CaboDB.saveGuest(guest);
  window.CaboComponents.showToast(`Guest profile for "${saved.name}" saved successfully!`, "success");
  closeGuestModal();
  
  // Refresh views
  if (currentView === 'guests') renderGuestsView(document.getElementById("app-view"));
  if (currentView === 'dashboard') renderDashboardView(document.getElementById("app-view"));
  
  updateHeaderCounters();
  
  // If drawer is open, refresh it too
  const drawerOverlay = document.getElementById("guest-drawer-overlay");
  if (drawerOverlay.classList.contains("open")) {
    openGuestDrawer(saved.id);
  }
};

window.confirmDeleteGuest = (id) => {
  const g = window.CaboDB.getGuest(id);
  if (g && confirm(`Are you sure you want to delete ${g.name}? All their excursions, airport transfers, and concierge logs will be permanently deleted.`)) {
    window.CaboDB.deleteGuest(id);
    window.CaboComponents.showToast("Guest profile successfully deleted.", "info");
    hideGuestDrawer();
    if (currentView === 'guests') renderGuestsView(document.getElementById("app-view"));
    if (currentView === 'dashboard') renderDashboardView(document.getElementById("app-view"));
    updateHeaderCounters();
  }
};


// --- Booking Modal (Excursions) ---
window.openBookingWizard = (guestId = '', bookingId = '') => {
  const modal = document.getElementById("booking-modal-overlay");
  const title = document.getElementById("booking-modal-title");
  const form = document.getElementById("booking-form");

  // Populate guest selectors
  const guests = window.CaboDB.getGuests();
  const guestSelect = document.getElementById("form-booking-guest");
  guestSelect.innerHTML = guests.map(g => `<option value="${g.id}">${g.name} (${g.hotel})</option>`).join("");

  // Populate Catalog excursions
  const catalog = window.CaboDB.getCatalog();
  const itemSelect = document.getElementById("form-booking-item");
  itemSelect.innerHTML = catalog.map(item => `<option value="${item.id}">[${item.category}] ${item.name} - Ad:$${item.adultPrice}</option>`).join("");

  form.reset();

  if (bookingId) {
    title.textContent = "Edit Excursion Booking";
    const b = window.CaboDB.getBooking(bookingId);
    if (b) {
      document.getElementById("form-booking-id").value = b.id;
      document.getElementById("form-booking-guest").value = b.guestId;
      document.getElementById("form-booking-item").value = b.catalogItemId;
      document.getElementById("form-booking-date").value = b.date;
      document.getElementById("form-booking-time").value = b.time;
      document.getElementById("form-booking-adults").value = b.adultsCount;
      document.getElementById("form-booking-children").value = b.childrenCount;
      document.getElementById("form-booking-status").value = b.bookingStatus;
      document.getElementById("form-booking-payment").value = b.paymentStatus;
      document.getElementById("form-booking-operator").value = b.operatorStatus;
      document.getElementById("form-booking-customprice").value = b.totalPrice || '';
      document.getElementById("form-booking-notes").value = b.notes || '';
    }
  } else {
    title.textContent = "Book New Excursion";
    document.getElementById("form-booking-id").value = '';
    
    if (guestId) {
      document.getElementById("form-booking-guest").value = guestId;
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById("form-booking-date").value = tomorrow.toISOString().split('T')[0];
  }

  modal.classList.add("open");
  updateBookingCalculator();
};

window.closeBookingModal = () => {
  document.getElementById("booking-modal-overlay").classList.remove("open");
};

window.updateBookingCalculator = () => {
  const itemId = document.getElementById("form-booking-item").value;
  const adults = parseInt(document.getElementById("form-booking-adults").value) || 0;
  const children = parseInt(document.getElementById("form-booking-children").value) || 0;
  const customVal = document.getElementById("form-booking-customprice").value;
  const overridePrice = customVal !== '' ? parseFloat(customVal) : null;

  window.CaboComponents.renderBookingCalculator(itemId, adults, children, overridePrice);
};

window.handleBookingSubmit = (e) => {
  e.preventDefault();
  
  const guestId = document.getElementById("form-booking-guest").value;
  const guest = window.CaboDB.getGuest(guestId);
  const catalogItemId = document.getElementById("form-booking-item").value;
  const catalogItem = window.CaboDB.getCatalogItem(catalogItemId);

  const customPriceInput = document.getElementById("form-booking-customprice").value;

  const booking = {
    id: document.getElementById("form-booking-id").value || null,
    guestId: guestId,
    guestName: guest ? guest.name : "Unknown",
    catalogItemId: catalogItemId,
    serviceName: catalogItem ? catalogItem.name : "Unknown Excursion",
    date: document.getElementById("form-booking-date").value,
    time: document.getElementById("form-booking-time").value,
    adultsCount: parseInt(document.getElementById("form-booking-adults").value) || 0,
    childrenCount: parseInt(document.getElementById("form-booking-children").value) || 0,
    bookingStatus: document.getElementById("form-booking-status").value,
    paymentStatus: document.getElementById("form-booking-payment").value,
    operatorStatus: document.getElementById("form-booking-operator").value,
    totalPrice: customPriceInput !== '' ? parseFloat(customPriceInput) : null,
    notes: document.getElementById("form-booking-notes").value
  };

  const saved = window.CaboDB.saveBooking(booking);
  window.CaboComponents.showToast(`Booking for "${saved.serviceName}" saved!`, "success");
  closeBookingModal();

  // Refresh active views
  if (currentView === 'bookings') renderBookingsView(document.getElementById("app-view"));
  if (currentView === 'dashboard') renderDashboardView(document.getElementById("app-view"));
  
  updateHeaderCounters();

  // Refresh drawer if active
  const drawerOverlay = document.getElementById("guest-drawer-overlay");
  if (drawerOverlay.classList.contains("open") && guestId) {
    openGuestDrawer(guestId);
  }
};

window.confirmDeleteBooking = (bookingId, guestId = '') => {
  if (confirm("Are you sure you want to cancel and delete this booking?")) {
    window.CaboDB.deleteBooking(bookingId);
    window.CaboComponents.showToast("Booking successfully removed.", "info");
    
    if (currentView === 'bookings') renderBookingsView(document.getElementById("app-view"));
    if (currentView === 'dashboard') renderDashboardView(document.getElementById("app-view"));
    updateHeaderCounters();

    // Refresh drawer if active
    if (guestId) {
      openGuestDrawer(guestId);
    }
  }
};


// --- Concierge Task Modal ---
window.openTaskWizard = (guestId = '', taskId = '') => {
  const modal = document.getElementById("task-modal-overlay");
  const title = document.getElementById("task-modal-title");
  const form = document.getElementById("task-form");

  // Populate guest select list
  const guests = window.CaboDB.getGuests();
  const guestSelect = document.getElementById("form-task-guest");
  guestSelect.innerHTML = guests.map(g => `<option value="${g.id}">${g.name} (${g.hotel})</option>`).join("");

  form.reset();

  if (taskId) {
    title.textContent = "Edit Concierge Request";
    const t = window.CaboDB.getTask(taskId);
    if (t) {
      document.getElementById("form-task-id").value = t.id;
      document.getElementById("form-task-guest").value = t.guestId;
      document.getElementById("form-task-category").value = t.category;
      document.getElementById("form-task-title").value = t.title;
      document.getElementById("form-task-date").value = t.date;
      document.getElementById("form-task-time").value = t.time;
      document.getElementById("form-task-status").value = t.status;
      document.getElementById("form-task-assignee").value = t.assignedTo;
      document.getElementById("form-task-desc").value = t.description;
    }
  } else {
    title.textContent = "New Concierge Ticket";
    document.getElementById("form-task-id").value = '';
    
    if (guestId) {
      document.getElementById("form-task-guest").value = guestId;
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById("form-task-date").value = todayStr;
  }

  modal.classList.add("open");
};

window.closeTaskModal = () => {
  document.getElementById("task-modal-overlay").classList.remove("open");
};

window.handleTaskSubmit = (e) => {
  e.preventDefault();

  const guestId = document.getElementById("form-task-guest").value;
  const guest = window.CaboDB.getGuest(guestId);

  const task = {
    id: document.getElementById("form-task-id").value || null,
    guestId: guestId,
    guestName: guest ? guest.name : "Unknown Guest",
    category: document.getElementById("form-task-category").value,
    title: document.getElementById("form-task-title").value,
    date: document.getElementById("form-task-date").value,
    time: document.getElementById("form-task-time").value,
    status: document.getElementById("form-task-status").value,
    assignedTo: document.getElementById("form-task-assignee").value,
    description: document.getElementById("form-task-desc").value
  };

  const saved = window.CaboDB.saveTask(task);
  window.CaboComponents.showToast(`Concierge request for "${saved.guestName}" registered.`, "success");
  closeTaskModal();

  // Refresh active views
  if (currentView === 'concierge') renderConciergeView(document.getElementById("app-view"));
  if (currentView === 'dashboard') renderDashboardView(document.getElementById("app-view"));
  
  updateHeaderCounters();

  // Refresh drawer if active
  const drawerOverlay = document.getElementById("guest-drawer-overlay");
  if (drawerOverlay.classList.contains("open") && guestId) {
    openGuestDrawer(guestId);
  }
};

window.confirmDeleteTask = (taskId, guestId = '') => {
  if (confirm("Are you sure you want to delete this concierge task?")) {
    window.CaboDB.deleteTask(taskId);
    window.CaboComponents.showToast("Task removed.", "info");
    
    if (currentView === 'concierge') renderConciergeView(document.getElementById("app-view"));
    if (currentView === 'dashboard') renderDashboardView(document.getElementById("app-view"));
    updateHeaderCounters();

    // Refresh drawer if active
    if (guestId) {
      openGuestDrawer(guestId);
    }
  }
};
