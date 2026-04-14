// ================================================
// admin-users-logs.js
// Quản lý người dùng (Users) và lịch sử hệ thống (Audit Logs)
// Chỉ Admin mới thấy 2 mục này
// ================================================

// ── Load danh sách người dùng ─────────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('uBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner" style="margin:0 auto"></div></td></tr>';

  try {
    const r = await API.getUsers();
    const list = r.data || [];

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#475569">Không có người dùng</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(u => `
      <tr>
        <td style="color:#475569;font-size:12px">${u.userID}</td>
        <td>
          <div style="font-weight:700">@${Utils.escapeHtml(u.username)}</div>
        </td>
        <td style="color:#94a3b8;font-size:13px">${Utils.escapeHtml(u.email)}</td>
        <td>
          <span class="badge badge-blue">${Utils.escapeHtml(u.roleName || '—')}</span>
        </td>
        <td>${Utils.statusLabel(u.isActive ? 'Active' : 'Inactive')}</td>
        <td>
          ${u.isActive
            ? `<button onclick="deactUser(${u.userID})"
                 class="btn-danger btn-sm" title="Vô hiệu hóa">
                 <i class="fa-solid fa-lock"></i> Vô hiệu
               </button>`
            : `<span style="color:#475569;font-size:12px">Đã vô hiệu hóa</span>`}
        </td>
      </tr>`).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}

// ── Vô hiệu hóa người dùng ───────────────────────────────────────────────────
async function deactUser(id) {
  if (!confirm('Vô hiệu hóa tài khoản người dùng này?')) return;
  try {
    await API.deleteUser(id);
    Toast.success('Đã vô hiệu hóa tài khoản');
    loadUsers();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Load lịch sử audit logs ───────────────────────────────────────────────────
async function loadLogs() {
  const tbody = document.getElementById('lBody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading"><div class="spinner" style="margin:0 auto"></div></td></tr>';

  try {
    const r = await API.getAuditLogs();
    const list = r.data || [];

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#475569">Chưa có lịch sử</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(l => `
      <tr>
        <td style="color:#475569;font-size:12px">${l.logID}</td>
        <td>
          <strong>${Utils.escapeHtml(l.username || '—')}</strong>
        </td>
        <td>
          <span class="badge badge-gold">${Utils.escapeHtml(l.action || '—')}</span>
        </td>
        <td style="color:#94a3b8;font-size:13px">
          ${Utils.escapeHtml(l.tableName || '—')}${l.recordID ? ' #' + l.recordID : ''}
        </td>
        <td style="color:#475569;font-size:12px">${Utils.formatDateTime(l.createdAt)}</td>
      </tr>`).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}