// ================================================
// api.js - Core API Communication Layer
// CLB CTXH DUT
// ================================================

const API_BASE = 'http://localhost:5190/api';

// ---- Token Management ----
const Auth = {
  getToken: () => localStorage.getItem('token'),
  setToken: (t) => localStorage.setItem('token', t),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  },
  setUser: (u) => localStorage.setItem('user', JSON.stringify(u)),
  clear: () => { localStorage.removeItem('token'); localStorage.removeItem('user'); },
  isLoggedIn: () => !!localStorage.getItem('token'),
  hasRole: (role) => {
    const user = Auth.getUser();
    return user && (Array.isArray(role) ? role.includes(user.role) : user.role === role);
  },
  isAdmin: () => Auth.hasRole('Admin'),
  isExecutive: () => Auth.hasRole(['Admin', 'ExecutiveBoard']),
};

// ---- HTTP Helpers ----
async function request(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth || Auth.isLoggedIn()) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('Không thể kết nối đến server. Vui lòng thử lại.');
    }
    throw err;
  }
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body, true);
const put = (path, body) => request('PUT', path, body, true);
const del = (path) => request('DELETE', path, null, true);

// ---- API Endpoints ----
const API = {
  // Auth
  login: (data) => post('/auth/login', data),
  register: (data) => post('/auth/register', data),

  // Users
  getUsers: (params = '') => request('GET', `/users${params}`, null, true),
  getUser: (id) => request('GET', `/users/${id}`, null, true),
  updateUser: (id, data) => put(`/users/${id}`, data),
  deleteUser: (id) => del(`/users/${id}`),
  getAuditLogs: () => request('GET', '/users/audit-logs', null, true),

  // Members
  getMembers: (params = '') => request('GET', `/members${params}`),
  getMember: (id) => get(`/members/${id}`),
  getMyProfile: () => request('GET', '/members/me', null, true),
  createMember: (data) => post('/members', data),
  updateMember: (id, data) => put(`/members/${id}`, data),
  deleteMember: (id) => del(`/members/${id}`),

  // Activities
  getActivities: (params = '') => get(`/activities${params}`),
  getActivity: (id) => get(`/activities/${id}`),
  createActivity: (data) => post('/activities', data),
  updateActivity: (id, data) => put(`/activities/${id}`, data),
  deleteActivity: (id) => del(`/activities/${id}`),
  getActivityRegistrations: (id) => request('GET', `/activities/${id}/registrations`, null, true),

  // Registrations
  getMyRegistrations: () => request('GET', '/registrations/my', null, true),
  register: (data) => post('/registrations', data),
  cancelRegistration: (id) => del(`/registrations/${id}`),

  // Posts
  getPosts: (params = '') => get(`/posts${params}`),
  getPost: (id) => get(`/posts/${id}`),
  createPost: (data) => post('/posts', data),
  updatePost: (id, data) => put(`/posts/${id}`, data),
  deletePost: (id) => del(`/posts/${id}`),

  // Notifications
  getNotifications: () => request('GET', '/notifications', null, true),
  sendNotification: (data) => post('/notifications', data),
  markRead: (id) => put(`/notifications/${id}/read`, {}),
};

// ---- Toast Notifications ----
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 3500) {
    this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success: (msg) => Toast.show(msg, 'success'),
  error: (msg) => Toast.show(msg, 'error'),
  info: (msg) => Toast.show(msg, 'info'),
};

// ---- Utility ----
const Utils = {
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  truncate(str, n = 120) {
    if (!str) return '';
    return str.length > n ? str.substring(0, n) + '...' : str;
  },
  statusLabel(status) {
    const map = {
      'Open': '<span class="badge badge-open">Đang mở</span>',
      'Closed': '<span class="badge badge-closed">Đã đóng</span>',
      'Cancelled': '<span class="badge badge-inactive">Đã hủy</span>',
      'Active': '<span class="badge badge-active">Hoạt động</span>',
      'Inactive': '<span class="badge badge-inactive">Không hoạt động</span>',
      'Published': '<span class="badge badge-active">Đã đăng</span>',
      'Draft': '<span class="badge badge-closed">Nháp</span>',
      'Registered': '<span class="badge badge-open">Đã đăng ký</span>',
      'Cancelled': '<span class="badge badge-inactive">Đã hủy</span>',
    };
    return map[status] || `<span class="badge">${status}</span>`;
  },
  escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  },
  getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
};

// ---- Update Navbar Based on Auth ----
function updateNavbar() {
  const user = Auth.getUser();
  const navActions = document.getElementById('navActions');
  if (!navActions) return;

  if (user) {
    navActions.innerHTML = `
      <span class="navbar-user">👤 ${Utils.escapeHtml(user.username)}</span>
      ${Auth.isExecutive() ? '<a href="admin-dashboard.html" class="btn btn-gold btn-sm">⚙️ Quản trị</a>' : '<a href="member-profile.html" class="btn btn-secondary btn-sm">Hồ sơ</a>'}
      <button onclick="logout()" class="btn btn-secondary btn-sm">Đăng xuất</button>
    `;
  } else {
    navActions.innerHTML = `
      <a href="login.html" class="btn btn-secondary btn-sm">Đăng nhập</a>
      <a href="register.html" class="btn btn-primary btn-sm">Đăng ký</a>
    `;
  }
}

function logout() {
  Auth.clear();
  Toast.success('Đã đăng xuất thành công');
  setTimeout(() => window.location.href = 'index1.html', 800);
}

// Auto update navbar
document.addEventListener('DOMContentLoaded', updateNavbar);