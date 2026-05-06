// ================================================
// admin-users-logs.js
// Quản lý người dùng — Panel Admin Dashboard
// ================================================

'use strict';

// ── State ──────────────────────────────────────────────────────────────────────
const UsersPanel = (() => {
  function initialQuery() {
    return {
      keyword: '',
      roleName: '',
      isActive: '',
      fromDate: '',
      toDate: '',
      sortBy: 'CreatedAt',
      sortDir: 'desc',
      page: 1,
      pageSize: 15,
    };
  }

  let _query = initialQuery();
  let _totalPages = 1;
  let _stats = null;
  let _roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'ExecutiveBoard' },
    { id: 3, name: 'Member' },
    { id: 4, name: 'Guest' },
  ];

  // ── Khởi tạo ──────────────────────────────────────────────────────────────
  async function init() {
    _populateRoleDropdown();
    await Promise.all([loadStats(), load()]);
  }

  // ── Populate role dropdown ─────────────────────────────────────────────────
  function _populateRoleDropdown() {
    const sel = document.getElementById('uRoleFilter');
    if (!sel) return;
    sel.innerHTML =
      `<option value="">Tất cả vai trò</option>` +
      _roles.map(r => `<option value="${r.name}">${_roleLabelVi(r.name)}</option>`).join('');
  }

  // ── Load stats ─────────────────────────────────────────────────────────────
  async function loadStats() {
    try {
      // FIX: gọi đúng path (API_BASE đã có /api, chỉ cần /users/stats)
      const r = await request('GET', '/users/stats', null, true);
      // FIX: r là ApiResponse, r.data mới là UserStatsDTO
      _stats = r.data;
      _renderStats(_stats);
    } catch (e) {
      console.warn('loadStats:', e.message);
    }
  }

  function _renderStats(s) {
    if (!s) return;
    // FIX: camelCase theo JSON serializer của ASP.NET Core
    _setEl('uStatTotal',    s.totalUsers);
    _setEl('uStatActive',   s.activeUsers);
    _setEl('uStatInactive', s.inactiveUsers);
    _setEl('uStatNew',      s.newThisMonth);
    _setEl('uStatAdmin',    s.adminCount);
    _setEl('uStatBoard',    s.executiveBoardCount);
    _setEl('uStatMember',   s.memberCount);
  }

  // ── Load danh sách ─────────────────────────────────────────────────────────
  async function load() {
    const tbody = document.getElementById('uBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px">
      <div class="spinner" style="margin:0 auto"></div>
    </td></tr>`;

    try {
      const params = _buildParams();
      // FIX: path đúng — API_BASE đã có /api
      const r = await request('GET', `/users${params}`, null, true);

      // FIX: r.data là PagedResultDTO { items, totalCount, page, pageSize, totalPages }
      const pagedData  = r.data;
      const list       = pagedData?.items || [];
      // FIX: dùng totalPages từ backend (sau khi thêm computed property vào DTO)
      _totalPages      = pagedData?.totalPages || Math.ceil((pagedData?.totalCount || 0) / _query.pageSize) || 1;

      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#475569">
          <div style="font-size:2rem;margin-bottom:12px">👤</div>
          Không tìm thấy người dùng nào
        </td></tr>`;
        _renderPagination();
        return;
      }

      tbody.innerHTML = list.map(_renderRow).join('');
      _renderPagination();
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="color:#ff2d55;padding:20px;text-align:center">
        <i class="fa-solid fa-circle-exclamation"></i> ${Utils.escapeHtml(e.message)}
      </td></tr>`;
    }
  }

  // ── Render một dòng bảng ───────────────────────────────────────────────────
  function _renderRow(u) {
    // FIX: dùng đúng tên field camelCase từ backend
    const name     = u.fullName || u.username || '?';
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const roleCls = {
      Admin: 'badge-red',
      ExecutiveBoard: 'badge-gold',
      Member: 'badge-blue',
      Guest: 'badge-closed',
    }[u.roleName] || 'badge-closed';

    const roleIco = {
      Admin: 'fa-crown',
      ExecutiveBoard: 'fa-clipboard',
      Member: 'fa-user',
      Guest: 'fa-user-clock',
    }[u.roleName] || 'fa-user';

    const activeHtml = u.isActive
      ? `<span class="badge badge-open"><i class="fa-solid fa-circle-check"></i> Hoạt động</span>`
      : `<span class="badge badge-inactive"><i class="fa-solid fa-circle-xmark"></i> Vô hiệu</span>`;

    const toggleTitle = u.isActive ? 'Vô hiệu hóa' : 'Kích hoạt';
    const toggleIcon  = u.isActive ? 'fa-lock' : 'fa-lock-open';
    const toggleStyle = u.isActive
      ? 'color:#f59e0b;border-color:rgba(245,158,11,0.3)'
      : 'color:#22c55e;border-color:rgba(34,197,94,0.3)';

    // FIX: dùng u.userID (camelCase)
    return `<tr data-uid="${u.userID}">
      <td style="color:#475569;font-size:12px">${u.userID}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="u-avatar" style="background:${_avatarColor(u.roleName)}">
            ${initials}
          </div>
          <div>
            <div style="font-weight:700;font-size:13px">${Utils.escapeHtml(u.username || '')}</div>
            <div style="color:#475569;font-size:11px">
              ${Utils.escapeHtml(u.fullName || '—')}
              ${u.faculty ? `<span style="color:#334155"> · ${Utils.escapeHtml(u.faculty)}</span>` : ''}
            </div>
          </div>
        </div>
      </td>
      <td style="font-size:13px;color:#94a3b8">${Utils.escapeHtml(u.email || '')}</td>
      <td>
        <span class="badge ${roleCls}">
          <i class="fa-solid ${roleIco}"></i> ${_roleLabelVi(u.roleName)}
        </span>
      </td>
      <td>${activeHtml}</td>
      <td style="color:#475569;font-size:12px">
        ${Utils.formatDate(u.createdAt)}
      </td>
      <td style="font-size:12px;color:#334155;text-align:center">
        <span title="Đăng ký HĐ"><i class="fa-solid fa-calendar-check" style="color:#3b82f6"></i> ${u.totalRegistrations ?? 0}</span>
        &nbsp;
        <span title="Bài viết"><i class="fa-solid fa-newspaper" style="color:#f59e0b"></i> ${u.totalPostsCreated ?? 0}</span>
      </td>
      <td>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button onclick="UsersPanel.viewDetail(${u.userID})"
            class="btn-outline btn-sm" title="Xem chi tiết">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button onclick="UsersPanel.openEdit(${u.userID})"
            class="btn-outline btn-sm" title="Chỉnh sửa">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="UsersPanel.toggleActive(${u.userID}, '${Utils.escapeHtml(u.username || '')}')"
            class="btn-outline btn-sm" title="${toggleTitle}"
            style="${toggleStyle}">
            <i class="fa-solid ${toggleIcon}"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }

  // ── Xem chi tiết ──────────────────────────────────────────────────────────
  async function viewDetail(id) {
    openModal('Chi tiết người dùng',
      '<div class="loading" style="padding:48px"><div class="spinner" style="margin:auto"></div></div>',
      null);

    try {
      const r = await request('GET', `/users/${id}`, null, true);
      // FIX: r.data mới là UserDetailDTO
      const u = r.data;
      if (!u) { Toast.error('Không tìm thấy người dùng'); return; }

      const initials = (u.fullName || u.username || '?')
        .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

      document.getElementById('gModalInner').innerHTML = `
        <div class="modal-header">
          <div class="modal-title"><i class="fa-solid fa-user-circle"></i> Chi tiết người dùng</div>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>

        <div class="u-detail-hero">
          <div class="u-avatar-lg" style="background:${_avatarColor(u.roleName)}">${initials}</div>
          <div>
            <div class="u-detail-name">${Utils.escapeHtml(u.username || '')}</div>
            <div class="u-detail-sub">${Utils.escapeHtml(u.fullName || 'Chưa cập nhật')}</div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <span class="badge ${u.isActive ? 'badge-open' : 'badge-inactive'}">
                ${u.isActive ? '✅ Hoạt động' : '🔒 Vô hiệu'}
              </span>
              <span class="badge badge-blue">${_roleLabelVi(u.roleName)}</span>
            </div>
          </div>
        </div>

        <div class="u-info-grid">
          ${_infoCard('fa-envelope',         'Email',             u.email)}
          ${_infoCard('fa-phone',            'Điện thoại',        u.phone || 'Chưa cập nhật')}
          ${_infoCard('fa-school',           'Lớp',               u.className || '—')}
          ${_infoCard('fa-building-columns', 'Khoa',              u.faculty || '—')}
          ${_infoCard('fa-id-badge',         'Chức vụ',           u.position || '—')}
          ${_infoCard('fa-calendar-plus',    'Ngày tham gia',     Utils.formatDate(u.createdAt))}
          ${_infoCard('fa-calendar-check',   'Cập nhật lần cuối', u.updatedAt ? Utils.formatDateTime(u.updatedAt) : '—')}
          ${_infoCard('fa-user-tag',         'Trạng thái TV',     u.memberStatus || '—')}
        </div>

        <div class="u-stat-row">
          <div class="u-stat-box">
            <div class="u-stat-num" style="color:#3b82f6">${u.totalRegistrations ?? 0}</div>
            <div class="u-stat-lbl">Hoạt động đã đăng ký</div>
          </div>
          <div class="u-stat-box">
            <div class="u-stat-num" style="color:#f59e0b">${u.totalPostsCreated ?? 0}</div>
            <div class="u-stat-lbl">Bài viết đã đăng</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:4px">
          <button onclick="UsersPanel.openEdit(${u.userID})" class="btn-outline" style="flex:1;padding:10px">
            <i class="fa-solid fa-pen"></i> Chỉnh sửa
          </button>
          <button onclick="UsersPanel.toggleActive(${u.userID}, '${Utils.escapeHtml(u.username || '')}')"
            class="btn-sm" style="padding:10px 16px;border-radius:6px;cursor:pointer;font-family:'Be Vietnam Pro',Arial,sans-serif;
              ${u.isActive
                ? 'background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#f59e0b'
                : 'background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#22c55e'}">
            <i class="fa-solid ${u.isActive ? 'fa-lock' : 'fa-lock-open'}"></i>
            ${u.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
          </button>
        </div>`;
    } catch (e) {
      Toast.error(e.message);
    }
  }

  // ── Modal chỉnh sửa ────────────────────────────────────────────────────────
  async function openEdit(id) {
    try {
      const r = await request('GET', `/users/${id}`, null, true);
      // FIX: r.data mới là UserDetailDTO
      const u = r.data;
      if (!u) { Toast.error('Không tìm thấy người dùng'); return; }

      openModal('Chỉnh sửa người dùng', `
        <div class="form-group">
          <label class="form-label">Tên đăng nhập</label>
          <div class="form-control" style="opacity:.6;cursor:not-allowed">${Utils.escapeHtml(u.username || '')}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <div class="form-control" style="opacity:.6;cursor:not-allowed">${Utils.escapeHtml(u.email || '')}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Điện thoại</label>
          <input id="ue-phone" class="form-control" placeholder="0901234567"
            value="${Utils.escapeHtml(u.phone || '')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Vai trò *</label>
            <select id="ue-role" class="form-control">
              ${_roles.map(ro => `
                <option value="${ro.id}" ${u.roleID === ro.id ? 'selected' : ''}>
                  ${_roleLabelVi(ro.name)}
                </option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Trạng thái</label>
            <select id="ue-active" class="form-control">
              <option value="true"  ${u.isActive ? 'selected' : ''}>Hoạt động</option>
              <option value="false" ${!u.isActive ? 'selected' : ''}>Vô hiệu hóa</option>
            </select>
          </div>
        </div>
        <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);
            border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#fbbf24">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Thay đổi vai trò sẽ ảnh hưởng đến quyền truy cập của người dùng này.
        </div>
        <button type="button" onclick="UsersPanel.saveEdit(${id})"
          class="btn-primary w-100" style="padding:11px">
          <i class="fa-solid fa-floppy-disk"></i> Lưu thay đổi
        </button>
      `, null);
    } catch (e) {
      Toast.error(e.message);
    }
  }

  // ── Lưu chỉnh sửa ─────────────────────────────────────────────────────────
  async function saveEdit(id) {
    const roleId   = parseInt(document.getElementById('ue-role')?.value || '0');
    const isActive = document.getElementById('ue-active')?.value === 'true';
    const phone    = document.getElementById('ue-phone')?.value.trim() || null;

    if (!roleId) { Toast.error('Vui lòng chọn vai trò'); return; }

    try {
      // FIX: gửi đúng field name mà backend UpdateUserAdminDTO kỳ vọng
      // Backend dùng [FromBody] và ASP.NET Core mặc định bind camelCase
      await request('PUT', `/users/${id}`, { roleID: roleId, isActive, phone }, true);
      Toast.success('Cập nhật người dùng thành công');
      closeModal();
      await Promise.all([loadStats(), load()]);
    } catch (e) {
      Toast.error(e.message);
    }
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  async function toggleActive(id, username) {
    const row = document.querySelector(`tr[data-uid="${id}"]`);
    const isCurrentlyActive = row
      ? row.querySelector('.badge-open') !== null
      : true;

    const msg = isCurrentlyActive
      ? `Vô hiệu hóa tài khoản "${username}"?\nNgười dùng sẽ không thể đăng nhập.`
      : `Kích hoạt lại tài khoản "${username}"?`;

    if (!confirm(msg)) return;

    try {
      const r = await request('PATCH', `/users/${id}/toggle-active`, null, true);
      // FIX: r.data mới là UserDetailDTO
      const newState = r.data?.isActive;
      Toast.success(newState ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản');
      closeModal();
      await Promise.all([loadStats(), load()]);
    } catch (e) {
      Toast.error(e.message);
    }
  }

  // ── Search / filter ────────────────────────────────────────────────────────
  function search() {
    _query.keyword  = document.getElementById('uSearch')?.value.trim() || '';
    _query.roleName = document.getElementById('uRoleFilter')?.value || '';
    _query.isActive = document.getElementById('uActiveFilter')?.value || '';
    _query.fromDate = document.getElementById('uFromDate')?.value || '';
    _query.toDate   = document.getElementById('uToDate')?.value || '';
    _query.page = 1;
    load();
  }

  function resetSearch() {
    ['uSearch', 'uRoleFilter', 'uActiveFilter', 'uFromDate', 'uToDate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    _query = initialQuery();
    load();
  }

  function changePage(page) {
    if (page < 1 || page > _totalPages) return;
    _query.page = page;
    load();
  }

  // ── Sort ───────────────────────────────────────────────────────────────────
  function sort(field) {
    if (_query.sortBy === field) {
      _query.sortDir = _query.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      _query.sortBy  = field;
      _query.sortDir = 'desc';
    }
    _query.page = 1;
    load();
    document.querySelectorAll('.u-sort-icon').forEach(el => el.textContent = '⇅');
    const icon = document.getElementById(`sort-${field}`);
    if (icon) icon.textContent = _query.sortDir === 'asc' ? '↑' : '↓';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _buildParams() {
    const p = new URLSearchParams();
    if (_query.keyword)       p.append('keyword',   _query.keyword);
    if (_query.roleName)      p.append('roleName',  _query.roleName);
    if (_query.isActive !== '') p.append('isActive', _query.isActive);
    if (_query.fromDate)      p.append('fromDate',  _query.fromDate);
    if (_query.toDate)        p.append('toDate',    _query.toDate);
    p.append('sortBy',   _query.sortBy);
    p.append('sortDir',  _query.sortDir);
    p.append('page',     _query.page);
    p.append('pageSize', _query.pageSize);
    return '?' + p.toString();
  }

  function _renderPagination() {
    const wrap = document.getElementById('uPagination');
    if (!wrap) return;
    if (_totalPages <= 1) { wrap.innerHTML = ''; return; }

    const cur = _query.page;
    let html = '';

    html += `<button onclick="UsersPanel.changePage(${cur - 1})"
      ${cur === 1 ? 'disabled' : ''}
      class="u-page-btn">←</button>`;

    const pages = _pageRange(cur, _totalPages);
    pages.forEach(p => {
      if (p === '…') {
        html += `<span class="u-page-ellipsis">…</span>`;
      } else {
        html += `<button onclick="UsersPanel.changePage(${p})"
          class="u-page-btn ${p === cur ? 'active' : ''}">${p}</button>`;
      }
    });

    html += `<button onclick="UsersPanel.changePage(${cur + 1})"
      ${cur === _totalPages ? 'disabled' : ''}
      class="u-page-btn">→</button>`;

    wrap.innerHTML = html;
  }

  function _pageRange(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4)   return [1, 2, 3, 4, 5, '…', total];
    if (cur >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', cur - 1, cur, cur + 1, '…', total];
  }

  function _setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '—';
  }

  function _avatarColor(role) {
    return {
      Admin: 'linear-gradient(135deg,#ff2d55,#ff6b84)',
      ExecutiveBoard: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
      Member: 'linear-gradient(135deg,#3b82f6,#60a5fa)',
      Guest: 'linear-gradient(135deg,#475569,#64748b)',
    }[role] || 'linear-gradient(135deg,#475569,#64748b)';
  }

  function _roleLabelVi(role) {
    return {
      Admin: 'Quản trị viên',
      ExecutiveBoard: 'Ban chủ nhiệm',
      Member: 'Thành viên',
      Guest: 'Khách',
    }[role] || role || '—';
  }

  function _infoCard(ico, lbl, val) {
    return `<div class="u-info-card">
      <div class="u-info-lbl"><i class="fa-solid ${ico}"></i> ${lbl}</div>
      <div class="u-info-val">${Utils.escapeHtml(String(val ?? '—'))}</div>
    </div>`;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init,
    load,
    loadStats,
    search,
    resetSearch,
    changePage,
    sort,
    viewDetail,
    openEdit,
    saveEdit,
    toggleActive,
  };
})();

window.UsersPanel = UsersPanel;