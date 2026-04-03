/**
 * =============================================
 * billing.js – POS / Billing System Logic
 * Brew & Bill Coffee POS
 * =============================================
 *
 * Handles:
 *  - Menu display with search & category filter
 *  - Cart management (add, remove, quantity)
 *  - Bill calculations (subtotal, GST, discount, total)
 *  - Invoice generation & print
 *  - Order saving to LocalStorage
 */

const Billing = (function () {

  // -----------------------------------------
  // CONSTANTS & STORAGE KEYS
  // -----------------------------------------
  const MENU_KEY   = 'brewbill_menu';
  const ORDERS_KEY = 'brewbill_orders';
  const GST_RATE   = 0.05;   // 5% GST

  // -----------------------------------------
  // STATE
  // -----------------------------------------
  let cart          = [];     // Array of { id, name, emoji, price, qty, category }
  let discount      = 0;      // Discount amount in ₹
  let currentInvoice = null;  // Last generated invoice data

  // -----------------------------------------
  // DEFAULT SAMPLE MENU DATA
  // -----------------------------------------
  const SAMPLE_MENU = [
    // Hot Coffee
    { id: 1, name: 'Espresso',          category: 'Hot Coffee',  price: 80,  emoji: '☕', desc: 'Strong & bold shot' },
    { id: 2, name: 'Cappuccino',         category: 'Hot Coffee',  price: 120, emoji: '☕', desc: 'Frothy milk & espresso' },
    { id: 3, name: 'Latte',             category: 'Hot Coffee',  price: 130, emoji: '🍵', desc: 'Smooth steamed milk' },
    { id: 4, name: 'Americano',         category: 'Hot Coffee',  price: 100, emoji: '☕', desc: 'Espresso & hot water' },
    { id: 5, name: 'Flat White',        category: 'Hot Coffee',  price: 140, emoji: '☕', desc: 'Velvet microfoam' },
    { id: 6, name: 'Mocha',             category: 'Hot Coffee',  price: 150, emoji: '🍫', desc: 'Chocolate espresso blend' },
    // Cold Coffee
    { id: 7,  name: 'Cold Brew',        category: 'Cold Coffee', price: 160, emoji: '🧊', desc: '12-hour cold steeped' },
    { id: 8,  name: 'Iced Latte',       category: 'Cold Coffee', price: 150, emoji: '🥤', desc: 'Chilled espresso & milk' },
    { id: 9,  name: 'Frappuccino',      category: 'Cold Coffee', price: 180, emoji: '🥤', desc: 'Blended iced coffee' },
    { id: 10, name: 'Iced Americano',   category: 'Cold Coffee', price: 120, emoji: '🧊', desc: 'Classic over ice' },
    // Tea
    { id: 11, name: 'Masala Chai',      category: 'Tea',         price: 60,  emoji: '🍵', desc: 'Spiced Indian tea' },
    { id: 12, name: 'Green Tea',        category: 'Tea',         price: 80,  emoji: '🍵', desc: 'Light & refreshing' },
    { id: 13, name: 'Matcha Latte',     category: 'Tea',         price: 160, emoji: '🍵', desc: 'Japanese matcha blend' },
    // Food
    { id: 14, name: 'Croissant',        category: 'Food',        price: 90,  emoji: '🥐', desc: 'Butter-flaky pastry' },
    { id: 15, name: 'Egg Sandwich',     category: 'Food',        price: 120, emoji: '🥪', desc: 'Classic egg breakfast' },
    { id: 16, name: 'Banana Bread',     category: 'Food',        price: 80,  emoji: '🍞', desc: 'Moist & homemade' },
    { id: 17, name: 'Avocado Toast',    category: 'Food',        price: 140, emoji: '🥑', desc: 'Fresh & healthy' },
    // Smoothies
    { id: 18, name: 'Mango Smoothie',   category: 'Smoothies',   price: 140, emoji: '🥭', desc: 'Fresh mango blend' },
    { id: 19, name: 'Berry Blast',      category: 'Smoothies',   price: 160, emoji: '🫐', desc: 'Mixed berries & yogurt' },
    // Desserts
    { id: 20, name: 'Brownie',          category: 'Desserts',    price: 90,  emoji: '🍫', desc: 'Fudgy chocolate brownie' },
    { id: 21, name: 'Cheesecake Slice', category: 'Desserts',    price: 130, emoji: '🍰', desc: 'Classic NY style' },
    { id: 22, name: 'Tiramisu',         category: 'Desserts',    price: 150, emoji: '🍮', desc: 'Italian coffee dessert' },
  ];

  // -----------------------------------------
  // PRIVATE: Get menu from localStorage
  // -----------------------------------------
  function getMenu() {
    const stored = localStorage.getItem(MENU_KEY);
    if (!stored) {
      // Seed with sample data on first run
      localStorage.setItem(MENU_KEY, JSON.stringify(SAMPLE_MENU));
      return SAMPLE_MENU;
    }
    return JSON.parse(stored);
  }

  // -----------------------------------------
  // PRIVATE: Format currency
  // -----------------------------------------
  function fmt(amount) {
    return '₹' + parseFloat(amount).toFixed(2);
  }

  // -----------------------------------------
  // PRIVATE: Get unique categories from menu
  // -----------------------------------------
  function getCategories(menu) {
    return ['All', ...new Set(menu.map(i => i.category))];
  }

  // -----------------------------------------
  // PRIVATE: Render category tabs
  // -----------------------------------------
  function renderCategories(menu) {
    const container = document.getElementById('categoryTabs');
    const categories = getCategories(menu);
    container.innerHTML = categories.map(cat => `
      <button class="cat-tab ${cat === 'All' ? 'active' : ''}"
              data-cat="${cat}"
              onclick="Billing.filterByCategory('${cat}')">
        ${cat}
      </button>
    `).join('');
  }

  // -----------------------------------------
  // PRIVATE: Render menu grid
  // -----------------------------------------
  function renderMenu(items) {
    const grid = document.getElementById('menuGrid');
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa fa-mug-hot"></i><p>No items found</p></div>`;
      return;
    }
    grid.innerHTML = items.map(item => `
      <div class="menu-item-card" onclick="Billing.addToCart(${item.id})">
        <div class="item-emoji">${item.emoji || '☕'}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-category">${item.category}</div>
        <div class="item-price">${fmt(item.price)}</div>
        <button class="item-add-btn">
          <i class="fa fa-plus"></i> Add
        </button>
      </div>
    `).join('');
  }

  // -----------------------------------------
  // PUBLIC: Filter menu by category
  // -----------------------------------------
  function filterByCategory(cat) {
    // Update active tab
    document.querySelectorAll('.cat-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === cat);
    });

    const searchVal = document.getElementById('menuSearch').value.toLowerCase();
    const menu      = getMenu();
    let filtered    = cat === 'All' ? menu : menu.filter(i => i.category === cat);
    if (searchVal) {
      filtered = filtered.filter(i => i.name.toLowerCase().includes(searchVal));
    }
    renderMenu(filtered);
  }

  // -----------------------------------------
  // PUBLIC: Search menu
  // -----------------------------------------
  function searchMenu() {
    const val = document.getElementById('menuSearch').value.toLowerCase();
    const activeCat = document.querySelector('.cat-tab.active')?.dataset.cat || 'All';
    const menu = getMenu();
    let filtered = activeCat === 'All' ? menu : menu.filter(i => i.category === activeCat);
    if (val) filtered = filtered.filter(i => i.name.toLowerCase().includes(val));
    renderMenu(filtered);
  }

  // -----------------------------------------
  // PUBLIC: Add item to cart
  // -----------------------------------------
  function addToCart(itemId) {
    const menu = getMenu();
    const item = menu.find(i => i.id === itemId);
    if (!item) return;

    const existing = cart.find(c => c.id === itemId);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ ...item, qty: 1 });
    }

    renderCart();
    updateTotals();
    showToast(`${item.emoji} ${item.name} added to cart`, 'success');

    // Pulse animation on cart badge
    const badge = document.getElementById('cartBadge');
    badge.classList.remove('pulse');
    void badge.offsetWidth; // reflow
    badge.classList.add('pulse');
  }

  // -----------------------------------------
  // PUBLIC: Change item quantity
  // -----------------------------------------
  function changeQty(itemId, delta) {
    const idx = cart.findIndex(c => c.id === itemId);
    if (idx === -1) return;

    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) {
      cart.splice(idx, 1);
    }
    renderCart();
    updateTotals();
  }

  // -----------------------------------------
  // PUBLIC: Remove item from cart
  // -----------------------------------------
  function removeFromCart(itemId) {
    cart = cart.filter(c => c.id !== itemId);
    renderCart();
    updateTotals();
  }

  // -----------------------------------------
  // PRIVATE: Render cart items
  // -----------------------------------------
  function renderCart() {
    const container  = document.getElementById('cartItems');
    const emptyEl    = document.getElementById('cartEmpty');
    const badge      = document.getElementById('cartBadge');
    const generateBtn = document.getElementById('generateBillBtn');

    const totalQty = cart.reduce((s, c) => s + c.qty, 0);
    badge.textContent = totalQty;

    if (!cart.length) {
      container.innerHTML = `
        <div class="cart-empty" id="cartEmpty">
          <i class="fa fa-basket-shopping"></i>
          <p>Your cart is empty.<br>Add items from the menu.</p>
        </div>`;
      generateBtn.disabled = true;
      return;
    }

    generateBtn.disabled = false;

    container.innerHTML = cart.map(item => `
      <div class="cart-item" id="cart-item-${item.id}">
        <div class="cart-item-emoji">${item.emoji || '☕'}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${fmt(item.price)} each</div>
        </div>
        <div class="quantity-controls">
          <button class="qty-btn" onclick="Billing.changeQty(${item.id}, -1)">
            <i class="fa fa-minus"></i>
          </button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="Billing.changeQty(${item.id}, 1)">
            <i class="fa fa-plus"></i>
          </button>
        </div>
        <div class="cart-item-total">${fmt(item.price * item.qty)}</div>
        <button class="remove-item-btn" onclick="Billing.removeFromCart(${item.id})" title="Remove">
          <i class="fa fa-xmark"></i>
        </button>
      </div>
    `).join('');
  }

  // -----------------------------------------
  // PRIVATE: Update totals display
  // -----------------------------------------
  function updateTotals() {
    const subtotal  = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const gst       = subtotal * GST_RATE;
    const safeDsc   = Math.min(discount, subtotal + gst); // Discount can't exceed total
    const total     = subtotal + gst - safeDsc;

    document.getElementById('subtotal').textContent       = fmt(subtotal);
    document.getElementById('gstAmount').textContent      = fmt(gst);
    document.getElementById('discountDisplay').textContent = fmt(safeDsc);
    document.getElementById('totalAmount').textContent    = fmt(total);
  }

  // -----------------------------------------
  // PUBLIC: Apply discount
  // -----------------------------------------
  function applyDiscount() {
    const input = document.getElementById('discountInput');
    const val   = parseFloat(input.value) || 0;
    if (val < 0) { showToast('Discount cannot be negative', 'error'); return; }
    discount = val;
    updateTotals();
    showToast(`Discount of ${fmt(val)} applied`, 'success');
  }

  // -----------------------------------------
  // PUBLIC: Clear cart
  // -----------------------------------------
  function clearCart() {
    if (!cart.length) return;
    cart     = [];
    discount = 0;
    document.getElementById('discountInput').value = '';
    document.getElementById('customerName').value  = '';
    renderCart();
    updateTotals();
    showToast('Cart cleared', 'info');
  }

  // -----------------------------------------
  // PRIVATE: Generate order ID
  // -----------------------------------------
  function generateOrderId() {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const num    = (orders.length + 1).toString().padStart(5, '0');
    return `BB${num}`;
  }

  // -----------------------------------------
  // PUBLIC: Generate bill & show invoice
  // -----------------------------------------
  function generateBill() {
    if (!cart.length) {
      showToast('Cart is empty', 'error');
      return;
    }

    const subtotal  = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const gst       = subtotal * GST_RATE;
    const safeDsc   = Math.min(discount, subtotal + gst);
    const total     = subtotal + gst - safeDsc;
    const now       = new Date();
    const session   = Auth.getSession();
    const orderId   = generateOrderId();
    const customer  = document.getElementById('customerName').value.trim() || 'Walk-in Customer';

    // Build invoice data object
    currentInvoice = {
      id:         orderId,
      date:       now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
      time:       now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
      dateISO:    now.toISOString(),
      customer:   customer,
      cashier:    session ? session.name : 'Admin',
      items:      cart.map(c => ({ ...c })),
      subtotal:   subtotal,
      gst:        gst,
      discount:   safeDsc,
      total:      total
    };

    // Save order to localStorage
    saveOrder(currentInvoice);

    // Populate invoice modal
    populateInvoiceModal(currentInvoice);

    // Show modal
    document.getElementById('invoiceModal').classList.add('show');
  }

  // -----------------------------------------
  // PRIVATE: Populate invoice modal fields
  // -----------------------------------------
  function populateInvoiceModal(inv) {
    document.getElementById('invOrderId').textContent  = inv.id;
    document.getElementById('invDate').textContent     = inv.date;
    document.getElementById('invTime').textContent     = inv.time;
    document.getElementById('invCustomer').textContent = inv.customer;
    document.getElementById('invCashier').textContent  = inv.cashier;
    document.getElementById('invSubtotal').textContent = fmt(inv.subtotal);
    document.getElementById('invGst').textContent      = fmt(inv.gst);
    document.getElementById('invDiscount').textContent = fmt(inv.discount);
    document.getElementById('invTotal').textContent    = fmt(inv.total);

    const tbody = document.getElementById('invItemsBody');
    tbody.innerHTML = inv.items.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${item.emoji} ${item.name}</td>
        <td>${item.qty}</td>
        <td>${fmt(item.price)}</td>
        <td>${fmt(item.price * item.qty)}</td>
      </tr>
    `).join('');
  }

  // -----------------------------------------
  // PRIVATE: Save order to localStorage
  // -----------------------------------------
  function saveOrder(invoice) {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    orders.push(invoice);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  // -----------------------------------------
  // PUBLIC: Close invoice modal
  // -----------------------------------------
  function closeInvoice() {
    document.getElementById('invoiceModal').classList.remove('show');
  }

  // -----------------------------------------
  // PUBLIC: Print invoice
  // -----------------------------------------
  function printInvoice() {
    window.print();
  }

  // -----------------------------------------
  // PUBLIC: New order (clear and close)
  // -----------------------------------------
  function newOrder() {
    closeInvoice();
    clearCart();
    discount = 0;
    document.getElementById('discountInput').value = '';
    document.getElementById('customerName').value  = '';
    showToast('Ready for new order!', 'success');
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
  // CLOCK & DATE IN HEADER
  // -----------------------------------------
  function startClock() {
    function update() {
      const now     = new Date();
      const timeEl  = document.getElementById('headerTime');
      const dateEl  = document.getElementById('headerDate');
      if (timeEl) timeEl.innerHTML = `<i class="fa fa-clock"></i> ${now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}`;
      if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
    }
    update();
    setInterval(update, 1000);
  }

  // -----------------------------------------
  // SIDEBAR TOGGLE (shared utility on all pages)
  // -----------------------------------------
  window.toggleSidebar = function () {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
  };

  // -----------------------------------------
  // INIT
  // -----------------------------------------
  function init() {
    // Require auth
    if (!Auth.requireAuth()) return;
    Auth.populateUserUI();

    startClock();

    const menu = getMenu();
    renderCategories(menu);
    renderMenu(menu);

    // Wire up search input
    document.getElementById('menuSearch').addEventListener('input', searchMenu);
  }

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  // Expose public API
  return {
    addToCart,
    changeQty,
    removeFromCart,
    filterByCategory,
    applyDiscount,
    clearCart,
    generateBill,
    closeInvoice,
    printInvoice,
    newOrder
  };

})();
