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
  registerUser: (data) => post('/auth/register', data),

  // Users
  getUsers: (params = '') => request('GET', `/users${params}`, null, true),
  getUser: (id) => request('GET', `/users/${id}`, null, true),
  updateUser: (id, data) => put(`/users/${id}`, data),
  deleteUser: (id) => del(`/users/${id}`),
  getAuditLogs: () => request('GET', '/users/audit-logs', null, true),

  // Members
  getMembers: (params = '') => request('GET', `/members${params}`, null, true),
  getMember: (id) => request('GET', `/members/${id}`, null, true),
  getMyProfile: () => request('GET', '/members/me', null, true),
  createMember: (data) => post('/members', data),
  updateMember: (id, data) => request('PUT', `/members/${id}`, data, true),
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
    const icons = {
      success: '<i class="fa-solid fa-check" style="color: rgb(0, 208, 144);"></i>',
      error: '<i class="fa-solid fa-xmark" style="color: rgb(255, 77, 77);"></i>',
      info: '<i class="fa-solid fa-info" style="color: rgb(59, 130, 246);"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation" style="color: rgb(255, 193, 7);"></i>'
    };
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
    const avatarHtml = (bgColor) => user.avatarUrl
      ? `<img src="${user.avatarUrl.startsWith('http') ? user.avatarUrl : 'http://localhost:5190' + user.avatarUrl}"
              style="width:28px;height:28px;border-radius:50%;object-fit:cover;
                     border:2px solid rgba(255,255,255,0.2);flex-shrink:0">`
      : `<div style="width:28px;height:28px;border-radius:50%;background:${bgColor};
                     display:flex;align-items:center;justify-content:center;
                     font-size:11px;font-weight:700;color:white;flex-shrink:0">
           ${(user.username || '?').slice(0,2).toUpperCase()}
         </div>`;

    if (user.role === 'Admin') {
      navActions.innerHTML = `
        <a href="member-profile.html" class="navbar-user" style="text-decoration:none;display:flex;align-items:center;gap:6px">
          ${avatarHtml('#f59e0b')}
          <i class="fa-solid fa-crown" style="color: rgb(255, 212, 59);"></i>
          ${Utils.escapeHtml(user.username)} (${user.role})
        </a>
        <a href="admin-dashboard.html" class="btn btn-gold btn-sm"><i class="fa-solid fa-user-gear" style="color: rgb(0, 0, 0);"></i> Quản trị</a>
        <button onclick="logout()" class="btn btn-secondary btn-sm">Đăng xuất</button>
      `;
    } else if (user.role === 'ExecutiveBoard') {
      navActions.innerHTML = `
        <a href="member-profile.html" class="navbar-user" style="text-decoration:none;display:flex;align-items:center;gap:6px">
          ${avatarHtml('#3b82f6')}
          <i class="fa-regular fa-clipboard" style="color: rgb(116, 192, 252);"></i>
          ${Utils.escapeHtml(user.username)} (${user.role})
        </a>
        <a href="admin-dashboard.html" class="btn btn-gold btn-sm"><i class="fa-solid fa-user-gear" style="color: rgb(249, 0, 0);"></i> Quản trị</a>
        <button onclick="logout()" class="btn btn-secondary btn-sm">Đăng xuất</button>
      `;
    } else if (user.role === 'Member') {
      const av = user.avatarUrl
        ? `<img src="${user.avatarUrl.startsWith('http') ? user.avatarUrl : 'http://localhost:5190' + user.avatarUrl}"
                style="width:32px;height:32px;border-radius:50%;object-fit:cover;
                       border:2px solid rgba(255,255,255,0.2);flex-shrink:0">`
        : `<div style="width:32px;height:32px;border-radius:50%;background:#ff2d55;
                       display:flex;align-items:center;justify-content:center;
                       font-size:12px;font-weight:700;color:white;flex-shrink:0">
             ${(user.username || '?').slice(0,2).toUpperCase()}
           </div>`;
      navActions.innerHTML = `
        <div style="position:relative" id="navUserMenu">
          <button onclick="toggleUserMenu()" style="
            display:flex;align-items:center;gap:8px;
            background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
            border-radius:100px;padding:4px 12px 4px 4px;cursor:pointer;
            transition:background 0.2s;color:white;font-family:Arial,sans-serif;font-size:13px"
            onmouseover="this.style.background='rgba(255,255,255,0.1)'"
            onmouseout="this.style.background='rgba(255,255,255,0.06)'">
            ${av}
            <span>${Utils.escapeHtml(user.username)}</span>
            <i class="fa-solid fa-chevron-down" style="font-size:10px;color:#64748b"></i>
          </button>
          <div id="navDropdown" style="
            display:none;position:absolute;top:calc(100% + 8px);right:0;
            background:#111827;border:1px solid rgba(255,255,255,0.09);
            border-radius:12px;padding:6px;min-width:180px;
            box-shadow:0 12px 32px rgba(0,0,0,0.5);z-index:999">
            <a href="member-profile.html" style="
              display:flex;align-items:center;gap:10px;padding:10px 12px;
              border-radius:8px;color:#e2e8f0;text-decoration:none;font-size:13px;
              transition:background 0.2s"
              onmouseover="this.style.background='rgba(255,255,255,0.06)'"
              onmouseout="this.style.background='transparent'">
              <i class="fa-solid fa-user" style="color:#94a3b8;width:14px"></i>
              Hồ sơ cá nhân
            </a>
            <div style="height:1px;background:rgba(255,255,255,0.06);margin:4px 0"></div>
            <button onclick="logout()" style="
              display:flex;align-items:center;gap:10px;padding:10px 12px;
              border-radius:8px;color:#ff6b84;font-size:13px;width:100%;
              background:none;border:none;cursor:pointer;font-family:Arial,sans-serif;
              transition:background 0.2s;text-align:left"
              onmouseover="this.style.background='rgba(255,45,85,0.08)'"
              onmouseout="this.style.background='transparent'">
              <i class="fa-solid fa-right-from-bracket" style="width:14px"></i>
              Đăng xuất
            </button>
          </div>
        </div>`;
    }
  } else {
    navActions.innerHTML = `
      <button class="login" onclick="AuthModal.open('login')">Đăng Nhập</button>
      <button class="signup" onclick="AuthModal.open('register')">Đăng Ký</button>
    `;
  }
}

function toLocalInputValue(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

function logout() {
  Auth.clear();
  Toast.success('Đăng xuất thành công');
  setTimeout(() => window.location.href = '../pages/index.html', 800);
}

function toggleUserMenu() {
  const dropdown = document.getElementById('navDropdown');
  if (!dropdown) return;
  const isOpen = dropdown.style.display === 'block';
  dropdown.style.display = isOpen ? 'none' : 'block';

  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!document.getElementById('navUserMenu')?.contains(e.target)) {
          dropdown.style.display = 'none';
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }
}
window.toggleUserMenu = toggleUserMenu;

document.addEventListener('DOMContentLoaded', updateNavbar);