// ============================================================
//  ELEMENT Nagaland — Employee Management System
//  Backend-powered (Vercel Postgres + JWT auth)
// ============================================================

const auth = window.elementAuth;
const api = window.elementApi;

// ===== THEME MANAGEMENT =====
const themeToggleBtn = document.getElementById('themeToggleBtn');
const htmlElement = document.documentElement;

function initTheme() {
  const savedTheme = localStorage.getItem('element_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
}

function applyTheme(theme) {
  htmlElement.setAttribute('data-theme', theme);
  localStorage.setItem('element_theme', theme);
  if (themeToggleBtn) {
    const icon = themeToggleBtn.querySelector('i');
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const current = htmlElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

initTheme();

// ===== REMEMBERED EMAIL =====
// We pre-fill the login email when the user previously checked "Remember me".
// The token itself already lives in localStorage via window.elementAuth, but
// the email key is separate so signing out doesn't clear it.
const REMEMBER_EMAIL_KEY = 'element_remember_email';

function getRememberedEmail() {
  try { return localStorage.getItem(REMEMBER_EMAIL_KEY) || ''; } catch { return ''; }
}
function setRememberedEmail(email) {
  try { localStorage.setItem(REMEMBER_EMAIL_KEY, email); } catch {}
}
function clearRememberedEmail() {
  try { localStorage.removeItem(REMEMBER_EMAIL_KEY); } catch {}
}

// ===== ROLE HELPERS =====
const ROLE = { OWNER: 'owner', ADMIN: 'admin', EMPLOYEE: 'employee' };
let currentUser = null; // refreshed on every login + bootstrap

function isPrivileged() {
  return !!currentUser && (currentUser.role === ROLE.OWNER || currentUser.role === ROLE.ADMIN);
}
function isOwner() {
  return !!currentUser && currentUser.role === ROLE.OWNER;
}

// ===== DATA MODEL =====
// In-memory cache, refreshed from the API.
let employees = [];
let leaveRequests = [];
let userAccounts = [];
let departments = []; // [{id, name, employeeCount}]
let selectMode = false;
let selectedIds = new Set();

function normalizeEmployee(emp) {
  return {
    id: emp.id || Date.now().toString(),
    name: emp.name || '',
    role: emp.role || '',
    department: emp.department || '',
    email: emp.email || '',
    phone: emp.phone || '',
    joinDate: emp.joinDate || '',
    status: emp.status || 'Active',
    dob: emp.dob || '',
    gender: emp.gender || '',
    bloodGroup: emp.bloodGroup || '',
    address: emp.address || '',
    grade: emp.grade || '',
    managerId: emp.managerId || '',
    emergencyName: emp.emergencyName || '',
    emergencyPhone: emp.emergencyPhone || '',
    notes: emp.notes || ''
  };
}

// ===== DOM REFERENCES =====
const authScreen = document.getElementById('authScreen');
const appContainer = document.getElementById('appContainer');
const pageLoader = document.getElementById('pageLoader');

// Auth UI
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginRemember = document.getElementById('loginRemember');
const loginError = document.getElementById('loginError');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupRemember = document.getElementById('signupRemember');
const signupError = document.getElementById('signupError');
const signupSubmitBtn = document.getElementById('signupSubmitBtn');
const authTabs = document.querySelectorAll('.auth-tab');

// User chip
const userChip = document.getElementById('userChip');
const userMenu = document.getElementById('userMenu');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userRoleBadge = document.getElementById('userRoleBadge');
const userMenuName = document.getElementById('userMenuName');
const userMenuEmail = document.getElementById('userMenuEmail');
const userMenuRole = document.getElementById('userMenuRole');
const logoutBtn = document.getElementById('logoutBtn');

// Sidebar role-gated elements
const navLeaves = document.getElementById('nav-leaves');
const navUsers = document.getElementById('nav-users');
const leavesBadge = document.getElementById('leavesBadge');
const requestLeaveSidebarBtn = document.getElementById('requestLeaveSidebarBtn');

// Leave UI
const leavesSection = document.getElementById('leaves');
const leaveStatusFilter = document.getElementById('leaveStatusFilter');
const leaveScopeFilter = document.getElementById('leaveScopeFilter');
const leaveScopeWrap = document.getElementById('leaveScopeWrap');
const leaveList = document.getElementById('leaveList');
const leaveResultsCount = document.getElementById('leaveResultsCount');
const newLeaveBtn = document.getElementById('newLeaveBtn');
const leaveModal = document.getElementById('leaveModal');
const leaveForm = document.getElementById('leaveForm');
const leaveIdInput = document.getElementById('leaveId');
const leaveTypeInput = document.getElementById('leaveType');
const leaveStartInput = document.getElementById('leaveStart');
const leaveEndInput = document.getElementById('leaveEnd');
const leaveReasonInput = document.getElementById('leaveReason');
const closeLeaveModalBtn = document.getElementById('closeLeaveModalBtn');
const cancelLeaveBtn = document.getElementById('cancelLeaveBtn');

const leaveReviewModal = document.getElementById('leaveReviewModal');
const closeLeaveReviewBtn = document.getElementById('closeLeaveReviewBtn');
const leaveReviewSummary = document.getElementById('leaveReviewSummary');
const leaveReviewIdInput = document.getElementById('leaveReviewId');
const leaveReviewNotes = document.getElementById('leaveReviewNotes');
const leaveReviewCancelBtn = document.getElementById('leaveReviewCancelBtn');
const leaveApproveBtn = document.getElementById('leaveApproveBtn');
const leaveRejectBtn = document.getElementById('leaveRejectBtn');

// Users section
const usersSection = document.getElementById('users');
const usersTableBody = document.getElementById('usersTableBody');

// Departments section
const navDepartments = document.getElementById('nav-departments');
const departmentsSection = document.getElementById('departments');
const departmentsTableBody = document.getElementById('departmentsTableBody');
const newDeptForm = document.getElementById('newDeptForm');
const newDeptName = document.getElementById('newDeptName');

// Bulk action bar
const selectModeBtn = document.getElementById('selectModeBtn');
const bulkBar = document.getElementById('bulkBar');
const bulkSelectAll = document.getElementById('bulkSelectAll');
const bulkSelectionCount = document.getElementById('bulkSelectionCount');
const bulkActivateBtn = document.getElementById('bulkActivateBtn');
const bulkDeactivateBtn = document.getElementById('bulkDeactivateBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const bulkExitBtn = document.getElementById('bulkExitBtn');
const selfOnlyNote = document.getElementById('selfOnlyNote');

// Audit feed
const auditFeed = document.getElementById('auditFeed');

// Claim Owner modal
const claimOwnerBtn = document.getElementById('claimOwnerBtn');
const claimOwnerModal = document.getElementById('claimOwnerModal');
const claimOwnerForm = document.getElementById('claimOwnerForm');
const claimOwnerPassword = document.getElementById('claimOwnerPassword');
const claimOwnerError = document.getElementById('claimOwnerError');
const closeClaimOwnerBtn = document.getElementById('closeClaimOwnerBtn');
const cancelClaimOwnerBtn = document.getElementById('cancelClaimOwnerBtn');
const confirmClaimOwnerBtn = document.getElementById('confirmClaimOwnerBtn');

const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view-section');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');

const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statDepts = document.getElementById('statDepts');
const recentEmpsGrid = document.getElementById('recentEmpsGrid');

const employeeGrid = document.getElementById('employeeGrid');
const searchInput = document.getElementById('searchInput');
const deptFilter = document.getElementById('deptFilter');
const statusFilter = document.getElementById('statusFilter');
const sortSelect = document.getElementById('sortSelect');
const resultsCount = document.getElementById('resultsCount');

const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const importCsvBtn = document.getElementById('importCsvBtn');
const csvFileInput = document.getElementById('csvFileInput');

const employeeModal = document.getElementById('employeeModal');
const employeeForm = document.getElementById('employeeForm');
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const modalTitle = document.getElementById('modalTitle');

// Form fields
const empIdInput = document.getElementById('empId');
const empNameInput = document.getElementById('empName');
const empRoleInput = document.getElementById('empRole');
const empDeptInput = document.getElementById('empDept');
const empStatusInput = document.getElementById('empStatus');
const empEmailInput = document.getElementById('empEmail');
const empPhoneInput = document.getElementById('empPhone');
const empJoinDateInput = document.getElementById('empJoinDate');
const empDobInput = document.getElementById('empDob');
const empGenderInput = document.getElementById('empGender');
const empBloodGroupInput = document.getElementById('empBloodGroup');
const empAddressInput = document.getElementById('empAddress');
const empGradeInput = document.getElementById('empGrade');
const empManagerInput = document.getElementById('empManager');
const empEmergencyNameInput = document.getElementById('empEmergencyName');
const empEmergencyPhoneInput = document.getElementById('empEmergencyPhone');
const empNotesInput = document.getElementById('empNotes');

// Detail view
const employeeDetailSection = document.getElementById('employeeDetail');
const detailHeader = document.getElementById('detailHeader');
const backToDirectoryBtn = document.getElementById('backToDirectoryBtn');
const detailEditBtn = document.getElementById('detailEditBtn');
const detailDeleteBtn = document.getElementById('detailDeleteBtn');
const tabBtns = document.querySelectorAll('.tab-btn');

const toastContainer = document.getElementById('toastContainer');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');

// State
let currentViewMode = 'grid'; // 'grid' or 'list'
let currentDetailId = null;

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success') {
  const icon = type === 'success' ? 'fa-check' : 'fa-xmark';
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid ${icon} ${type}"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== HELPERS =====
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function nameToHue(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
}

function avatarGradient(name) {
  const hue = nameToHue(name || '?');
  return `linear-gradient(135deg, hsl(${hue}, 55%, 45%), hsl(${(hue + 35) % 360}, 50%, 40%))`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function getManagerName(managerId) {
  if (!managerId) return '—';
  const mgr = employees.find(e => e.id === managerId);
  return mgr ? mgr.name : '—';
}

function showLoader(show) {
  if (!pageLoader) return;
  pageLoader.classList.toggle('d-none', !show);
}

// ===== AUTH FLOW =====
function showAuthScreen() {
  authScreen.classList.remove('d-none');
  appContainer.classList.add('d-none');
  // Reset forms
  loginForm.reset();
  signupForm.reset();
  hideAuthError(loginError);
  hideAuthError(signupError);

  // Pre-fill the remembered email so the user just types their password.
  const remembered = getRememberedEmail();
  if (remembered) {
    loginEmail.value = remembered;
    if (loginRemember) loginRemember.checked = true;
    // Move focus straight to password since the email is already filled in.
    setTimeout(() => loginPassword.focus(), 50);
  } else {
    setTimeout(() => loginEmail.focus(), 50);
  }
}

function showApp() {
  authScreen.classList.add('d-none');
  appContainer.classList.remove('d-none');
}

function showAuthError(el, message) {
  el.textContent = message;
  el.classList.remove('d-none');
}

function hideAuthError(el) {
  el.textContent = '';
  el.classList.add('d-none');
}

function setUserChip(user) {
  if (!user) return;
  userAvatar.textContent = getInitials(user.name || user.email);
  userAvatar.style.background = avatarGradient(user.name || user.email);
  userName.textContent = user.name || user.email;
  userMenuName.textContent = user.name || 'User';
  userMenuEmail.textContent = user.email || '';
  const role = (user.role || 'employee').toLowerCase();
  if (userRoleBadge) {
    userRoleBadge.textContent = role;
    userRoleBadge.classList.remove('role-owner', 'role-admin', 'role-employee');
    userRoleBadge.classList.add('role-' + role);
  }
  if (userMenuRole) userMenuRole.textContent = role;
}

// Show/hide things based on the current user's role.
function applyRoleVisibility() {
  const privileged = isPrivileged();
  // Sidebar: "Add employee" stays admin-only.
  if (addEmployeeBtn) addEmployeeBtn.classList.toggle('d-none', !privileged);
  // Sidebar: "Departments" + "User Roles" only visible to admin/owner.
  if (navDepartments) navDepartments.classList.toggle('d-none', !privileged);
  if (navUsers) navUsers.classList.toggle('d-none', !privileged);
  // Directory CSV import + bulk-select + edit/delete are admin-only.
  if (importCsvBtn) importCsvBtn.classList.toggle('d-none', !privileged);
  if (selectModeBtn) selectModeBtn.classList.toggle('d-none', !privileged);
  // Leave scope filter (everyone vs mine) only matters for privileged viewers.
  if (leaveScopeWrap) leaveScopeWrap.classList.toggle('d-none', !privileged);
  // Once a user is owner there's nothing for the claim flow to do.
  if (claimOwnerBtn) claimOwnerBtn.classList.toggle('d-none', isOwner());
  // Self-only note pops in for non-privileged users on the directory page.
  if (selfOnlyNote) selfOnlyNote.classList.toggle('d-none', privileged);
  // Hide directory filters/sort for non-privileged since they only see one row.
  document.querySelectorAll('#directory .filter-group').forEach((el) => {
    el.classList.toggle('d-none', !privileged);
  });
  document.querySelectorAll('#directory .controls-right .csv-actions').forEach((el) => {
    el.classList.toggle('d-none', !privileged);
  });
  document.querySelectorAll('#directory .view-toggle').forEach((el) => {
    el.classList.toggle('d-none', !privileged);
  });
}

// Switch between login and signup tabs
authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.getAttribute('data-auth-tab');
    authTabs.forEach(t => t.classList.toggle('active', t === tab));
    if (target === 'login') {
      loginForm.classList.remove('d-none');
      loginForm.classList.add('active');
      signupForm.classList.add('d-none');
      signupForm.classList.remove('active');
    } else {
      signupForm.classList.remove('d-none');
      signupForm.classList.add('active');
      loginForm.classList.add('d-none');
      loginForm.classList.remove('active');
    }
    hideAuthError(loginError);
    hideAuthError(signupError);
  });
});

// Login submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthError(loginError);
  loginSubmitBtn.disabled = true;

  const email = loginEmail.value.trim();
  const remember = !!(loginRemember && loginRemember.checked);

  try {
    const { user, token } = await api.login(email, loginPassword.value, remember);
    auth.setToken(token);
    auth.setUser(user);
    if (remember) setRememberedEmail(email); else clearRememberedEmail();
    await onLoginSuccess(user);
  } catch (err) {
    showAuthError(loginError, err.message || 'Sign in failed.');
  } finally {
    loginSubmitBtn.disabled = false;
  }
});

// Signup submit
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthError(signupError);
  signupSubmitBtn.disabled = true;

  const email = signupEmail.value.trim();
  const remember = !!(signupRemember && signupRemember.checked);

  try {
    const { user, token } = await api.signup(
      email,
      signupPassword.value,
      signupName.value.trim(),
      remember
    );
    auth.setToken(token);
    auth.setUser(user);
    if (remember) setRememberedEmail(email); else clearRememberedEmail();
    showToast(`Welcome, ${user.name}!`);
    await onLoginSuccess(user);
  } catch (err) {
    showAuthError(signupError, err.message || 'Could not create account.');
  } finally {
    signupSubmitBtn.disabled = false;
  }
});

async function onLoginSuccess(user) {
  currentUser = user;
  setUserChip(user);
  applyRoleVisibility();
  showApp();
  await loadEmployees();
  await loadLeaves();
  if (isPrivileged()) await loadDepartments();
  switchView('dashboard');
}

// Logout
logoutBtn.addEventListener('click', (e) => {
  // Prevent the click from bubbling to userChip (which would re-toggle the menu open)
  e.stopPropagation();
  auth.clear();
  // Note: we deliberately keep the remembered email so the next login is
  // a one-step affair (password only). Sign out only clears the session.
  currentUser = null;
  employees = [];
  leaveRequests = [];
  userAccounts = [];
  userMenu.classList.add('d-none');
  showAuthScreen();
});

// Toggle user menu
userChip.addEventListener('click', (e) => {
  e.stopPropagation();
  userMenu.classList.toggle('d-none');
});

// Close user menu when clicking outside
document.addEventListener('click', (e) => {
  if (!userChip.contains(e.target)) {
    userMenu.classList.add('d-none');
  }
});

// ===== DATA LOADING =====
async function loadEmployees() {
  try {
    const { employees: list } = await api.listEmployees();
    employees = (list || []).map(normalizeEmployee);
    updateAllViews();
  } catch (err) {
    if (err.status === 401) {
      // Token expired or invalid
      showAuthScreen();
      return;
    }
    showToast('Failed to load employees: ' + err.message, 'error');
  }
}

// ===== SIDEBAR TOGGLE (MOBILE) =====
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}

// ===== NAVIGATION =====
function switchView(targetId) {
  views.forEach(v => {
    v.classList.toggle('d-none', v.id !== targetId);
    v.classList.toggle('active', v.id === targetId);
  });

  if (targetId === 'dashboard') {
    pageTitle.textContent = 'Overview';
    pageSubtitle.textContent = 'Track and manage your workforce.';
    updateDashboard();
  } else if (targetId === 'directory') {
    pageTitle.textContent = 'Employee Directory';
    pageSubtitle.textContent = 'View and filter all staff members.';
    renderDirectory();
  } else if (targetId === 'leaves') {
    pageTitle.textContent = 'Leave Requests';
    pageSubtitle.textContent = isPrivileged()
      ? 'Review and process pending leave requests from staff.'
      : 'Submit and track your own leave requests.';
    renderLeaves();
  } else if (targetId === 'users') {
    if (!isPrivileged()) {
      // Hard guard so an employee can't reach this view by URL hash.
      switchView('dashboard');
      return;
    }
    pageTitle.textContent = 'User Roles';
    pageSubtitle.textContent = 'Manage who is an owner, admin, or employee.';
    loadUsers();
  } else if (targetId === 'departments') {
    if (!isPrivileged()) {
      switchView('dashboard');
      return;
    }
    pageTitle.textContent = 'Departments';
    pageSubtitle.textContent = 'Add, rename, or remove the departments your employees belong to.';
    loadDepartments();
  }

  // Leaving the directory view should also exit select mode so it doesn't
  // surprise the user when they come back.
  if (targetId !== 'directory' && selectMode) exitSelectMode();

  navItems.forEach(n => {
    const navTarget = n.getAttribute('data-target');
    n.classList.toggle('active', navTarget === targetId);
  });

  sidebar.classList.remove('open');
}

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(item.getAttribute('data-target'));
  });
});

// ===== MODAL =====
function populateManagerDropdown(excludeId) {
  empManagerInput.innerHTML = '<option value="">None (Top Level)</option>';
  employees.forEach(emp => {
    if (emp.id !== excludeId) {
      empManagerInput.innerHTML += `<option value="${emp.id}">${escapeHtml(emp.name)} — ${escapeHtml(emp.role)}</option>`;
    }
  });
}

// Refresh the department <select>s from the loaded departments. We always
// keep at least the four defaults, but admins can add/rename/delete in the
// Departments page and have those changes appear here on the next refresh.
function populateDepartmentDropdowns(selected) {
  const targets = [empDeptInput, deptFilter];
  targets.forEach((select) => {
    if (!select) return;
    const current = selected !== undefined ? selected : select.value;
    // The directory filter has a leading "All" option; the form does not.
    const isFilter = select === deptFilter;
    const opts = [];
    if (isFilter) {
      opts.push('<option value="all">All Departments</option>');
    } else {
      opts.push('<option value="" disabled>Select Department</option>');
    }
    departments.forEach((d) => {
      opts.push(`<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`);
    });
    select.innerHTML = opts.join('');
    if (current) {
      // Only reapply if the option still exists.
      const exists = Array.from(select.options).some((o) => o.value === current);
      if (exists) select.value = current;
    }
  });
}

function openModal(isEdit = false, emp = null) {
  employeeModal.classList.remove('d-none');
  populateManagerDropdown(isEdit && emp ? emp.id : null);
  populateDepartmentDropdowns(isEdit && emp ? emp.department : '');

  if (isEdit && emp) {
    modalTitle.textContent = 'Edit Employee';
    empIdInput.value = emp.id;
    empNameInput.value = emp.name;
    empRoleInput.value = emp.role;
    empDeptInput.value = emp.department;
    empStatusInput.value = emp.status;
    empEmailInput.value = emp.email;
    empPhoneInput.value = emp.phone;
    empJoinDateInput.value = emp.joinDate;
    empDobInput.value = emp.dob;
    empGenderInput.value = emp.gender;
    empBloodGroupInput.value = emp.bloodGroup;
    empAddressInput.value = emp.address;
    empGradeInput.value = emp.grade;
    empManagerInput.value = emp.managerId;
    empEmergencyNameInput.value = emp.emergencyName;
    empEmergencyPhoneInput.value = emp.emergencyPhone;
    empNotesInput.value = emp.notes;
  } else {
    modalTitle.textContent = 'Add New Employee';
    employeeForm.reset();
    empIdInput.value = '';
    empJoinDateInput.value = new Date().toISOString().split('T')[0];
  }
}

function closeModal() {
  employeeModal.classList.add('d-none');
  employeeForm.reset();
}

addEmployeeBtn.addEventListener('click', () => openModal(false));
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
employeeModal.addEventListener('click', (e) => { if (e.target === employeeModal) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !employeeModal.classList.contains('d-none')) closeModal();
});

// ===== FORM SUBMIT =====
employeeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const idValue = empIdInput.value;
  const employeeData = {
    name: empNameInput.value.trim(),
    role: empRoleInput.value.trim(),
    department: empDeptInput.value,
    status: empStatusInput.value,
    email: empEmailInput.value.trim(),
    phone: empPhoneInput.value.trim(),
    joinDate: empJoinDateInput.value,
    dob: empDobInput.value,
    gender: empGenderInput.value,
    bloodGroup: empBloodGroupInput.value,
    address: empAddressInput.value.trim(),
    grade: empGradeInput.value.trim(),
    managerId: empManagerInput.value,
    emergencyName: empEmergencyNameInput.value.trim(),
    emergencyPhone: empEmergencyPhoneInput.value.trim(),
    notes: empNotesInput.value.trim()
  };

  const submitBtn = employeeForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    if (idValue) {
      const { employee } = await api.updateEmployee(idValue, employeeData);
      const idx = employees.findIndex(em => em.id === idValue);
      if (idx !== -1) employees[idx] = normalizeEmployee(employee);
      showToast(`${employee.name} updated successfully.`);
    } else {
      const { employee } = await api.createEmployee(employeeData);
      employees.unshift(normalizeEmployee(employee));
      showToast(`${employee.name} added to the team.`);
    }

    closeModal();
    updateAllViews();

    if (currentDetailId === idValue) {
      showEmployeeDetail(idValue);
    }
  } catch (err) {
    showToast('Failed to save: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

// ===== RENDERING: EMPLOYEE CARDS =====
function createEmployeeCard(emp) {
  const privileged = isPrivileged();
  const isInactive = emp.status !== 'Active';
  const checkbox = (privileged && selectMode)
    ? `<input type="checkbox" class="emp-select" data-id="${emp.id}" ${selectedIds.has(emp.id) ? 'checked' : ''} aria-label="Select ${emp.name}">`
    : '';
  const isSelected = selectedIds.has(emp.id);

  const adminActions = privileged ? `
        <button class="icon-btn toggle-status-btn ${isInactive ? 'is-inactive' : ''}" data-id="${emp.id}" title="${isInactive ? 'Reactivate employee' : 'Deactivate employee'}">
          <i class="fa-solid ${isInactive ? 'fa-circle-play' : 'fa-circle-pause'}"></i>
        </button>
        <button class="icon-btn edit-btn" data-id="${emp.id}" title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="icon-btn delete-btn" data-id="${emp.id}" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>` : '';

  return `
    <div class="emp-card${isSelected ? ' is-selected' : ''}" data-emp-id="${emp.id}">
      ${checkbox}
      <div class="status-badge ${emp.status === 'Active' ? 'status-active' : 'status-inactive'}">
        ${emp.status}
      </div>
      <div class="emp-card-header">
        <div class="emp-avatar" style="background: ${avatarGradient(emp.name)}">
          ${getInitials(emp.name)}
        </div>
        <div class="emp-info">
          <h4>${escapeHtml(emp.name)}</h4>
          <span class="role">${escapeHtml(emp.role)}</span>
          <div class="dept">${escapeHtml(emp.department)}</div>
        </div>
      </div>
      <div class="emp-details">
        <div class="emp-detail-item">
          <i class="fa-solid fa-envelope"></i>
          <span>${escapeHtml(emp.email)}</span>
        </div>
        <div class="emp-detail-item">
          <i class="fa-solid fa-phone"></i>
          <span>${escapeHtml(emp.phone)}</span>
        </div>
        <div class="emp-detail-item">
          <i class="fa-regular fa-calendar"></i>
          <span>Joined ${formatDate(emp.joinDate)}</span>
        </div>
      </div>
      <div class="emp-actions">
        ${adminActions}
      </div>
    </div>
  `;
}

function attachCardEvents(container) {
  container.querySelectorAll('.emp-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.emp-actions')) return;
      if (e.target.closest('.emp-select')) return;
      // In select mode, clicking the card toggles its checkbox instead of
      // opening the detail view.
      if (selectMode && isPrivileged()) {
        const id = card.getAttribute('data-emp-id');
        toggleSelected(id);
        return;
      }
      const id = card.getAttribute('data-emp-id');
      showEmployeeDetail(id);
    });
  });

  container.querySelectorAll('.emp-select').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (e.currentTarget.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      updateBulkBar();
      const card = e.currentTarget.closest('.emp-card');
      if (card) card.classList.toggle('is-selected', e.currentTarget.checked);
    });
  });

  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const emp = employees.find(em => em.id === id);
      if (emp) openModal(true, emp);
    });
  });

  container.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const emp = employees.find(em => em.id === id);
      if (!emp) return;
      const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
      try {
        const { employee } = await api.updateEmployee(id, { ...emp, status: newStatus });
        const idx = employees.findIndex((x) => x.id === id);
        if (idx !== -1) employees[idx] = normalizeEmployee(employee);
        updateAllViews();
        showToast(`${employee.name} marked ${newStatus}.`);
      } catch (err) {
        showToast('Failed to update status: ' + err.message, 'error');
      }
    });
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const emp = employees.find(em => em.id === id);
      if (!emp) return;
      if (!confirm(`Are you sure you want to remove ${emp.name}?`)) return;

      try {
        await api.deleteEmployee(id);
        employees = employees.filter(em => em.id !== id);
        showToast(`${emp.name} removed.`, 'error');
        updateAllViews();
      } catch (err) {
        showToast('Failed to delete: ' + err.message, 'error');
      }
    });
  });
}

// ===== BULK SELECT MODE =====
function toggleSelected(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  renderDirectory();
  updateBulkBar();
}

function enterSelectMode() {
  if (!isPrivileged()) return;
  selectMode = true;
  selectedIds.clear();
  if (employeeGrid) employeeGrid.classList.add('select-mode');
  if (bulkBar) bulkBar.classList.remove('d-none');
  if (selectModeBtn) selectModeBtn.classList.add('d-none');
  renderDirectory();
  updateBulkBar();
}

function exitSelectMode() {
  selectMode = false;
  selectedIds.clear();
  if (employeeGrid) employeeGrid.classList.remove('select-mode');
  if (bulkBar) bulkBar.classList.add('d-none');
  if (selectModeBtn && isPrivileged()) selectModeBtn.classList.remove('d-none');
  if (bulkSelectAll) bulkSelectAll.checked = false;
  renderDirectory();
}

function updateBulkBar() {
  if (!bulkSelectionCount) return;
  const n = selectedIds.size;
  bulkSelectionCount.textContent = `${n} selected`;
  if (bulkSelectAll) {
    const filteredIds = getFilteredSortedEmployees().map((e) => e.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
    bulkSelectAll.checked = allSelected;
  }
}

if (selectModeBtn) selectModeBtn.addEventListener('click', enterSelectMode);
if (bulkExitBtn) bulkExitBtn.addEventListener('click', exitSelectMode);

if (bulkSelectAll) {
  bulkSelectAll.addEventListener('change', (e) => {
    const filteredIds = getFilteredSortedEmployees().map((emp) => emp.id);
    if (e.currentTarget.checked) filteredIds.forEach((id) => selectedIds.add(id));
    else filteredIds.forEach((id) => selectedIds.delete(id));
    renderDirectory();
    updateBulkBar();
  });
}

async function applyBulk(action) {
  if (selectedIds.size === 0) {
    showToast('Pick at least one employee first.', 'error');
    return;
  }
  const ids = [...selectedIds];
  let confirmMsg = '';
  if (action === 'delete') confirmMsg = `Delete ${ids.length} employee${ids.length !== 1 ? 's' : ''}? This cannot be undone.`;
  else if (action === 'activate') confirmMsg = `Mark ${ids.length} employee${ids.length !== 1 ? 's' : ''} as Active?`;
  else if (action === 'deactivate') confirmMsg = `Mark ${ids.length} employee${ids.length !== 1 ? 's' : ''} as Inactive?`;
  if (!confirm(confirmMsg)) return;

  try {
    const { affected } = await api.bulkEmployees(action, ids);
    if (action === 'delete') {
      employees = employees.filter((em) => !selectedIds.has(em.id));
    } else {
      const newStatus = action === 'activate' ? 'Active' : 'Inactive';
      employees = employees.map((em) => (selectedIds.has(em.id) ? { ...em, status: newStatus } : em));
    }
    selectedIds.clear();
    updateAllViews();
    showToast(`${affected} employee${affected !== 1 ? 's' : ''} ${action === 'delete' ? 'deleted' : action + 'd'}.`);
    if (action === 'delete') exitSelectMode();
    updateBulkBar();
  } catch (err) {
    showToast('Bulk action failed: ' + err.message, 'error');
  }
}

if (bulkActivateBtn) bulkActivateBtn.addEventListener('click', () => applyBulk('activate'));
if (bulkDeactivateBtn) bulkDeactivateBtn.addEventListener('click', () => applyBulk('deactivate'));
if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', () => applyBulk('delete'));

// ===== DASHBOARD =====
function updateDashboard() {
  statTotal.textContent = employees.length;
  statActive.textContent = employees.filter(e => e.status === 'Active').length;
  statDepts.textContent = new Set(employees.map(e => e.department).filter(Boolean)).size;

  const recent = [...employees]
    .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
    .slice(0, 4);

  if (recent.length === 0) {
    recentEmpsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-users"></i>
        <p>No employees yet. Click "New Employee" to add your first one.</p>
      </div>`;
  } else {
    recentEmpsGrid.innerHTML = recent.map(emp => createEmployeeCard(emp)).join('');
    attachCardEvents(recentEmpsGrid);
  }
}

// ===== DIRECTORY =====
function getFilteredSortedEmployees() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedDept = deptFilter.value;
  const selectedStatus = statusFilter.value;
  const sortValue = sortSelect.value;

  let filtered = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm) ||
                          emp.email.toLowerCase().includes(searchTerm) ||
                          emp.role.toLowerCase().includes(searchTerm);
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    const matchesStatus = selectedStatus === 'all' || emp.status === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  filtered.sort((a, b) => {
    switch (sortValue) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'date-desc': return new Date(b.joinDate) - new Date(a.joinDate);
      case 'date-asc': return new Date(a.joinDate) - new Date(b.joinDate);
      case 'dept-asc': return a.department.localeCompare(b.department);
      default: return 0;
    }
  });

  return filtered;
}

function renderDirectory() {
  const filtered = getFilteredSortedEmployees();

  if (resultsCount) {
    resultsCount.textContent = `${filtered.length} employee${filtered.length !== 1 ? 's' : ''}`;
  }

  employeeGrid.classList.toggle('list-view', currentViewMode === 'list');

  if (filtered.length === 0) {
    employeeGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-magnifying-glass"></i>
        <p>No matching employees found.</p>
      </div>`;
  } else {
    employeeGrid.innerHTML = filtered.map(emp => createEmployeeCard(emp)).join('');
    attachCardEvents(employeeGrid);
  }
}

function updateAllViews() {
  updateDashboard();
  renderDirectory();
}

// Filters & sort
searchInput.addEventListener('input', renderDirectory);
deptFilter.addEventListener('change', renderDirectory);
statusFilter.addEventListener('change', renderDirectory);
sortSelect.addEventListener('change', renderDirectory);

// ===== VIEW TOGGLE (Grid / List) =====
gridViewBtn.addEventListener('click', () => {
  currentViewMode = 'grid';
  gridViewBtn.classList.add('active');
  listViewBtn.classList.remove('active');
  renderDirectory();
});

listViewBtn.addEventListener('click', () => {
  currentViewMode = 'list';
  listViewBtn.classList.add('active');
  gridViewBtn.classList.remove('active');
  renderDirectory();
});

// ===== EMPLOYEE DETAIL VIEW =====
function showEmployeeDetail(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;

  currentDetailId = id;

  pageTitle.textContent = emp.name;
  pageSubtitle.textContent = `${emp.role} · ${emp.department}`;

  detailHeader.innerHTML = `
    <div class="detail-avatar" style="background: ${avatarGradient(emp.name)}">
      ${getInitials(emp.name)}
    </div>
    <div>
      <div class="detail-name">${emp.name}</div>
      <div class="detail-meta">
        <span><i class="fa-solid fa-briefcase"></i> ${emp.role}</span>
        <span><i class="fa-solid fa-building"></i> ${emp.department}</span>
        <span class="status-badge ${emp.status === 'Active' ? 'status-active' : 'status-inactive'}" style="position:static">${emp.status}</span>
      </div>
    </div>
  `;

  const infoPanel = document.getElementById('tab-info');
  infoPanel.innerHTML = `
    <div class="info-grid">
      <div class="info-section">
        <div class="info-section-title">Personal Information</div>
        <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">${emp.name}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${emp.email}</span></div>
        <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${emp.phone}</span></div>
        <div class="info-row"><span class="info-label">Date of Birth</span><span class="info-value">${formatDate(emp.dob)}</span></div>
        <div class="info-row"><span class="info-label">Gender</span><span class="info-value">${emp.gender || '—'}</span></div>
        <div class="info-row"><span class="info-label">Blood Group</span><span class="info-value">${emp.bloodGroup || '—'}</span></div>
        <div class="info-row"><span class="info-label">Address</span><span class="info-value">${emp.address || '—'}</span></div>
      </div>
      <div class="info-section">
        <div class="info-section-title">Employment Details</div>
        <div class="info-row"><span class="info-label">Employee ID</span><span class="info-value">#${emp.id}</span></div>
        <div class="info-row"><span class="info-label">Designation</span><span class="info-value">${emp.role}</span></div>
        <div class="info-row"><span class="info-label">Department</span><span class="info-value">${emp.department}</span></div>
        <div class="info-row"><span class="info-label">Grade / Level</span><span class="info-value">${emp.grade || '—'}</span></div>
        <div class="info-row"><span class="info-label">Reports To</span><span class="info-value">${getManagerName(emp.managerId)}</span></div>
        <div class="info-row"><span class="info-label">Join Date</span><span class="info-value">${formatDate(emp.joinDate)}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value">${emp.status}</span></div>
      </div>
      <div class="info-section">
        <div class="info-section-title">Emergency Contact</div>
        <div class="info-row"><span class="info-label">Contact Name</span><span class="info-value">${emp.emergencyName || '—'}</span></div>
        <div class="info-row"><span class="info-label">Contact Phone</span><span class="info-value">${emp.emergencyPhone || '—'}</span></div>
      </div>
      ${emp.notes ? `
      <div class="info-section">
        <div class="info-section-title">Notes</div>
        <p style="font-size: 0.8125rem; color: var(--text-secondary);">${emp.notes}</p>
      </div>` : ''}
    </div>
  `;

  tabBtns.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'info'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-info'));

  views.forEach(v => { v.classList.add('d-none'); v.classList.remove('active'); });
  employeeDetailSection.classList.remove('d-none');
  employeeDetailSection.classList.add('active');

  navItems.forEach(n => n.classList.remove('active'));
}

// Detail: Edit button
detailEditBtn.addEventListener('click', () => {
  const emp = employees.find(e => e.id === currentDetailId);
  if (emp) openModal(true, emp);
});

// Detail: Delete button
detailDeleteBtn.addEventListener('click', async () => {
  const emp = employees.find(e => e.id === currentDetailId);
  if (!emp) return;
  if (!confirm(`Are you sure you want to remove ${emp.name}?`)) return;

  try {
    await api.deleteEmployee(currentDetailId);
    employees = employees.filter(em => em.id !== currentDetailId);
    showToast(`${emp.name} removed.`, 'error');
    currentDetailId = null;
    switchView('directory');
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
});

// Detail: Back button
backToDirectoryBtn.addEventListener('click', () => {
  currentDetailId = null;
  switchView('directory');
});

// Detail tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    tabBtns.forEach(t => t.classList.toggle('active', t === btn));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
    if (tab === 'timeline' && currentDetailId) {
      loadAuditFeed(currentDetailId);
    }
  });
});

// ===== CSV EXPORT =====
function exportCsv() {
  const headers = [
    'ID', 'Name', 'Role', 'Department', 'Email', 'Phone', 'Join Date', 'Status',
    'Date of Birth', 'Gender', 'Blood Group', 'Address', 'Grade', 'Manager ID',
    'Emergency Contact Name', 'Emergency Contact Phone', 'Notes'
  ];

  const rows = employees.map(emp => [
    emp.id, emp.name, emp.role, emp.department, emp.email, emp.phone, emp.joinDate, emp.status,
    emp.dob, emp.gender, emp.bloodGroup, emp.address, emp.grade, emp.managerId,
    emp.emergencyName, emp.emergencyPhone, emp.notes
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `element_employees_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Exported ${employees.length} employees to CSV.`);
}

exportCsvBtn.addEventListener('click', exportCsv);

// ===== CSV IMPORT =====
importCsvBtn.addEventListener('click', () => csvFileInput.click());

csvFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const text = event.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length < 2) {
        showToast('CSV file is empty or has no data rows.', 'error');
        return;
      }

      const headerLine = lines[0];
      const headers = parseCSVRow(headerLine);

      const fieldMap = {
        'id': 'id', 'name': 'name', 'full name': 'name', 'role': 'role',
        'designation': 'role', 'department': 'department', 'dept': 'department',
        'email': 'email', 'email address': 'email', 'phone': 'phone',
        'phone number': 'phone', 'join date': 'joinDate', 'joindate': 'joinDate',
        'status': 'status', 'date of birth': 'dob', 'dob': 'dob',
        'gender': 'gender', 'blood group': 'bloodGroup', 'bloodgroup': 'bloodGroup',
        'address': 'address', 'grade': 'grade', 'level': 'grade',
        'manager id': 'managerId', 'managerid': 'managerId',
        'emergency contact name': 'emergencyName', 'emergencyname': 'emergencyName',
        'emergency contact phone': 'emergencyPhone', 'emergencyphone': 'emergencyPhone',
        'notes': 'notes'
      };

      const colMap = headers.map(h => fieldMap[h.toLowerCase().trim()] || null);

      const rowsToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVRow(lines[i]);
        const empObj = {};
        colMap.forEach((field, idx) => {
          if (field && values[idx] !== undefined) {
            empObj[field] = values[idx];
          }
        });
        if (!empObj.name || !empObj.name.trim()) continue;
        // Don't reuse imported IDs — let the server generate fresh ones
        delete empObj.id;
        if (!empObj.role) empObj.role = 'Unspecified';
        if (!empObj.department) empObj.department = 'Administration';
        if (!empObj.status) empObj.status = 'Active';
        rowsToImport.push(empObj);
      }

      showToast(`Importing ${rowsToImport.length} employee${rowsToImport.length !== 1 ? 's' : ''}…`);
      let imported = 0;
      let failed = 0;
      for (const row of rowsToImport) {
        try {
          const { employee } = await api.createEmployee(row);
          employees.unshift(normalizeEmployee(employee));
          imported++;
        } catch (err) {
          console.error('Import row failed:', row, err);
          failed++;
        }
      }

      updateAllViews();
      if (failed === 0) {
        showToast(`Imported ${imported} employee${imported !== 1 ? 's' : ''} from CSV.`);
      } else {
        showToast(`Imported ${imported}, failed ${failed}. See console.`, 'error');
      }
    } catch (err) {
      showToast('Failed to parse CSV file.', 'error');
      console.error('CSV import error:', err);
    }

    csvFileInput.value = '';
  };

  reader.readAsText(file);
});

function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

// ============================================================
//  LEAVE REQUESTS
// ============================================================
async function loadLeaves() {
  try {
    const { leaves } = await api.listLeaves();
    leaveRequests = Array.isArray(leaves) ? leaves : [];
    updateLeavesBadge();
    if (leavesSection && leavesSection.classList.contains('active')) {
      renderLeaves();
    }
  } catch (err) {
    if (err.status === 401) { showAuthScreen(); return; }
    showToast('Failed to load leave requests: ' + err.message, 'error');
  }
}

function updateLeavesBadge() {
  if (!leavesBadge) return;
  // For admins/owners the badge counts pending org-wide. For employees, it
  // counts their own pending requests so they remember what's outstanding.
  const pending = leaveRequests.filter((l) => l.status === 'Pending').length;
  if (pending > 0) {
    leavesBadge.textContent = String(pending);
    leavesBadge.classList.remove('d-none');
  } else {
    leavesBadge.classList.add('d-none');
  }
}

function getFilteredLeaves() {
  const status = leaveStatusFilter ? leaveStatusFilter.value : 'all';
  const scope = (isPrivileged() && leaveScopeFilter) ? leaveScopeFilter.value : 'all';
  return leaveRequests.filter((l) => {
    if (status !== 'all' && l.status !== status) return false;
    if (scope === 'mine' && currentUser && Number(l.userId) !== Number(currentUser.id)) return false;
    return true;
  });
}

function formatDateRange(start, end) {
  if (!start && !end) return '—';
  if (start === end) return formatDate(start);
  return `${formatDate(start)} → ${formatDate(end)}`;
}

function leaveDayCount(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function renderLeaves() {
  if (!leaveList) return;
  const filtered = getFilteredLeaves();
  if (leaveResultsCount) {
    leaveResultsCount.textContent = `${filtered.length} request${filtered.length !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    leaveList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-plane-departure"></i>
        <p>No leave requests match the current filters.</p>
      </div>`;
    return;
  }

  const privileged = isPrivileged();
  leaveList.innerHTML = filtered.map((l) => {
    const days = leaveDayCount(l.startDate, l.endDate);
    const isMine = currentUser && Number(l.userId) === Number(currentUser.id);
    const canReview = privileged && l.status === 'Pending';
    const canCancel = isMine && l.status === 'Pending';
    const canDelete = privileged;
    const reviewer = l.reviewerName ? `Reviewed by ${escapeHtml(l.reviewerName)}` : '';

    return `
      <div class="leave-card" data-leave-id="${l.id}">
        <div class="leave-avatar" style="background: ${avatarGradient(l.userName || l.userEmail || '?')}">
          ${getInitials(l.userName || l.userEmail || '?')}
        </div>
        <div class="leave-body">
          <div class="leave-line-1">
            <span class="leave-name">${escapeHtml(l.userName || l.userEmail || 'Unknown')}</span>
            <span class="leave-type-pill">${escapeHtml(l.leaveType)}</span>
          </div>
          <div class="leave-line-2">
            <span><i class="fa-regular fa-calendar"></i> ${formatDateRange(l.startDate, l.endDate)}</span>
            <span><i class="fa-solid fa-hourglass-half"></i> ${days} day${days !== 1 ? 's' : ''}</span>
            ${reviewer ? `<span><i class="fa-solid fa-user-check"></i> ${reviewer}</span>` : ''}
          </div>
          ${l.reason ? `<div class="leave-reason">${escapeHtml(l.reason)}</div>` : ''}
          ${l.reviewNotes ? `<div class="leave-review-note">Note: ${escapeHtml(l.reviewNotes)}</div>` : ''}
        </div>
        <div class="leave-actions">
          <span class="leave-status status-${l.status}">${l.status}</span>
          ${canReview ? `
            <button class="btn btn-secondary btn-sm leave-review-btn" data-id="${l.id}">
              <i class="fa-solid fa-gavel"></i><span>Review</span>
            </button>` : ''}
          ${canCancel ? `
            <button class="btn btn-secondary btn-sm leave-cancel-btn" data-id="${l.id}">
              <i class="fa-solid fa-ban"></i><span>Cancel</span>
            </button>` : ''}
          ${canDelete ? `
            <button class="icon-btn leave-delete-btn" data-id="${l.id}" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Wire up per-card actions.
  leaveList.querySelectorAll('.leave-review-btn').forEach((btn) => {
    btn.addEventListener('click', () => openLeaveReview(btn.getAttribute('data-id')));
  });
  leaveList.querySelectorAll('.leave-cancel-btn').forEach((btn) => {
    btn.addEventListener('click', () => updateLeaveStatus(btn.getAttribute('data-id'), 'Cancelled'));
  });
  leaveList.querySelectorAll('.leave-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteLeave(btn.getAttribute('data-id')));
  });
}

function openLeaveModal() {
  if (!leaveModal) return;
  leaveForm.reset();
  leaveIdInput.value = '';
  const today = new Date().toISOString().split('T')[0];
  leaveStartInput.value = today;
  leaveEndInput.value = today;
  leaveModal.classList.remove('d-none');
}
function closeLeaveModal() {
  if (leaveModal) leaveModal.classList.add('d-none');
}

if (newLeaveBtn) newLeaveBtn.addEventListener('click', openLeaveModal);
if (requestLeaveSidebarBtn) requestLeaveSidebarBtn.addEventListener('click', openLeaveModal);
if (closeLeaveModalBtn) closeLeaveModalBtn.addEventListener('click', closeLeaveModal);
if (cancelLeaveBtn) cancelLeaveBtn.addEventListener('click', closeLeaveModal);
if (leaveModal) {
  leaveModal.addEventListener('click', (e) => { if (e.target === leaveModal) closeLeaveModal(); });
}

if (leaveForm) {
  leaveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = leaveForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const payload = {
        leaveType: leaveTypeInput.value,
        startDate: leaveStartInput.value,
        endDate: leaveEndInput.value,
        reason: leaveReasonInput.value.trim()
      };
      const { leave } = await api.createLeave(payload);
      leaveRequests.unshift(leave);
      updateLeavesBadge();
      closeLeaveModal();
      showToast('Leave request submitted.');
      if (leavesSection && leavesSection.classList.contains('active')) renderLeaves();
    } catch (err) {
      showToast('Failed to submit leave: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

if (leaveStatusFilter) leaveStatusFilter.addEventListener('change', renderLeaves);
if (leaveScopeFilter) leaveScopeFilter.addEventListener('change', renderLeaves);

function openLeaveReview(id) {
  const leave = leaveRequests.find((l) => String(l.id) === String(id));
  if (!leave) return;
  leaveReviewIdInput.value = leave.id;
  leaveReviewNotes.value = '';
  const days = leaveDayCount(leave.startDate, leave.endDate);
  leaveReviewSummary.innerHTML = `
    <div><strong>${escapeHtml(leave.userName || leave.userEmail || 'Unknown')}</strong> · ${escapeHtml(leave.leaveType)}</div>
    <div>${formatDateRange(leave.startDate, leave.endDate)} · ${days} day${days !== 1 ? 's' : ''}</div>
    ${leave.reason ? `<div style="margin-top:0.375rem">${escapeHtml(leave.reason)}</div>` : ''}
  `;
  leaveReviewModal.classList.remove('d-none');
}
function closeLeaveReview() {
  if (leaveReviewModal) leaveReviewModal.classList.add('d-none');
}
if (closeLeaveReviewBtn) closeLeaveReviewBtn.addEventListener('click', closeLeaveReview);
if (leaveReviewCancelBtn) leaveReviewCancelBtn.addEventListener('click', closeLeaveReview);
if (leaveReviewModal) {
  leaveReviewModal.addEventListener('click', (e) => { if (e.target === leaveReviewModal) closeLeaveReview(); });
}

async function applyLeaveDecision(status) {
  const id = leaveReviewIdInput.value;
  if (!id) return;
  const reviewNotes = leaveReviewNotes.value.trim();
  leaveApproveBtn.disabled = true;
  leaveRejectBtn.disabled = true;
  try {
    const { leave } = await api.updateLeave(id, { status, reviewNotes });
    const idx = leaveRequests.findIndex((l) => String(l.id) === String(id));
    if (idx !== -1) leaveRequests[idx] = leave;
    updateLeavesBadge();
    closeLeaveReview();
    showToast(`Request ${status.toLowerCase()}.`, status === 'Rejected' ? 'error' : 'success');
    renderLeaves();
  } catch (err) {
    showToast('Failed to update request: ' + err.message, 'error');
  } finally {
    leaveApproveBtn.disabled = false;
    leaveRejectBtn.disabled = false;
  }
}
if (leaveApproveBtn) leaveApproveBtn.addEventListener('click', () => applyLeaveDecision('Approved'));
if (leaveRejectBtn) leaveRejectBtn.addEventListener('click', () => applyLeaveDecision('Rejected'));

async function updateLeaveStatus(id, status) {
  if (!confirm(`Set this request to ${status}?`)) return;
  try {
    const { leave } = await api.updateLeave(id, { status });
    const idx = leaveRequests.findIndex((l) => String(l.id) === String(id));
    if (idx !== -1) leaveRequests[idx] = leave;
    updateLeavesBadge();
    renderLeaves();
    showToast(`Request ${status.toLowerCase()}.`);
  } catch (err) {
    showToast('Failed to update request: ' + err.message, 'error');
  }
}

async function deleteLeave(id) {
  if (!confirm('Delete this leave request? This cannot be undone.')) return;
  try {
    await api.deleteLeave(id);
    leaveRequests = leaveRequests.filter((l) => String(l.id) !== String(id));
    updateLeavesBadge();
    renderLeaves();
    showToast('Request deleted.');
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
}

// ============================================================
//  USERS / ROLES MANAGEMENT
// ============================================================
async function loadUsers() {
  if (!isPrivileged() || !usersTableBody) return;
  try {
    const { users } = await api.listUsers();
    userAccounts = Array.isArray(users) ? users : [];
    renderUsers();
  } catch (err) {
    if (err.status === 401) { showAuthScreen(); return; }
    showToast('Failed to load users: ' + err.message, 'error');
  }
}

function renderUsers() {
  if (!usersTableBody) return;
  if (userAccounts.length === 0) {
    usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.25rem">No users yet.</td></tr>`;
    return;
  }

  usersTableBody.innerHTML = userAccounts.map((u) => {
    const role = (u.role || 'employee').toLowerCase();
    const isMe = currentUser && Number(u.id) === Number(currentUser.id);
    const targetIsOwner = role === 'owner';

    // What roles can the current user assign to this row?
    let options = [];
    if (isOwner()) {
      options = ['owner', 'admin', 'employee'];
    } else if (isPrivileged() && !targetIsOwner) {
      options = ['admin', 'employee'];
    }
    const canEdit = !isMe && options.length > 0;

    const dropdown = canEdit ? `
      <select class="role-select" data-user-id="${u.id}">
        ${options.map((r) => `<option value="${r}" ${r === role ? 'selected' : ''}>${r}</option>`).join('')}
      </select>` : `<span class="role-pill role-${role}">${role}</span>`;

    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="emp-avatar" style="background: ${avatarGradient(u.name || u.email)}">
              ${getInitials(u.name || u.email)}
            </div>
            <div>${escapeHtml(u.name || '')}${isMe ? ' <span class="text-muted">(you)</span>' : ''}</div>
          </div>
        </td>
        <td style="word-break:break-all">${escapeHtml(u.email || '')}</td>
        <td>${dropdown}</td>
        <td class="text-muted">${u.createdAt ? formatDate(u.createdAt) : '—'}</td>
        <td></td>
      </tr>
    `;
  }).join('');

  usersTableBody.querySelectorAll('select.role-select').forEach((sel) => {
    sel.addEventListener('change', async (e) => {
      const userId = e.currentTarget.getAttribute('data-user-id');
      const newRole = e.currentTarget.value;
      const target = userAccounts.find((u) => String(u.id) === String(userId));
      if (!target) return;
      const previousRole = target.role;

      const confirmMsg = newRole === 'owner'
        ? `Promote ${target.name || target.email} to OWNER? This grants full control.`
        : `Set ${target.name || target.email}'s role to ${newRole}?`;
      if (!confirm(confirmMsg)) {
        e.currentTarget.value = previousRole;
        return;
      }

      try {
        const { user } = await api.updateUserRole(userId, newRole);
        target.role = user.role;
        showToast(`${user.name || user.email} is now ${user.role}.`);
        // If we just transferred ownership, refresh self.
        if (newRole === 'owner' && currentUser && Number(currentUser.id) !== Number(userId)) {
          await refreshCurrentUser();
        }
        renderUsers();
      } catch (err) {
        showToast('Could not update role: ' + err.message, 'error');
        e.currentTarget.value = previousRole;
      }
    });
  });
}

// ============================================================
//  CLAIM OWNER ACCESS
// ============================================================
function openClaimOwnerModal() {
  if (!claimOwnerModal) return;
  if (claimOwnerForm) claimOwnerForm.reset();
  hideAuthError(claimOwnerError);
  // Close the user dropdown if it was open.
  if (userMenu) userMenu.classList.add('d-none');
  claimOwnerModal.classList.remove('d-none');
  setTimeout(() => claimOwnerPassword && claimOwnerPassword.focus(), 50);
}
function closeClaimOwnerModal() {
  if (claimOwnerModal) claimOwnerModal.classList.add('d-none');
  if (claimOwnerForm) claimOwnerForm.reset();
  hideAuthError(claimOwnerError);
}

if (claimOwnerBtn) {
  claimOwnerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openClaimOwnerModal();
  });
}
if (closeClaimOwnerBtn) closeClaimOwnerBtn.addEventListener('click', closeClaimOwnerModal);
if (cancelClaimOwnerBtn) cancelClaimOwnerBtn.addEventListener('click', closeClaimOwnerModal);
if (claimOwnerModal) {
  claimOwnerModal.addEventListener('click', (e) => {
    if (e.target === claimOwnerModal) closeClaimOwnerModal();
  });
}

if (claimOwnerForm) {
  claimOwnerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError(claimOwnerError);
    const pwd = claimOwnerPassword.value;
    if (!pwd) {
      showAuthError(claimOwnerError, 'Setup password is required.');
      return;
    }
    confirmClaimOwnerBtn.disabled = true;
    try {
      const { user, token } = await api.claimOwner(pwd);
      // Swap in the fresh token + user so the role takes effect immediately.
      if (token) auth.setToken(token);
      currentUser = user;
      auth.setUser(user);
      setUserChip(user);
      applyRoleVisibility();
      closeClaimOwnerModal();
      showToast('You are now the workspace owner.');
      // Refresh the users list if the page is currently open.
      if (usersSection && usersSection.classList.contains('active')) {
        await loadUsers();
      }
    } catch (err) {
      showAuthError(claimOwnerError, err.message || 'Could not claim ownership.');
    } finally {
      confirmClaimOwnerBtn.disabled = false;
    }
  });
}

// ============================================================
//  DEPARTMENTS
// ============================================================
async function loadDepartments() {
  try {
    const { departments: list } = await api.listDepartments();
    departments = Array.isArray(list) ? list : [];
    populateDepartmentDropdowns();
    if (departmentsSection && departmentsSection.classList.contains('active')) {
      renderDepartments();
    }
  } catch (err) {
    if (err.status === 401) { showAuthScreen(); return; }
    if (err.status === 403) return; // employees don't get the full list — silently ignore
    showToast('Failed to load departments: ' + err.message, 'error');
  }
}

function renderDepartments() {
  if (!departmentsTableBody) return;
  if (departments.length === 0) {
    departmentsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:1.25rem">No departments yet.</td></tr>`;
    return;
  }
  departmentsTableBody.innerHTML = departments.map((d) => `
    <tr data-dept-id="${d.id}">
      <td>
        <div class="dept-name-cell">
          <input type="text" class="dept-name-edit" value="${escapeHtml(d.name)}" maxlength="60">
        </div>
      </td>
      <td>${d.employeeCount}</td>
      <td>
        <div class="dept-row-actions">
          <button class="btn btn-secondary btn-sm dept-rename-btn" data-id="${d.id}">
            <i class="fa-solid fa-floppy-disk"></i><span>Save</span>
          </button>
          <button class="btn btn-danger btn-sm dept-delete-btn" data-id="${d.id}" ${d.employeeCount > 0 ? 'disabled title="Reassign employees first"' : ''}>
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  departmentsTableBody.querySelectorAll('.dept-rename-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const row = btn.closest('tr');
      const input = row.querySelector('.dept-name-edit');
      const newName = (input.value || '').trim();
      if (!newName) {
        showToast('Department name cannot be empty.', 'error');
        return;
      }
      btn.disabled = true;
      try {
        await api.renameDepartment(id, newName);
        showToast('Department renamed.');
        await loadDepartments();
        // Renames cascade — refresh employees so the directory reflects them.
        await loadEmployees();
      } catch (err) {
        showToast('Rename failed: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });

  departmentsTableBody.querySelectorAll('.dept-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const dept = departments.find((d) => String(d.id) === String(id));
      if (!dept) return;
      if (!confirm(`Delete department "${dept.name}"?`)) return;
      try {
        await api.deleteDepartment(id);
        showToast(`Deleted "${dept.name}".`);
        await loadDepartments();
      } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
      }
    });
  });
}

if (newDeptForm) {
  newDeptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (newDeptName.value || '').trim();
    if (!name) return;
    const submitBtn = newDeptForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await api.createDepartment(name);
      newDeptName.value = '';
      showToast(`"${name}" added.`);
      await loadDepartments();
    } catch (err) {
      showToast('Could not add department: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ============================================================
//  AUDIT LOG (Employee Detail → Timeline tab)
// ============================================================
const AUDIT_ICONS = {
  created: { icon: 'fa-plus', cls: 'audit-created', verb: 'created' },
  updated: { icon: 'fa-pen', cls: 'audit-updated', verb: 'updated' },
  deleted: { icon: 'fa-trash', cls: 'audit-deleted', verb: 'deleted' },
  status_changed: { icon: 'fa-circle-half-stroke', cls: 'audit-status_changed', verb: 'changed status of' }
};

function fieldLabel(name) {
  const map = {
    name: 'Name', role: 'Role', department: 'Department', email: 'Email',
    phone: 'Phone', joinDate: 'Join Date', status: 'Status', dob: 'DOB',
    gender: 'Gender', bloodGroup: 'Blood Group', address: 'Address',
    grade: 'Grade', managerId: 'Manager', emergencyName: 'Emergency Contact',
    emergencyPhone: 'Emergency Phone', notes: 'Notes'
  };
  return map[name] || name;
}

function formatRelative(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date)) return '';
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadAuditFeed(employeeId) {
  if (!auditFeed) return;
  auditFeed.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-clock-rotate-left"></i>
      <p>Loading activity…</p>
    </div>`;
  try {
    const { audit } = await api.employeeAudit(employeeId);
    if (!audit || audit.length === 0) {
      auditFeed.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <p>No recorded activity yet for this employee.</p>
        </div>`;
      return;
    }
    auditFeed.innerHTML = audit.map((a) => {
      const meta = AUDIT_ICONS[a.action] || { icon: 'fa-circle', cls: '', verb: a.action };
      let changesHtml = '';
      if (a.action === 'updated' && a.details && a.details.changes) {
        const entries = Object.entries(a.details.changes);
        if (entries.length > 0) {
          changesHtml = `<div class="audit-changes">${entries.map(([field, val]) => {
            const from = val && val.from !== undefined ? String(val.from) : '';
            const to = val && val.to !== undefined ? String(val.to) : '';
            return `<div><span class="audit-change-field">${escapeHtml(fieldLabel(field))}:</span> ${escapeHtml(from || '—')} → ${escapeHtml(to || '—')}</div>`;
          }).join('')}</div>`;
        }
      } else if (a.action === 'status_changed' && a.details) {
        changesHtml = `<div class="audit-changes"><div><span class="audit-change-field">Status:</span> ${escapeHtml(a.details.from || '—')} → ${escapeHtml(a.details.to || '—')}</div></div>`;
      }
      return `
        <div class="audit-entry">
          <div class="audit-icon ${meta.cls}"><i class="fa-solid ${meta.icon}"></i></div>
          <div class="audit-body">
            <div class="audit-headline"><strong>${escapeHtml(a.userName)}</strong> ${escapeHtml(meta.verb)} this employee${a.action === 'created' && a.details ? '' : ''}</div>
            <div class="audit-time">${escapeHtml(formatRelative(a.createdAt))}</div>
            ${changesHtml}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    if (err.status === 401) { showAuthScreen(); return; }
    auditFeed.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Could not load activity: ${escapeHtml(err.message || 'Unknown error')}</p>
      </div>`;
  }
}

async function refreshCurrentUser() {
  try {
    const { user } = await api.me();
    currentUser = user;
    auth.setUser(user);
    setUserChip(user);
    applyRoleVisibility();
  } catch {
    // Non-fatal. The next request that needs auth will fail and bounce to login.
  }
}

// ============================================================
//  BOOTSTRAP — auth check, then either show app or auth screen
// ============================================================
(async function bootstrap() {
  showLoader(true);
  try {
    if (auth.isLoggedIn()) {
      // Verify the stored token is still valid
      try {
        const { user } = await api.me();
        currentUser = user;
        auth.setUser(user);
        setUserChip(user);
        applyRoleVisibility();
        showApp();
        await loadEmployees();
        await loadLeaves();
        if (isPrivileged()) await loadDepartments();
        switchView('dashboard');
      } catch (err) {
        // Token expired or server unreachable — fall back to auth screen
        auth.clear();
        showAuthScreen();
      }
    } else {
      showAuthScreen();
    }
  } finally {
    showLoader(false);
  }
})();
