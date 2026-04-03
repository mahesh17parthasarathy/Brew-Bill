/**
 * =============================================
 * dashboard.js – Dashboard & Analytics
 * Brew & Bill Coffee POS
 * =============================================
 *
 * Handles:
 *  - KPI stat cards (today orders, revenue, total)
 *  - Weekly revenue bar chart (Chart.js)
 *  - Category sales doughnut chart
 *  - Top-selling items list
 *  - Recent orders table
 */

const Dashboard = (function () {

  // -----------------------------------------
  // STORAGE KEYS
  // -----------------------------------------
  const ORDERS_KEY = 'brewbill_orders';

  // -----------------------------------------
  // Chart instances (stored to allow re-rendering)
  // -----------------------------------------
  let revenueChart  = null;
  let categoryChart = null;

  // -----------------------------------------
  // PRIVATE: Get all orders
  // -----------------------------------------
  function getOrders() {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  }

  // -----------------------------------------
  // PRIVATE: Format currency
  // -----------------------------------------
  function fmt(n) {
    return '₹' + parseFloat(n).toFixed(2);
  }

  // -----------------------------------------
  // PRIVATE: Get today's date string (YYYY-MM-DD)
  // -----------------------------------------
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  // -----------------------------------------
  // PRIVATE: Get date string N days ago
  // -----------------------------------------
  function daysAgoStr(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  // -----------------------------------------
  // PRIVATE: Short day label
  // -----------------------------------------
  function shortDay(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' });
  }

  // -----------------------------------------
  // PUBLIC: Load & render all dashboard data
  // -----------------------------------------
  function loadDashboard() {
    const orders = getOrders();
    const today  = todayStr();

    // Today's orders & revenue
    const todayOrders  = orders.filter(o => o.dateISO && o.dateISO.startsWith(today));
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);

    document.getElementById('statTodayOrders').textContent  = todayOrders.length;
    document.getElementById('statTodayRevenue').textContent = fmt(todayRevenue);
    document.getElementById('statTotalOrders').textContent  = orders.length;
    document.getElementById('statTotalRevenue').textContent = fmt(totalRevenue);

    renderRevenueChart(orders);
    renderCategoryChart(orders);
    renderTopItems(orders);
    renderRecentOrders(orders);
  }

  // -----------------------------------------
  // PRIVATE: Weekly revenue bar chart
  // -----------------------------------------
  function renderRevenueChart(orders) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    // Build last-7-days data
    const days    = [];
    const revenue = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = daysAgoStr(i);
      const dayOrders = orders.filter(o => o.dateISO && o.dateISO.startsWith(dStr));
      days.push(shortDay(dStr));
      revenue.push(parseFloat(dayOrders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)));
    }

    // Destroy existing chart to avoid canvas conflicts
    if (revenueChart) { revenueChart.destroy(); revenueChart = null; }

    revenueChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Revenue (₹)',
          data:  revenue,
          backgroundColor: revenue.map((v, i) => i === 6 ? 'rgba(200,150,62,0.9)' : 'rgba(111,78,55,0.6)'),
          borderColor:     revenue.map((v, i) => i === 6 ? '#C8963E' : '#6F4E37'),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' ₹' + ctx.parsed.y.toFixed(2)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              callback: v => '₹' + v,
              font: { size: 11 }
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  }

  // -----------------------------------------
  // PRIVATE: Category sales doughnut
  // -----------------------------------------
  function renderCategoryChart(orders) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    // Aggregate sales by category
    const catMap = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const cat = item.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + item.qty;
      });
    });

    const labels = Object.keys(catMap);
    const data   = Object.values(catMap);

    // Coffee-themed color palette
    const COLORS = [
      '#6F4E37','#C8963E','#8B6347','#a67832','#3d2416',
      '#4a3321','#d4a05a','#2C1810','#e8b96e','#7a5230'
    ];

    if (categoryChart) { categoryChart.destroy(); categoryChart = null; }

    if (!labels.length) {
      ctx.parentElement.innerHTML = '<div class="empty-state"><i class="fa fa-chart-pie"></i><p>No sales data yet</p></div>';
      return;
    }

    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} items`
            }
          }
        }
      }
    });
  }

  // -----------------------------------------
  // PRIVATE: Top selling items
  // -----------------------------------------
  function renderTopItems(orders) {
    const container = document.getElementById('topItemsList');
    if (!container) return;

    // Aggregate item quantities
    const itemMap = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = { name: item.name, emoji: item.emoji || '☕', count: 0 };
        }
        itemMap[item.name].count += item.qty;
      });
    });

    const sorted   = Object.values(itemMap).sort((a, b) => b.count - a.count).slice(0, 5);
    const maxCount = sorted[0]?.count || 1;

    if (!sorted.length) {
      container.innerHTML = '<div class="empty-state"><i class="fa fa-mug-hot"></i><p>No orders yet</p></div>';
      return;
    }

    const rankLabels = ['gold', 'silver', 'bronze'];

    container.innerHTML = sorted.map((item, i) => {
      const pct = Math.round((item.count / maxCount) * 100);
      return `
        <div class="top-item-row">
          <div class="top-item-rank ${rankLabels[i] || ''}">${i + 1}</div>
          <div class="top-item-info">
            <div class="name">${item.emoji} ${item.name}</div>
            <div class="top-item-bar-wrap">
              <div class="top-item-bar" style="width: ${pct}%"></div>
            </div>
          </div>
          <div class="top-item-count">${item.count} sold</div>
        </div>
      `;
    }).join('');
  }

  // -----------------------------------------
  // PRIVATE: Recent orders table (last 8)
  // -----------------------------------------
  function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (!tbody) return;

    const recent = [...orders].reverse().slice(0, 8);

    if (!recent.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:2rem">No orders yet</td></tr>';
      return;
    }

    tbody.innerHTML = recent.map(order => `
      <tr>
        <td><span class="badge badge-primary">${order.id}</span></td>
        <td>${order.time || ''} ${order.date || ''}</td>
        <td>${(order.items || []).length} item(s)</td>
        <td class="fw-700 text-accent">${fmt(order.total || 0)}</td>
      </tr>
    `).join('');
  }

  // -----------------------------------------
  // CLOCK & DATE
  // -----------------------------------------
  function startClock() {
    function update() {
      const now    = new Date();
      const timeEl = document.getElementById('headerTime');
      const dateEl = document.getElementById('headerDate');
      if (timeEl) timeEl.innerHTML = `<i class="fa fa-clock"></i> ${now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}`;
      if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
    }
    update();
    setInterval(update, 1000);
  }

  // -----------------------------------------
  // SIDEBAR TOGGLE
  // -----------------------------------------
  window.toggleSidebar = function () {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
  };

  // -----------------------------------------
  // INIT
  // -----------------------------------------
  function init() {
    if (!Auth.requireAuth()) return;
    Auth.populateUserUI();
    startClock();
    loadDashboard();

    // Auto-refresh dashboard every 30 seconds
    setInterval(loadDashboard, 30000);
  }

  document.addEventListener('DOMContentLoaded', init);

  return { loadDashboard };

})();
