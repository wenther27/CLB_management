// ================================================
// admin-members.js
// Quản lý thành viên: danh sách, thêm, sửa,
// xem chi tiết, vô hiệu hóa, thống kê
// ================================================

function memberPlain(value, fallback = '—') {
  return Utils.displayText(value, fallback);
}

function memberText(value, fallback = '—') {
  return Utils.escapeText(value, fallback);
}

// ── Load danh sách thành viên ─────────────────────────────────────────────────
let memberAdminQuery = {
  page: 1,
  pageSize: 10,
};
let memberAdminTotalPages = 1;

function buildMemberAdminQuery() {
  const keyword = document.getElementById('mSearch')?.value.trim() || '';
  const status  = document.getElementById('mStatus')?.value || '';
  const faculty = document.getElementById('mFaculty')?.value || '';
  const params = new URLSearchParams();

  params.set('page', memberAdminQuery.page);
  params.set('pageSize', memberAdminQuery.pageSize);
  if (keyword) params.set('keyword', keyword);
  if (status) params.set('status', status);
  if (faculty) params.set('faculty', faculty);

  return `?${params.toString()}`;
}

function memberAdminPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

function renderMemberPagination() {
  const box = document.getElementById('mPagination');
  if (!box) return;
  if (memberAdminTotalPages <= 1) {
    box.innerHTML = '';
    return;
  }

  const current = memberAdminQuery.page;
  const buttons = memberAdminPageRange(current, memberAdminTotalPages).map(page => {
    if (page === '...') return '<span class="admin-page-ellipsis">...</span>';
    return `
      <button class="admin-page-btn ${page === current ? 'active' : ''}"
              onclick="changeMemberAdminPage(${page})">${page}</button>`;
  }).join('');

  box.innerHTML = `
    <button class="admin-page-btn" onclick="changeMemberAdminPage(${current - 1})" ${current <= 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    ${buttons}
    <button class="admin-page-btn" onclick="changeMemberAdminPage(${current + 1})" ${current >= memberAdminTotalPages ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>`;
}

function changeMemberAdminPage(page) {
  if (page < 1 || page > memberAdminTotalPages || page === memberAdminQuery.page) return;
  memberAdminQuery.page = page;
  loadMembers();
}

function searchMembersAdmin() {
  memberAdminQuery.page = 1;
  loadMembers();
}

async function loadMembers() {
  const tbody = document.getElementById('mBody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner" style="margin:0 auto"></div></td></tr>';

  try {
    const r = await request('GET', `/members${buildMemberAdminQuery()}`, null, true);
    const paged = r.data || {};
    const list = paged.items || r.data || [];
    memberAdminTotalPages = paged.totalPages || Math.max(1, Math.ceil((paged.totalCount || list.length) / memberAdminQuery.pageSize));
    renderMemberPagination();

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#475569">Không có thành viên nào</td></tr>';
      renderMemberPagination();
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
              ${memberPlain(m.fullName, '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style="font-weight:700;font-size:13px">${memberText(m.fullName)}</div>
              <div style="color:#475569;font-size:11px">
                ${memberText(m.studentCode, '')}${m.email ? ' - ' + memberText(m.email, '') : ''}
              </div>
            </div>
          </div>
        </td>
        <td style="color:#000000;font-size:13px">${memberText(m.className)}</td>
        <td style="color:#000000;font-size:13px">${memberText(m.faculty)}</td>
        <td style="color:#000000;font-size:13px">${memberText(m.position, 'Thành viên')}</td>
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
              ? `<button onclick="deactivateMember(${m.memberID}, ${JSON.stringify(memberPlain(m.fullName, ''))})"
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
    refreshMemberApplicationsBadge();

  } catch (e) {
    memberAdminTotalPages = 1;
    renderMemberPagination();
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
    const initials = memberPlain(m.fullName, '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

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
          <div style="font-size:18px;font-weight:700">${memberText(m.fullName)}</div>
          <div style="color:#475569;font-size:13px">${memberText(m.studentCode)}</div>
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
              ${memberText(val)}
            </div>
          </div>`).join('')}
      </div>

      <div style="display:flex;gap:10px">
        <button onclick="editMember(${m.memberID})" class="btn-outline" style="flex:1;padding:10px">
          <i class="fa-solid fa-pen"></i> Chỉnh sửa
        </button>
        ${m.status !== 'Inactive'
          ? `<button onclick="deactivateMember(${m.memberID}, ${JSON.stringify(memberPlain(m.fullName, ''))})"
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
  const isEditingMember = !!data.memberID;
  const facultyList = data.faculty && !FACULTIES.includes(data.faculty)
    ? [data.faculty, ...FACULTIES]
    : FACULTIES;

  const facultyOptions = facultyList.map(f => `
    <option value="${f}" ${data.faculty === f ? 'selected' : ''}>${f}</option>
  `).join('');

  const boardAvatarUrl = data.boardAvatarUrl || '';
  const avatarSrc = boardAvatarUrl
    ? (boardAvatarUrl.startsWith('http') ? boardAvatarUrl : 'http://localhost:5190' + boardAvatarUrl)
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
        <label class="form-label">Số điện thoại *</label>
        <input id="mf-phone" class="form-control"
               value="${Utils.escapeHtml(data.phone || '')}">
      </div>
    </div>

    <!-- Email liên lạc (full width) -->
    <div class="form-group">
      <label class="form-label">Email liên lạc *</label>
      <input id="mf-contact-email" class="form-control"
             value="${Utils.escapeHtml(data.contactEmail || '')}"
             ${isEditingMember ? 'readonly aria-readonly="true"' : ''}>
      ${isEditingMember ? `
        <div style="font-size:11px;color:#64748b;margin-top:6px">
          Email dùng để định danh tài khoản, quản lý không thể thay đổi tại đây.
        </div>
      ` : ''}
    </div>

    <!-- Hàng 2: Lớp | Khoa -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Lớp *</label>
        <input id="mf-class" class="form-control"
               value="${Utils.escapeHtml(data.className || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Khoa *</label>
        <select id="mf-fac" class="form-control">
          <option value="" ${!data.faculty ? 'selected' : ''}>-- Chọn Khoa --</option>
          ${facultyOptions}
        </select>
      </div>
    </div>

    <!-- Hàng 3: Ngày sinh | Chức vụ -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ngày sinh</label>
        <input type="date" id="mf-birth" class="form-control"
               value="${data.birthDate ? String(data.birthDate).slice(0, 10) : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Chức vụ</label>
        <select id="mf-pos" class="form-control">
          <option value="Thành viên" ${(data.position === 'Thành viên' || !data.position) ? 'selected' : ''}>Thành viên</option>
          <option value="Phó Ban" ${data.position === 'Phó Ban' ? 'selected' : ''}>Phó Ban</option>
          <option value="Trưởng Ban" ${data.position === 'Trưởng Ban' ? 'selected' : ''}>Trưởng Ban</option>
        </select>
      </div>
    </div>

    <!-- Hàng 4: Trạng thái | Ban -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select id="mf-st" class="form-control">
          <option value="Active"    ${(data.status === 'Active' || !data.status) ? 'selected' : ''}>Hoạt động</option>
          <option value="Inactive"  ${data.status === 'Inactive'  ? 'selected' : ''}>Ngừng hoạt động</option>
          <option value="Suspended" ${data.status === 'Suspended' ? 'selected' : ''}>Tạm đình chỉ</option>
        </select>
      </div>
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
        <label class="form-label">Ảnh hiển thị trên trang thành viên</label>
        <div style="font-size:12px;color:#64748b;margin:-2px 0 10px">
          Có thể chọn ảnh riêng dạng dọc/hình chữ nhật, không cần trùng với avatar tài khoản.
        </div>

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
                 ${boardAvatarUrl ? 'display:none' : ''}">
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
          ${boardAvatarUrl ? `
            <div id="mf-img-wrap" style="position:relative; width:160px; height:210px;
                 border-radius:12px; overflow:hidden;
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
        <input type="hidden" id="mf-avatar" value="${boardAvatarUrl}">
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
    birthDate:    document.getElementById('mf-birth').value               || null,
    position:     document.getElementById('mf-pos').value                 || 'Thành viên',
    status:       document.getElementById('mf-st').value,
    // Gửi "" khi chọn thành viên thường để backend biết cần set NULL
    department:   deptValue,   // "", "BCN", "BTT" hoặc "BPT"
    displayOrder: parseInt(document.getElementById('mf-order')?.value) || 0,
    avatarUrl:    document.getElementById('mf-avatar')?.value.trim()      || null,
  };

  if (!id) {
    d.contactEmail = document.getElementById('mf-contact-email')?.value.trim() || null;
  }

  const requiredFields = [
    { value: d.fullName,     label: 'Họ và tên' },
    { value: d.phone,        label: 'Số điện thoại' },
    ...(!id ? [{ value: d.contactEmail, label: 'Gmail' }] : []),
    { value: d.className,    label: 'Lớp' },
    { value: d.faculty,      label: 'Khoa' },
  ];

  const missingFields = requiredFields
    .filter(field => !field.value)
    .map(field => field.label);

  if (missingFields.length) {
    Toast.error(`Vui lòng nhập đầy đủ: ${missingFields.join(', ')}`);
    return;
  }

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
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    Toast.error('Chỉ chấp nhận ảnh JPG, JPEG, PNG, WEBP hoặc GIF');
    return;
  }

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

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || errorData?.data || `HTTP ${res.status}`);
    }
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
    div.style.cssText = 'position:relative;width:160px;height:210px;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,0.1);flex-shrink:0';
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


// Member application review
function applicationStatusBadge(status) {
  const map = {
    Pending: '<span class="badge badge-pending">Ch\u1edd duy\u1ec7t</span>',
    Approved: '<span class="badge badge-active">\u0110\u00e3 duy\u1ec7t</span>',
    Rejected: '<span class="badge badge-inactive">T\u1eeb ch\u1ed1i</span>'
  };
  return map[status] || `<span class="badge">${Utils.escapeHtml(status || '')}</span>`;
}

function formatApplicationDate(value) {
  if (!value) return '\u2014';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString('vi-VN');
}

async function refreshMemberApplicationsBadge() {
  const badge = document.getElementById('memberApplicationsBadge');
  if (!badge) return;

  try {
    const r = await API.getMemberApplications('?status=Pending');
    const list = r.data || [];
    badge.style.display = list.length ? 'block' : 'none';
  } catch {
    badge.style.display = 'none';
  }
}

async function openMemberApplicationsModal(status = 'Pending') {
  openModal('H\u1ed3 s\u01a1 ch\u1edd duy\u1ec7t', `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:16px">
      <div style="color:#64748b;font-size:13px;line-height:1.55;max-width:720px">
        Duy\u1ec7t h\u1ed3 s\u01a1 s\u1ebd t\u1ea1o t\u00e0i kho\u1ea3n v\u1edbi t\u00ean \u0111\u0103ng nh\u1eadp l\u00e0 MSSV v\u00e0 m\u1eadt kh\u1ea9u t\u1ea1m l\u00e0 ng\u00e0y sinh d\u1ea1ng ddMMyyyy.
      </div>
      <select id="appStatusFilter" class="form-control" style="width:180px;flex-shrink:0" onchange="openMemberApplicationsModal(this.value)">
        <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Ch\u1edd duy\u1ec7t</option>
        <option value="Approved" ${status === 'Approved' ? 'selected' : ''}>\u0110\u00e3 duy\u1ec7t</option>
        <option value="Rejected" ${status === 'Rejected' ? 'selected' : ''}>T\u1eeb ch\u1ed1i</option>
        <option value="" ${status === '' ? 'selected' : ''}>T\u1ea5t c\u1ea3</option>
      </select>
    </div>

    <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
      <input id="memberApplicationSearch" class="form-control"
        placeholder="T\u00ecm MSSV, h\u1ecd t\u00ean, l\u1edbp, khoa, email, S\u0110T..."
        oninput="renderMemberApplicationsTable()"
        style="flex:1">
      <button class="btn-outline btn-sm" onclick="document.getElementById('memberApplicationSearch').value='';renderMemberApplicationsTable()">
        <i class="fa-solid fa-xmark"></i> X\u00f3a
      </button>
    </div>

    <div id="memberApplicationsBody" class="loading" style="padding:34px;text-align:center">
      <div class="spinner" style="margin:auto"></div>
    </div>
  `, null);

  const modal = document.getElementById('gModalInner');
  if (modal) {
    modal.classList.add('member-applications-modal');
    modal.style.width = 'min(1680px, calc(100vw - 32px))';
    modal.style.maxWidth = 'calc(100vw - 32px)';
    modal.style.minHeight = 'min(760px, calc(100vh - 72px))';
    modal.style.padding = '30px';
  }

  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const r = await API.getMemberApplications(query);
    window._memberApplicationsCache = r.data || [];
    refreshMemberApplicationsBadge();
    renderMemberApplicationsTable();
  } catch (e) {
    const body = document.getElementById('memberApplicationsBody');
    if (body) body.innerHTML = `<div style="color:#ff2d55;text-align:center;padding:24px">${Utils.escapeHtml(e.message)}</div>`;
  }
}

function renderMemberApplicationsTable() {
  const body = document.getElementById('memberApplicationsBody');
  if (!body) return;
  body.classList.remove('loading');
  body.style.padding = '0';
  body.style.textAlign = 'left';
  body.style.width = '100%';

  const keyword = (document.getElementById('memberApplicationSearch')?.value || '').trim().toLowerCase();
  const source = window._memberApplicationsCache || [];
  const list = !keyword ? source : source.filter(a => [
    a.studentCode,
    a.fullName,
    a.className,
    a.faculty,
    a.contactEmail,
    a.phone,
    a.note,
    a.status
  ].some(v => String(v || '').toLowerCase().includes(keyword)));

  if (!list.length) {
    body.innerHTML = '<div style="padding:26px;text-align:center;color:#64748b">Kh\u00f4ng c\u00f3 h\u1ed3 s\u01a1 ph\u00f9 h\u1ee3p</div>';
    return;
  }

  body.innerHTML = `
    <div style="overflow:auto;border:1px solid #e2e8f0;border-radius:14px;max-height:64vh;width:100%">
      <table style="width:100%;border-collapse:collapse;min-width:1480px">
        <thead style="background:#f8fafc;position:sticky;top:0;z-index:1">
          <tr>
            <th style="padding:13px;text-align:left;white-space:nowrap">MSSV</th>
            <th style="padding:13px;text-align:left;min-width:190px">H\u1ecd t\u00ean</th>
            <th style="padding:13px;text-align:left;min-width:210px">Ghi ch\u00fa</th>
            <th style="padding:13px;text-align:left;white-space:nowrap">L\u1edbp</th>
            <th style="padding:13px;text-align:left;min-width:190px">Khoa</th>
            <th style="padding:13px;text-align:left;white-space:nowrap">Ng\u00e0y sinh</th>
            <th style="padding:13px;text-align:left;min-width:230px">Email</th>
            <th style="padding:13px;text-align:left;white-space:nowrap">S\u0110T</th>
            <th style="padding:13px;text-align:left;white-space:nowrap">Thẻ SV</th>
            <th style="padding:13px;text-align:left;white-space:nowrap">Tr\u1ea1ng th\u00e1i</th>
            <th style="padding:13px;text-align:left;min-width:170px">Thao t\u00e1c</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(a => `
            <tr style="border-top:1px solid #edf2f7">
              <td style="padding:13px;font-weight:800;white-space:nowrap">${Utils.escapeHtml(a.studentCode || '')}</td>
              <td style="padding:13px">
                <div style="font-weight:800">${Utils.escapeHtml(a.fullName || '')}</div>
              </td>
              <td style="padding:13px;color:#64748b;line-height:1.35">${Utils.escapeHtml(a.note || '\u2014')}</td>
              <td style="padding:13px;white-space:nowrap">${Utils.escapeHtml(a.className || '\u2014')}</td>
              <td style="padding:13px">${Utils.escapeHtml(a.faculty || '\u2014')}</td>
              <td style="padding:13px;white-space:nowrap">${formatApplicationDate(a.birthDate)}</td>
              <td style="padding:13px;font-weight:600">${Utils.escapeHtml(a.contactEmail || '\u2014')}</td>
              <td style="padding:13px;white-space:nowrap">${Utils.escapeHtml(a.phone || '\u2014')}</td>
              <td style="padding:13px;white-space:nowrap">
                ${a.studentCardImageUrl ? `
                  <button class="btn-outline btn-sm" onclick="viewMemberApplicationCard('${Utils.escapeHtml(a.studentCardImageUrl)}')">
                    <i class="fa-regular fa-id-card"></i> Xem
                  </button>
                ` : '\u2014'}
              </td>
              <td style="padding:13px">${applicationStatusBadge(a.status)}</td>
              <td style="padding:13px">
                ${a.status === 'Pending' ? `
                  <div style="display:flex;gap:7px;flex-wrap:wrap">
                    <button class="btn-primary btn-sm" data-application-action="${a.memberApplicationID}" onclick="approveMemberApplication(${a.memberApplicationID}, this)">
                      <i class="fa-solid fa-check"></i> Duy\u1ec7t
                    </button>
                    <button class="btn-danger btn-sm" data-application-action="${a.memberApplicationID}" onclick="rejectMemberApplication(${a.memberApplicationID}, this)">
                      <i class="fa-solid fa-xmark"></i> T\u1eeb ch\u1ed1i
                    </button>
                  </div>` : '\u2014'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function viewMemberApplicationCard(url) {
  const safeUrl = Utils.escapeHtml(url || '');
  if (!safeUrl) return;
  const imageUrl = safeUrl.startsWith('http')
    ? safeUrl
    : `http://localhost:5190${safeUrl.startsWith('/') ? safeUrl : `/${safeUrl}`}`;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.62);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:18px;max-width:min(760px,96vw);max-height:90vh;overflow:hidden;box-shadow:0 24px 80px rgba(15,23,42,.32)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;border-bottom:1px solid #e2e8f0">
        <strong style="font-size:16px;color:#0f172a">Ảnh thẻ sinh viên</strong>
        <button type="button" data-close style="width:34px;height:34px;border-radius:50%;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div style="padding:16px;background:#f8fafc">
        <img src="${imageUrl}" alt="Ảnh thẻ sinh viên" style="display:block;max-width:100%;max-height:72vh;border-radius:12px;border:1px solid #e2e8f0;background:#fff">
      </div>
    </div>
  `;
  overlay.querySelector('[data-close]').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function showMemberApplicationDecisionDialog({ type }) {
  return new Promise(resolve => {
    const isReject = type === 'reject';
    const overlay = document.createElement('div');
    overlay.className = 'member-application-confirm-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.45);
      display:flex;align-items:center;justify-content:center;padding:18px;
    `;

    overlay.innerHTML = `
      <div style="
        width:min(460px,100%);background:#fff;border-radius:18px;padding:24px;
        box-shadow:0 24px 70px rgba(15,23,42,.28);border:1px solid #e2e8f0;
        font-family:Arial,sans-serif;
      ">
        <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px">
          <div style="
            width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;
            background:${isReject ? '#fff1f2' : '#ecfdf5'};color:${isReject ? '#e11d48' : '#16a34a'};font-size:20px;flex-shrink:0;
          ">
            <i class="fa-solid ${isReject ? 'fa-xmark' : 'fa-check'}"></i>
          </div>
          <div>
            <h3 style="margin:0 0 6px;font-size:20px;color:#0f172a;font-weight:800">
              ${isReject ? 'Từ chối hồ sơ?' : 'Duyệt hồ sơ?'}
            </h3>
            <p style="margin:0;color:#64748b;font-size:14px;line-height:1.55">
              ${isReject
                ? 'Người nộp sẽ nhận email thông báo kết quả kèm lý do nếu bạn nhập.'
                : 'Hệ thống sẽ tạo tài khoản thành viên và gửi email thông tin đăng nhập.'}
            </p>
          </div>
        </div>

        ${isReject ? `
          <label style="display:block;margin-bottom:8px;font-size:13px;font-weight:800;color:#334155;text-transform:uppercase">
            Lý do từ chối
          </label>
          <textarea id="memberApplicationRejectReason" style="
            width:100%;min-height:110px;resize:vertical;border:1px solid #cbd5e1;border-radius:12px;
            padding:12px 14px;font-size:14px;outline:none;box-sizing:border-box;font-family:Arial,sans-serif;
          " placeholder="Có thể bỏ trống nếu chưa cần ghi chú"></textarea>
        ` : ''}

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px">
          <button type="button" data-dialog-cancel style="
            border:1px solid #e2e8f0;background:#fff;color:#334155;border-radius:10px;
            padding:10px 16px;font-weight:800;cursor:pointer;
          ">Hủy</button>
          <button type="button" data-dialog-confirm style="
            border:0;background:${isReject ? '#e11d48' : '#16a34a'};color:#fff;border-radius:10px;
            padding:10px 18px;font-weight:800;cursor:pointer;box-shadow:0 10px 24px ${isReject ? 'rgba(225,29,72,.22)' : 'rgba(22,163,74,.22)'};
          ">
            <i class="fa-solid ${isReject ? 'fa-xmark' : 'fa-check'}"></i>
            ${isReject ? 'Từ chối' : 'Duyệt hồ sơ'}
          </button>
        </div>
      </div>`;

    const finish = result => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('[data-dialog-cancel]').onclick = () => finish(null);
    overlay.querySelector('[data-dialog-confirm]').onclick = () => {
      const reason = overlay.querySelector('#memberApplicationRejectReason')?.value.trim() || '';
      finish(isReject ? { reason } : {});
    };
    overlay.addEventListener('click', e => {
      if (e.target === overlay) finish(null);
    });
    document.body.appendChild(overlay);
    overlay.querySelector('textarea')?.focus();
  });
}

async function approveMemberApplication(id, button) {
  const decision = await showMemberApplicationDecisionDialog({ type: 'approve' });
  if (!decision) return;
  window._processingMemberApplications ??= new Set();
  if (window._processingMemberApplications.has(id)) return;

  const actionButtons = document.querySelectorAll(`[data-application-action="${id}"]`);
  window._processingMemberApplications.add(id);
  actionButtons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.65';
    btn.style.pointerEvents = 'none';
  });
  if (button) button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang duyệt';

  try {
    await API.approveMemberApplication(id, {});
    Toast.success('\u0110\u00e3 duy\u1ec7t h\u1ed3 s\u01a1 v\u00e0 t\u1ea1o t\u00e0i kho\u1ea3n. M\u1eadt kh\u1ea9u t\u1ea1m l\u00e0 ng\u00e0y sinh d\u1ea1ng ddMMyyyy.');
    await openMemberApplicationsModal('Pending');
    loadMembers();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
    window._processingMemberApplications.delete(id);
    actionButtons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
    });
    if (button) button.innerHTML = '<i class="fa-solid fa-check"></i> Duyệt';
  }
}

async function rejectMemberApplication(id, button) {
  const decision = await showMemberApplicationDecisionDialog({ type: 'reject' });
  if (!decision) return;
  const reason = decision.reason || '';
  window._processingMemberApplications ??= new Set();
  if (window._processingMemberApplications.has(id)) return;

  const actionButtons = document.querySelectorAll(`[data-application-action="${id}"]`);
  window._processingMemberApplications.add(id);
  actionButtons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.65';
    btn.style.pointerEvents = 'none';
  });
  if (button) button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang từ chối';

  try {
    await API.rejectMemberApplication(id, { reviewNote: reason });
    Toast.success('\u0110\u00e3 t\u1eeb ch\u1ed1i h\u1ed3 s\u01a1');
    await openMemberApplicationsModal('Pending');
    refreshMemberApplicationsBadge();
  } catch (e) {
    Toast.error(e.message);
    window._processingMemberApplications.delete(id);
    actionButtons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
    });
    if (button) button.innerHTML = '<i class="fa-solid fa-xmark"></i> Từ chối';
  }
}

window.openMemberApplicationsModal = openMemberApplicationsModal;
window.refreshMemberApplicationsBadge = refreshMemberApplicationsBadge;
window.approveMemberApplication = approveMemberApplication;
window.rejectMemberApplication = rejectMemberApplication;
window.renderMemberApplicationsTable = renderMemberApplicationsTable;
window.viewMemberApplicationCard = viewMemberApplicationCard;
