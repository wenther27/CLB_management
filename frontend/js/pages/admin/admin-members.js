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
    const r = await request('GET', `/members${params}`, null, true);
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
        <td style="color:#000000;font-size:13px">${Utils.escapeHtml(m.className || '—')}</td>
        <td style="color:#000000;font-size:13px">${Utils.escapeHtml(m.faculty || '—')}</td>
        <td style="color:#000000;font-size:13px">${Utils.escapeHtml(m.position || 'Thành viên')}</td>
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
                  padding:16px;background:#f8fafc;border-radius:10px;
                  border:1px solid #e2e8f0">
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
          <div style="background:#f8fafc;border-radius:8px;padding:12px;
                      border:1px solid #e2e8f0">
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;
                        letter-spacing:.05em;margin-bottom:5px">
              <i class="fa-solid ${ico}" style="color:#475569;margin-right:5px"></i>${lbl}
            </div>
            <div style="font-size:13px;color:#0f172a;font-weight:600">
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
// -- Chỉnh sửa thông tin thành viên ───────────────────────────────────────────────
async function editMember(id) {
  try {
    const r = await API.getMember(id);
    console.log('editMember data:', r);
    openMemberModal(r.data);
  } catch (e) {
    console.error('editMember error:', e);
    Toast.error(e.message);
  }
}

const FACULTIES = [
  'Cơ khí',
  'Công nghệ thông tin',
  'Cơ khí giao thông',
  'Công nghệ Nhiệt - Điện lạnh',
  'Điện',
  'Điện tử - Viễn thông',
  'Hóa',
  'Xây dựng Cầu - Đường',
  'Xây dựng Dân dụng & Công nghiệp',
  'Xây dựng Công trình Thủy',
  'Môi trường',
  'Quản lý dự án',
  'Khoa học Công nghệ tiên tiến',
];

function openMemberModal(data = {}) {
  const facultyList = data.faculty && !FACULTIES.includes(data.faculty)
    ? [data.faculty, ...FACULTIES]
    : FACULTIES;

  const facultyOptions = facultyList.map(f => `
    <option value="${f}" ${data.faculty === f ? 'selected' : ''}>${f}</option>
  `).join('');

  const avatarSrc = data.avatarUrl
    ? (data.avatarUrl.startsWith('http') ? data.avatarUrl : 'http://localhost:5190' + data.avatarUrl)
    : '';

  openModal(data.memberID ? 'Chỉnh sửa thành viên' : 'Thêm thành viên mới', `

    <!-- Hàng 1: Họ và tên | Điện thoại -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Họ và tên *</label>
        <input id="mf-name" class="form-control"
               value="${Utils.escapeHtml(data.fullName || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Số điện thoại</label>
        <input id="mf-phone" class="form-control"
               value="${Utils.escapeHtml(data.phone || '')}">
      </div>
    </div>

    <!-- Email liên lạc (full width) -->
    <div class="form-group">
      <label class="form-label">Email liên lạc</label>
      <input id="mf-contact-email" class="form-control"
             value="${Utils.escapeHtml(data.contactEmail || '')}">
    </div>

    <!-- Hàng 2: Lớp | Khoa -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Lớp</label>
        <input id="mf-class" class="form-control"
               value="${Utils.escapeHtml(data.className || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Khoa</label>
        <select id="mf-fac" class="form-control">
          <option value="" ${!data.faculty ? 'selected' : ''}>-- Chọn Khoa --</option>
          ${facultyOptions}
        </select>
      </div>
    </div>

    <!-- Hàng 3: Chức vụ | Trạng thái -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Chức vụ</label>
        <input id="mf-pos" class="form-control"
               value="${Utils.escapeHtml(data.position || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select id="mf-st" class="form-control">
          <option value="Active"    ${(data.status === 'Active' || !data.status) ? 'selected' : ''}>Hoạt động</option>
          <option value="Inactive"  ${data.status === 'Inactive'  ? 'selected' : ''}>Ngừng hoạt động</option>
          <option value="Suspended" ${data.status === 'Suspended' ? 'selected' : ''}>Tạm đình chỉ</option>
        </select>
      </div>
    </div>

    <!-- Hàng 4: Ban | Thứ tự hiển thị — cùng form-row để canh chỉnh ngay ngắn -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">
          Ban
          <span style="color:#475569;font-weight:400;text-transform:none;font-size:11px">
          </span>
        </label>
        <select id="mf-dept" class="form-control">
          <option value="" ${!data.department ? 'selected' : ''}>-- Thành viên thường --</option>
          <option value="BCN" ${data.department === 'BCN' ? 'selected' : ''}>Ban Chủ Nhiệm</option>
          <option value="BTT" ${data.department === 'BTT' ? 'selected' : ''}>Ban Truyền Thông</option>
          <option value="BPT" ${data.department === 'BPT' ? 'selected' : ''}>Ban Phong Trào</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Thứ tự hiển thị</label>
        <input type="number" id="mf-order" class="form-control"
               min="1"
               value="${data.displayOrder || ''}">
      </div>
    </div>

    <!-- Vùng ảnh đại diện — ẩn mặc định, chỉ hiện khi Ban có giá trị (BCN) -->
    <div id="mf-board-fields" style="${data.department ? '' : 'display:none'}">
      <div class="form-group" style="margin-top:8px">
        <label class="form-label">Ảnh đại diện</label>

        <!-- Dropzone kéo thả — ẩn khi đã có ảnh sẵn -->
        <div id="mf-dropzone"
          onclick="document.getElementById('mf-fileInput').click()"
          ondragover="handleMemberDragOver(event)"
          ondragleave="handleMemberDragLeave(event)"
          ondrop="handleMemberDrop(event)"
          style="border:2px dashed rgba(255,255,255,0.12); border-radius:10px;
                 padding:24px; text-align:center; cursor:pointer;
                 transition:border-color 0.2s, background 0.2s;
                 width:100%; box-sizing:border-box; background:rgba(255,255,255,0.02);
                 ${data.avatarUrl ? 'display:none' : ''}">
          <div style="font-size:2rem;margin-bottom:8px">🖼️</div>
          <div style="font-size:13px;color:#64748b">
            Kéo thả ảnh vào đây hoặc
            <span style="color:#ff2d55;font-weight:700">click để chọn</span>
          </div>
          <div style="font-size:11px;color:#334155;margin-top:4px">JPG, PNG, WEBP, GIF</div>
        </div>

        <input type="file" id="mf-fileInput" accept="image/*"
               style="display:none" onchange="handleMemberFileSelect(event)">

        <!-- Preview ảnh tròn — căn giữa, chỉ hiện khi đã có ảnh -->
        <div id="mf-preview" style="display:flex; justify-content:center; width:100%; margin-top:12px">
          ${data.avatarUrl ? `
            <div id="mf-img-wrap" style="position:relative; width:100px; height:100px;
                 border-radius:50%; overflow:hidden;
                 border:3px solid #ff2d55; flex-shrink:0; box-shadow:0 4px 12px rgba(0,0,0,0.3)">
              <img src="${avatarSrc}" style="width:100%; height:100%; object-fit:cover">
              <button onclick="removeMemberImage()"
                style="position:absolute; top:5px; right:5px; width:22px; height:22px;
                       border-radius:50%; background:rgba(0,0,0,0.7); border:none;
                       color:white; font-size:12px; cursor:pointer;
                       display:flex; align-items:center; justify-content:center; transition:0.2s"
                onmouseover="this.style.background='#ff2d55'"
                onmouseout="this.style.background='rgba(0,0,0,0.7)'">✕</button>
            </div>` : ''}
        </div>

        <div id="mf-uploadStatus" style="font-size:12px; color:#64748b; margin-top:8px; text-align:center"></div>
        <input type="hidden" id="mf-avatar" value="${data.avatarUrl || ''}">
      </div>
    </div>

    <!-- Nút lưu -->
    <button type="button" onclick="saveMember(${data.memberID || 0})"
      class="btn-primary w-100" style="padding:11px;margin-top:16px">
      <i class="fa-solid fa-floppy-disk"></i>
      ${data.memberID ? 'Cập nhật thành viên' : 'Lưu thành viên'}
    </button>
  `, null);

  // Hiện/ẩn vùng ảnh đại diện khi đổi Ban:
  // có giá trị (BCN) → hiện mf-board-fields; để trống → ẩn
  document.getElementById('mf-dept').addEventListener('change', function() {
    document.getElementById('mf-board-fields').style.display =
      this.value ? '' : 'none';
  });
}


// ── Lưu thành viên (tạo mới / cập nhật) ─────────────────────────────────────
async function saveMember(id) {
  const deptEl = document.getElementById('mf-dept');
  const deptValue = deptEl ? deptEl.value : null;

  const d = {
    fullName:     document.getElementById('mf-name').value.trim(),
    phone:        document.getElementById('mf-phone').value.trim()        || null,
    className:    document.getElementById('mf-class').value.trim()        || null,
    faculty:      document.getElementById('mf-fac').value                 || null,
    position:     document.getElementById('mf-pos').value.trim()          || null,
    status:       document.getElementById('mf-st').value,
    // Gửi "" khi chọn thành viên thường để backend biết cần set NULL
    department:   deptValue,   // "", "BCN", "BTT" hoặc "BPT"
    displayOrder: parseInt(document.getElementById('mf-order')?.value) || 0,
    avatarUrl:    document.getElementById('mf-avatar')?.value.trim()      || null,
    contactEmail: document.getElementById('mf-contact-email')?.value.trim() || null,
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

// ── Upload ảnh thành viên ──────────────────────────────────────────────────
function handleMemberDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('mf-dropzone');
  if (dz) {
    dz.style.borderColor = '#ff2d55';
    dz.style.background  = 'rgba(255,45,85,0.05)';
  }
}

function handleMemberDragLeave(e) {
  const dz = document.getElementById('mf-dropzone');
  if (dz) {
    dz.style.borderColor = 'rgba(255,255,255,0.12)';
    dz.style.background  = 'transparent';
  }
}

function handleMemberDrop(e) {
  e.preventDefault();
  handleMemberDragLeave(e);
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) uploadMemberImage(files[0]);
}

function handleMemberFileSelect(e) {
  const file = e.target.files[0];
  if (file) uploadMemberImage(file);
  e.target.value = '';
}

function removeMemberImage() {
  document.getElementById('mf-avatar').value = '';
  const wrap = document.getElementById('mf-img-wrap');
  if (wrap) wrap.remove();
  const dz = document.getElementById('mf-dropzone');
  if (dz) dz.style.display = '';
}

async function uploadMemberImage(file) {
  if (file.size > 5 * 1024 * 1024) {
    Toast.error('File quá 5MB');
    return;
  }

  const status = document.getElementById('mf-uploadStatus');
  if (status) status.innerHTML = '<span style="color:#f59e0b">⏳ Đang upload...</span>';

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('http://localhost:5190/api/upload/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
      body: formData,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.data) throw new Error('Không nhận được URL ảnh');

    const url = data.data;
    document.getElementById('mf-avatar').value = url;

    // Ẩn dropzone, hiện preview tròn
    const dz = document.getElementById('mf-dropzone');
    if (dz) dz.style.display = 'none';

    const preview = document.getElementById('mf-preview');
    const existing = document.getElementById('mf-img-wrap');
    if (existing) existing.remove();

    const src = url.startsWith('http') ? url : `http://localhost:5190${url}`;
    const div = document.createElement('div');
    div.id = 'mf-img-wrap';
    div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,0.1);flex-shrink:0';
    div.innerHTML = `
      <img src="${src}" style="width:100%;height:100%;object-fit:cover">
      <button onclick="removeMemberImage()"
        style="position:absolute;top:2px;right:2px;width:18px;height:18px;
               border-radius:50%;background:rgba(0,0,0,0.7);border:none;
               color:white;font-size:10px;cursor:pointer;
               display:flex;align-items:center;justify-content:center">✕</button>`;
    preview.appendChild(div);

    if (status) status.innerHTML = '<span style="color:#22c55e">✅ Upload thành công</span>';
    setTimeout(() => { if (status) status.innerHTML = ''; }, 3000);

  } catch(e) {
    if (status) status.innerHTML = `<span style="color:#ff2d55">❌ ${e.message}</span>`;
  }
}

// Export
window.handleMemberDragOver   = handleMemberDragOver;
window.handleMemberDragLeave  = handleMemberDragLeave;
window.handleMemberDrop       = handleMemberDrop;
window.handleMemberFileSelect = handleMemberFileSelect;
window.removeMemberImage      = removeMemberImage;
