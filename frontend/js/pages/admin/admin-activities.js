// ================================================
// admin-activities.js — Flatpickr date format version
// Hiển thị ngày giờ dạng dd/MM/yyyy HH:mm
// Lưu API dạng yyyy-MM-ddTHH:mm:ss, không lệch ngày/tháng/giờ
// ================================================

let currentEditId = null;
let flatpickrLoadPromise = null;
let activityAdminQuery = {
  page: 1,
  pageSize: 10,
  keyword: '',
};
let activityAdminTotalPages = 1;

function buildActivityAdminQuery() {
  const params = new URLSearchParams();
  if (activityAdminQuery.keyword) params.append('keyword', activityAdminQuery.keyword);
  params.append('page', activityAdminQuery.page);
  params.append('pageSize', activityAdminQuery.pageSize);
  return `?${params.toString()}`;
}

function activityAdminPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function renderActivityPagination() {
  const wrap = document.getElementById('aPagination');
  if (!wrap) return;
  if (activityAdminTotalPages <= 1) {
    wrap.innerHTML = '';
    return;
  }

  const current = activityAdminQuery.page;
  let html = `
    <button class="admin-page-btn" onclick="changeActivityAdminPage(${current - 1})" ${current === 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>`;

  activityAdminPageRange(current, activityAdminTotalPages).forEach(page => {
    if (page === '...') {
      html += '<span class="admin-page-ellipsis">...</span>';
      return;
    }

    html += `
      <button class="admin-page-btn ${page === current ? 'active' : ''}" onclick="changeActivityAdminPage(${page})">
        ${page}
      </button>`;
  });

  html += `
    <button class="admin-page-btn" onclick="changeActivityAdminPage(${current + 1})" ${current === activityAdminTotalPages ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>`;

  wrap.innerHTML = html;
}

function changeActivityAdminPage(page) {
  if (page < 1 || page > activityAdminTotalPages || page === activityAdminQuery.page) return;
  activityAdminQuery.page = page;
  loadActivitiesAdmin();
}

function searchActivitiesAdmin() {
  activityAdminQuery.keyword = (document.getElementById('activitySearch')?.value || '').trim();
  activityAdminQuery.page = 1;
  loadActivitiesAdmin();
}

function toDisplayDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function parseDisplayDateTime(value) {
  if (!value) return null;

  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;

  const [, dd, mm, yyyy, hh, mi] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), 0);

  const isValid =
    d.getFullYear() === Number(yyyy) &&
    d.getMonth() === Number(mm) - 1 &&
    d.getDate() === Number(dd) &&
    d.getHours() === Number(hh) &&
    d.getMinutes() === Number(mi);

  if (!isValid) return null;
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
}

function loadFlatpickrAssets() {
  if (typeof flatpickr === 'function') return Promise.resolve();
  if (flatpickrLoadPromise) return flatpickrLoadPromise;

  flatpickrLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-flatpickr-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
      link.dataset.flatpickrCss = 'true';
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector('script[data-flatpickr-js]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve);
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
    script.dataset.flatpickrJs = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Không tải được Flatpickr'));
    document.head.appendChild(script);
  });

  return flatpickrLoadPromise;
}

async function initActivityDatePickers() {
  try {
    await loadFlatpickrAssets();
    if (typeof flatpickr !== 'function') return;

    flatpickr('.js-activity-datetime', {
      enableTime: true,
      time_24hr: true,
      dateFormat: 'd/m/Y H:i',
      allowInput: true,
      minuteIncrement: 1,
    });
  } catch (e) {
    console.warn(e.message);
  }
}

async function loadActivitiesAdmin() {
  const tbody = document.getElementById('aBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" class="loading"><div class="spinner"></div></td></tr>';

  try {
    const r = await API.getActivities(buildActivityAdminQuery());
    const paged = r.data || {};
    const list = r.data?.items || r.data || [];
    activityAdminTotalPages = paged.totalPages || Math.max(1, Math.ceil((paged.totalCount || list.length) / activityAdminQuery.pageSize));
    renderActivityPagination();

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#111827">Chưa có hoạt động nào</td></tr>';
      renderActivityPagination();
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
            const color = isExpired ? '#dc2626' : isNear ? '#b45309' : '#111827';
            return `<span style="color:${color};font-size:12px"> ${Utils.formatDateTime(a.registrationDeadLine)}</span>`;
          })()
        : '<span style="color:#111827;font-size:12px">—</span>';

      const openDateHtml = a.registrationOpenDate
        ? `<span style="font-size:12px;color:#1d4ed8"> ${Utils.formatDateTime(a.registrationOpenDate)}</span>`
        : '<span style="color:#111827;font-size:12px">Ngay khi tạo</span>';

      const safeId = a.activityID;

      return `
        <tr>
          <td style="color:#111827">${a.activityID}</td>
          <td>
            <strong
              class="act-name-link"
              data-id="${safeId}"
              style="cursor:pointer;color:#ff2d55;text-decoration:underline;text-underline-offset:2px"
              title="Xem chi tiết"
              onclick="window.showActivityDetail(${safeId})">
              ${Utils.escapeHtml(a.activityName)}
            </strong>
          </td>
          <td style="color:#111827">${Utils.formatDateTime(a.time)}</td>
          <td style="font-size:12px">${openDateHtml}</td>
          <td style="font-size:12px">${deadlineHtml}</td>
          <td style="color:#111827">${Utils.escapeHtml(a.location || '—')}</td>
          <td style="color:#111827">${a.registeredCount}${a.maxParticipants ? ' / ' + a.maxParticipants : ''}</td>
          <td>${Utils.statusLabel(a.status)}</td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button onclick="showRegistrationsList(${a.activityID}, '${Utils.escapeHtml(a.activityName)}')"
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
    activityAdminTotalPages = 1;
    renderActivityPagination();
  }
}

function openActModal(data = {}) {
  currentEditId = data.activityID || null;

  const tv = toDisplayDateTime(data.time);
  const rod = toDisplayDateTime(data.registrationOpenDate);
  const rdl = toDisplayDateTime(data.registrationDeadLine);
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
        <label class="form-label">Thời gian diễn ra *</label>
        <input type="text" id="af-time" class="form-control js-activity-datetime"
               value="${tv}" placeholder="dd/mm/yyyy hh:mm">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ngày mở đăng ký</label>
        <input type="text" id="af-reg-open" class="form-control js-activity-datetime"
               value="${rod}" placeholder="dd/mm/yyyy hh:mm">
        <div style="font-size:11px;color:#111827;margin-top:4px">Để trống = mở ngay khi tạo</div>
      </div>
      <div class="form-group">
        <label class="form-label">Hạn chót đăng ký</label>
        <input type="text" id="af-reg-deadline" class="form-control js-activity-datetime"
               value="${rdl}" placeholder="dd/mm/yyyy hh:mm">
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
          <option value="Open" ${(!data.status || data.status === 'Open') ? 'selected' : ''}>Đang mở</option>
          <option value="Closed" ${data.status === 'Closed' ? 'selected' : ''}>Đã đóng</option>
          <option value="Cancelled" ${data.status === 'Cancelled' ? 'selected' : ''}>Đã hủy</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">
        Ảnh hoạt động
        <span style="color:#111827;font-weight:400">(tối đa 5 ảnh, mỗi ảnh ≤ 5MB)</span>
      </label>

      <div id="af-dropzone"
        onclick="document.getElementById('af-fileInput').click()"
        ondragover="handleDragOver(event)"
        ondragleave="handleDragLeave(event)"
        ondrop="handleDrop(event)"
        style="border:2px dashed #e2e8f0;border-radius:10px;padding:28px;
               text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s;
               margin-bottom:12px">
        <div style="font-size:2rem;margin-bottom:8px">🖼️</div>
        <div style="font-size:13px;color:#111827">
          Kéo thả ảnh vào đây hoặc
          <span style="color:#ff2d55;font-weight:700">click để chọn</span>
        </div>
        <div style="font-size:11px;color:#111827;margin-top:4px">JPG, PNG, WEBP, GIF</div>
      </div>

      <input type="file" id="af-fileInput" accept="image/*" multiple
             style="display:none" onchange="handleFileSelect(event)">

      <div id="af-preview" style="display:flex;flex-wrap:wrap;gap:10px;min-height:0">
        ${existingImages}
      </div>
      <div id="af-uploadStatus" style="font-size:12px;color:#111827;margin-top:8px"></div>
    </div>

    <button type="button" onclick="saveAct(${data.activityID || 0})"
      class="btn-primary w-100" style="padding:11px;margin-top:4px;font-size:15px">
      <i class="fa-solid fa-floppy-disk"></i>
      ${data.activityID ? 'Cập nhật hoạt động' : 'Tạo hoạt động'}
    </button>
  `, null);

  window._actImageUrls = data.image
    ? [...data.image]
    : (data.images ? [...data.images] : []);

  initActivityDatePickers();
}

function openActModalForEdit(activityData) {
  openActModal({
    activityID: activityData.activityID,
    activityName: activityData.activityName,
    description: activityData.description,
    location: activityData.location,
    maxParticipants: activityData.maxParticipants,
    time: activityData.time,
    status: activityData.status,
    registrationOpenDate: activityData.registrationOpenDate,
    registrationDeadLine: activityData.registrationDeadLine,
    image: activityData.image || activityData.images || [],
  });
}

async function saveAct(id) {
  const timeInput = document.getElementById('af-time')?.value;
  const deadlineInput = document.getElementById('af-reg-deadline')?.value;
  const openInput = document.getElementById('af-reg-open')?.value;

  const timeVal = parseDisplayDateTime(timeInput);
  const deadlineVal = parseDisplayDateTime(deadlineInput);
  const openVal = parseDisplayDateTime(openInput);
  const nameEl = document.getElementById('af-name');

  if (!nameEl?.value.trim()) {
    Toast.error('Vui lòng nhập tên hoạt động');
    return;
  }
  if (!timeVal) {
    Toast.error('Vui lòng chọn thời gian diễn ra đúng định dạng dd/mm/yyyy hh:mm');
    return;
  }
  if (openInput && !openVal) {
    Toast.error('Ngày mở đăng ký sai định dạng dd/mm/yyyy hh:mm');
    return;
  }
  if (deadlineInput && !deadlineVal) {
    Toast.error('Hạn chót đăng ký sai định dạng dd/mm/yyyy hh:mm');
    return;
  }

  const d = {
    activityName: nameEl.value.trim(),
    description: document.getElementById('af-desc')?.value.trim() || null,
    location: document.getElementById('af-loc')?.value.trim() || null,
    maxParticipants: parseInt(document.getElementById('af-max')?.value) || null,
    time: timeVal,
    registrationOpenDate: openVal,
    registrationDeadLine: deadlineVal,
    status: document.getElementById('af-st')?.value || 'Open',
    imageUrls: window._actImageUrls || [],
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

async function toggleActivityStatus(activityId, newStatus) {
  const msgs = {
    Closed: { confirm: 'Khóa hoạt động? Người dùng sẽ không thể đăng ký.', success: 'Đã khóa hoạt động' },
    Open: { confirm: 'Mở lại hoạt động? Người dùng có thể đăng ký.', success: 'Đã mở hoạt động' },
  };
  const m = msgs[newStatus];
  if (!m || !confirm(m.confirm)) return;

  try {
    const cur = (await API.getActivity(activityId)).data;
    await API.updateActivity(activityId, {
      activityName: cur.activityName,
      description: cur.description || null,
      location: cur.location || null,
      maxParticipants: cur.maxParticipants || null,
      time: cur.time,
      registrationOpenDate: cur.registrationOpenDate || null,
      registrationDeadLine: cur.registrationDeadLine || null,
      status: newStatus,
      imageUrls: cur.image || [],
    });
    Toast.success(m.success);
    loadActivitiesAdmin();
    if (typeof loadStats === 'function') loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

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

function renderPreviewItem(url, index) {
  const src = url.startsWith('http') ? url : `http://localhost:5190${url}`;
  const uniqueId = `img-wrap-${Date.now()}-${index}`;
  return `
    <div id="${uniqueId}" style="position:relative;width:90px;height:90px;
         border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;flex-shrink:0">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover">
      <button onclick="removeImage('${url}', '${uniqueId}')"
        style="position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;
               background:rgba(0,0,0,0.7);border:none;color:white;font-size:11px;
               cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">✕</button>
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
  if (dz) {
    dz.style.borderColor = '#ff2d55';
    dz.style.background = 'rgba(255,45,85,0.05)';
  }
}

function handleDragLeave(e) {
  const dz = document.getElementById('af-dropzone');
  if (dz) {
    dz.style.borderColor = '#e2e8f0';
    dz.style.background = 'transparent';
  }
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
  if (remaining <= 0) {
    Toast.error('Đã đủ 5 ảnh, vui lòng xóa bớt trước');
    return;
  }

  const toUpload = files.slice(0, remaining);
  if (files.length > remaining) Toast.info(`Chỉ upload thêm ${remaining} ảnh`);

  const status = document.getElementById('af-uploadStatus');
  if (status) status.innerHTML = `<span style="color:#f59e0b">⏳ Đang upload ${toUpload.length} ảnh...</span>`;

  let successCount = 0;

  for (const file of toUpload) {
    if (file.size > 5 * 1024 * 1024) {
      Toast.error(`"${file.name}" quá 5MB`);
      continue;
    }

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

function attachActivityTableListeners() {
  document.querySelectorAll('.act-name-link').forEach(el => {
    el.onclick = function() {
      showActivityDetail(parseInt(this.dataset.id));
    };
  });

  document.querySelectorAll('.act-edit-btn').forEach(el => {
    el.onclick = async function() {
      const id = parseInt(this.dataset.id);
      try {
        const r = await API.getActivity(id);
        openActModal(r.data);
      } catch (e) {
        Toast.error(e.message);
      }
    };
  });
}

window.loadActivitiesAdmin = loadActivitiesAdmin;
window.changeActivityAdminPage = changeActivityAdminPage;
window.searchActivitiesAdmin = searchActivitiesAdmin;
window.openActModal = openActModal;
window.openActModalForEdit = openActModalForEdit;
window.saveAct = saveAct;
window.toggleActivityStatus = toggleActivityStatus;
window.deleteActivity = deleteActivity;
window.removeImage = removeImage;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleFileSelect = handleFileSelect;
window.uploadImages = uploadImages;
window.renderPreviewItem = renderPreviewItem;
