// ================================================
// admin-members.js
// Quản lý thành viên: danh sách, thêm, sửa,
// xem chi tiết, vô hiệu hóa, thống kê
// ================================================

// ── Load danh sách thành viên ─────────────────────────────────────────────────
async function loadMembers() {
  const keyword = document.getElementById('mSearch')?.value.trim() || '';
  const status  = document.getElementById('mStatus')?.value || '';
  const faculty = document.getElementById('mFaculty')?.value || '';

  let params = '?page=1&pageSize=50';
  if (keyword) params += `&keyword=${encodeURIComponent(keyword)}`;
  if (status)  params += `&status=${status}`;
  if (faculty) params += `&faculty=${encodeURIComponent(faculty)}`;

  const tbody = document.getElementById('mBody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner" style="margin:0 auto"></div></td></tr>';

  try {
    const r = await API.getMembers(params);
    const list = r.data?.items || r.data || [];

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#475569">Không có thành viên nào</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(m => `
      <tr>
        <td style="color:#475569;font-size:12px">${m.memberID}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:#ff2d55;
                        display:flex;align-items:center;justify-content:center;
                        font-size:12px;font-weight:700;color:white;flex-shrink:0">
              ${(m.fullName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style="font-weight:700;font-size:13px">${Utils.escapeHtml(m.fullName)}</div>
              <div style="color:#475569;font-size:11px">
                ${Utils.escapeHtml(m.username || '')}${m.email ? ' · ' + m.email : ''}
              </div>
            </div>
          </div>
        </td>
        <td style="color:#94a3b8;font-size:13px">${Utils.escapeHtml(m.className || '—')}</td>
        <td style="color:#94a3b8;font-size:13px">${Utils.escapeHtml(m.faculty || '—')}</td>
        <td style="color:#94a3b8;font-size:13px">${Utils.escapeHtml(m.position || 'Thành viên')}</td>
        <td>${Utils.statusLabel(m.status || 'Active')}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button onclick="viewMember(${m.memberID})" class="btn-outline btn-sm" title="Xem chi tiết">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button onclick="editMember(${m.memberID})" class="btn-outline btn-sm" title="Chỉnh sửa">
              <i class="fa-solid fa-pen"></i>
            </button>
            ${m.status !== 'Inactive'
              ? `<button onclick="deactivateMember(${m.memberID}, '${Utils.escapeHtml(m.fullName)}')"
                   class="btn-danger btn-sm" title="Vô hiệu hóa">
                   <i class="fa-solid fa-user-slash"></i>
                 </button>`
              : `<button onclick="activateMember(${m.memberID})"
                   class="btn-outline btn-sm" style="color:#22c55e;border-color:rgba(34,197,94,0.3)" title="Kích hoạt lại">
                   <i class="fa-solid fa-user-check"></i>
                 </button>`}
          </div>
        </td>
      </tr>`).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#ff2d55;padding:20px;text-align:center">
      <i class="fa-solid fa-circle-exclamation"></i> ${e.message}
    </td></tr>`;
  }
}

// ── Xem chi tiết thành viên ───────────────────────────────────────────────────
async function viewMember(id) {
  openModal('Chi tiết thành viên',
    '<div class="loading" style="padding:40px"><div class="spinner" style="margin:auto"></div></div>',
    null);

  try {
    const r = await API.getMember(id);
    const m = r.data;
    const initials = (m.fullName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    document.getElementById('gModalInner').innerHTML = `
      <div class="modal-header">
        <div class="modal-title"><i class="fa-solid fa-user"></i> Chi tiết thành viên</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px;
                  padding:16px;background:#0a0f1c;border-radius:10px;
                  border:1px solid rgba(255,255,255,0.06)">
        <div style="width:56px;height:56px;border-radius:50%;background:#ff2d55;
                    display:flex;align-items:center;justify-content:center;
                    font-size:20px;font-weight:700;color:white;flex-shrink:0">${initials}</div>
        <div>
          <div style="font-size:18px;font-weight:700">${Utils.escapeHtml(m.fullName)}</div>
          <div style="color:#475569;font-size:13px">@${Utils.escapeHtml(m.username || '—')}</div>
          <div style="margin-top:6px">${Utils.statusLabel(m.status || 'Active')}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
        ${[
          ['fa-envelope',        'Email',         m.email],
          ['fa-phone',           'Điện thoại',    m.phone || 'Chưa cập nhật'],
          ['fa-school',          'Lớp',           m.className || '—'],
          ['fa-building-columns','Khoa',          m.faculty || '—'],
          ['fa-id-badge',        'Chức vụ',       m.position || 'Thành viên'],
          ['fa-shield-halved',   'Vai trò',       m.roleName || 'Member'],
          ['fa-calendar-plus',   'Ngày tham gia', Utils.formatDate(m.joinDate)],
        ].map(([ico, lbl, val]) => `
          <div style="background:#0a0f1c;border-radius:8px;padding:12px;
                      border:1px solid rgba(255,255,255,0.05)">
            <div style="font-size:11px;color:#334155;text-transform:uppercase;
                        letter-spacing:.05em;margin-bottom:5px">
              <i class="fa-solid ${ico}" style="color:#475569;margin-right:5px"></i>${lbl}
            </div>
            <div style="font-size:13px;color:#e2e8f0;font-weight:600">
              ${Utils.escapeHtml(String(val || '—'))}
            </div>
          </div>`).join('')}
      </div>

      <div style="display:flex;gap:10px">
        <button onclick="editMember(${m.memberID})" class="btn-outline" style="flex:1;padding:10px">
          <i class="fa-solid fa-pen"></i> Chỉnh sửa
        </button>
        ${m.status !== 'Inactive'
          ? `<button onclick="deactivateMember(${m.memberID},'${Utils.escapeHtml(m.fullName)}')"
               class="btn-danger" style="padding:10px 16px">
               <i class="fa-solid fa-user-slash"></i>
             </button>`
          : `<button onclick="activateMember(${m.memberID})"
               style="padding:10px 16px;background:rgba(34,197,94,0.1);
                      border:1px solid rgba(34,197,94,0.3);color:#22c55e;
                      border-radius:6px;cursor:pointer;font-family:Arial,sans-serif">
               <i class="fa-solid fa-user-check"></i>
             </button>`}
      </div>`;

  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Modal thêm / sửa thành viên ───────────────────────────────────────────────
function openMemberModal(data = {}) {
  openModal(data.memberID ? 'Chỉnh sửa thành viên' : 'Thêm thành viên mới', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Họ và tên *</label>
        <input id="mf-name" class="form-control" placeholder="Nguyễn Văn A"
               value="${Utils.escapeHtml(data.fullName || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Điện thoại</label>
        <input id="mf-phone" class="form-control" placeholder="0901234567"
               value="${Utils.escapeHtml(data.phone || '')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Lớp</label>
        <input id="mf-class" class="form-control" placeholder="22TCLC_DT1"
               value="${Utils.escapeHtml(data.className || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Khoa</label>
        <input id="mf-fac" class="form-control" placeholder="Điện tử - Viễn thông"
               value="${Utils.escapeHtml(data.faculty || '')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Chức vụ</label>
        <input id="mf-pos" class="form-control" placeholder="Trưởng nhóm..."
               value="${Utils.escapeHtml(data.position || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select id="mf-st" class="form-control">
          <option value="Active"    ${(data.status === 'Active' || !data.status) ? 'selected' : ''}>Hoạt động</option>
          <option value="Inactive"  ${data.status === 'Inactive'   ? 'selected' : ''}>Ngừng hoạt động</option>
          <option value="Suspended" ${data.status === 'Suspended'  ? 'selected' : ''}>Tạm đình chỉ</option>
        </select>
      </div>
    </div>
    <button type="button" onclick="saveMember(${data.memberID || 0})"
      class="btn-primary w-100" style="padding:11px;margin-top:4px">
      <i class="fa-solid fa-floppy-disk"></i> ${data.memberID ? 'Cập nhật' : 'Lưu thành viên'}
    </button>
  `, null);
}

// ── Lưu thành viên (tạo mới / cập nhật) ─────────────────────────────────────
async function saveMember(id) {
  const d = {
    fullName:  document.getElementById('mf-name').value.trim(),
    phone:     document.getElementById('mf-phone').value.trim() || null,
    className: document.getElementById('mf-class').value.trim() || null,
    faculty:   document.getElementById('mf-fac').value.trim()   || null,
    position:  document.getElementById('mf-pos').value.trim()   || null,
    status:    document.getElementById('mf-st').value,
  };
  if (!d.fullName) { Toast.error('Vui lòng nhập họ tên'); return; }

  try {
    if (id) {
      await API.updateMember(id, d);
      Toast.success('Cập nhật thành viên thành công');
    } else {
      await API.createMember(d);
      Toast.success('Thêm thành viên thành công');
    }
    closeModal();
    loadMembers();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Sửa thành viên (load data → mở modal) ────────────────────────────────────
async function editMember(id) {
  try {
    const r = await API.getMember(id);
    openMemberModal(r.data);
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Vô hiệu hóa tài khoản ────────────────────────────────────────────────────
async function deactivateMember(id, name) {
  if (!confirm(`Vô hiệu hóa tài khoản của "${name}"?\nThành viên sẽ không thể đăng nhập.`)) return;
  try {
    await request('PATCH', `/members/${id}/deactivate`, null, true);
    Toast.success('Đã vô hiệu hóa tài khoản');
    closeModal();
    loadMembers();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Kích hoạt lại tài khoản ──────────────────────────────────────────────────
async function activateMember(id) {
  try {
    await API.updateMember(id, { status: 'Active' });
    Toast.success('Đã kích hoạt lại tài khoản');
    closeModal();
    loadMembers();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Thống kê thành viên (toggle hiện/ẩn) ─────────────────────────────────────
async function loadMemberStats() {
  const row = document.getElementById('memberStatsRow');
  const isHidden = row.style.display === 'none' || row.style.display === '';
  row.style.display = isHidden ? 'grid' : 'none';
  if (!isHidden) return;

  try {
    const r = await request('GET', '/members/stats', null, true);
    const s = r.data;
    document.getElementById('ms-total').textContent    = s.totalMembers;
    document.getElementById('ms-active').textContent   = s.activeMembers;
    document.getElementById('ms-inactive').textContent = s.inactiveMembers;
    document.getElementById('ms-new').textContent      = s.newThisMonth;
  } catch (e) {
    Toast.error(e.message);
  }
}