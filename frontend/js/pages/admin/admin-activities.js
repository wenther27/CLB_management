// ================================================
// admin-activities.js — FIXED VERSION v2
// Fix 1: Click xem chi tiết hoạt động trong bảng admin
// Fix 2: Giao diện modal tạo/chỉnh sửa đẹp hơn
// ================================================

let currentEditId = null;

async function loadActivitiesAdmin() {
  const tbody = document.getElementById('aBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#475569"><div class="spinner" style="margin:0 auto"></div></td></tr>';

  try {
    const r = await API.getActivities();
    const list = r.data?.items || r.data || [];

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#475569">Chưa có hoạt động nào</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(a => {
      let toggleBtn = '';
      if (a.status === 'Open') {
        toggleBtn = `<button onclick="toggleActivityStatus(${a.activityID}, 'Closed')"
          style="background:#f59e0b;color:white;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;font-size:12px">
          <i class="fa-solid fa-lock"></i> Khóa
        </button>`;
      } else if (a.status === 'Closed') {
        toggleBtn = `<button onclick="toggleActivityStatus(${a.activityID}, 'Open')"
          style="background:#22c55e;color:white;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;font-size:12px">
          <i class="fa-solid fa-unlock"></i> Mở
        </button>`;
      } else if (a.status === 'Cancelled') {
        toggleBtn = `<button onclick="toggleActivityStatus(${a.activityID}, 'Open')" class="btn-outline btn-sm">
          <i class="fa-solid fa-rotate-right"></i>
        </button>`;
      }

      const deadlineHtml = a.registrationDeadLine
        ? (() => {
            const dl = new Date(a.registrationDeadLine);
            const now = new Date();
            const isExpired = dl < now;
            const isNear = !isExpired && (dl - now) < 24 * 60 * 60 * 1000;
            const color = isExpired ? '#ff2d55' : isNear ? '#f59e0b' : '#ff0909';
            return `<span style="color:${color};font-size:12px">${Utils.formatDateTime(a.registrationDeadLine)}</span>`;
          })()
        : '<span style="color:#475569;font-size:12px">—</span>';

      const openDateHtml = a.registrationOpenDate
        ? `<span style="font-size:12px;color:#60a5fa">${Utils.formatDateTime(a.registrationOpenDate)}</span>`
        : '<span style="color:#475569;font-size:12px">Ngay khi tạo</span>';

      // FIX: Dùng onclick trực tiếp thay vì data-id + querySelector
      // Escape tên hoạt động cho title tooltip
      const safeName = Utils.escapeHtml(a.activityName);

      return `
        <tr>
          <td style="color:#475569">${a.activityID}</td>
          <td>
            <strong
              onclick="showActivityDetail(${a.activityID})"
              style="cursor:pointer;color:#ff2d55;text-decoration:underline;text-underline-offset:2px;user-select:none"
              title="Xem chi tiết">
              ${safeName}
            </strong>
          </td>
          <td style="color:#94a3b8">${Utils.formatDateTime(a.time)}</td>
          <td style="font-size:12px">${openDateHtml}</td>
          <td style="font-size:12px">${deadlineHtml}</td>
          <td style="color:#94a3b8">${Utils.escapeHtml(a.location || '—')}</td>
          <td style="color:#94a3b8">${a.registeredCount}${a.maxParticipants ? ' / ' + a.maxParticipants : ''}</td>
          <td>${Utils.statusLabel(a.status)}</td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button onclick="showRegistrationsList(${a.activityID}, '${safeName}')"
                class="btn-outline btn-sm" title="Xem danh sách đăng ký">
                <i class="fa-solid fa-users"></i>
              </button>
              ${toggleBtn}
              <button onclick='openActModalForEdit(${JSON.stringify(a).replace(/'/g, "&#39;")})'
                class="btn-outline btn-sm" title="Sửa hoạt động">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button onclick="deleteActivity(${a.activityID})"
                class="btn-danger btn-sm" title="Xóa hoạt động">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}

// ── Modal tạo / sửa hoạt động — Giao diện đẹp hơn ──────────────────────────
function openActModal(data = {}) {
  currentEditId = data.activityID || null;

  const tv  = toLocalInputValue(data.time);
  const rod = toLocalInputValue(data.registrationOpenDate);
  const rdl = toLocalInputValue(data.registrationDeadLine);

  const existingImages = (data.image || data.images || [])
    .map((url, i) => renderPreviewItem(url, i))
    .join('');

  const isEdit = !!data.activityID;

  openModal(isEdit ? 'Chỉnh sửa hoạt động' : 'Tạo hoạt động mới', `
    <style>
      .af-section {
        background: #0f172a;
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .af-section-title {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .af-section-title i { color: #ff2d55; font-size: 12px; }
      .af-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .af-field { margin-bottom: 0; }
      .af-label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 5px;
      }
      .af-hint {
        font-size: 11px;
        color: #475569;
        margin-top: 4px;
      }
      .af-dropzone {
        border: 2px dashed rgba(255,255,255,0.12);
        border-radius: 10px;
        padding: 22px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        margin-bottom: 12px;
      }
      .af-dropzone:hover {
        border-color: #ff2d55;
        background: rgba(255,45,85,0.04);
      }
    </style>

    <!-- THÔNG TIN CƠ BẢN -->
    <div class="af-section">
      <div class="af-section-title">
        <i class="fa-solid fa-circle-info"></i> Thông tin cơ bản
      </div>

      <div class="af-field" style="margin-bottom:12px">
        <label class="af-label">Tên hoạt động <span style="color:#ff2d55">*</span></label>
        <input id="af-name" class="form-control" placeholder="Nhập tên hoạt động..."
               value="${Utils.escapeHtml(data.activityName || '')}">
      </div>

      <div class="af-field">
        <label class="af-label">Mô tả</label>
        <textarea id="af-desc" class="form-control" style="min-height:80px;resize:vertical"
                  placeholder="Mô tả chi tiết về hoạt động...">${Utils.escapeHtml(data.description || '')}</textarea>
      </div>
    </div>

    <!-- ĐỊA ĐIỂM & THỜI GIAN -->
    <div class="af-section">
      <div class="af-section-title">
        <i class="fa-solid fa-calendar-days"></i> Địa điểm & thời gian
      </div>
      <div class="af-grid-2">
        <div class="af-field">
          <label class="af-label">Địa điểm</label>
          <input id="af-loc" class="form-control" placeholder="Hội trường lớn, Phòng A101..."
                 value="${Utils.escapeHtml(data.location || '')}">
        </div>
        <div class="af-field">
          <label class="af-label">Thời gian diễn ra <span style="color:#ff2d55">*</span></label>
          <input type="datetime-local" id="af-time" class="form-control" value="${tv}">
        </div>
      </div>
    </div>

    <!-- THỜI GIAN ĐĂNG KÝ -->
    <div class="af-section">
      <div class="af-section-title">
        <i class="fa-solid fa-calendar-check"></i> Thời gian đăng ký
      </div>
      <div class="af-grid-2">
        <div class="af-field">
          <label class="af-label">Ngày mở đăng ký</label>
          <input type="datetime-local" id="af-reg-open" class="form-control" value="${rod}">
          <div class="af-hint">Để trống = mở ngay khi tạo</div>
        </div>
        <div class="af-field">
          <label class="af-label">Hạn chót đăng ký</label>
          <input type="datetime-local" id="af-reg-deadline" class="form-control" value="${rdl}">
        </div>
      </div>
    </div>

    <!-- GIỚI HẠN & TRẠNG THÁI -->
    <div class="af-section">
      <div class="af-section-title">
        <i class="fa-solid fa-sliders"></i> Cài đặt khác
      </div>
      <div class="af-grid-2">
        <div class="af-field">
          <label class="af-label">Giới hạn người tham gia</label>
          <input type="number" id="af-max" class="form-control"
                 placeholder="Để trống = không giới hạn" min="1"
                 value="${data.maxParticipants || ''}">
        </div>
        <div class="af-field">
          <label class="af-label">Trạng thái</label>
          <select id="af-st" class="form-control">
            <option value="Open"      ${(!data.status || data.status === 'Open') ? 'selected' : ''}>Đang mở</option>
            <option value="Closed"    ${data.status === 'Closed' ? 'selected' : ''}>Đã đóng</option>
            <option value="Cancelled" ${data.status === 'Cancelled' ? 'selected' : ''}>Đã hủy</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ẢNH HOẠT ĐỘNG -->
    <div class="af-section">
      <div class="af-section-title">
        <i class="fa-solid fa-images"></i> Ảnh hoạt động
        <span style="font-weight:400;color:#475569;font-size:10px;text-transform:none;letter-spacing:0">
          (tối đa 5 ảnh, mỗi ảnh ≤ 5MB)
        </span>
      </div>

      <div id="af-dropzone" class="af-dropzone"
        onclick="document.getElementById('af-fileInput').click()"
        ondragover="handleDragOver(event)"
        ondragleave="handleDragLeave(event)"
        ondrop="handleDrop(event)">
        <div style="font-size:28px;margin-bottom:8px;opacity:0.5">🖼️</div>
        <div style="font-size:13px;color:#64748b">
          Kéo thả ảnh vào đây hoặc
          <span style="color:#ff2d55;font-weight:700;cursor:pointer">click để chọn</span>
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

    <!-- NÚT LƯU -->
    <button type="button" onclick="saveAct(${data.activityID || 0})"
      class="btn-primary w-100" style="padding:12px;font-size:15px;border-radius:8px;margin-top:4px">
      <i class="fa-solid fa-floppy-disk"></i>
      ${isEdit ? 'Cập nhật hoạt động' : 'Tạo hoạt động mới'}
    </button>
  `, null);

  window._actImageUrls = data.image
    ? [...data.image]
    : (data.images ? [...data.images] : []);
}

// ── openActModalForEdit ────────────────────────────────────────────────────────
function openActModalForEdit(activityData) {
  openActModal({
    activityID:           activityData.activityID,
    activityName:         activityData.activityName,
    description:          activityData.description,
    location:             activityData.location,
    maxParticipants:      activityData.maxParticipants,
    time:                 activityData.time,
    status:               activityData.status,
    registrationOpenDate: activityData.registrationOpenDate,
    registrationDeadLine: activityData.registrationDeadLine,
    image:                activityData.image || activityData.images || [],
  });
}

// ── saveAct ───────────────────────────────────────────────────────────────────
async function saveAct(id) {
  const timeVal     = document.getElementById('af-time')?.value;
  const deadlineVal = document.getElementById('af-reg-deadline')?.value;
  const openVal     = document.getElementById('af-reg-open')?.value;
  const nameEl      = document.getElementById('af-name');

  if (!nameEl?.value.trim()) {
    Toast.error('Vui lòng nhập tên hoạt động');
    return;
  }
  if (!timeVal) {
    Toast.error('Vui lòng chọn thời gian diễn ra');
    return;
  }

  const d = {
    activityName:         nameEl.value.trim(),
    description:          document.getElementById('af-desc')?.value.trim() || null,
    location:             document.getElementById('af-loc')?.value.trim()  || null,
    maxParticipants:      parseInt(document.getElementById('af-max')?.value) || null,
    time:                 timeVal ? timeVal + ':00' : null,
    registrationOpenDate: openVal ? openVal + ':00' : null,
    registrationDeadLine: deadlineVal ? deadlineVal + ':00' : null,
    status:               document.getElementById('af-st')?.value || 'Open',
    imageUrls:            window._actImageUrls || [],
  };

  if (d.registrationDeadLine && new Date(d.registrationDeadLine) >= new Date(d.time)) {
    Toast.error('Hạn chót đăng ký phải trước thời gian diễn ra hoạt động');
    return;
  }
  if (d.registrationOpenDate && d.registrationDeadLine &&
      new Date(d.registrationOpenDate) >= new Date(d.registrationDeadLine)) {
    Toast.error('Ngày mở đăng ký phải trước hạn chót đăng ký');
    return;
  }

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
    if (typeof loadStats === 'function') loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── toggleActivityStatus ──────────────────────────────────────────────────────
async function toggleActivityStatus(activityId, newStatus) {
  const msgs = {
    Closed: { confirm: 'Khóa hoạt động? Người dùng sẽ không thể đăng ký.', success: 'Đã khóa hoạt động' },
    Open:   { confirm: 'Mở lại hoạt động? Người dùng có thể đăng ký.',     success: 'Đã mở hoạt động'  },
  };
  const m = msgs[newStatus];
  if (!m || !confirm(m.confirm)) return;

  try {
    const cur = (await API.getActivity(activityId)).data;
    await API.updateActivity(activityId, {
      activityName:         cur.activityName,
      description:          cur.description         || null,
      location:             cur.location            || null,
      maxParticipants:      cur.maxParticipants      || null,
      time:                 cur.time,
      registrationOpenDate: cur.registrationOpenDate || null,
      registrationDeadLine: cur.registrationDeadLine || null,
      status:               newStatus,
      imageUrls:            cur.image || [],
    });
    Toast.success(m.success);
    loadActivitiesAdmin();
    if (typeof loadStats === 'function') loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── deleteActivity ────────────────────────────────────────────────────────────
async function deleteActivity(activityId) {
  if (!confirm('Xóa hoạt động này? Hành động không thể hoàn tác!')) return;
  try {
    await API.deleteActivity(activityId);
    Toast.success('Đã xóa hoạt động');
    loadActivitiesAdmin();
    if (typeof loadStats === 'function') loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Upload ảnh ────────────────────────────────────────────────────────────────
function renderPreviewItem(url, index) {
  const src = url.startsWith('http') ? url : `http://localhost:5190${url}`;
  const uniqueId = `img-wrap-${Date.now()}-${index}`;
  return `
    <div id="${uniqueId}" style="position:relative;width:90px;height:90px;
         border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);flex-shrink:0">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 90 90%22><rect fill=%22%231e293b%22 width=%2290%22 height=%2290%22/><text x=%2245%22 y=%2250%22 text-anchor=%22middle%22 fill=%22%23475569%22 font-size=%2220%22>?</text></svg>'">
      <button onclick="removeImage('${url}', '${uniqueId}')"
        style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;
               background:rgba(0,0,0,0.75);border:none;color:white;font-size:11px;
               cursor:pointer;display:flex;align-items:center;justify-content:center;
               line-height:1;padding:0;font-family:Arial,sans-serif">✕</button>
    </div>`;
}

function removeImage(url, wrapId) {
  window._actImageUrls = (window._actImageUrls || []).filter(u => u !== url);
  const wrap = document.getElementById(wrapId);
  if (wrap) wrap.remove();
}

function handleDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('af-dropzone');
  if (dz) { dz.style.borderColor = '#ff2d55'; dz.style.background = 'rgba(255,45,85,0.05)'; }
}

function handleDragLeave(e) {
  const dz = document.getElementById('af-dropzone');
  if (dz) { dz.style.borderColor = 'rgba(255,255,255,0.12)'; dz.style.background = 'transparent'; }
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
  e.target.value = '';
}

async function uploadImages(files) {
  const remaining = 5 - (window._actImageUrls || []).length;
  if (remaining <= 0) { Toast.error('Đã đủ 5 ảnh, vui lòng xóa bớt trước'); return; }

  const toUpload = files.slice(0, remaining);
  if (files.length > remaining) Toast.info(`Chỉ upload thêm ${remaining} ảnh`);

  const status = document.getElementById('af-uploadStatus');
  if (status) status.innerHTML = `<span style="color:#f59e0b">⏳ Đang upload ${toUpload.length} ảnh...</span>`;

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

      const preview = document.getElementById('af-preview');
      if (preview) {
        const idx = Date.now() + Math.random();
        const div = document.createElement('div');
        div.innerHTML = renderPreviewItem(url, idx);
        preview.appendChild(div.firstElementChild);
      }
      successCount++;

    } catch (e) {
      Toast.error(`Lỗi upload "${file.name}": ${e.message}`);
    }
  }

  if (status) {
    status.innerHTML = successCount > 0
      ? `<span style="color:#22c55e">✅ Đã upload ${successCount} ảnh</span>`
      : `<span style="color:#ff2d55">❌ Upload thất bại</span>`;
    setTimeout(() => { if (status) status.innerHTML = ''; }, 3000);
  }
}

// Export
window.loadActivitiesAdmin    = loadActivitiesAdmin;
window.openActModal           = openActModal;
window.openActModalForEdit    = openActModalForEdit;
window.saveAct                = saveAct;
window.toggleActivityStatus   = toggleActivityStatus;
window.deleteActivity         = deleteActivity;
window.removeImage            = removeImage;
window.handleDragOver         = handleDragOver;
window.handleDragLeave        = handleDragLeave;
window.handleDrop             = handleDrop;
window.handleFileSelect       = handleFileSelect;
window.uploadImages           = uploadImages;
window.renderPreviewItem      = renderPreviewItem;