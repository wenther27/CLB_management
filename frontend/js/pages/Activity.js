

let allActivities = [];
let currentPage = 1;
const PAGE_SIZE = 9;
let userRegistrations = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  updateNavbar();
  await loadActivities();
});



// ── Kiểm tra đăng ký ────────────────────────────────────────────────────────
async function checkUserRegistrations(activities) {
  if (!Auth.isLoggedIn()) { userRegistrations.clear(); return; }
  try {
    const results = await Promise.all(
      activities.map(async (act) => {
        try {
          const r = await API.hasRegistered(act.activityID);
          return { id: act.activityID, registered: r.data === true };
        } catch {
          return { id: act.activityID, registered: false };
        }
      })
    );
    userRegistrations.clear();
    results.forEach(r => userRegistrations.set(r.id, r.registered));
  } catch (e) {
    console.error('Error checking registrations:', e);
  }
}

// ── Load activities ──────────────────────────────────────────────────────────
async function loadActivities() {
  try {
    const r = await API.getActivities();
    allActivities = r.data?.items || [];
    window.allActivities = allActivities;
    await checkUserRegistrations(allActivities);
    renderActivities();
  } catch (e) {
    document.getElementById('actGrid').innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <div class="ico">⚠️</div>
        <p style="color:#ff2d55">${e.message}</p>
        <button class="btn-outline" style="margin-top:12px" onclick="loadActivities()">🔄 Thử lại</button>
      </div>`;
  }
}

// ── Render danh sách ─────────────────────────────────────────────────────────
function renderActivities() {
  const keyword = (document.getElementById('searchAct')?.value || '').toLowerCase().trim();
  const status  = document.getElementById('statusFilter')?.value || '';

  let filtered = allActivities.filter(a => {
    const matchKw = !keyword ||
      a.activityName?.toLowerCase().includes(keyword) ||
      a.description?.toLowerCase().includes(keyword) ||
      a.location?.toLowerCase().includes(keyword);
    const matchSt = !status || a.status === status;
    return matchKw && matchSt;
  });

  const label = document.getElementById('countLabel');
  if (label) label.textContent = filtered.length + ' hoạt động';

  const grid = document.getElementById('actGrid');

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <div class="ico">🔍</div>
        <p>Không tìm thấy hoạt động phù hợp</p>
        <button class="btn-outline" style="margin-top:12px" onclick="clearFilter()">Xóa bộ lọc</button>
      </div>`;
    removePagination();
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = 1;
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  grid.innerHTML = paged.map(a => renderCard(a)).join('');
  renderPagination(totalPages);
}

// ── Render một card ──────────────────────────────────────────────────────────
function renderCard(a) {
  const now      = new Date();
  const deadline = a.registrationDeadLine ? new Date(a.registrationDeadLine) : null;
  const openDate = a.registrationOpenDate ? new Date(a.registrationOpenDate) : null;
  const actTime  = a.time                 ? new Date(a.time)                 : null;

  const isDeadlinePassed = deadline && deadline <= now;
  const isNotOpenYet     = openDate && openDate > now;
  const isDeadlineNear   = deadline && !isDeadlinePassed && (deadline - now) < 24 * 60 * 60 * 1000;
  const isEventEnded     = actTime && actTime <= now;

  const pct    = a.maxParticipants ? Math.min(100, Math.round((a.registeredCount / a.maxParticipants) * 100)) : 0;
  const isFull = a.maxParticipants && a.registeredCount >= a.maxParticipants;
  const hasRegistered = userRegistrations.get(a.activityID) === true;

  // Thumbnail
  const firstImage = a.image && a.image.length > 0 ? a.image[0] : null;
  const thumbHtml = firstImage
    ? '<img src="' + (firstImage.startsWith('http') ? firstImage : 'http://localhost:5190' + firstImage) + '"'
      + ' alt="' + Utils.escapeHtml(a.activityName) + '"'
      + ' onerror="this.parentElement.innerHTML=\'<div class=act-card-thumb-placeholder>🎯</div>\'">'
    : '<div class="act-card-thumb-placeholder">🎯</div>';

  // Status badge
  let statusCls, statusIcon, statusText;
  if (isEventEnded) {
    statusCls = 'ended'; statusIcon = 'flag-checkered'; statusText = 'Kết thúc';
  } else if (a.status === 'Open') {
    statusCls = 'open'; statusIcon = 'circle-check'; statusText = 'Đang mở';
  } else if (a.status === 'Cancelled') {
    statusCls = 'cancelled'; statusIcon = 'circle-xmark'; statusText = 'Đã hủy';
  } else {
    statusCls = 'closed'; statusIcon = 'lock'; statusText = 'Đã đóng';
  }

  // Khối thời gian đăng ký
  let openRow = '';
  if (openDate) {
    const cls   = isNotOpenYet ? 'future' : '';
    const badge = isNotOpenYet ? '<span class="act-reg-badge future">chưa mở</span>' : '';
    openRow = '<div class="act-reg-row">'
      + '<span class="icon"><i class="fa-solid fa-calendar-check" style="color:#16a34a;font-size:11px"></i></span>'
      + '<span class="act-reg-label">Mở đăng ký:</span>'
      + '<span class="act-reg-value ' + cls + '">' + Utils.formatDateTime(a.registrationOpenDate) + badge + '</span>'
      + '</div>';
  }

  let deadlineRow = '';
  if (deadline) {
    const cls   = isDeadlinePassed ? 'expired' : isDeadlineNear ? 'near' : '';
    const badge = isDeadlinePassed
      ? '<span class="act-reg-badge expired">hết hạn</span>'
      : isDeadlineNear ? '<span class="act-reg-badge near">sắp hết hạn</span>' : '';
    deadlineRow = '<div class="act-reg-row">'
      + '<span class="icon"><i class="fa-solid fa-calendar-xmark" style="color:#dc2626;font-size:11px"></i></span>'
      + '<span class="act-reg-label">Hạn đăng ký:</span>'
      + '<span class="act-reg-value ' + cls + '">' + Utils.formatDateTime(a.registrationDeadLine) + badge + '</span>'
      + '</div>';
  }

  const regInfoHtml = (openRow || deadlineRow)
    ? '<div class="act-reg-info">' + openRow + deadlineRow + '</div>'
    : '';

  // Progress
  let progressHtml = '';
  if (a.maxParticipants) {
    const pctColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#2563eb';
    progressHtml = '<div class="act-progress-wrap">'
      + '<div class="act-progress-label">'
      + '<span><i class="fa-solid fa-user-group" style="color:#94a3b8"></i> ' + a.registeredCount + ' / ' + a.maxParticipants + ' người</span>'
      + '<span class="pct' + (pct >= 80 ? ' high' : '') + '">' + pct + '%</span>'
      + '</div>'
      + '<div class="act-progress-bar"><div class="act-progress-fill" style="width:' + pct + '%;background:' + pctColor + '"></div></div>'
      + '</div>';
  } else {
    progressHtml = '<div style="font-size:12px;color:#374151;font-weight:500;margin-bottom:12px">'
      + '<i class="fa-solid fa-user-group"></i> ' + a.registeredCount + ' người đã đăng ký</div>';
  }

  // Nút hành động
  let actionBtn = '';
  if (hasRegistered) {
    if (isEventEnded || a.status === 'Cancelled') {
      actionBtn = '<span class="act-status-tag ended"><i class="fa-solid fa-flag-checkered"></i> Đã kết thúc</span>';
    } else {
      actionBtn = '<button class="btn-act-cancel" onclick="event.stopPropagation(); cancelRegistration(' + a.activityID + ', this)">'
  + '<i class="fa-solid fa-xmark"></i> Hủy đăng ký</button>';
    }
  } else if (isEventEnded) {
    actionBtn = '<span class="act-status-tag ended"><i class="fa-solid fa-flag-checkered"></i> Đã kết thúc</span>';
  } else if (a.status === 'Open' && !isFull && !isDeadlinePassed && !isNotOpenYet) {
    if (Auth.isLoggedIn()) {
      actionBtn = '<button class="btn-act-register" onclick="event.stopPropagation(); registerActivity(' + a.activityID + ', this)">'
        + '<i class="fa-solid fa-person-circle-plus"></i> Đăng ký</button>';
    } else {
      actionBtn = '<button class="btn-act-register" onclick="event.stopPropagation(); AuthModal.open(\'login\')">'
        + '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập</button>';
    }
  } else if (isNotOpenYet) {
    actionBtn = '<span class="act-status-tag not-open"><i class="fa-solid fa-hourglass-start"></i> Chưa mở đăng ký</span>';
  } else if (isFull) {
    actionBtn = '<span class="act-status-tag full"><i class="fa-solid fa-ban"></i> Đã đủ chỗ</span>';
  } else if (a.status === 'Closed' || isDeadlinePassed) {
    actionBtn = '<span class="act-status-tag closed"><i class="fa-solid fa-lock"></i> Đã đóng đăng ký</span>';
  } else if (a.status === 'Cancelled') {
    actionBtn = '<span class="act-status-tag cancelled"><i class="fa-solid fa-circle-xmark"></i> Đã hủy</span>';
  }

  return '<div class="act-card" onclick="showActivityDetail(' + a.activityID + ')">'
    + '<div class="act-card-thumb">'
    + thumbHtml
    + '<div class="act-status-badge act-status-' + statusCls + '">'
    + '<i class="fa-solid fa-' + statusIcon + '" style="font-size:9px"></i> ' + statusText
    + '</div>'
    + (hasRegistered ? '<div class="act-registered-chip"><i class="fa-solid fa-check"></i> Đã đăng ký</div>' : '')
    + '</div>'
    + '<div class="act-card-body">'
    + '<div class="act-card-title">' + Utils.escapeHtml(a.activityName) + '</div>'
    + '<div class="act-card-desc">' + Utils.truncate(a.description || 'Không có mô tả', 90) + '</div>'
    + regInfoHtml
    + progressHtml
    + '<div class="act-card-meta">'
    + '<span><i class="fa-solid fa-calendar-days"></i> ' + Utils.formatDateTime(a.time) + '</span>'
    + '<span><i class="fa-solid fa-location-dot"></i> ' + Utils.escapeHtml(a.location || 'TBD') + '</span>'
    + '</div>'
    + '</div>'
    + '<div class="act-card-footer" onclick="event.stopPropagation()">'
    + '<button class="btn-act-detail" onclick="showActivityDetail(' + a.activityID + ')">'
    + '<i class="fa-solid fa-circle-info"></i> Chi tiết</button>'
    + actionBtn
    + '</div>'
    + '</div>';
}

// ── Hủy đăng ký ─────────────────────────────────────────────────────────────
async function cancelRegistration(activityId, btn) {
  const ok = await showAppConfirm({
    title: 'Hủy đăng ký hoạt động?',
    message: 'Bạn sẽ không còn trong danh sách tham gia hoạt động này.',
    confirmText: 'Hủy đăng ký',
    cancelText: 'Giữ lại',
    danger: true
  });
  if (!ok) return;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    await API.cancelRegistration(activityId);
    Toast.success('Hủy đăng ký thành công');
    const act = allActivities.find(a => a.activityID === activityId);
    if (act) act.registeredCount = Math.max(0, (act.registeredCount || 0) - 1);
    userRegistrations.set(activityId, false);
    renderActivities();
  } catch (e) {
    Toast.error(e.message || 'Hủy đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ── Đăng ký ──────────────────────────────────────────────────────────────────
async function registerActivity(id, btn) {
  if (!Auth.isLoggedIn()) {
    Toast.info('Vui lòng đăng nhập để đăng ký');
    setTimeout(() => AuthModal.open('login'), 700);
    return;
  }
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    await API.register(id);
    Toast.success('Đăng ký tham gia thành công! 🎉');
    const act = allActivities.find(a => a.activityID === id);
    if (act) act.registeredCount = (act.registeredCount || 0) + 1;
    userRegistrations.set(id, true);
    renderActivities();
  } catch (e) {
    Toast.error(e.message || 'Đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ── Phân trang ───────────────────────────────────────────────────────────────
function renderPagination(totalPages) {
  removePagination();
  if (totalPages <= 1) return;

  const wrap = document.createElement('div');
  wrap.id = 'pagination';
  wrap.style.cssText = 'display:flex;justify-content:center;gap:8px;margin-top:36px;flex-wrap:wrap';

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    const isActive = i === currentPage;
    btn.style.cssText = 'padding:7px 14px;border-radius:8px;'
      + 'border:1px solid ' + (isActive ? '#e8213a' : '#e2e8f0') + ';'
      + 'background:' + (isActive ? '#fef2f4' : '#ffffff') + ';'
      + 'color:' + (isActive ? '#e8213a' : '#111827') + ';'
      + 'cursor:pointer;font-size:13px;font-weight:' + (isActive ? '700' : '500') + ';'
      + "font-family:'Be Vietnam Pro',Arial,sans-serif;transition:all 0.2s;";
    btn.onmouseover = () => { if (i !== currentPage) { btn.style.borderColor = '#e8213a'; btn.style.color = '#e8213a'; } };
    btn.onmouseout  = () => { if (i !== currentPage) { btn.style.borderColor = '#e2e8f0'; btn.style.color = '#111827'; } };
    btn.onclick = () => { currentPage = i; renderActivities(); window.scrollTo({ top: 400, behavior: 'smooth' }); };
    wrap.appendChild(btn);
  }

  document.getElementById('actGrid').after(wrap);
}

function removePagination() {
  document.getElementById('pagination')?.remove();
}

function clearFilter() {
  const s = document.getElementById('searchAct');
  const f = document.getElementById('statusFilter');
  if (s) s.value = '';
  if (f) f.value = '';
  currentPage = 1;
  renderActivities();
}

window.cancelRegistration = cancelRegistration;
window.registerActivity   = registerActivity;
