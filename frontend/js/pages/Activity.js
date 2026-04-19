// ================================================
// Activity.js — FIXED VERSION
// Fixes:
// 1. a.registrationDeadline → a.registrationDeadLine (chữ L hoa)
// 2. Thêm hiển thị openDate và deadline trong card
// 3. Hiển thị chip "Đã đăng ký" rõ ràng hơn
// ================================================

let allActivities = [];
let currentPage = 1;
const PAGE_SIZE = 9;
let userRegistrations = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  updateNavbar();
  await loadActivities();
});

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

function renderActivities() {
  const keyword = (document.getElementById('searchAct')?.value || '').toLowerCase().trim();
  const status = document.getElementById('statusFilter')?.value || '';

  let filtered = allActivities.filter(a => {
    const matchKw = !keyword ||
      a.activityName?.toLowerCase().includes(keyword) ||
      a.description?.toLowerCase().includes(keyword) ||
      a.location?.toLowerCase().includes(keyword);
    const matchSt = !status || a.status === status;
    return matchKw && matchSt;
  });

  const label = document.getElementById('countLabel');
  if (label) label.textContent = `${filtered.length} hoạt động`;

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

function renderCard(a) {
  const pct = a.maxParticipants
    ? Math.min(100, Math.round((a.registeredCount / a.maxParticipants) * 100))
    : 0;
  const isFull = a.maxParticipants && a.registeredCount >= a.maxParticipants;
  const hasRegistered = userRegistrations.get(a.activityID) === true;

  const now = new Date();
  // FIX: a.registrationDeadLine (chữ L HOA) — đây là lỗi trong bản gốc dùng lowercase
  const deadline = a.registrationDeadLine ? new Date(a.registrationDeadLine) : null;
  const openDate = a.registrationOpenDate ? new Date(a.registrationOpenDate) : null;
  const isDeadlinePassed = deadline && deadline <= now;
  const isNotOpenYet = openDate && openDate > now;
  const isDeadlineNear = deadline && !isDeadlinePassed && (deadline - now) < 24 * 60 * 60 * 1000;

  // Ảnh thumbnail
  const firstImage = a.image && a.image.length > 0 ? a.image[0] : null;
  const imageHtml = firstImage
    ? `<img src="${firstImage.startsWith('http') ? firstImage : 'http://localhost:5190' + firstImage}"
           style="width:100%;height:140px;object-fit:cover;border-radius:8px 8px 0 0"
           onerror="this.style.display='none';this.nextSibling.style.display='flex'">
       <div style="display:none;width:100%;height:140px;background:linear-gradient(135deg,#1e293b,#0f172a);
                   align-items:center;justify-content:center;font-size:2rem;border-radius:8px 8px 0 0">🎯</div>`
    : `<div style="width:100%;height:140px;background:linear-gradient(135deg,#1e293b,#0f172a);
                  display:flex;align-items:center;justify-content:center;font-size:2rem;border-radius:8px 8px 0 0">🎯</div>`;

  // ── Khối thông tin đăng ký (NEW) ──────────────────────────────────────────
  let regInfoHtml = '';

  // Chỉ hiển thị block nếu có ít nhất một trong hai field
  if (openDate || deadline || a.maxParticipants) {
    let openRow = '';
    if (openDate) {
      if (isNotOpenYet) {
        openRow = `<div style="display:flex;align-items:center;gap:6px;font-size:11px">
          <span style="color:#64748b"><i class="fa-solid fa-clipboard-check" style="color: rgb(5, 237, 166);"></i></span>
          <span style="min-width:70px">Mở đăng ký: </span>
          <span style="color:  rgb(116, 192, 252)";font-weight:600">${Utils.formatDateTime(a.registrationOpenDate)}</span>
          <span style="font-size:10px;color:#60a5fa;background:rgba(59,130,246,.1);padding:1px 5px;border-radius:4px">chưa mở</span>
        </div>`;
      } else {
        openRow = `<div style="display:flex;align-items:center;gap:6px;font-size:11px">
          <span style="color:#22c55e"><i class="fa-solid fa-clipboard-check" style="color: rgb(5, 237, 166);"></i></span>
          <span style="min-width:70px">Mở đăng ký: </span>
          <span style="color:#4ade80">${Utils.formatDateTime(a.registrationOpenDate)}</span>
        </div>`;
      }
    }

    let deadlineRow = '';
    if (deadline) {
      if (isDeadlinePassed) {
        deadlineRow = `<div style="display:flex;align-items:center;gap:6px;font-size:11px">
          <span style="color:#ff6b84"><i class="fa-solid fa-calendar-xmark" style="color: rgb(243, 0, 15);"></i></span>
          <span style=";min-width:70px">Hạn đăng ký</span>
          <span style="color:#ff6b84;font-weight:600">${Utils.formatDateTime(a.registrationDeadLine)}</span>
          <span style="font-size:10px;color:#ff6b84;background:rgba(255,45,85,.1);padding:1px 5px;border-radius:4px">Quá hạn đăng ký</span>
        </div>`;
      } else if (isDeadlineNear) {
        deadlineRow = `<div style="display:flex;align-items:center;gap:6px;font-size:11px">
          <span style="color:#f59e0b"><i class="fa-solid fa-calendar-xmark" style="color: rgb(243, 0, 15);"></i></span>
          <span style="min-width:70px">Hạn đăng ký: </span>
          <span style="color:#f59e0b;font-weight:600">${Utils.formatDateTime(a.registrationDeadLine)}</span>
          <span style="font-size:10px;color:#f59e0b;background:rgba(245,158,11,.1);padding:1px 5px;border-radius:4px">sắp hết hạn </span>
        </div>`;
      } else {
        deadlineRow = `<div style="display:flex;align-items:center;gap:6px;font-size:11px">
          <span style="color:#ff6b84"><i class="fa-solid fa-calendar-xmark" style="color: rgb(243, 0, 15);"></i></span>
          <span style="min-width:70px">Hạn đăng ký: </span>
          <span style="">${Utils.formatDateTime(a.registrationDeadLine)}</span>
        </div>`;
      }
    }

    // Progress bar số lượng
    let countRow = '';
    if (a.maxParticipants) {
      const pctColor = pct >= 90 ? '#ff2d55' : pct >= 70 ? '#f59e0b' : '#3b82f6';
      countRow = `
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px">
          <span><i class="fa-solid fa-user-group"></i> ${a.registeredCount} / ${a.maxParticipants} người</span>
          <span style="color:${pctColor}">${pct}%</span>
        </div>
        <div style="height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;margin-top:3px">
          <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:2px"></div>
        </div>`;
    } else {
      countRow = `<div style="font-size:11px;margin-top:4px">
        <i class="fa-solid fa-user-group"></i> ${a.registeredCount} người đã đăng ký
      </div>`;
    }

    if (openRow || deadlineRow) {
      regInfoHtml = `
        <div style="background:#0f172a;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;
                    gap:5px;border:1px solid rgba(255,255,255,0.05);margin-top:4px">
          ${openRow}${deadlineRow}
          ${countRow}
        </div>`;
    } else {
      regInfoHtml = `<div style="margin-top:4px">${countRow}</div>`;
    }
  } else {
    regInfoHtml = `<div style="font-size:12px;margin:6px 0">
      <i class="fa-solid fa-user-group"></i> ${a.registeredCount} người đăng ký
    </div>`;
  }

  // ── Nút hành động ────────────────────────────────────────────────────────
  let actionBtn = '';
  if (hasRegistered) {
    actionBtn = `<button onclick="event.stopPropagation(); cancelRegistration(${a.activityID}, this)"
                   class="btn-outline" style="padding:8px 14px;font-size:13px;background:rgba(255,45,85,.1);border-color:#ff2d55;color:#ff2d55">
                  <i class="fa-solid fa-xmark"></i> Hủy đăng ký
                </button>`;
  } else if (a.status === 'Open' && !isFull && !isDeadlinePassed && !isNotOpenYet) {
    if (Auth.isLoggedIn()) {
      actionBtn = `<button onclick="event.stopPropagation(); registerActivity(${a.activityID}, this)"
                     class="btn-primary" style="padding:8px 14px;font-size:13px">
                    <i class="fa-solid fa-check"></i> Đăng ký
                  </button>`;
    } else {
      actionBtn = `<button onclick="event.stopPropagation(); AuthModal.open('login')"
                     class="btn-outline" style="padding:8px 14px;font-size:13px">
                    Đăng nhập
                  </button>`;
    }
  } else if (isNotOpenYet) {
    actionBtn = `<span style="padding:7px 10px;font-size:13px;color:#60a5fa;background:rgba(59,130,246,.1);border-radius:6px;border:1px solid rgba(59,130,246,.2)"><i class="fa-solid fa-hourglass-start" style="color: rgb(116, 192, 252);"></i> Chưa mở đăng ký</span>`;
  } else if (isFull) {
    actionBtn = `<span class="badge badge-inactive" style="padding:7px 10px">Đủ chỗ</span>`;
  } else if (a.status === 'Closed' || isDeadlinePassed) {
    actionBtn = `<span class="badge badge-closed" style="padding:7px 10px">Đã đóng</span>`;
  } else if (a.status === 'Cancelled') {
    actionBtn = `<span class="badge badge-inactive" style="padding:7px 10px">Đã hủy</span>`;
  }

  return `
  <div class="card" style="cursor:pointer;overflow:hidden" onclick="showActivityDetail(${a.activityID})">
    ${imageHtml}
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        ${Utils.statusLabel(a.status)}
        ${hasRegistered ? `<span style="font-size:11px;color:#22c55e;background:rgba(34,197,94,.1);
            padding:2px 7px;border-radius:4px;border:1px solid rgba(34,197,94,.2)">
            ✓ Đã đăng ký</span>` : ''}
      </div>
      <div class="card-title">${Utils.escapeHtml(a.activityName)}</div>
      <div class="card-desc">${Utils.truncate(a.description || 'Không có mô tả', 90)}</div>

      ${regInfoHtml}

      <div class="card-meta" style="margin-top:8px">
        <span><i class="fa-solid fa-calendar-days"></i> ${Utils.formatDateTime(a.time)}</span>
        <span><i class="fa-solid fa-location-dot"></i> ${Utils.escapeHtml(a.location || 'TBD')}</span>
      </div>
    </div>
    <div class="card-footer" onclick="event.stopPropagation()">
      <button onclick="showActivityDetail(${a.activityID})" class="btn-outline" style="flex:1;padding:8px;font-size:13px">
        <i class="fa-solid fa-info-circle"></i> Chi tiết
      </button>
      ${actionBtn}
    </div>
  </div>`;
}

// Hàm hủy đăng ký
async function cancelRegistration(activityId, btn) {
  if (!confirm('Bạn có chắc muốn hủy đăng ký hoạt động này?')) return;
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

// Hàm đăng ký
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

function renderPagination(totalPages) {
  removePagination();
  if (totalPages <= 1) return;

  const wrap = document.createElement('div');
  wrap.id = 'pagination';
  wrap.style.cssText = 'display:flex;justify-content:center;gap:8px;margin-top:36px';

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.style.cssText = `padding:7px 13px;border-radius:6px;border:1px solid ${i === currentPage ? '#ff2d55' : 'rgba(255,255,255,0.1)'};
      background:${i === currentPage ? 'rgba(255,45,85,0.15)' : 'transparent'};
      color:${i === currentPage ? '#ff2d55' : '#64748b'};cursor:pointer;font-size:13px`;
    btn.onclick = () => { currentPage = i; renderActivities(); window.scrollTo({ top: 400, behavior: 'smooth' }); };
    wrap.appendChild(btn);
  }

  document.getElementById('actGrid').after(wrap);
}

function removePagination() {
  document.getElementById('pagination')?.remove();
}

function clearFilter() {
  document.getElementById('searchAct').value = '';
  document.getElementById('statusFilter').value = '';
  currentPage = 1;
  renderActivities();
}

window.cancelRegistration = cancelRegistration;
window.registerActivity = registerActivity;