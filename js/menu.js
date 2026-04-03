/**
 * =============================================
 * menu.js – Menu Management (CRUD)
 * Brew & Bill Coffee POS
 * =============================================
 *
 * Handles:
 *  - Display menu items in card grid
 *  - Add new item (modal form)
 *  - Edit existing item
 *  - Delete item with confirmation
 *  - Search & category filter
 *  - Save/read from LocalStorage
 */

const MenuMgr = (function () {

  // -----------------------------------------
  // CONSTANTS
  // -----------------------------------------
  const MENU_KEY = 'brewbill_menu';

  // All available emoji icons for the picker
  const EMOJI_LIST = [
    '☕','🍵','🥤','🧃','🧋','🍺','🍶','🍹','🥛',
    '🥐','🍞','🧇','🥞','🥪','🥗','🍱','🍛','🍜',
    '🍰','🎂','🧁','🍮','🍫','🍬','🍭','🍩','🍪',
    '🥭','🍓','🫐','🍊','🍋','🍇','🍎','🍌','🥑',
    '🌮','🍕','🍔','🌯','🥙','🫔','🍟','🌭','🥚',
    '🧆','🍣','🍤','🎁','⭐','❤️','🔥','💎'
  ];

  // -----------------------------------------
  // SAMPLE MENU (mirrors billing.js)
  // -----------------------------------------
  const SAMPLE_MENU = [
    { id: 1, name: 'Espresso',          category: 'Hot Coffee',  price: 80,  emoji: '☕', desc: 'Strong & bold shot' },
    { id: 2, name: 'Cappuccino',         category: 'Hot Coffee',  price: 120, emoji: '☕', desc: 'Frothy milk & espresso' },
    { id: 3, name: 'Latte',             category: 'Hot Coffee',  price: 130, emoji: '🍵', desc: 'Smooth steamed milk' },
    { id: 4, name: 'Americano',         category: 'Hot Coffee',  price: 100, emoji: '☕', desc: 'Espresso & hot water' },
    { id: 5, name: 'Flat White',        category: 'Hot Coffee',  price: 140, emoji: '☕', desc: 'Velvet microfoam' },
    { id: 6, name: 'Mocha',             category: 'Hot Coffee',  price: 150, emoji: '🍫', desc: 'Chocolate espresso blend' },
    { id: 7,  name: 'Cold Brew',        category: 'Cold Coffee', price: 160, emoji: '🧊', desc: '12-hour cold steeped' },
    { id: 8,  name: 'Iced Latte',       category: 'Cold Coffee', price: 150, emoji: '🥤', desc: 'Chilled espresso & milk' },
    { id: 9,  name: 'Frappuccino',      category: 'Cold Coffee', price: 180, emoji: '🥤', desc: 'Blended iced coffee' },
    { id: 10, name: 'Iced Americano',   category: 'Cold Coffee', price: 120, emoji: '🧊', desc: 'Classic over ice' },
    { id: 11, name: 'Masala Chai',      category: 'Tea',         price: 60,  emoji: '🍵', desc: 'Spiced Indian tea' },
    { id: 12, name: 'Green Tea',        category: 'Tea',         price: 80,  emoji: '🍵', desc: 'Light & refreshing' },
    { id: 13, name: 'Matcha Latte',     category: 'Tea',         price: 160, emoji: '🍵', desc: 'Japanese matcha blend' },
    { id: 14, name: 'Croissant',        category: 'Food',        price: 90,  emoji: '🥐', desc: 'Butter-flaky pastry' },
    { id: 15, name: 'Egg Sandwich',     category: 'Food',        price: 120, emoji: '🥪', desc: 'Classic egg breakfast' },
    { id: 16, name: 'Banana Bread',     category: 'Food',        price: 80,  emoji: '🍞', desc: 'Moist & homemade' },
    { id: 17, name: 'Avocado Toast',    category: 'Food',        price: 140, emoji: '🥑', desc: 'Fresh & healthy' },
    { id: 18, name: 'Mango Smoothie',   category: 'Smoothies',   price: 140, emoji: '🥭', desc: 'Fresh mango blend' },
    { id: 19, name: 'Berry Blast',      category: 'Smoothies',   price: 160, emoji: '🫐', desc: 'Mixed berries & yogurt' },
    { id: 20, name: 'Brownie',          category: 'Desserts',    price: 90,  emoji: '🍫', desc: 'Fudgy chocolate brownie' },
    { id: 21, name: 'Cheesecake Slice', category: 'Desserts',    price: 130, emoji: '🍰', desc: 'Classic NY style' },
    { id: 22, name: 'Tiramisu',         category: 'Desserts',    price: 150, emoji: '🍮', desc: 'Italian coffee dessert' },
  ];

  // -----------------------------------------
  // STATE
  // -----------------------------------------
  let pendingDeleteId = null;
  let currentFilter   = '';
  let currentCategory = '';

  // -----------------------------------------
  // PRIVATE: Get menu
  // -----------------------------------------
  function getMenu() {
    const stored = localStorage.getItem(MENU_KEY);
    if (!stored) {
      localStorage.setItem(MENU_KEY, JSON.stringify(SAMPLE_MENU));
      return SAMPLE_MENU;
    }
    return JSON.parse(stored);
  }

  // -----------------------------------------
  // PRIVATE: Save menu
  // -----------------------------------------
  function saveMenu(menu) {
    localStorage.setItem(MENU_KEY, JSON.stringify(menu));
  }

  // -----------------------------------------
  // PRIVATE: Format price
  // -----------------------------------------
  function fmt(price) {
    return '₹' + parseFloat(price).toFixed(2);
  }

  // -----------------------------------------
  // PRIVATE: Update stats bar (items count, categories, avg price)
  // -----------------------------------------
  function updateStats(menu) {
    const categories  = [...new Set(menu.map(i => i.category))];
    const avgPrice    = menu.length ? menu.reduce((s, i) => s + i.price, 0) / menu.length : 0;

    document.getElementById('totalItemsCount').textContent = menu.length;
    document.getElementById('totalCatCount').textContent   = categories.length;
    document.getElementById('avgPriceDisplay').textContent = fmt(avgPrice);
  }

  // -----------------------------------------
  // PRIVATE: Populate category filter dropdown
  // -----------------------------------------
  function populateCategoryFilter(menu) {
    const sel  = document.getElementById('filterCategory');
    const cats = [...new Set(menu.map(i => i.category))].sort();
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
  }

  // -----------------------------------------
  // PUBLIC: Render all items (with optional filter)
  // -----------------------------------------
  function render() {
    const menu     = getMenu();
    const grid     = document.getElementById('menuItemsGrid');
    const search   = (document.getElementById('menuSearchInput')?.value || '').toLowerCase();
    const category = document.getElementById('filterCategory')?.value || '';

    let filtered = menu;
    if (search)   filtered = filtered.filter(i => i.name.toLowerCase().includes(search) || i.category.toLowerCase().includes(search));
    if (category) filtered = filtered.filter(i => i.category === category);

    updateStats(menu);
    populateCategoryFilter(menu);

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <i class="fa fa-search"></i><p>No items found matching your search.</p></div>`;
      return;
    }

    grid.innerHTML = filtered.map(item => `
      <div class="menu-manage-card fade-in" id="menu-card-${item.id}">
        <div class="card-top">
          <div class="card-emoji">${item.emoji || '☕'}</div>
          <div class="card-info">
            <h3>${item.name}</h3>
            <p class="cat-label"><i class="fa fa-tag"></i> ${item.category}</p>
            ${item.desc ? `<p style="font-size:.75rem;color:var(--text-light);margin-top:.2rem;">${item.desc}</p>` : ''}
          </div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:.3rem;">
          <div class="card-price">${fmt(item.price)}</div>
          <div class="card-actions">
            <button class="btn btn-sm btn-outline" onclick="MenuMgr.openEditModal(${item.id})" title="Edit">
              <i class="fa fa-pen"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="MenuMgr.openDeleteModal(${item.id})" title="Delete">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // -----------------------------------------
  // PUBLIC: Filter items (called on search/category change)
  // -----------------------------------------
  function filterItems() {
    render();
  }

  // -----------------------------------------
  // PRIVATE: Populate emoji picker
  // -----------------------------------------
  function populateEmojiPicker(selectedEmoji = '☕') {
    const picker = document.getElementById('emojiPicker');
    picker.innerHTML = EMOJI_LIST.map(emoji => `
      <div class="emoji-option ${emoji === selectedEmoji ? 'selected' : ''}"
           data-emoji="${emoji}"
           onclick="MenuMgr.selectEmoji('${emoji}')">
        ${emoji}
      </div>
    `).join('');
  }

  // -----------------------------------------
  // PUBLIC: Select emoji
  // -----------------------------------------
  function selectEmoji(emoji) {
    document.getElementById('itemEmoji').value = emoji;
    document.querySelectorAll('.emoji-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.emoji === emoji);
    });
  }

  // -----------------------------------------
  // PUBLIC: Open Add Item Modal
  // -----------------------------------------
  function openAddModal() {
    document.getElementById('modalTitle').innerHTML = '<i class="fa fa-plus text-accent"></i> Add Menu Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value    = '';
    document.getElementById('itemEmoji').value = '☕';
    document.getElementById('itemFormError').style.display = 'none';
    populateEmojiPicker('☕');
    document.getElementById('itemModal').classList.add('show');
  }

  // -----------------------------------------
  // PUBLIC: Open Edit Item Modal
  // -----------------------------------------
  function openEditModal(id) {
    const menu = getMenu();
    const item = menu.find(i => i.id === id);
    if (!item) return;

    document.getElementById('modalTitle').innerHTML = '<i class="fa fa-pen text-accent"></i> Edit Menu Item';
    document.getElementById('itemId').value       = item.id;
    document.getElementById('itemName').value     = item.name;
    document.getElementById('itemPrice').value    = item.price;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemDesc').value     = item.desc || '';
    document.getElementById('itemEmoji').value    = item.emoji || '☕';
    document.getElementById('itemFormError').style.display = 'none';
    populateEmojiPicker(item.emoji || '☕');
    document.getElementById('itemModal').classList.add('show');
  }

  // -----------------------------------------
  // PUBLIC: Close modal
  // -----------------------------------------
  function closeModal() {
    document.getElementById('itemModal').classList.remove('show');
  }

  // -----------------------------------------
  // PUBLIC: Save item (add or edit)
  // -----------------------------------------
  function saveItem(e) {
    e.preventDefault();

    const id       = document.getElementById('itemId').value;
    const name     = document.getElementById('itemName').value.trim();
    const price    = parseFloat(document.getElementById('itemPrice').value);
    const category = document.getElementById('itemCategory').value;
    const desc     = document.getElementById('itemDesc').value.trim();
    const emoji    = document.getElementById('itemEmoji').value || '☕';
    const errEl    = document.getElementById('itemFormError');

    // Validate
    if (!name) {
      errEl.textContent = 'Item name is required.';
      errEl.style.display = 'block';
      return;
    }
    if (!price || price <= 0) {
      errEl.textContent = 'Please enter a valid price greater than 0.';
      errEl.style.display = 'block';
      return;
    }
    if (!category) {
      errEl.textContent = 'Please select a category.';
      errEl.style.display = 'block';
      return;
    }

    errEl.style.display = 'none';
    const menu = getMenu();

    if (id) {
      // Edit existing
      const idx = menu.findIndex(i => i.id === parseInt(id));
      if (idx !== -1) {
        menu[idx] = { ...menu[idx], name, price, category, desc, emoji };
        showToast(`✏️ "${name}" updated successfully`, 'success');
      }
    } else {
      // Add new
      const newId = menu.length ? Math.max(...menu.map(i => i.id)) + 1 : 1;
      menu.push({ id: newId, name, price, category, desc, emoji });
      showToast(`✅ "${name}" added to menu`, 'success');
    }

    saveMenu(menu);
    closeModal();
    render();
  }

  // -----------------------------------------
  // PUBLIC: Open delete confirmation
  // -----------------------------------------
  function openDeleteModal(id) {
    pendingDeleteId = id;
    document.getElementById('deleteModal').classList.add('show');
    document.getElementById('confirmDeleteBtn').onclick = confirmDelete;
  }

  // -----------------------------------------
  // PUBLIC: Close delete modal
  // -----------------------------------------
  function closeDeleteModal() {
    pendingDeleteId = null;
    document.getElementById('deleteModal').classList.remove('show');
  }

  // -----------------------------------------
  // PRIVATE: Confirm and execute delete
  // -----------------------------------------
  function confirmDelete() {
    if (!pendingDeleteId) return;

    const menu    = getMenu();
    const item    = menu.find(i => i.id === pendingDeleteId);
    const updated = menu.filter(i => i.id !== pendingDeleteId);
    saveMenu(updated);
    closeDeleteModal();
    render();

    if (item) showToast(`🗑️ "${item.name}" deleted`, 'warning');
    pendingDeleteId = null;
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
  // CLOCK
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

  // Close modal on overlay click
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
    render();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    render,
    filterItems,
    openAddModal,
    openEditModal,
    closeModal,
    saveItem,
    openDeleteModal,
    closeDeleteModal,
    selectEmoji
  };

})();
