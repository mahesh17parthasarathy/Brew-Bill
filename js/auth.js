/**
 * =============================================
 * auth.js – Authentication & Session Management
 * Brew & Bill Coffee POS
 * =============================================
 *
 * Handles:
 *  - User login / logout
 *  - Session storage (localStorage)
 *  - Route protection (redirect if not logged in)
 *  - Default users setup
 */

const Auth = (function () {

  // -----------------------------------------
  // CONSTANTS
  // -----------------------------------------
  const SESSION_KEY  = 'brewbill_session';
  const USERS_KEY    = 'brewbill_users';

  // Default demo users
  const DEFAULT_USERS = [
    { id: 1, username: 'admin',   password: 'admin123',  role: 'Admin',   name: 'Admin User'     },
    { id: 2, username: 'cashier', password: 'cash123',   role: 'Cashier', name: 'Jane Cashier'   }
  ];

  // -----------------------------------------
  // PRIVATE: Seed default users on first run
  // -----------------------------------------
  function seedUsers() {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    }
  }

  // -----------------------------------------
  // PRIVATE: Get all users
  // -----------------------------------------
  function getUsers() {
    seedUsers();
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  }

  // -----------------------------------------
  // PUBLIC: Login
  //  Returns { success: bool, message: string }
  // -----------------------------------------
  function login(username, password) {
    const users = getUsers();
    const user  = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() &&
           u.password === password
    );

    if (!user) {
      return { success: false, message: 'Invalid username or password. Please try again.' };
    }

    // Store session (exclude password)
    const session = {
      id:       user.id,
      username: user.username,
      name:     user.name,
      role:     user.role,
      loginAt:  new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, session };
  }

  // -----------------------------------------
  // PUBLIC: Logout
  // -----------------------------------------
  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  // -----------------------------------------
  // PUBLIC: Get current session
  // -----------------------------------------
  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  // -----------------------------------------
  // PUBLIC: Check if logged in
  // -----------------------------------------
  function isLoggedIn() {
    return !!getSession();
  }

  // -----------------------------------------
  // PUBLIC: Require authentication
  //  Call on every protected page.
  //  Redirects to login if no session.
  // -----------------------------------------
  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  // -----------------------------------------
  // PUBLIC: Populate user info in UI
  //  Fills elements with data-user="name|role"
  // -----------------------------------------
  function populateUserUI() {
    const session = getSession();
    if (!session) return;

    // Sidebar user name
    const nameEls = document.querySelectorAll('[data-user="name"]');
    nameEls.forEach(el => el.textContent = session.name);

    // Sidebar user role
    const roleEls = document.querySelectorAll('[data-user="role"]');
    roleEls.forEach(el => el.textContent = session.role);

    // Avatar initials
    const avatarEls = document.querySelectorAll('[data-user="avatar"]');
    const initials  = session.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatarEls.forEach(el => el.textContent = initials);
  }

  // -----------------------------------------
  // PUBLIC: Get user initials
  // -----------------------------------------
  function getUserInitials() {
    const session = getSession();
    if (!session) return '?';
    return session.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  // -----------------------------------------
  // INIT: Run on every page load
  // -----------------------------------------
  function init() {
    seedUsers();
  }

  init();

  // Expose public API
  return { login, logout, getSession, isLoggedIn, requireAuth, populateUserUI, getUserInitials };

})();
