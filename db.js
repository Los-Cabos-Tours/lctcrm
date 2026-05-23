// CaboCRM Mock Database and State Management Engine
// Uses LocalStorage to persist all records between reloads

const DEFAULT_RESORTS = [
  "Pueblo Bonito Sunset Beach",
  "Villa del Palmar Beach Resort & Spa",
  "Playa Grande Resort & Grand Spa",
  "Grand Solmar Land's End",
  "Hotel Tesoro Los Cabos",
  "Pueblo Bonito Blanco & Rosé",
  "The Cape, A Thompson Hotel",
  "One&Only Palmilla"
];

const DEFAULT_OPERATORS = [
  { id: "cactus", name: "Cactus ATVs & Outdoor", phone: "+52 624 143 0122", email: "bookings@cactusatvs.com", netRate: 0.75 },
  { id: "cabo-adv", name: "Cabo Adventures", phone: "+52 624 173 9500", email: "reservations@cabo-adventures.com", netRate: 0.70 },
  { id: "wild-canyon", name: "Wild Canyon Eko Park", phone: "+52 624 144 4433", email: "vouchers@wildcanyon.com.mx", netRate: 0.72 },
  { id: "cabo-escape", name: "Cabo Escape Catamarans", phone: "+52 624 105 0177", email: "info@caboescape.com", netRate: 0.75 },
  { id: "eco-cat", name: "Eco Cat Sails", phone: "+52 624 143 7066", email: "ecocat@ecocatsails.com", netRate: 0.80 },
  { id: "fishing-charters", name: "Solmar Sport Fishing", phone: "+52 624 143 0646", email: "sportfishing@solmar.com", netRate: 0.80 },
  { id: "transport", name: "Cabo Shuttle Transfers", phone: "+52 624 122 0988", email: "dispatch@caboshuttle.com", netRate: 0.85 }
];

const CATALOG_ITEMS = [
  // Cactus ATVs
  { id: "c-atv-single", name: "Single ATV Desert Tour", operatorId: "cactus", category: "ATV & Off-road", adultPrice: 130, childPrice: 0 },
  { id: "c-atv-double", name: "Double ATV Desert Tour", operatorId: "cactus", category: "ATV & Off-road", adultPrice: 170, childPrice: 0 },
  { id: "c-utv-double", name: "UTV Buggy Double Ride", operatorId: "cactus", category: "ATV & Off-road", adultPrice: 280, childPrice: 0 },
  { id: "c-camel", name: "Pacific Beach Camel Ride", operatorId: "cactus", category: "Culture & food", adultPrice: 110, childPrice: 75 },

  // Cabo Adventures
  { id: "ca-dolphins", name: "Dolphin Swim Adventure", operatorId: "cabo-adv", category: "Water sports", adultPrice: 149, childPrice: 99 },
  { id: "ca-whale", name: "Luxury Whale Watching Cruise", operatorId: "cabo-adv", category: "Whale watching", adultPrice: 99, childPrice: 69 },
  { id: "ca-snorkeling", name: "Cabo Pulmo Snorkeling Expedition", operatorId: "cabo-adv", category: "Water sports", adultPrice: 189, childPrice: 139 },
  { id: "ca-sailing", name: "Luxury Sunset Sailing", operatorId: "cabo-adv", category: "Yacht & Sailing", adultPrice: 119, childPrice: 119 },

  // Wild Canyon
  { id: "wc-ziplines", name: "Monster Ziplines (8 Cables)", operatorId: "wild-canyon", category: "ATV & Off-road", adultPrice: 145, childPrice: 145 },
  { id: "wc-atv", name: "Off-Road ATV Canyon Race", operatorId: "wild-canyon", category: "ATV & Off-road", adultPrice: 155, childPrice: 0 },
  { id: "wc-bridge", name: "Suspension Bridge Tour & Animal Sanctuary", operatorId: "wild-canyon", category: "extras", adultPrice: 40, childPrice: 30 },

  // Cabo Escape
  { id: "ce-sunset-party", name: "Sunset Fajitas & Open Bar DJ Cruise", operatorId: "cabo-escape", category: "Yacht & Sailing", adultPrice: 89, childPrice: 45 },
  { id: "ce-snorkel-lunch", name: "Snorkel Fun Cruise with Open Bar & Lunch", operatorId: "cabo-escape", category: "Water sports", adultPrice: 79, childPrice: 39 },

  // Eco Cat
  { id: "ec-cat-arch", name: "Eco Cat Lands End Arch Tour", operatorId: "eco-cat", category: "Yacht & Sailing", adultPrice: 65, childPrice: 32 },
  { id: "ec-cat-sunset", name: "Eco Cat Sunset Catamaran Sail", operatorId: "eco-cat", category: "Yacht & Sailing", adultPrice: 85, childPrice: 42 },

  // Sport Fishing
  { id: "sf-panga", name: "Local 23ft Panga Charter (5 hours)", operatorId: "fishing-charters", category: "Sport fishing", adultPrice: 320, childPrice: 320 },
  { id: "sf-cruiser", name: "31ft Sport Fishing Cruiser (8 hours)", operatorId: "fishing-charters", category: "Sport fishing", adultPrice: 750, childPrice: 750 },
  { id: "sf-yacht-fish", name: "Luxury 45ft Sport Fisher Yacht", operatorId: "fishing-charters", category: "Sport fishing", adultPrice: 1450, childPrice: 1450 },

  // Transportation
  { id: "tr-airport-private", name: "Airport to Resort Private Suburbar/Van", operatorId: "transport", category: "extras", adultPrice: 120, childPrice: 120 },
  { id: "tr-airport-round", name: "Round-Trip Airport Private Van (Up to 7 pax)", operatorId: "transport", category: "extras", adultPrice: 220, childPrice: 220 }
];

// Helper to calculate booking totals, net cost, and profit margin
function calculateBookingFinancials(catalogItemId, adultsCount, childrenCount, customPrice = null) {
  const item = CATALOG_ITEMS.find(i => i.id === catalogItemId);
  if (!item) return { total: 0, netCost: 0, profit: 0, operatorId: "" };

  const operator = DEFAULT_OPERATORS.find(o => o.id === item.operatorId);
  const netRate = operator ? operator.netRate : 0.75;

  let total = 0;
  if (customPrice !== null) {
    total = customPrice;
  } else {
    total = (item.adultPrice * adultsCount) + (item.childPrice * childrenCount);
  }

  const netCost = parseFloat((total * netRate).toFixed(2));
  const profit = parseFloat((total - netCost).toFixed(2));

  return {
    total,
    netCost,
    profit,
    operatorId: item.operatorId
  };
}

// Seed initial database
function initializeDB() {
  if (localStorage.getItem("cabo_crm_initialized")) return;

  const sampleGuests = [
    {
      id: "G-1001",
      name: "Marcus Sterling",
      email: "msterling@outlook.com",
      phone: "+1 (512) 555-8839",
      hotel: "Pueblo Bonito Sunset Beach",
      room: "Suite 4124",
      checkIn: "2026-05-20",
      checkOut: "2026-05-27",
      guestsCount: 4,
      status: "Active",
      notes: "Celebrating 10th anniversary. Prefers top-shelf tequila, ocean views, and requested late checkout."
    },
    {
      id: "G-1002",
      name: "Sarah Henderson",
      email: "sarah.h@gmail.com",
      phone: "+1 (415) 321-4990",
      hotel: "Villa del Palmar Beach Resort & Spa",
      room: "Villas 210B",
      checkIn: "2026-05-22",
      checkOut: "2026-05-29",
      guestsCount: 2,
      status: "Active",
      notes: "Extremely active, interested in snorkeling and heavy off-road ATV rides. Vegetarian meal requests."
    },
    {
      id: "G-1003",
      name: "Robert Vance",
      email: "rvance@vancerefrig.com",
      phone: "+1 (717) 888-2931",
      hotel: "Playa Grande Resort & Grand Spa",
      room: "Penthouse 12",
      checkIn: "2026-05-24",
      checkOut: "2026-05-31",
      guestsCount: 5,
      status: "Confirmed",
      notes: "VIP guest booking. Family trip. Requesting golf advice and private charter setups."
    },
    {
      id: "G-1004",
      name: "Diana Ross",
      email: "diana.ross@musicmgmt.com",
      phone: "+1 (212) 678-9021",
      hotel: "The Cape, A Thompson Hotel",
      room: "Suite 602",
      checkIn: "2026-05-18",
      checkOut: "2026-05-23",
      guestsCount: 2,
      status: "Active",
      notes: "High-end influencer. Prefers premium spa experiences and private transport."
    },
    {
      id: "G-1005",
      name: "Kevin Malone",
      email: "kmalone@dundermifflin.com",
      phone: "+1 (570) 555-1234",
      hotel: "Hotel Tesoro Los Cabos",
      room: "Room 304",
      checkIn: "2026-05-15",
      checkOut: "2026-05-21",
      guestsCount: 1,
      status: "Completed",
      notes: "In Cabo for a short fishing trip. Highly satisfied with the sport cruiser booking."
    },
    {
      id: "G-1006",
      name: "Elena Rostova",
      email: "elena_ros@yandex.ru",
      phone: "+44 7911 123456",
      hotel: "Grand Solmar Land's End",
      room: "Room 1805",
      checkIn: "2026-05-26",
      checkOut: "2026-06-02",
      guestsCount: 3,
      status: "Lead",
      notes: "Inquiring about Sunset Sailing and airport shuttle pricing. Has not committed to excursions yet."
    }
  ];

  const sampleBookings = [
    {
      id: "B-2001",
      guestId: "G-1001",
      guestName: "Marcus Sterling",
      catalogItemId: "tr-airport-round",
      serviceName: "Round-Trip Airport Private Van",
      date: "2026-05-20",
      time: "14:30",
      adultsCount: 4,
      childrenCount: 0,
      totalPrice: 220.00,
      netCost: 187.00,
      profitMargin: 33.00,
      operatorId: "transport",
      paymentStatus: "Paid",
      bookingStatus: "Completed",
      operatorStatus: "Confirmed",
      voucherSent: true,
      notes: "Driver met them at terminal 2. Very clean arrival."
    },
    {
      id: "B-2002",
      guestId: "G-1001",
      guestName: "Marcus Sterling",
      catalogItemId: "ca-sailing",
      serviceName: "Luxury Sunset Sailing",
      date: "2026-05-23",
      time: "17:00",
      adultsCount: 4,
      childrenCount: 0,
      totalPrice: 476.00,
      netCost: 333.20,
      profitMargin: 142.80,
      operatorId: "cabo-adv",
      paymentStatus: "Paid",
      bookingStatus: "Confirmed",
      operatorStatus: "Confirmed",
      voucherSent: true,
      notes: "Special champagne toast requested for anniversary."
    },
    {
      id: "B-2003",
      guestId: "G-1001",
      guestName: "Marcus Sterling",
      catalogItemId: "c-atv-double",
      serviceName: "Double ATV Desert Tour",
      date: "2026-05-25",
      time: "09:00",
      adultsCount: 4,
      childrenCount: 0,
      totalPrice: 340.00,
      netCost: 255.00,
      profitMargin: 85.00,
      operatorId: "cactus",
      paymentStatus: "Deposit",
      bookingStatus: "Confirmed",
      operatorStatus: "Confirmed",
      voucherSent: true,
      notes: "Arranged hotel lobby pickup at 08:15 AM."
    },
    {
      id: "B-2004",
      guestId: "G-1002",
      guestName: "Sarah Henderson",
      catalogItemId: "tr-airport-round",
      serviceName: "Round-Trip Airport Private Van",
      date: "2026-05-22",
      time: "11:45",
      adultsCount: 2,
      childrenCount: 0,
      totalPrice: 220.00,
      netCost: 187.00,
      profitMargin: 33.00,
      operatorId: "transport",
      paymentStatus: "Paid",
      bookingStatus: "Completed",
      operatorStatus: "Confirmed",
      voucherSent: true,
      notes: "Arrived on flight AA1290."
    },
    {
      id: "B-2005",
      guestId: "G-1002",
      guestName: "Sarah Henderson",
      catalogItemId: "wc-ziplines",
      serviceName: "Monster Ziplines (8 Cables)",
      date: "2026-05-24",
      time: "10:00",
      adultsCount: 2,
      childrenCount: 0,
      totalPrice: 290.00,
      netCost: 208.80,
      profitMargin: 81.20,
      operatorId: "wild-canyon",
      paymentStatus: "Unpaid",
      bookingStatus: "Confirmed",
      operatorStatus: "Pending",
      voucherSent: false,
      notes: "Operator emailed; waiting for confirmation number."
    },
    {
      id: "B-2006",
      guestId: "G-1005",
      guestName: "Kevin Malone",
      catalogItemId: "sf-cruiser",
      serviceName: "31ft Sport Fishing Cruiser (8 hours)",
      date: "2026-05-17",
      time: "06:30",
      adultsCount: 1,
      childrenCount: 0,
      totalPrice: 750.00,
      netCost: 600.00,
      profitMargin: 150.00,
      operatorId: "fishing-charters",
      paymentStatus: "Paid",
      bookingStatus: "Completed",
      operatorStatus: "Confirmed",
      voucherSent: true,
      notes: "Caught 2 mahi-mahi and a marlin. Had a great charter."
    },
    {
      id: "B-2007",
      guestId: "G-1003",
      guestName: "Robert Vance",
      catalogItemId: "sf-yacht-fish",
      serviceName: "Luxury 45ft Sport Fisher Yacht",
      date: "2026-05-26",
      time: "06:00",
      adultsCount: 5,
      childrenCount: 0,
      totalPrice: 1450.00,
      netCost: 1160.00,
      profitMargin: 290.00,
      operatorId: "fishing-charters",
      paymentStatus: "Deposit",
      bookingStatus: "Confirmed",
      operatorStatus: "Confirmed",
      voucherSent: true,
      notes: "Private gourmet lunch pre-stocked. VIP guest."
    },
    {
      id: "B-2008",
      guestId: "G-1004",
      guestName: "Diana Ross",
      catalogItemId: "ca-sailing",
      serviceName: "Luxury Sunset Sailing",
      date: "2026-05-19",
      time: "17:30",
      adultsCount: 2,
      childrenCount: 0,
      totalPrice: 238.00,
      netCost: 166.60,
      profitMargin: 71.40,
      operatorId: "cabo-adv",
      paymentStatus: "Paid",
      bookingStatus: "Completed",
      operatorStatus: "Confirmed",
      voucherSent: true,
      notes: "Enjoyed it. Promoted on Instagram."
    }
  ];

  const sampleTasks = [
    {
      id: "T-3001",
      guestId: "G-1001",
      guestName: "Marcus Sterling",
      title: "Deliver Tequila Welcome Pack",
      category: "Grocery",
      date: "2026-05-20",
      time: "15:00",
      description: "Deliver premium reposado bottle + limes/salt to Pueblo Bonito Room 4124 upon check-in.",
      status: "Completed",
      assignedTo: "Carlos (Runner)"
    },
    {
      id: "T-3002",
      guestId: "G-1002",
      guestName: "Sarah Henderson",
      title: "Book In-Villa Massage (2 pax)",
      category: "Spa",
      date: "2026-05-24",
      time: "16:00",
      description: "Arrange two 80-minute deep tissue massages in Villa 210B. Sol y Mar Spa contacted.",
      status: "In Progress",
      assignedTo: "Ana (Concierge)"
    },
    {
      id: "T-3003",
      guestId: "G-1001",
      guestName: "Marcus Sterling",
      title: "Airport Departure Pickup Confirm",
      category: "Transfer",
      date: "2026-05-26",
      time: "11:00",
      description: "Verify flight departure details and dispatch Cabo Shuttle van to Pueblo Bonito lobby for 12:00 PM pickup.",
      status: "Todo",
      assignedTo: "Carlos (Runner)"
    },
    {
      id: "T-3004",
      guestId: "G-1003",
      guestName: "Robert Vance",
      title: "El Farallon Reservation Setup",
      category: "Food Delivery",
      date: "2026-05-25",
      time: "19:30",
      description: "Book cliffside table for 5 guests. Cliffside ocean view required. Card details given to restaurant.",
      status: "Todo",
      assignedTo: "Ana (Concierge)"
    },
    {
      id: "T-3005",
      guestId: "G-1004",
      guestName: "Diana Ross",
      title: "Private Chef & Yacht Stocking",
      category: "Chef",
      date: "2026-05-21",
      time: "12:00",
      description: "Stock charter yacht with specific organic snacks, champagne, and allocate Chef Hector for villa dinner.",
      status: "Completed",
      assignedTo: "Ana (Concierge)"
    }
  ];

  localStorage.setItem("cabo_resorts", JSON.stringify(DEFAULT_RESORTS));
  localStorage.setItem("cabo_operators", JSON.stringify(DEFAULT_OPERATORS));
  localStorage.setItem("cabo_guests", JSON.stringify(sampleGuests));
  localStorage.setItem("cabo_bookings", JSON.stringify(sampleBookings));
  localStorage.setItem("cabo_tasks", JSON.stringify(sampleTasks));
  localStorage.setItem("cabo_crm_initialized", "true");
}

// DB Engine API
const db = {
  // Initialization
  init: initializeDB,

  // Reset database back to default state
  reset: () => {
    localStorage.removeItem("cabo_crm_initialized");
    localStorage.removeItem("cabo_resorts");
    localStorage.removeItem("cabo_operators");
    localStorage.removeItem("cabo_guests");
    localStorage.removeItem("cabo_bookings");
    localStorage.removeItem("cabo_tasks");
    initializeDB();
  },

  // Resorts
  getResorts: () => JSON.parse(localStorage.getItem("cabo_resorts") || "[]"),

  // Catalog / Tours
  getCatalog: () => CATALOG_ITEMS,
  getCatalogItem: (id) => CATALOG_ITEMS.find(item => item.id === id),

  // Operators
  getOperators: () => JSON.parse(localStorage.getItem("cabo_operators") || "[]"),
  getOperator: (id) => {
    const operators = JSON.parse(localStorage.getItem("cabo_operators") || "[]");
    return operators.find(op => op.id === id);
  },

  // Guests CRUD
  getGuests: () => JSON.parse(localStorage.getItem("cabo_guests") || "[]"),
  getGuest: (id) => {
    const guests = JSON.parse(localStorage.getItem("cabo_guests") || "[]");
    return guests.find(g => g.id === id);
  },
  saveGuest: (guest) => {
    const guests = db.getGuests();
    if (!guest.id) {
      // Create new auto ID
      const maxIdNum = guests.reduce((max, g) => {
        const num = parseInt(g.id.replace("G-", ""));
        return num > max ? num : max;
      }, 1000);
      guest.id = `G-${maxIdNum + 1}`;
      guests.push(guest);
    } else {
      const idx = guests.findIndex(g => g.id === guest.id);
      if (idx !== -1) {
        guests[idx] = guest;
      } else {
        guests.push(guest);
      }
    }
    localStorage.setItem("cabo_guests", JSON.stringify(guests));
    return guest;
  },
  deleteGuest: (id) => {
    let guests = db.getGuests();
    guests = guests.filter(g => g.id !== id);
    localStorage.setItem("cabo_guests", JSON.stringify(guests));

    // Cascade delete bookings and tasks or re-assign? Let's delete bookings for simplicity
    let bookings = db.getBookings();
    bookings = bookings.filter(b => b.guestId !== id);
    localStorage.setItem("cabo_bookings", JSON.stringify(bookings));

    let tasks = db.getTasks();
    tasks = tasks.filter(t => t.guestId !== id);
    localStorage.setItem("cabo_tasks", JSON.stringify(tasks));
  },

  // Bookings CRUD
  getBookings: () => JSON.parse(localStorage.getItem("cabo_bookings") || "[]"),
  getBooking: (id) => {
    const bookings = JSON.parse(localStorage.getItem("cabo_bookings") || "[]");
    return bookings.find(b => b.id === id);
  },
  getGuestBookings: (guestId) => {
    const bookings = db.getBookings();
    return bookings.filter(b => b.guestId === guestId);
  },
  saveBooking: (booking) => {
    const bookings = db.getBookings();

    // Auto-calculate financial rates
    const financials = calculateBookingFinancials(
      booking.catalogItemId,
      booking.adultsCount,
      booking.childrenCount,
      booking.totalPrice || null
    );

    booking.totalPrice = financials.total;
    booking.netCost = financials.netCost;
    booking.profitMargin = financials.profit;
    booking.operatorId = financials.operatorId;

    if (!booking.id) {
      const maxIdNum = bookings.reduce((max, b) => {
        const num = parseInt(b.id.replace("B-", ""));
        return num > max ? num : max;
      }, 2000);
      booking.id = `B-${maxIdNum + 1}`;
      bookings.push(booking);
    } else {
      const idx = bookings.findIndex(b => b.id === booking.id);
      if (idx !== -1) {
        bookings[idx] = booking;
      } else {
        bookings.push(booking);
      }
    }
    localStorage.setItem("cabo_bookings", JSON.stringify(bookings));
    return booking;
  },
  deleteBooking: (id) => {
    let bookings = db.getBookings();
    bookings = bookings.filter(b => b.id !== id);
    localStorage.setItem("cabo_bookings", JSON.stringify(bookings));
  },

  // Tasks CRUD
  getTasks: () => JSON.parse(localStorage.getItem("cabo_tasks") || "[]"),
  getTask: (id) => {
    const tasks = JSON.parse(localStorage.getItem("cabo_tasks") || "[]");
    return tasks.find(t => t.id === id);
  },
  getGuestTasks: (guestId) => {
    const tasks = db.getTasks();
    return tasks.filter(t => t.guestId === guestId);
  },
  saveTask: (task) => {
    const tasks = db.getTasks();
    if (!task.id) {
      const maxIdNum = tasks.reduce((max, t) => {
        const num = parseInt(t.id.replace("T-", ""));
        return num > max ? num : max;
      }, 3000);
      task.id = `T-${maxIdNum + 1}`;
      tasks.push(task);
    } else {
      const idx = tasks.findIndex(t => t.id === task.id);
      if (idx !== -1) {
        tasks[idx] = task;
      } else {
        tasks.push(task);
      }
    }
    localStorage.setItem("cabo_tasks", JSON.stringify(tasks));
    return task;
  },
  deleteTask: (id) => {
    let tasks = db.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem("cabo_tasks", JSON.stringify(tasks));
  },

  // Dashboard Aggregates
  getDashboardStats: () => {
    const bookings = db.getBookings();
    const guests = db.getGuests();
    const tasks = db.getTasks();

    // 1. Total revenue & profit (confirmed and completed bookings)
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalConfirmedBookings = 0;

    bookings.forEach(b => {
      if (b.bookingStatus === "Confirmed" || b.bookingStatus === "Completed") {
        totalRevenue += b.totalPrice;
        totalProfit += b.profitMargin;
        totalConfirmedBookings++;
      }
    });

    // 2. Active Guests count
    const activeGuestsCount = guests.filter(g => g.status === "Active").length;

    // 3. Pending confirmation issues (Pending operator approval OR pending payment on confirmed tours)
    const pendingOperatorCount = bookings.filter(b => b.operatorStatus === "Pending" && b.bookingStatus !== "Cancelled").length;
    const pendingPaymentsCount = bookings.filter(b => b.paymentStatus !== "Paid" && b.bookingStatus === "Confirmed").length;

    // 4. Concierge active tasks
    const activeTasksCount = tasks.filter(t => t.status !== "Completed").length;

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      activeGuests: activeGuestsCount,
      pendingOperatorConfirmations: pendingOperatorCount,
      pendingPayments: pendingPaymentsCount,
      activeTasks: activeTasksCount,
      bookingsCount: bookings.length,
      confirmedBookingsCount: totalConfirmedBookings
    };
  }
};

// Auto-run DB init on load
db.init();

window.CaboDB = db; // Export to global namespace
