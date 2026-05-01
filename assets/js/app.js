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

// ===== DATA MODEL =====
// In-memory cache, refreshed from the API.
let employees = [];

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
const loginError = document.getElementById('loginError');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupError = document.getElementById('signupError');
const signupSubmitBtn = document.getElementById('signupSubmitBtn');
const authTabs = document.querySelectorAll('.auth-tab');

// User chip
const userChip = document.getElementById('userChip');
const userMenu = document.getElementById('userMenu');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userMenuName = document.getElementById('userMenuName');
const userMenuEmail = document.getElementById('userMenuEmail');
const logoutBtn = document.getElementById('logoutBtn');

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

  try {
    const { user, token } = await api.login(
      loginEmail.value.trim(),
      loginPassword.value
    );
    auth.setToken(token);
    auth.setUser(user);
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

  try {
    const { user, token } = await api.signup(
      signupEmail.value.trim(),
      signupPassword.value,
      signupName.value.trim()
    );
    auth.setToken(token);
    auth.setUser(user);
    showToast(`Welcome, ${user.name}!`);
    await onLoginSuccess(user);
  } catch (err) {
    showAuthError(signupError, err.message || 'Could not create account.');
  } finally {
    signupSubmitBtn.disabled = false;
  }
});

async function onLoginSuccess(user) {
  setUserChip(user);
  showApp();
  await loadEmployees();
  switchView('dashboard');
}

// Logout
logoutBtn.addEventListener('click', (e) => {
  // Prevent the click from bubbling to userChip (which would re-toggle the menu open)
  e.stopPropagation();
  auth.clear();
  employees = [];
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
  }

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
      empManagerInput.innerHTML += `<option value="${emp.id}">${emp.name} — ${emp.role}</option>`;
    }
  });
}

function openModal(isEdit = false, emp = null) {
  employeeModal.classList.remove('d-none');
  populateManagerDropdown(isEdit && emp ? emp.id : null);

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
  return `
    <div class="emp-card" data-emp-id="${emp.id}">
      <div class="status-badge ${emp.status === 'Active' ? 'status-active' : 'status-inactive'}">
        ${emp.status}
      </div>
      <div class="emp-card-header">
        <div class="emp-avatar" style="background: ${avatarGradient(emp.name)}">
          ${getInitials(emp.name)}
        </div>
        <div class="emp-info">
          <h4>${emp.name}</h4>
          <span class="role">${emp.role}</span>
          <div class="dept">${emp.department}</div>
        </div>
      </div>
      <div class="emp-details">
        <div class="emp-detail-item">
          <i class="fa-solid fa-envelope"></i>
          <span>${emp.email}</span>
        </div>
        <div class="emp-detail-item">
          <i class="fa-solid fa-phone"></i>
          <span>${emp.phone}</span>
        </div>
        <div class="emp-detail-item">
          <i class="fa-regular fa-calendar"></i>
          <span>Joined ${formatDate(emp.joinDate)}</span>
        </div>
      </div>
      <div class="emp-actions">
        <button class="icon-btn edit-btn" data-id="${emp.id}" title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="icon-btn delete-btn" data-id="${emp.id}" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

function attachCardEvents(container) {
  container.querySelectorAll('.emp-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.emp-actions')) return;
      const id = card.getAttribute('data-emp-id');
      showEmployeeDetail(id);
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
//  BOOTSTRAP — auth check, then either show app or auth screen
// ============================================================
(async function bootstrap() {
  showLoader(true);
  try {
    if (auth.isLoggedIn()) {
      // Verify the stored token is still valid
      try {
        const { user } = await api.me();
        auth.setUser(user);
        setUserChip(user);
        showApp();
        await loadEmployees();
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
