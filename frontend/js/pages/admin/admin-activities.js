// ================================================
// admin-activities.js
// Quản lý hoạt động: danh sách, tạo, sửa,
// upload ảnh, khóa/mở, xóa
// ================================================

// ── Load danh sách hoạt động ──────────────────────────────────────────────────
async function loadActivitiesAdmin() {
  const tbody = document.getElementById('aBody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div></td></tr>';

  try {
    const r = await API.getActivities();
    const list = r.data?.items || r.data || [];

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#475569">Chưa có hoạt động nào</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(a => {
      // Nút khóa / mở / khôi phục tùy status
      let toggleBtn = '';
      if (a.status === 'Open') {
        toggleBtn = `
          <button onclick="toggleActivityStatus(${a.activityID}, 'Closed')"
            style="background:#f59e0b;color:white;border:none;padding:5px 10px;
                   border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;font-size:12px"
            title="Khóa đăng ký">
            <i class="fa-solid fa-lock"></i> Khóa
          </button>`;
      } else if (a.status === 'Closed') {
        toggleBtn = `
          <button onclick="toggleActivityStatus(${a.activityID}, 'Open')"
            style="background:#22c55e;color:white;border:none;padding:5px 10px;
                   border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;font-size:12px"
            title="Mở đăng ký">
            <i class="fa-solid fa-unlock"></i> Mở
          </button>`;
      } else if (a.status === 'Cancelled') {
        toggleBtn = `
          <button onclick="toggleActivityStatus(${a.activityID}, 'Open')"
            class="btn-outline btn-sm" title="Khôi phục">
            <i class="fa-solid fa-rotate-right"></i>
          </button>`;
      }

      return `
        <tr>
          <td style="color:#475569">${a.activityID}</td>
          <td>
            <strong style="cursor:pointer;color:#ff2d55;text-decoration:underline;
                           text-underline-offset:2px"
                    onclick="showActivityDetail(${a.activityID}, { showAdminButtons: true })"
                    title="Xem chi tiết">
              ${Utils.escapeHtml(a.activityName)}
            </strong>
          </td>
          <td style="color:#94a3b8">${Utils.formatDateTime(a.time)}</td>
          <td style="color:#94a3b8">${Utils.escapeHtml(a.location || '—')}</td>
          <td style="color:#94a3b8">
            ${a.registeredCount}${a.maxParticipants ? ' / ' + a.maxParticipants : ''}
          </td>
          <td>${Utils.statusLabel(a.status)}</td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${toggleBtn}
              <button onclick='openActModalForEdit(${JSON.stringify(a).replace(/'/g, "&#39;")})'
                class="btn-outline btn-sm" title="Sửa">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button onclick="deleteActivity(${a.activityID})"
                class="btn-danger btn-sm" title="Xóa">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}

// ── Modal tạo / sửa hoạt động ────────────────────────────────────────────────
function openActModal(data = {}) {
  const tv = data.time ? new Date(data.time).toISOString().slice(0, 16) : '';
  const existingImages = (data.image || data.images || [])
    .map((url, i) => renderPreviewItem(url, i))
    .join('');

  openModal(data.activityID ? 'Chỉnh sửa hoạt động' : 'Tạo hoạt động mới', `
    <div class="form-group">
      <label class="form-label">Tên hoạt động *</label>
      <input id="af-name" class="form-control" placeholder="Nhập tên hoạt động..."
             value="${Utils.escapeHtml(data.activityName || '')}">
    </div>

    <div class="form-group">
      <label class="form-label">Mô tả</label>
      <textarea id="af-desc" class="form-control" style="min-height:90px"
                placeholder="Mô tả hoạt động...">${Utils.escapeHtml(data.description || '')}</textarea>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Địa điểm</label>
        <input id="af-loc" class="form-control" placeholder="Địa điểm tổ chức..."
               value="${Utils.escapeHtml(data.location || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Thời gian *</label>
        <input type="datetime-local" id="af-time" class="form-control" value="${tv}">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Giới hạn người tham gia</label>
        <input type="number" id="af-max" class="form-control"
               placeholder="Để trống = không giới hạn" min="1"
               value="${data.maxParticipants || ''}">
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
      <label class="form-label">
        Ảnh hoạt động
        <span style="color:#475569;font-weight:400">(tối đa 5 ảnh, mỗi ảnh ≤ 5MB)</span>
      </label>

      <div id="af-dropzone"
        onclick="document.getElementById('af-fileInput').click()"
        ondragover="handleDragOver(event)"
        ondragleave="handleDragLeave(event)"
        ondrop="handleDrop(event)"
        style="border:2px dashed rgba(255,255,255,0.12);border-radius:10px;padding:28px;
               text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s;
               margin-bottom:12px">
        <div style="font-size:2rem;margin-bottom:8px">🖼️</div>
        <div style="font-size:13px;color:#64748b">
          Kéo thả ảnh vào đây hoặc
          <span style="color:#ff2d55;font-weight:700">click để chọn</span>
        </div>
        <div style="font-size:11px;color:#334155;margin-top:4px">JPG, PNG, WEBP, GIF</div>
      </div>

      <input type="file" id="af-fileInput" accept="image/*" multiple
             style="display:none" onchange="handleFileSelect(event)">

      <div id="af-preview" style="display:flex;flex-wrap:wrap;gap:10px;min-height:0">
        ${existingImages}
      </div>
      <div id="af-uploadStatus" style="font-size:12px;color:#64748b;margin-top:8px"></div>
    </div>

    <button type="button" onclick="saveAct(${data.activityID || 0})"
      class="btn-primary w-100" style="padding:11px;margin-top:4px">
      <i class="fa-solid fa-floppy-disk"></i>
      ${data.activityID ? 'Cập nhật hoạt động' : 'Tạo hoạt động'}
    </button>
  `, null);

  // Reset danh sách URL ảnh (giữ lại ảnh cũ khi edit)
  window._actImageUrls = data.image
    ? [...data.image]
    : (data.images ? [...data.images] : []);
}

// Helper để mở modal edit từ dòng table (tránh lỗi escape JSON)
function openActModalForEdit(activityData) {
  openActModal({
    activityID:      activityData.activityID,
    activityName:    activityData.activityName,
    description:     activityData.description,
    location:        activityData.location,
    maxParticipants: activityData.maxParticipants,
    time:            activityData.time,
    status:          activityData.status,
    images:          activityData.image || activityData.images || [],
  });
}

// ── Lưu hoạt động (tạo / cập nhật) ──────────────────────────────────────────
async function saveAct(id) {
  const d = {
    activityName:    document.getElementById('af-name').value.trim(),
    description:     document.getElementById('af-desc').value.trim() || null,
    location:        document.getElementById('af-loc').value.trim()  || null,
    maxParticipants: parseInt(document.getElementById('af-max').value) || null,
    time:            document.getElementById('af-time').value
                       ? new Date(document.getElementById('af-time').value).toISOString()
                       : null,
    status:          document.getElementById('af-st').value,
    imageUrls:       window._actImageUrls || [],
  };

  if (!d.activityName) { Toast.error('Vui lòng nhập tên hoạt động'); return; }
  if (!d.time)         { Toast.error('Vui lòng chọn thời gian');      return; }

  try {
    if (id) {
      await API.updateActivity(id, d);
      Toast.success('Cập nhật hoạt động thành công');
    } else {
      await API.createActivity(d);
      Toast.success('Tạo hoạt động thành công 🎉');
    }
    closeModal();
    loadActivitiesAdmin();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Khóa / Mở hoạt động ──────────────────────────────────────────────────────
async function toggleActivityStatus(activityId, newStatus) {
  const msgs = {
    Closed: { confirm: 'Khóa hoạt động này? Người dùng sẽ không thể đăng ký.',  success: 'Đã khóa hoạt động' },
    Open:   { confirm: 'Mở lại hoạt động này? Người dùng có thể đăng ký.',      success: 'Đã mở hoạt động'  },
  };
  const m = msgs[newStatus];
  if (!m || !confirm(m.confirm)) return;

  try {
    const cur = (await API.getActivity(activityId)).data;
    await API.updateActivity(activityId, {
      activityName:    cur.activityName,
      description:     cur.description  || null,
      location:        cur.location     || null,
      maxParticipants: cur.maxParticipants || null,
      time:            cur.time,
      status:          newStatus,
      imageUrls:       cur.image || [],
    });
    Toast.success(m.success);
    loadActivitiesAdmin();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Xóa hoạt động ────────────────────────────────────────────────────────────
async function deleteActivity(activityId) {
  if (!confirm('Xóa hoạt động này? Hành động không thể hoàn tác!')) return;
  try {
    await API.deleteActivity(activityId);
    Toast.success('Đã xóa hoạt động');
    loadActivitiesAdmin();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Upload ảnh ────────────────────────────────────────────────────────────────
function renderPreviewItem(url, index) {
  const src = url.startsWith('http') ? url : `http://localhost:5190${url}`;
  return `
    <div id="img-wrap-${index}" style="position:relative;width:90px;height:90px;
         border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);flex-shrink:0">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover">
      <button onclick="removeImage('${url}', 'img-wrap-${index}')"
        style="position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;
               background:rgba(0,0,0,0.7);border:none;color:white;font-size:11px;
               cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">✕</button>
    </div>`;
}

function removeImage(url, wrapId) {
  window._actImageUrls = (window._actImageUrls || []).filter(u => u !== url);
  document.getElementById(wrapId)?.remove();
}

function handleDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('af-dropzone');
  dz.style.borderColor = '#ff2d55';
  dz.style.background  = 'rgba(255,45,85,0.05)';
}

function handleDragLeave() {
  const dz = document.getElementById('af-dropzone');
  dz.style.borderColor = 'rgba(255,255,255,0.12)';
  dz.style.background  = 'transparent';
}

function handleDrop(e) {
  e.preventDefault();
  handleDragLeave();
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) uploadImages(files);
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length) uploadImages(files);
  e.target.value = '';
}

async function uploadImages(files) {
  const remaining = 5 - (window._actImageUrls || []).length;
  if (remaining <= 0) { Toast.error('Đã đủ 5 ảnh, vui lòng xóa bớt trước'); return; }

  const toUpload = files.slice(0, remaining);
  if (files.length > remaining) Toast.info(`Chỉ upload thêm ${remaining} ảnh`);

  const status = document.getElementById('af-uploadStatus');
  status.innerHTML = `<span style="color:#f59e0b">⏳ Đang upload ${toUpload.length} ảnh...</span>`;

  let successCount = 0;

  for (const file of toUpload) {
    if (file.size > 5 * 1024 * 1024) { Toast.error(`"${file.name}" quá 5MB`); continue; }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:5190/api/upload/image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const ct = res.headers.get('content-type');
      if (!ct?.includes('application/json')) throw new Error('Server không trả về JSON');

      const data = await res.json();
      if (!data?.data) throw new Error('Server không trả về URL ảnh');

      const url = data.data;
      window._actImageUrls = window._actImageUrls || [];
      window._actImageUrls.push(url);

      const idx = Date.now() + Math.random();
      const preview = document.getElementById('af-preview');
      const div = document.createElement('div');
      div.innerHTML = renderPreviewItem(url, idx);
      preview.appendChild(div.firstElementChild);
      successCount++;

    } catch (e) {
      Toast.error(`Lỗi upload "${file.name}": ${e.message}`);
    }
  }

  status.innerHTML = successCount > 0
    ? `<span style="color:#22c55e">✅ Đã upload ${successCount} ảnh</span>`
    : `<span style="color:#ff2d55">❌ Upload thất bại</span>`;
}