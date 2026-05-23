// CaboCRM Charting and Analytics Engine
// Integrates with Chart.js to render metrics with brand styling

const charts = {
  instances: {},

  // Helper to destroy a chart instance if it already exists
  destroyChart: (id) => {
    if (charts.instances[id]) {
      charts.instances[id].destroy();
      delete charts.instances[id];
    }
  },

  // Renders all dashboard visualizations
  renderAll: () => {
    const bookings = window.CaboDB.getBookings()
      .filter(b => b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed');

    charts.renderRevenueTrend(bookings);
    charts.renderCategoryDistribution(bookings);
    charts.renderOperatorShares(bookings);
  },

  // 1. Line/Bar Chart for Daily Revenue Trend
  renderRevenueTrend: (bookings) => {
    const canvasId = "chart-revenue";
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    charts.destroyChart(canvasId);

    // Group bookings by date (sort ascending)
    const dateMap = {};
    bookings.forEach(b => {
      if (!dateMap[b.date]) dateMap[b.date] = 0;
      dateMap[b.date] += b.totalPrice;
    });

    const sortedDates = Object.keys(dateMap).sort();
    const dataValues = sortedDates.map(d => dateMap[d]);
    // Human-friendly date labels (e.g. May 20)
    const labelValues = sortedDates.map(d => {
      const parts = d.split('-');
      if (parts.length !== 3) return d;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`;
    });

    // Provide default fallback data if database is empty
    const finalLabels = labelValues.length > 0 ? labelValues : ["May 18", "May 19", "May 20", "May 21", "May 22", "May 23"];
    const finalData = dataValues.length > 0 ? dataValues : [1200, 1500, 950, 2200, 1800, 3100];

    charts.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: finalLabels,
        datasets: [{
          label: 'Revenue (USD)',
          data: finalData,
          borderColor: '#C9A84C', // Gold
          backgroundColor: 'rgba(201, 168, 76, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointBackgroundColor: '#C9A84C',
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F2040',
            titleColor: '#C9A84C',
            bodyColor: '#F0EAD6',
            borderColor: 'rgba(201, 168, 76, 0.25)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#A8B8C8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { 
              color: '#A8B8C8',
              font: { size: 10 },
              callback: (value) => '$' + value
            }
          }
        }
      }
    });
  },

  // 2. Doughnut Chart for Excursion Categories
  renderCategoryDistribution: (bookings) => {
    const canvasId = "chart-categories";
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    charts.destroyChart(canvasId);

    // Group into high-level categories
    const categories = {
      "Yachts & Charters": 0,
      "Land Excursions": 0,
      "Water Sports": 0,
      "Transfers & Extras": 0
    };

    bookings.forEach(b => {
      const item = window.CaboDB.getCatalogItem(b.catalogItemId);
      if (!item) return;

      if (item.category === "Yacht & Sailing" || item.category === "Sport fishing" || item.category === "Whale watching") {
        categories["Yachts & Charters"] += b.totalPrice;
      } else if (item.category === "ATV & Off-road" || item.category === "Culture & food") {
        categories["Land Excursions"] += b.totalPrice;
      } else if (item.category === "Water sports") {
        categories["Water Sports"] += b.totalPrice;
      } else {
        categories["Transfers & Extras"] += b.totalPrice;
      }
    });

    const labels = Object.keys(categories);
    const data = Object.values(categories);

    // Color schema matching corporate branding
    const segmentColors = [
      '#C9A84C', // Gold
      '#4DB8D4', // Teal / Ocean
      '#D4581A', // Coral
      '#1A3050'  // Light Navy
    ];

    charts.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: segmentColors,
          borderColor: '#0A1628',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#A8B8C8',
              font: { size: 10, family: 'Inter' },
              padding: 12,
              boxWidth: 10
            }
          },
          tooltip: {
            backgroundColor: '#0F2040',
            titleColor: '#C9A84C',
            bodyColor: '#F0EAD6',
            borderColor: 'rgba(201, 168, 76, 0.25)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const value = context.raw;
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return ` ${context.label}: $${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  },

  // 3. Bar Chart showing Operator Sales share
  renderOperatorShares: (bookings) => {
    const canvasId = "chart-operators";
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    charts.destroyChart(canvasId);

    const operators = window.CaboDB.getOperators();
    const opRevenue = {};
    
    // Seed keys
    operators.forEach(op => {
      opRevenue[op.name] = 0;
    });

    bookings.forEach(b => {
      const op = operators.find(o => o.id === b.operatorId);
      if (op) {
        opRevenue[op.name] += b.totalPrice;
      }
    });

    // Sort operators by revenue
    const sortedOps = Object.keys(opRevenue).sort((a, b) => opRevenue[b] - opRevenue[a]);
    const labels = sortedOps.slice(0, 5); // top 5
    const data = labels.map(l => opRevenue[l]);

    charts.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Excursions Booked (USD)',
          data: data,
          backgroundColor: 'rgba(77, 184, 212, 0.65)', // Teal with opacity
          borderColor: '#4DB8D4',
          borderWidth: 1.5,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y', // horizontal bar chart
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F2040',
            titleColor: '#C9A84C',
            bodyColor: '#F0EAD6',
            borderColor: 'rgba(201, 168, 76, 0.25)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { 
              color: '#A8B8C8',
              font: { size: 9 },
              callback: (value) => '$' + value
            }
          },
          y: {
            grid: { display: false },
            ticks: { 
              color: '#A8B8C8',
              font: { size: 9 }
            }
          }
        }
      }
    });
  }
};

window.CaboCharts = charts;
