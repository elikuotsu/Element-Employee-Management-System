// ============================================================
//  ELEMENT Nagaland — API Client
//  Handles auth tokens + all calls to /api/* endpoints
// ============================================================
(function () {
  const API_BASE = '/api';
  const TOKEN_KEY = 'element_auth_token';
  const USER_KEY = 'element_auth_user';

  const auth = {
    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    },
    setToken(token) {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    },
    getUser() {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },
    setUser(user) {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    },
    clear() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    isLoggedIn() {
      return !!this.getToken();
    }
  };

  async function request(path, options = {}) {
    const token = auth.getToken();
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { Authorization: 'Bearer ' + token } : {},
      options.headers || {}
    );

    let res;
    try {
      res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    } catch (networkErr) {
      const e = new Error('Network error. Please check your connection.');
      e.cause = networkErr;
      throw e;
    }

    let data = {};
    try { data = await res.json(); } catch { /* no body */ }

    if (!res.ok) {
      // Auto-clear on 401 so the UI bounces back to login.
      if (res.status === 401) auth.clear();
      const err = new Error(data.error || ('Request failed with status ' + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  const api = {
    // Auth
    signup(email, password, name) {
      return request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      });
    },
    login(email, password) {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },
    me() {
      return request('/auth/me', { method: 'GET' });
    },

    // Employees
    listEmployees() {
      return request('/employees', { method: 'GET' });
    },
    createEmployee(data) {
      return request('/employees', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    updateEmployee(id, data) {
      return request('/employees/' + encodeURIComponent(id), {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    deleteEmployee(id) {
      return request('/employees/' + encodeURIComponent(id), {
        method: 'DELETE'
      });
    }
  };

  // Expose globally — kept simple, no module bundler needed.
  window.elementAuth = auth;
  window.elementApi = api;
})();
