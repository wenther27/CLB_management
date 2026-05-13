
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
  registerUser: (data) => post('/auth/register', data),

  // Users
  getUsers: (params = '') => request('GET', `/users${params}`, null, true),
  getUser: (id) => request('GET', `/users/${id}`, null, true),
  updateUser: (id, data) => put(`/users/${id}`, data),
  deleteUser: (id) => del(`/users/${id}`),
// Trong api.js, sửa hàm getAuditLogs:
getAuditLogs: (params = '') => request('GET', `/users/audit-logs${params}`, null, true),

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
    hasRegistered: (activityId) => get(`/activities/${activityId}/has-registered`),

  // Registrations
  register: (activityId) => post(`/activities/${activityId}/register`, null),
  cancelRegistration: (activityId) => del(`/activities/${activityId}/register`),
  getActivityRegistrations: (activityId, page = 1, pageSize = 20) => 
    get(`/activities/${activityId}/registrations?page=${page}&pageSize=${pageSize}`),
  getMyRegistrations: (page = 1, pageSize = 10) => 
    get(`/activities/my-registrations?page=${page}&pageSize=${pageSize}`),

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
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = Auth.getToken();
    const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
    }
    
    const data = await res.json();
    return data;
}
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
    const icons = { success: '<i class="fa-solid fa-check" style="color: rgb(0, 208, 144);"></i>', error: '<i class="fa-solid fa-xmark" style="color: rgb(255, 77, 77);"></i>', info: '<i class="fa-solid fa-info" style="color: rgb(59, 130, 246);"></i>', warning: '<i class="fa-solid fa-triangle-exclamation" style="color: rgb(255, 193, 7);"></i>' };
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
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d   = new Date(dateStr);
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
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
  if (user){
    let roleLabel = '';
    let roleClass = '';
    if (user.role === 'Admin') {
      navActions.innerHTML = `
        <span class="navbar-user"><i class="fa-solid fa-crown" style="color: rgb(255, 212, 59);"></i> ${Utils.escapeHtml(user.username)} (${user.role})</span>
        <a href="admin-dashboard.html" class="btn btn-gold btn-sm"><i class="fa-solid fa-user-gear" style="color: rgb(0, 0, 0);"></i> Quản trị</a>
        <button onclick="logout()" class="btn btn-secondary btn-sm">Đăng xuất</button>
      `;
    } else if (user.role === 'ExecutiveBoard') {
      navActions.innerHTML = `
        <span class="navbar-user"><i class="fa-regular fa-clipboard" style="color: rgb(116, 192, 252);"></i> ${Utils.escapeHtml(user.username)} (${user.role})</span>
        <a href="admin-dashboard.html" class="btn btn-gold btn-sm"><i class="fa-solid fa-user-gear" style="color: rgb(249, 0, 0);"></i>Quản trị</a>
        <button onclick="logout()" class="btn btn-secondary btn-sm">Đăng xuất</button>
      `;
    } else if (user.role === 'Member') {
      navActions.innerHTML = `
        <span class="navbar-user"><i class="fa-regular fa-user" style="color: rgb(251, 251, 251);"></i> ${Utils.escapeHtml(user.username)}</span>
        <a href="member-profile.html" class="btn btn-secondary btn-sm">Hồ sơ</a>
        <button onclick="logout()" class="btn btn-secondary btn-sm">Đăng xuất</button>
      `;
    }
  }
  else {
   navActions.innerHTML = `
      <button class="login" onclick="AuthModal.open('login')">Đăng Nhập</button>
      <button class="signup" onclick="AuthModal.open('register')">Đăng Ký</button>
    `;
  }
  
}
function toLocalInputValue(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  // Bù timezone offset
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

function logout() {
  Auth.clear();
  Toast.success('Đăng xuất thành công');
  setTimeout(() => window.location.href = '../pages/index.html', 800);
}

document.addEventListener('DOMContentLoaded', updateNavbar);