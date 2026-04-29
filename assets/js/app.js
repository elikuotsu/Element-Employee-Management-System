// ============================================================
//  ELEMENT Nagaland — Employee Management System
//  Module 1: Enhanced Directory & Profiles
// ============================================================

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

// ===== DATA MODEL & STORAGE =====
const STORAGE_KEY = 'element_nagaland_employees';

// Ensure backward compat: add default values for new fields if they're missing
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

function getEmployees() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data).map(normalizeEmployee);
}

function saveEmployees(emps) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emps));
}

let employees = getEmployees();

// ===== DOM REFERENCES =====
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
  const hue = nameToHue(name);
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
  // employeeDetail title is set when opening

  // Update nav active state
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
employeeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const idValue = empIdInput.value;
  const employeeData = normalizeEmployee({
    id: idValue || Date.now().toString(),
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
  });

  if (idValue) {
    const index = employees.findIndex(emp => emp.id === idValue);
    if (index !== -1) employees[index] = employeeData;
    showToast(`${employeeData.name} updated successfully.`);
  } else {
    employees.push(employeeData);
    showToast(`${employeeData.name} added to the team.`);
  }

  saveEmployees(employees);
  closeModal();
  updateAllViews();

  // If detail view is open for this employee, refresh it
  if (currentDetailId === idValue) {
    showEmployeeDetail(idValue);
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
  // Click card to open detail view
  container.querySelectorAll('.emp-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't open detail if clicking action buttons
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
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const emp = employees.find(em => em.id === id);
      if (emp && confirm(`Are you sure you want to remove ${emp.name}?`)) {
        employees = employees.filter(em => em.id !== id);
        saveEmployees(employees);
        showToast(`${emp.name} removed.`, 'error');
        updateAllViews();
      }
    });
  });
}

// ===== DASHBOARD =====
function updateDashboard() {
  statTotal.textContent = employees.length;
  statActive.textContent = employees.filter(e => e.status === 'Active').length;
  statDepts.textContent = new Set(employees.map(e => e.department)).size;

  const recent = [...employees]
    .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
    .slice(0, 4);

  if (recent.length === 0) {
    recentEmpsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-users"></i>
        <p>No employees found. Click "New Employee" to get started.</p>
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

  // Sort
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

  // Apply view mode class
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

  // Header
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

  // Info tab
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

  // Reset to info tab
  tabBtns.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'info'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-info'));

  // Show the detail section
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
detailDeleteBtn.addEventListener('click', () => {
  const emp = employees.find(e => e.id === currentDetailId);
  if (emp && confirm(`Are you sure you want to remove ${emp.name}?`)) {
    employees = employees.filter(em => em.id !== currentDetailId);
    saveEmployees(employees);
    showToast(`${emp.name} removed.`, 'error');
    currentDetailId = null;
    switchView('directory');
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
  reader.onload = (event) => {
    try {
      const text = event.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length < 2) {
        showToast('CSV file is empty or has no data rows.', 'error');
        return;
      }

      // Parse header
      const headerLine = lines[0];
      const headers = parseCSVRow(headerLine);

      // Map headers to fields (case-insensitive)
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

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVRow(lines[i]);
        const empObj = {};
        colMap.forEach((field, idx) => {
          if (field && values[idx] !== undefined) {
            empObj[field] = values[idx];
          }
        });

        // Skip rows without a name
        if (!empObj.name || !empObj.name.trim()) continue;

        // Generate a unique ID if not present or if it conflicts
        if (!empObj.id || employees.some(e => e.id === empObj.id)) {
          empObj.id = Date.now().toString() + '_' + i;
        }

        employees.push(normalizeEmployee(empObj));
        imported++;
      }

      saveEmployees(employees);
      updateAllViews();
      showToast(`Imported ${imported} employee${imported !== 1 ? 's' : ''} from CSV.`);
    } catch (err) {
      showToast('Failed to parse CSV file.', 'error');
      console.error('CSV import error:', err);
    }

    // Reset file input so the same file can be re-imported
    csvFileInput.value = '';
  };

  reader.readAsText(file);
});

// Simple CSV row parser that handles quoted fields
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
          i++; // skip escaped quote
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

// ===== INITIAL LOAD =====
updateAllViews();
