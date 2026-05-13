// admin.js - Khớp với admin-dashboard.html mới
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn() || (!Auth.isExecutive() && !Auth.isAdmin())) {
    Toast.error('Không có quyền truy cập');

    setTimeout(() => location.href = 'login.html', 800);
    return;
  }
  // Ẩn admin-only nếu không phải Admin
  if (!Auth.isAdmin()) {
    document.getElementById('adminGrpLbl')?.remove();
    document.getElementById('usersBtn')?.remove();
    document.getElementById('logsBtn')?.remove();
  }
  const d = new Date();
  const el = document.getElementById('dateLabel');
  if (el) el.textContent = d.toLocaleDateString('vi-VN', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
  loadStats();
  updateNavbar();
});

function showP(name) {
  document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.adm-item').forEach(i => i.classList.remove('active'));
  document.getElementById('p-' + name)?.classList.add('active');
  document.querySelector(`[data-p="${name}"]`)?.classList.add('active');
  const map = {members: loadMembers, activities: loadActivitiesAdmin, posts: loadPostsAdmin, users: loadUsers, logs: loadLogs};
  map[name]?.();
}

// ── STATS ──
async function loadStats() {
  try {
    const [mr, ar, pr] = await Promise.all([API.getMembers(), API.getActivities(), API.getPosts()]);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const members = mr.data || [];
    const acts = ar.data?.items || [];
    const posts = pr.data || [];
    set('sMembers', members.filter(m => m.status === 'Active').length);
    set('sOpenActs', acts.filter(a => a.status === 'Open').length);
    set('sPosts', posts.length);
    set('sAllActs', acts.length);
  } catch {}
}

// ── MODAL ──
function openModal(title, bodyHtml, onSave) {
  const m = document.getElementById('gModal');
  document.getElementById('gModalInner').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${Utils.escapeHtml(title)}</div>
      <button class="modal-close" onclick="document.getElementById('gModal').classList.remove('open')">✕</button>
    </div>
    ${bodyHtml}`;
  m.classList.add('open');
  m._save = onSave;
  m.onclick = e => { if (e.target === m) m.classList.remove('open'); };
}

// ── MEMBERS ──
// ================================================
// Admin_member.js
// Thay thế / bổ sung các hàm Member trong Admin.js
// Dán nội dung này vào Admin.js, thay thế phần // ── MEMBERS ──
// ================================================

// ── MEMBERS - Load danh sách ──────────────────────────────────────────────────
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
            <div style="width:32px;height:32px;border-radius:50%;background:#ff2d55;display:flex;
                        align-items:center;justify-content:center;font-size:12px;font-weight:700;
                        color:white;flex-shrink:0">
              ${(m.fullName || '?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
            </div>
            <div>
              <div style="font-weight:700;font-size:13px">${Utils.escapeHtml(m.fullName)}</div>
              <div style="color:#475569;font-size:11px">${Utils.escapeHtml(m.username || '')}${m.email ? ' · ' + m.email : ''}</div>
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
            ${m.status !== 'Inactive' ? `
              <button onclick="deactivateMember(${m.memberID}, '${Utils.escapeHtml(m.fullName)}')" 
                class="btn-danger btn-sm" title="Vô hiệu hóa">
                <i class="fa-solid fa-user-slash"></i>
              </button>` : `
              <button onclick="activateMember(${m.memberID})" 
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
  openModal('Chi tiết thành viên', '<div class="loading" style="padding:40px"><div class="spinner" style="margin:auto"></div></div>', null);

  try {
    const r = await API.getMember(id);
    const m = r.data;
    const initials = (m.fullName || '?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

    document.getElementById('gModalInner').innerHTML = `
      <div class="modal-header">
        <div class="modal-title"><i class="fa-solid fa-user"></i> Chi tiết thành viên</div>
        <button class="modal-close" onclick="document.getElementById('gModal').classList.remove('open')">✕</button>
      </div>

      <!-- Avatar + tên -->
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px;
                  padding:16px;background:#0a0f1c;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
        <div style="width:56px;height:56px;border-radius:50%;background:#ff2d55;display:flex;
                    align-items:center;justify-content:center;font-size:20px;font-weight:700;
                    color:white;flex-shrink:0">${initials}</div>
        <div>
          <div style="font-size:18px;font-weight:700">${Utils.escapeHtml(m.fullName)}</div>
          <div style="color:#475569;font-size:13px">@${Utils.escapeHtml(m.username || '—')}</div>
          <div style="margin-top:6px">${Utils.statusLabel(m.status || 'Active')}</div>
        </div>
      </div>

      <!-- Grid thông tin -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
        ${[
          ['fa-envelope','Email', m.email],
          ['fa-phone','Điện thoại', m.phone || 'Chưa cập nhật'],
          ['fa-school','Lớp', m.className || '—'],
          ['fa-building-columns','Khoa', m.faculty || '—'],
          ['fa-id-badge','Chức vụ', m.position || 'Thành viên'],
          ['fa-shield-halved','Vai trò', m.roleName || 'Member'],
          ['fa-calendar-plus','Ngày tham gia', Utils.formatDate(m.joinDate)],
          ['fa-user-tag','Trạng thái', m.status || 'Active'],
        ].map(([ico, lbl, val]) => `
          <div style="background:#0a0f1c;border-radius:8px;padding:12px;border:1px solid rgba(255,255,255,0.05)">
            <div style="font-size:11px;color:#334155;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">
              <i class="fa-solid ${ico}" style="color:#475569;margin-right:5px"></i>${lbl}
            </div>
            <div style="font-size:13px;color:#e2e8f0;font-weight:600">${Utils.escapeHtml(String(val || '—'))}</div>
          </div>`).join('')}
      </div>

      <div style="display:flex;gap:10px">
        <button onclick="editMember(${m.memberID})" class="btn-outline" style="flex:1;padding:10px">
          <i class="fa-solid fa-pen"></i> Chỉnh sửa
        </button>
        ${m.status !== 'Inactive'
          ? `<button onclick="deactivateMember(${m.memberID},'${Utils.escapeHtml(m.fullName)}')" class="btn-danger" style="padding:10px 16px">
               <i class="fa-solid fa-user-slash"></i>
             </button>`
          : `<button onclick="activateMember(${m.memberID})" 
               style="padding:10px 16px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);
                      color:#22c55e;border-radius:6px;cursor:pointer;font-family:Arial,sans-serif">
               <i class="fa-solid fa-user-check"></i>
             </button>`}
      </div>`;

  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Modal tạo / sửa thành viên ────────────────────────────────────────────────
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
          <option value="Active"   ${(data.status === 'Active'   || !data.status) ? 'selected' : ''}>Hoạt động</option>
          <option value="Inactive" ${data.status === 'Inactive' ? 'selected' : ''}>Ngừng hoạt động</option>
          <option value="Suspended"${data.status === 'Suspended'? 'selected' : ''}>Tạm đình chỉ</option>
        </select>
      </div>
    </div>
    <button type="button" onclick="saveMember(${data.memberID || 0})"
      class="btn-primary w-100" style="padding:11px;margin-top:4px">
      <i class="fa-solid fa-floppy-disk"></i> ${data.memberID ? 'Cập nhật' : 'Lưu thành viên'}
    </button>
  `, null);
}

// ── Lưu thành viên ────────────────────────────────────────────────────────────
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
      // Nếu cần tạo mới qua API khác có thể thêm ở đây
      Toast.info('Thành viên được tạo qua tính năng đăng ký');
    }
    document.getElementById('gModal').classList.remove('open');
    loadMembers();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Sửa thành viên ────────────────────────────────────────────────────────────
async function editMember(id) {
  try {
    const r = await API.getMember(id);
    openMemberModal(r.data);
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Vô hiệu hóa / Kích hoạt ──────────────────────────────────────────────────
async function deactivateMember(id, name) {
  if (!confirm(`Vô hiệu hóa tài khoản của "${name}"?\nThành viên sẽ không thể đăng nhập.`)) return;
  try {
    await request('PATCH', `/members/${id}/deactivate`, null, true);
    Toast.success('Đã vô hiệu hóa tài khoản');
    document.getElementById('gModal').classList.remove('open');
    loadMembers();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

async function activateMember(id) {
  try {
    await API.updateMember(id, { status: 'Active' });
    Toast.success('Đã kích hoạt lại tài khoản');
    document.getElementById('gModal').classList.remove('open');
    loadMembers();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Xóa thành viên ────────────────────────────────────────────────────────────
async function delMember(id) {
  if (!confirm('Xóa thành viên này? Hành động không thể hoàn tác.')) return;
  try {
    await API.deleteMember(id);
    Toast.success('Đã xóa thành viên');
    loadMembers();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── ACTIVITIES ──
function openActModal(data = {}) {
  const tv = data.time ? new Date(data.time).toISOString().slice(0, 16) : '';
 
  // Render ảnh đã có sẵn (khi edit)
  const existingImages = (data.image || data.images || [])
    .map((url, i) => renderPreviewItem(url, i))
    .join('');
 
  openModal(data.activityID ? 'Chỉnh sửa hoạt động' : 'Tạo hoạt động mới', `
 
    <div class="form-group">
      <label class="form-label">Tên hoạt động *</label>
      <input id="af-name" class="form-control" placeholder="Nhập tên hoạt động..." value="${Utils.escapeHtml(data.activityName || '')}">
    </div>
 
    <div class="form-group">
      <label class="form-label">Mô tả</label>
      <textarea id="af-desc" class="form-control" style="min-height:90px" placeholder="Mô tả hoạt động...">${Utils.escapeHtml(data.description || '')}</textarea>
    </div>
 
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Địa điểm</label>
        <input id="af-loc" class="form-control" placeholder="Địa điểm tổ chức..." value="${Utils.escapeHtml(data.location || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Thời gian *</label>
        <input type="datetime-local" id="af-time" class="form-control" value="${tv}">
      </div>
    </div>
 
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Giới hạn người tham gia</label>
        <input type="number" id="af-max" class="form-control" placeholder="Để trống = không giới hạn" min="1" value="${data.maxParticipants || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select id="af-st" class="form-control">
          <option value="Open"      ${(!data.status || data.status === 'Open')      ? 'selected' : ''}>Đang mở</option>
          <option value="Closed"    ${data.status === 'Closed'    ? 'selected' : ''}>Đã đóng</option>
          <option value="Cancelled" ${data.status === 'Cancelled' ? 'selected' : ''}>Đã hủy</option>
        </select>
      </div>
    </div>
 
    <!-- Upload ảnh -->
    <div class="form-group">
      <label class="form-label">Ảnh hoạt động <span style="color:#475569;font-weight:400">(tối đa 5 ảnh, mỗi ảnh &le; 5MB)</span></label>
 
      <!-- Vùng kéo thả / click chọn ảnh -->
      <div id="af-dropzone" onclick="document.getElementById('af-fileInput').click()"
        style="border:2px dashed rgba(255,255,255,0.12);border-radius:10px;padding:28px;text-align:center;
               cursor:pointer;transition:border-color 0.2s,background 0.2s;margin-bottom:12px"
        ondragover="handleDragOver(event)"
        ondragleave="handleDragLeave(event)"
        ondrop="handleDrop(event)">
        <div style="font-size:2rem;margin-bottom:8px">🖼️</div>
        <div style="font-size:13px;color:#64748b">Kéo thả ảnh vào đây hoặc <span style="color:#ff2d55;font-weight:700">click để chọn</span></div>
        <div style="font-size:11px;color:#334155;margin-top:4px">JPG, PNG, WEBP, GIF</div>
      </div>
 
      <input type="file" id="af-fileInput" accept="image/*" multiple style="display:none"
        onchange="handleFileSelect(event)">
 
      <!-- Preview ảnh đã chọn / đã có -->
      <div id="af-preview" style="display:flex;flex-wrap:wrap;gap:10px;min-height:0">
        ${existingImages}
      </div>
 
      <!-- Trạng thái upload -->
      <div id="af-uploadStatus" style="font-size:12px;color:#64748b;margin-top:8px"></div>
    </div>
 
    <button type="button" onclick="saveAct(${data.activityID || 0})"
      class="btn-primary w-100" style="padding:11px;margin-top:4px">
      💾 ${data.activityID ? 'Cập nhật hoạt động' : 'Tạo hoạt động'}
    </button>
  `, null);
 
  // Reset danh sách URL ảnh (giữ lại ảnh cũ nếu edit)
  window._actImageUrls = data.image ? [...data.image] : (data.images ? [...data.images] : []);
}
 
// ── Render một ảnh preview ────────────────────────────────────────────────────
function renderPreviewItem(url, index) {
  const src = url.startsWith('http') ? url : `http://localhost:5190${url}`;
  return `
  <div id="img-wrap-${index}" style="position:relative;width:90px;height:90px;border-radius:8px;overflow:hidden;
       border:1px solid rgba(255,255,255,0.1);flex-shrink:0">
    <img src="${src}" style="width:100%;height:100%;object-fit:cover">
    <button onclick="removeImage('${url}', 'img-wrap-${index}')"
      style="position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;
             background:rgba(0,0,0,0.7);border:none;color:white;font-size:11px;
             cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">✕</button>
  </div>`;
}
 
// ── Xóa ảnh khỏi danh sách ───────────────────────────────────────────────────
function removeImage(url, wrapId) {
  window._actImageUrls = (window._actImageUrls || []).filter(u => u !== url);
  document.getElementById(wrapId)?.remove();
}
 
// ── Drag & Drop ───────────────────────────────────────────────────────────────
function handleDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('af-dropzone');
  dz.style.borderColor = '#ff2d55';
  dz.style.background = 'rgba(255,45,85,0.05)';
}
 
function handleDragLeave(e) {
  const dz = document.getElementById('af-dropzone');
  dz.style.borderColor = 'rgba(255,255,255,0.12)';
  dz.style.background = 'transparent';
}
 
function handleDrop(e) {
  e.preventDefault();
  handleDragLeave(e);
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) uploadImages(files);
}
 
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length) uploadImages(files);
  e.target.value = ''; // reset để có thể chọn lại cùng file
}
 

// ── Upload ảnh lên server ─────────────────────────────────────────────────────
async function uploadImages(files) {
  const currentCount = (window._actImageUrls || []).length;
  const remaining = 5 - currentCount;
 
  if (remaining <= 0) {
    Toast.error('Đã đủ 5 ảnh, vui lòng xóa bớt trước khi thêm');
    return;
  }
 
  const toUpload = files.slice(0, remaining);
  if (files.length > remaining)
    Toast.info(`Chỉ upload thêm ${remaining} ảnh (đã đủ sau đó)`);
 
  const status = document.getElementById('af-uploadStatus');
  status.innerHTML = `<span style="color:#f59e0b">⏳ Đang upload ${toUpload.length} ảnh...</span>`;
 
  let successCount = 0;
 
  for (const file of toUpload) {
    if (file.size > 5 * 1024 * 1024) {
      Toast.error(`"${file.name}" quá 5MB, bỏ qua`);
      continue;
    }
 
    try {
      const formData = new FormData();
      formData.append('file', file);
 
      const res = await fetch('http://localhost:5190/api/upload/image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
        body: formData
      });
 
      // Kiểm tra content-type trước khi parse JSON
      const contentType = res.headers.get('content-type');
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText.substring(0, 200)}`);
      }
      
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await res.text();
        console.warn('Non-JSON response:', textResponse);
        throw new Error('Server không trả về JSON hợp lệ');
      }
 
      const data = await res.json();
 
      if (!data || !data.data) {
        throw new Error('Server không trả về URL ảnh');
      }
 
      const url = data.data;
      window._actImageUrls = window._actImageUrls || [];
      window._actImageUrls.push(url);
 
      // Thêm preview ngay lập tức
      const idx = Date.now() + Math.random();
      const preview = document.getElementById('af-preview');
      const div = document.createElement('div');
      div.innerHTML = renderPreviewItem(url, idx);
      preview.appendChild(div.firstElementChild);
      successCount++;
 
    } catch (e) {
      console.error('Upload error:', e);
      Toast.error(`Lỗi upload "${file.name}": ${e.message}`);
    }
  }
 
  status.innerHTML = successCount > 0
    ? `<span style="color:#22c55e">✅ Đã upload ${successCount} ảnh</span>`
    : '<span style="color:#ff2d55">❌ Upload thất bại, vui lòng thử lại</span>';
}
 
// ── Lưu hoạt động (đã gắn ImageUrls từ _actImageUrls) ───────────────────────
async function saveAct(id) {
  const d = {
    activityName:   document.getElementById('af-name').value.trim(),
    description:    document.getElementById('af-desc').value.trim() || null,
    location:       document.getElementById('af-loc').value.trim() || null,
    maxParticipants: parseInt(document.getElementById('af-max').value) || null,
    time:           document.getElementById('af-time').value
                      ? new Date(document.getElementById('af-time').value).toISOString()
                      : null,
    status:         document.getElementById('af-st').value,
    imageUrls:      window._actImageUrls || [],   // ← danh sách URL ảnh đã upload
  };
 
  if (!d.activityName) { Toast.error('Vui lòng nhập tên hoạt động'); return; }
  if (!d.time)         { Toast.error('Vui lòng chọn thời gian');       return; }
 
  try {
    if (id) {
      await API.updateActivity(id, d);
      Toast.success('Cập nhật hoạt động thành công');
    } else {
      await API.createActivity(d);
      Toast.success('Tạo hoạt động thành công 🎉');
    }
    document.getElementById('gModal').classList.remove('open');
    loadActivitiesAdmin();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}
 async function loadActivitiesAdmin() {
  const tbody = document.getElementById('aBody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div></td></tr>';

  try {
    const r = await API.getActivities();
    const list = r.data?.items || [];

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#475569">Không có hoạt động</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(a => {
      let toggleBtn = '';
      if (a.status === 'Open') {
        toggleBtn = `<button onclick="toggleActivityStatus(${a.activityID}, 'Closed')" class="btn-warning btn-sm" style="background:#f59e0b;color:white;border:none;padding:5px 10px;border-radius:6px;cursor:pointer" title="Khóa đăng ký"><i class="fa-solid fa-lock" style="color: rgb(255, 255, 255);"></i> Khóa</button>`;
      } else if (a.status === 'Closed') {
        toggleBtn = `<button onclick="toggleActivityStatus(${a.activityID}, 'Open')" class="btn-success btn-sm" style="background:#22c55e;color:white;border:none;padding:5px 10px;border-radius:6px;cursor:pointer" title="Mở đăng ký"><i class="fa-solid fa-unlock" style="color: rgb(255, 255, 255);"></i> Mở</button>`;
      } else if (a.status === 'Cancelled') {
        toggleBtn = `<button onclick="toggleActivityStatus(${a.activityID}, 'Open')" class="btn-outline btn-sm" style="padding:5px 10px" title="Khôi phục">🔄 Khôi phục</button>`;
      }

      return `
      <tr>
        <td style="color:#475569">${a.activityID}</td>
        <td><strong style="cursor:pointer;color:#ff2d55;text-decoration:underline;text-underline-offset:2px" 
            onclick="showActivityDetail(${a.activityID}, { showAdminButtons: true })" 
            title="Xem chi tiết">${Utils.escapeHtml(a.activityName)}</strong></td>
        <td style="color:#94a3b8">${Utils.formatDateTime(a.time)}</td>
        <td style="color:#94a3b8">${Utils.escapeHtml(a.location || '—')}</td>
        <td style="color:#94a3b8">${a.registeredCount}${a.maxParticipants ? ' / ' + a.maxParticipants : ''}</td>
        <td>${Utils.statusLabel(a.status)}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap">
          ${toggleBtn}
          <button onclick='openActModalForEdit(${JSON.stringify(a).replace(/'/g, "&#39;")})' class="btn-outline btn-sm"><i class="fa-solid fa-pen" style="color: rgb(255, 255, 255);"></i> Sửa</button>
          <button onclick="deleteActivity(${a.activityID})" class="btn-danger btn-sm"><i class="fa-solid fa-trash-can" style="color: rgb(255, 0, 0);"></i></button>
        </td>
      <tr>
    `}).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}
// ── POSTS ──
async function loadPostsAdmin() {
  const tbody = document.getElementById('pBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner" style="margin:0 auto"></div></td></tr>';
  try {
    const r = await API.getPosts();
    const list = r.data || [];
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#475569">Chưa có bài viết</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(p => `
      <tr>
        <td style="color:#475569">${p.postID}</td>
        <td><strong>${Utils.escapeHtml(p.title || Utils.truncate(p.content, 40))}</strong></td>
        <td><span class="badge badge-gold">${Utils.escapeHtml(p.category)}</span></td>
        <td style="color:#94a3b8">${Utils.formatDate(p.createdDate)}</td>
        <td>${Utils.statusLabel(p.status)}</td>
        <td style="display:flex;gap:6px">
          <button onclick="editPost(${p.postID})" class="btn-outline btn-sm">✏️</button>
          <button onclick="delPost(${p.postID})" class="btn-danger btn-sm">🗑️</button>
        </td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}

function openPostModal(data = {}) {
  const cats = ['Tin tức','Thông báo','Hoạt động','Tuyển thành viên'];
  openModal(data.postID ? 'Chỉnh sửa bài viết' : 'Đăng bài viết mới', `
    <div class="form-group"><label class="form-label">Tiêu đề</label><input id="pf-title" class="form-control" value="${Utils.escapeHtml(data.title||'')}"></div>
    <div class="form-group"><label class="form-label">Nội dung *</label><textarea id="pf-content" class="form-control" style="min-height:150px">${Utils.escapeHtml(data.content||'')}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Danh mục</label>
        <select id="pf-cat" class="form-control">${cats.map(c=>`<option value="${c}" ${data.category===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Trạng thái</label>
        <select id="pf-st" class="form-control">
          <option value="Published" ${data.status==='Published'||!data.status?'selected':''}>Đã đăng</option>
          <option value="Draft" ${data.status==='Draft'?'selected':''}>Nháp</option>
        </select>
      </div>
    </div>
    <button type="button" onclick="savePost(${data.postID||0})" class="btn-primary w-100" style="padding:11px">💾 Lưu</button>`,
    null
  );
}

async function savePost(id) {
  const d = {
    title: document.getElementById('pf-title').value.trim() || null,
    content: document.getElementById('pf-content').value.trim(),
    category: document.getElementById('pf-cat').value,
    status: document.getElementById('pf-st').value,
  };
  if (!d.content) { Toast.error('Vui lòng nhập nội dung'); return; }
  try {
    if (id) { await API.updatePost(id, d); Toast.success('Cập nhật thành công'); }
    else     { await API.createPost(d); Toast.success('Đăng bài thành công'); }
    document.getElementById('gModal').classList.remove('open');
    loadPostsAdmin(); loadStats();
  } catch(e) { Toast.error(e.message); }
}

async function editPost(id) {
  try { const r = await API.getPost(id); openPostModal(r.data); }
  catch(e) { Toast.error(e.message); }
}

async function delPost(id) {
  if (!confirm('Xóa bài viết này?')) return;
  try { await API.deletePost(id); Toast.success('Đã xóa'); loadPostsAdmin(); }
  catch(e) { Toast.error(e.message); }
}

// ── USERS ──
async function loadUsers() {
  const tbody = document.getElementById('uBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner" style="margin:0 auto"></div></td></tr>';
  try {
    const r = await API.getUsers();
    tbody.innerHTML = (r.data||[]).map(u => `
      <tr>
        <td style="color:#475569">${u.userID}</td>
        <td><strong>@${Utils.escapeHtml(u.username)}</strong></td>
        <td style="color:#94a3b8">${Utils.escapeHtml(u.email)}</td>
        <td><span class="badge badge-blue">${Utils.escapeHtml(u.roleName||'—')}</span></td>
        <td>${Utils.statusLabel(u.isActive?'Active':'Inactive')}</td>
        <td>${u.isActive?`<button onclick="deactUser(${u.userID})" class="btn-danger btn-sm">🔒 Vô hiệu</button>`:''}</td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}

async function deactUser(id) {
  if (!confirm('Vô hiệu hóa tài khoản này?')) return;
  try { await API.deleteUser(id); Toast.success('Đã vô hiệu hóa'); loadUsers(); }
  catch(e) { Toast.error(e.message); }
}

// ── LOGS ──
async function loadLogs() {
  const tbody = document.getElementById('lBody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading"><div class="spinner" style="margin:0 auto"></div></td></tr>';
  try {
    const r = await API.getAuditLogs();
    tbody.innerHTML = (r.data||[]).map(l => `
      <tr>
        <td style="color:#475569">${l.logID}</td>
        <td><strong>${Utils.escapeHtml(l.username)}</strong></td>
        <td><span class="badge badge-gold">${Utils.escapeHtml(l.action||'—')}</span></td>
        <td style="color:#94a3b8">${Utils.escapeHtml(l.tableName||'—')}${l.recordID?' #'+l.recordID:''}</td>
        <td style="color:#475569">${Utils.formatDateTime(l.createdAt)}</td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}

function updateNavbar() {
  const el = document.getElementById('navActions');
  if (!el) return;
  const u = Auth.getUser();
  if (u) {
    el.innerHTML = `<span class="navbar-user"> <i class="fa-solid fa-crown" style="color: rgb(255, 212, 59);"></i> ${Utils.escapeHtml(u.username)}</span>
      <button onclick="logout()" class="btn-secondary btn-sm">Đăng xuất</button>`;
  }
}
// Thêm vào cuối file Admin.js (trước dấu đóng ngoặc)

// ── TOGGLE ACTIVITY STATUS (Khóa/Mở hoạt động) ────────────────────────────────
async function toggleActivityStatus(activityId, newStatus) {
  let confirmMessage = '';
  let successMessage = '';
  
  if (newStatus === 'Closed') {
    confirmMessage = 'Bạn có chắc chắn muốn KHÓA hoạt động này? Người dùng sẽ không thể đăng ký tham gia.';
    successMessage = 'Đã khóa hoạt động thành công!';
  } else if (newStatus === 'Open') {
    confirmMessage = 'Bạn có chắc chắn muốn MỞ lại hoạt động này? Người dùng có thể đăng ký tham gia.';
    successMessage = 'Đã mở hoạt động thành công!';
  } else {
    return;
  }
  
  if (!confirm(confirmMessage)) return;
  
  try {
    // Lấy thông tin hoạt động hiện tại
    const activityRes = await API.getActivity(activityId);
    const currentActivity = activityRes.data;
    
    // Cập nhật chỉ status, giữ nguyên các trường khác
    const updateData = {
      activityName: currentActivity.activityName,
      description: currentActivity.description || null,
      location: currentActivity.location || null,
      maxParticipants: currentActivity.maxParticipants || null,
      time: currentActivity.time,
      status: newStatus,
      imageUrls: currentActivity.image || []
    };
    
    await API.updateActivity(activityId, updateData);
    Toast.success(successMessage);
    loadActivitiesAdmin(); // Refresh danh sách
    loadStats(); // Refresh thống kê
    
  } catch (e) {
    Toast.error(e.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
  }
}

// ── DELETE ACTIVITY ───────────────────────────────────────────────────────────
async function deleteActivity(activityId) {
  if (!confirm('Bạn có chắc chắn muốn XÓA hoạt động này? Hành động này không thể hoàn tác!')) return;
  
  try {
    await API.deleteActivity(activityId);
    Toast.success('Đã xóa hoạt động thành công');
    loadActivitiesAdmin();
    loadStats();
  } catch (e) {
    Toast.error(e.message || 'Có lỗi xảy ra khi xóa hoạt động');
  }
}

// ── Hàm riêng để mở modal edit (tránh lỗi escape JSON) ───────────────────────
function openActModalForEdit(activityData) {
  const data = {
    activityID: activityData.activityID,
    activityName: activityData.activityName,
    description: activityData.description,
    location: activityData.location,
    maxParticipants: activityData.maxParticipants,
    time: activityData.time,
    status: activityData.status,
    images: activityData.image || activityData.images || []
  };
  openActModal(data);
}
async function loadMemberStats() {
  const row = document.getElementById('memberStatsRow');
  row.style.display = row.style.display === 'none' ? 'grid' : 'none';
  if (row.style.display === 'none') return;
  try {
    const r = await request('GET', '/members/stats', null, true);
    const s = r.data;
    document.getElementById('ms-total').textContent    = s.totalMembers;
    document.getElementById('ms-active').textContent   = s.activeMembers;
    document.getElementById('ms-inactive').textContent = s.inactiveMembers;
    document.getElementById('ms-new').textContent      = s.newThisMonth;
  } catch(e) { Toast.error(e.message); }
}