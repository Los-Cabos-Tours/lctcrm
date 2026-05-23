// CaboCRM UI Components Helper Library

const components = {
  // Toast notification alert system
  showToast: (message, type = "success") => {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let iconClass = "ti-circle-check";
    if (type === "error") iconClass = "ti-alert-triangle";
    if (type === "info") iconClass = "ti-info-circle";

    toast.innerHTML = `
      <i class="ti ${iconClass}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Slide and fade out animation trigger
    setTimeout(() => {
      toast.style.animation = "none";
      toast.offsetHeight; // trigger reflow
      toast.style.transition = "all 0.5s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-20px)";
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, 3500);
  },

  // Generates a link to directly text guest booking summaries on WhatsApp
  getWhatsAppLink: (booking, guest) => {
    if (!guest || !guest.phone) return "#";
    
    // Normalize phone number (remove spaces, dashes, parentheses)
    const cleanPhone = guest.phone.replace(/[^\d+]/g, "");
    
    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const formattedPrice = currencyFormatter.format(booking.totalPrice);
    
    const text = 
`🌴 *LOS CABOS TOURS OPERATIONS* 🌴
Hello *${guest.name}*, this is Ana from Los Cabos Tours.

We are excited to confirm your upcoming excursion in Cabo! Here are your booking details:

🏷 *Service:* ${booking.serviceName}
📅 *Date:* ${booking.date}
⏰ *Time:* ${booking.time}
👥 *Size:* ${booking.adultsCount} Adults ${booking.childrenCount > 0 ? `, ${booking.childrenCount} Children` : ""}
📍 *Lobby Pickup:* ${guest.hotel} ${guest.room ? `(Room/Villa ${guest.room})` : ""}
💵 *Amount:* ${formattedPrice} USD
💳 *Status:* ${booking.paymentStatus === 'Paid' ? '✅ Paid' : `⚠️ ${booking.paymentStatus}`}

Please let us know if you need to coordinate any airport transfers, in-villa dining/spa bookings, or grocery pre-stocking! 

See you in Cabo! ☀️`;

    return `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(text)}`;
  },

  // Renders the live booking pricing calculator inside the modal wizard
  renderBookingCalculator: (catalogItemId, adults, children, customPrice = null) => {
    const item = window.CaboDB.getCatalogItem(catalogItemId);
    const container = document.getElementById("booking-calculator-widget");
    if (!container || !item) {
      if (container) container.innerHTML = "";
      return;
    }

    const op = window.CaboDB.getOperator(item.operatorId);
    const netRatePercent = op ? op.netRate * 100 : 75;

    let subtotal = (item.adultPrice * adults) + (item.childPrice * children);
    let isOverridden = false;
    let finalTotal = subtotal;

    if (customPrice !== null && customPrice !== "" && !isNaN(customPrice) && customPrice > 0) {
      finalTotal = parseFloat(customPrice);
      isOverridden = true;
    }

    const netCost = parseFloat((finalTotal * (netRatePercent / 100)).toFixed(2));
    const profit = parseFloat((finalTotal - netCost).toFixed(2));
    const marginPercent = finalTotal > 0 ? Math.round((profit / finalTotal) * 100) : 0;

    container.innerHTML = `
      <div class="calc-card">
        <div class="calc-row">
          <span class="profile-label">Standard Retail Calculation</span>
          <span class="profile-val">${adults} × $${item.adultPrice} + ${children} × $${item.childPrice} = $${subtotal} USD</span>
        </div>
        ${isOverridden ? `
        <div class="calc-row">
          <span class="profile-label" style="color: var(--coral);">Custom Rate Applied (Override)</span>
          <span class="profile-val" style="color: var(--coral);">$${finalTotal.toFixed(2)} USD</span>
        </div>
        ` : ''}
        <div class="calc-divider"></div>
        <div class="calc-row grand-total">
          <span>Client Total Price (USD)</span>
          <span>$${finalTotal.toFixed(2)}</span>
        </div>
        <div class="calc-row">
          <span class="profile-label">Operator Net Fee to ${op ? op.name : 'Partner'} (${netRatePercent}%)</span>
          <span class="profile-val">$${netCost.toFixed(2)}</span>
        </div>
        <div class="calc-row profit-row">
          <span>Agency Net Profit Margin (${100 - netRatePercent}%)</span>
          <span>$${profit.toFixed(2)} (${marginPercent}% margin)</span>
        </div>
      </div>
    `;
  },

  // Renders the profile side panel for the selected guest
  renderGuestProfileDrawer: (guestId) => {
    const guest = window.CaboDB.getGuest(guestId);
    const bookings = window.CaboDB.getGuestBookings(guestId);
    const tasks = window.CaboDB.getGuestTasks(guestId);

    const titleEl = document.getElementById("drawer-guest-name");
    const container = document.getElementById("guest-drawer-content");
    
    if (!guest || !container) return;

    titleEl.textContent = guest.name;

    // Build badge status
    let statusClass = "badge-lead";
    if (guest.status === "Active") statusClass = "badge-active";
    if (guest.status === "Confirmed") statusClass = "badge-confirmed";
    if (guest.status === "Completed") statusClass = "badge-completed";

    // Format money helper
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    // Calculate totals
    const totalSpent = bookings
      .filter(b => b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const bookingsHTML = bookings.length === 0 
      ? `<p style="font-size: 12px; color: var(--text-muted); font-style: italic;">No excursions booked yet.</p>`
      : bookings.map(b => {
          const waLink = components.getWhatsAppLink(b, guest);
          return `
            <div class="activity-item ${b.operatorId === 'transport' ? 'transfer' : 'excursion'}" style="margin-bottom: 8px;">
              <div style="width: 100%;">
                <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                  <span class="activity-title" style="font-weight:600; color:var(--text);">${b.serviceName}</span>
                  <span class="activity-time">${b.date}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-muted);">
                  <span>Tickets: ${b.adultsCount} Ad, ${b.childrenCount} Ch | Status: <span class="badge ${b.bookingStatus === 'Confirmed' ? 'badge-confirmed' : b.bookingStatus === 'Completed' ? 'badge-completed' : 'badge-pending'}">${b.bookingStatus}</span></span>
                  <strong style="color:var(--gold);">${fmt.format(b.totalPrice)}</strong>
                </div>
                <div style="margin-top:8px; display:flex; gap:8px;">
                  <a href="${waLink}" target="_blank" class="btn btn-whatsapp btn-icon-only" title="Send WhatsApp Confirmation">
                    <i class="ti ti-brand-whatsapp"></i>
                  </a>
                  <button onclick="openBookingWizard('${guestId}', '${b.id}')" class="btn btn-secondary btn-icon-only" title="Edit Booking">
                    <i class="ti ti-edit"></i>
                  </button>
                  <button onclick="confirmDeleteBooking('${b.id}', '${guestId}')" class="btn btn-danger btn-icon-only" title="Cancel Booking">
                    <i class="ti ti-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("");

    const tasksHTML = tasks.length === 0
      ? `<p style="font-size: 12px; color: var(--text-muted); font-style: italic;">No concierge requests registered.</p>`
      : tasks.map(t => {
          let catTag = "tag-other";
          if (t.category === "Transfer") catTag = "tag-transfer";
          if (t.category === "Food Delivery") catTag = "tag-food";
          if (t.category === "Spa") catTag = "tag-spa";
          if (t.category === "Chef") catTag = "tag-chef";
          if (t.category === "Grocery") catTag = "tag-grocery";
          
          return `
            <div class="task-card" style="margin-bottom: 8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span class="task-tag ${catTag}">${t.category}</span>
                <span class="badge ${t.status === 'Completed' ? 'badge-completed' : t.status === 'In Progress' ? 'badge-confirmed' : 'badge-pending'}">${t.status}</span>
              </div>
              <div class="task-title" style="font-size:12px; font-weight:600; margin-bottom:4px;">${t.title}</div>
              <div class="task-desc" style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">${t.description}</div>
              <div class="task-footer" style="font-size:10px;">
                <span>Scheduled: ${t.date} ${t.time}</span>
                <div style="display:flex; gap:4px;">
                  <button onclick="openTaskWizard('${guestId}', '${t.id}')" style="background:none; border:none; color:var(--gold); cursor:pointer;"><i class="ti ti-edit"></i></button>
                  <button onclick="confirmDeleteTask('${t.id}', '${guestId}')" style="background:none; border:none; color:var(--coral); cursor:pointer;"><i class="ti ti-trash"></i></button>
                </div>
              </div>
            </div>
          `;
        }).join("");

    container.innerHTML = `
      <!-- Status & Actions -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span class="badge ${statusClass}">${guest.status}</span>
        <div style="display:flex; gap:8px;">
          <button onclick="openGuestWizard('${guest.id}')" class="btn btn-secondary btn-icon-only" title="Edit Profile"><i class="ti ti-edit"></i></button>
          <button onclick="confirmDeleteGuest('${guest.id}')" class="btn btn-danger btn-icon-only" title="Delete Profile"><i class="ti ti-trash"></i></button>
        </div>
      </div>

      <!-- Profile Summary Cards -->
      <div class="drawer-section-title">Contact & Hotel Stay</div>
      <div class="guest-profile-summary">
        <div class="profile-row">
          <span class="profile-label">Email Address</span>
          <span class="profile-val">${guest.email}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">WhatsApp/Phone</span>
          <span class="profile-val">${guest.phone}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Hotel / Resort</span>
          <span class="profile-val highlight">${guest.hotel}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Room / Villa</span>
          <span class="profile-val">${guest.room || "TBD"}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Stay Dates</span>
          <span class="profile-val">${guest.checkIn} to ${guest.checkOut}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Total in Party</span>
          <span class="profile-val">${guest.guestsCount} guests</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Total Spent to Date</span>
          <span class="profile-val" style="color:var(--teal); font-weight:700;">${fmt.format(totalSpent)}</span>
        </div>
      </div>

      <!-- Notes -->
      <div class="drawer-section-title">Operational Notes</div>
      <div class="guest-profile-summary" style="font-style: italic; font-size:12px; color:var(--text-muted); line-height: 1.5; padding: 12px 14px;">
        ${guest.notes || "No special requests logged for this guest."}
      </div>

      <!-- Bookings Excursions -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <div class="drawer-section-title" style="margin-bottom:0; border:none; padding:0;">Excursions &amp; Tours</div>
        <button onclick="openBookingWizard('${guest.id}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;">
          <i class="ti ti-plus"></i> Excursion
        </button>
      </div>
      <div style="margin-top: 10px;">
        ${bookingsHTML}
      </div>

      <!-- Concierge Requests -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <div class="drawer-section-title" style="margin-bottom:0; border:none; padding:0;">Concierge Service Desk</div>
        <button onclick="openTaskWizard('${guest.id}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;">
          <i class="ti ti-plus"></i> Request
        </button>
      </div>
      <div style="margin-top: 10px;">
        ${tasksHTML}
      </div>
    `;
  }
};

window.CaboComponents = components;
