/**
 * =============================================
 * history.js – Order History Management
 * Brew & Bill Coffee POS
 * =============================================
 *
 * Handles:
 *  - Display all past orders in a table
 *  - Search by order ID or customer name
 *  - Filter by date
 *  - Sort orders (newest/oldest)
 *  - View order details (invoice modal)
 *  - Print individual order invoices
 *  - Pagination (10 orders per page)
 *  - Clear all orders
 */

const History = (function () {

  // -----------------------------------------
  // CONSTANTS
  // -----------------------------------------
  const ORDERS_KEY = 'brewbill_orders';
  const PAGE_SIZE  = 10;

  // -----------------------------------------
  // STATE
  // -----------------------------------------
  let currentPage     = 1;
  let filteredOrders  = [];

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
    return '₹' + parseFloat(n || 0).toFixed(2);
  }

  // -----------------------------------------
  // PRIVATE: Update stats cards
  // -----------------------------------------
  function updateStats(orders) {
    const today       = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => o.dateISO && o.dateISO.startsWith(today));
    const totalRev    = orders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrder    = orders.length ? totalRev / orders.length : 0;

    document.getElementById('histTotalOrders').textContent  = orders.length;
    document.getElementById('histTotalRevenue').textContent = fmt(totalRev);
    document.getElementById('histTodayOrders').textContent  = todayOrders.length;
    document.getElementById('histAvgOrder').textContent     = fmt(avgOrder);
  }

  // -----------------------------------------
  // PUBLIC: Filter & render (called on input change)
  // -----------------------------------------
  function filter() {
    currentPage = 1; // Reset to page 1 when filter changes
    renderTable();
  }

  // -----------------------------------------
  // PUBLIC: Clear all filter inputs
  // -----------------------------------------
  function clearFilters() {
    const searchEl = document.getElementById('historySearch');
    const dateEl   = document.getElementById('filterDate');
    const sortEl   = document.getElementById('filterSort');
    if (searchEl) searchEl.value = '';
    if (dateEl)   dateEl.value   = '';
    if (sortEl)   sortEl.value   = 'desc';
    filter();
  }

  // -----------------------------------------
  // PRIVATE: Get filtered & sorted orders
  // -----------------------------------------
  function getFilteredOrders() {
    const all      = getOrders();
    const search   = (document.getElementById('historySearch')?.value || '').toLowerCase();
    const dateVal  = document.getElementById('filterDate')?.value || '';
    const sortVal  = document.getElementById('filterSort')?.value || 'desc';

    let orders = all;

    // Search filter
    if (search) {
      orders = orders.filter(o =>
        (o.id || '').toLowerCase().includes(search) ||
        (o.customer || '').toLowerCase().includes(search)
      );
    }

    // Date filter
    if (dateVal) {
      orders = orders.filter(o => o.dateISO && o.dateISO.startsWith(dateVal));
    }

    // Sort
    orders = [...orders].sort((a, b) => {
      const da = new Date(a.dateISO || 0).getTime();
      const db = new Date(b.dateISO || 0).getTime();
      return sortVal === 'asc' ? da - db : db - da;
    });

    return orders;
  }

  // -----------------------------------------
  // PRIVATE: Render the history table
  // -----------------------------------------
  function renderTable() {
    const allOrders    = getOrders();
    filteredOrders     = getFilteredOrders();
    const tbody        = document.getElementById('historyTableBody');
    const start        = (currentPage - 1) * PAGE_SIZE;
    const pageOrders   = filteredOrders.slice(start, start + PAGE_SIZE);

    updateStats(allOrders);

    if (!pageOrders.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-muted" style="padding:3rem">
            <i class="fa fa-inbox" style="font-size:2rem;opacity:.3;display:block;margin-bottom:.8rem;"></i>
            No orders found
          </td>
        </tr>`;
      renderPagination();
      return;
    }

    tbody.innerHTML = pageOrders.map(order => {
      const itemCount = (order.items || []).reduce((s, i) => s + i.qty, 0);
      const itemNames = (order.items || []).slice(0, 2).map(i => i.name).join(', ') +
                        (order.items?.length > 2 ? ` +${order.items.length - 2}` : '');
      return `
        <tr>
          <td><span class="badge badge-primary">${order.id || '-'}</span></td>
          <td>
            <div style="font-size:.88rem;font-weight:600;">${order.date || '-'}</div>
            <div style="font-size:.75rem;color:var(--text-light);">${order.time || ''}</div>
          </td>
          <td>${order.customer || 'Walk-in'}</td>
          <td>
            <div style="font-size:.85rem;">${itemNames}</div>
            <div style="font-size:.75rem;color:var(--text-light);">${itemCount} item(s)</div>
          </td>
          <td>${fmt(order.subtotal)}</td>
          <td>${fmt(order.gst)}</td>
          <td style="color:var(--success);">${order.discount > 0 ? '-' + fmt(order.discount) : '—'}</td>
          <td class="fw-700 text-accent">${fmt(order.total)}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="History.viewDetail('${order.id}')" title="View Invoice">
              <i class="fa fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    renderPagination();
  }

  // -----------------------------------------
  // PRIVATE: Render pagination controls
  // -----------------------------------------
  function renderPagination() {
    const bar       = document.getElementById('paginationBar');
    const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);

    if (totalPages <= 1) {
      bar.innerHTML = '';
      return;
    }

    let html = '';
    // Prev button
    html += `<button class="btn btn-sm btn-outline"
              ${currentPage === 1 ? 'disabled' : ''}
              onclick="History.goToPage(${currentPage - 1})">
              <i class="fa fa-chevron-left"></i>
            </button>`;

    // Page numbers (show max 5 pages)
    const start = Math.max(1, currentPage - 2);
    const end   = Math.min(totalPages, start + 4);

    for (let p = start; p <= end; p++) {
      html += `<button class="btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-outline'}"
                onclick="History.goToPage(${p})">${p}</button>`;
    }

    // Next button
    html += `<button class="btn btn-sm btn-outline"
              ${currentPage === totalPages ? 'disabled' : ''}
              onclick="History.goToPage(${currentPage + 1})">
              <i class="fa fa-chevron-right"></i>
            </button>`;

    html += `<span style="font-size:.8rem; color:var(--text-light); align-self:center; margin-left:.5rem;">
              Page ${currentPage} of ${totalPages} &middot; ${filteredOrders.length} orders
            </span>`;

    bar.innerHTML = html;
  }

  // -----------------------------------------
  // PUBLIC: Go to page
  // -----------------------------------------
  function goToPage(page) {
    const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    // Scroll to top of table
    document.querySelector('.section-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  // -----------------------------------------
  // PUBLIC: View order detail in modal
  // -----------------------------------------
  function viewDetail(orderId) {
    const orders = getOrders();
    const order  = orders.find(o => o.id === orderId);
    if (!order) return;

    // Populate detail modal
    document.getElementById('detOrderId').textContent  = order.id;
    document.getElementById('detDate').textContent     = order.date || '-';
    document.getElementById('detTime').textContent     = order.time || '-';
    document.getElementById('detCustomer').textContent = order.customer || 'Walk-in Customer';
    document.getElementById('detCashier').textContent  = order.cashier || '-';
    document.getElementById('detSubtotal').textContent = fmt(order.subtotal);
    document.getElementById('detGst').textContent      = fmt(order.gst);
    document.getElementById('detDiscount').textContent = fmt(order.discount);
    document.getElementById('detTotal').textContent    = fmt(order.total);

    const tbody = document.getElementById('detItemsBody');
    tbody.innerHTML = (order.items || []).map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${item.emoji || ''} ${item.name}</td>
        <td>${item.qty}</td>
        <td>${fmt(item.price)}</td>
        <td>${fmt(item.price * item.qty)}</td>
      </tr>
    `).join('');

    document.getElementById('orderDetailModal').classList.add('show');
  }

  // -----------------------------------------
  // PUBLIC: Close detail modal
  // -----------------------------------------
  function closeDetail() {
    document.getElementById('orderDetailModal').classList.remove('show');
  }

  // -----------------------------------------
  // PUBLIC: Print detail invoice
  // -----------------------------------------
  function printDetail() {
    window.print();
  }

  // -----------------------------------------
  // PUBLIC: Show clear all confirmation
  // -----------------------------------------
  function clearAllOrders() {
    const orders = getOrders();
    if (!orders.length) {
      showToast('No orders to clear', 'warning');
      return;
    }
    document.getElementById('clearAllModal').classList.add('show');
  }

  // -----------------------------------------
  // PUBLIC: Confirm clear all
  // -----------------------------------------
  function confirmClearAll() {
    localStorage.removeItem(ORDERS_KEY);
    document.getElementById('clearAllModal').classList.remove('show');
    renderTable();
    showToast('All orders cleared', 'warning');
  }

  // -----------------------------------------
  // TOAST HELPER
  // -----------------------------------------
  function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const iconMap = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
    const toast   = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fa ${iconMap[type] || iconMap.info} toast-icon"></i>
      <span class="toast-msg">${msg}</span>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa fa-xmark"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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

  // Close modals on overlay click
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay')) {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
    }
  });

  // -----------------------------------------
  // INIT
  // -----------------------------------------
  function init() {
    if (!Auth.requireAuth()) return;
    Auth.populateUserUI();
    startClock();
    renderTable();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    filter,
    clearFilters,
    goToPage,
    viewDetail,
    closeDetail,
    printDetail,
    clearAllOrders,
    confirmClearAll
  };

})();
