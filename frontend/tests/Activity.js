// ================================================
// activity.js - Trang danh sách & chi tiết hoạt động
// CLB CTXH DUT
// ================================================

let allActivities = [];   // Cache toàn bộ danh sách
let currentPage = 1;
const PAGE_SIZE = 9;



// ── Khởi động ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateNavbar();
  await loadActivities();

  // Đóng modal khi click nền
  document.getElementById('detailModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
});

// ── Load dữ liệu từ API ───────────────────────────────────────────────────────
async function loadActivities() {
  try {
    const r = await API.getActivities();
    allActivities = r.data?.items || [];
    renderActivities();
  } catch (e) {
    document.getElementById('actGrid').innerHTML =
      `<div class="empty" style="grid-column:1/-1">
        <div class="ico">⚠️</div>
        <p style="color:#ff2d55">${e.message}</p>
        <button class="btn-outline" style="margin-top:12px" onclick="loadActivities()">🔄 Thử lại</button>
      </div>`;
  }
}

// ── Render danh sách (filter + phân trang client-side) ───────────────────────
function renderActivities() {
  const keyword = (document.getElementById('searchAct')?.value || '').toLowerCase().trim();
  const status  = document.getElementById('statusFilter')?.value || '';

  // Filter
  let filtered = allActivities.filter(a => {
    const matchKw = !keyword ||
      a.activityName?.toLowerCase().includes(keyword) ||
      a.description?.toLowerCase().includes(keyword) ||
      a.location?.toLowerCase().includes(keyword);
    const matchSt = !status || a.status === status;
    return matchKw && matchSt;
  });

  // Cập nhật label số kết quả
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

  // Phân trang
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = 1;
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  grid.innerHTML = paged.map(a => renderCard(a)).join('');
  renderPagination(totalPages);
}

// ── Render một card hoạt động ─────────────────────────────────────────────────
function renderCard(a) {
  const pct = a.maxParticipants
    ? Math.min(100, Math.round((a.registeredCount / a.maxParticipants) * 100))
    : 0;
  const isFull = a.maxParticipants && a.registeredCount >= a.maxParticipants;

  // Lấy ảnh đầu tiên (nếu có)
  const firstImage = a.image && a.image.length > 0 ? a.image[0] : null;
  const imageHtml = firstImage 
    ? `<img src="${firstImage.startsWith('http') ? firstImage : 'http://localhost:5190' + firstImage}" 
         style="width:100%;height:140px;object-fit:cover;border-radius:8px 8px 0 0" 
         onerror="this.style.display='none';this.nextSibling.style.display='flex'">
       <div style="display:none;width:100%;height:140px;background:linear-gradient(135deg,#1e293b,#0f172a);
                   align-items:center;justify-content:center;font-size:2rem;border-radius:8px 8px 0 0">
       
       </div>`
    : `<div style="width:100%;height:140px;background:linear-gradient(135deg,#1e293b,#0f172a);
                  display:flex;align-items:center;justify-content:center;font-size:2rem;border-radius:8px 8px 0 0">
    
       </div>`;

  // Nút đăng ký (giữ nguyên)
  let regBtn = '';
  if (a.status === 'Open' && !isFull) {
    if (Auth.isLoggedIn()) {
      regBtn = `<button onclick="registerActivity(${a.activityID}, this)" class="btn-primary" style="padding:8px 14px;font-size:13px">Đăng ký</button>`;
    } else {
      regBtn = `<button onclick="location.href='login.html'" class="btn-outline" style="padding:8px 14px;font-size:13px">Đăng nhập để đăng ký</button>`;
    }
  } else if (isFull) {
    regBtn = `<span class="badge badge-inactive" style="padding:8px 12px">Đã đủ chỗ</span>`;
  }

  return `
  <div class="card" style="cursor:pointer;overflow:hidden" onclick="openDetail(${a.activityID})">
    ${imageHtml}
    <div class="card-body">
      ${Utils.statusLabel(a.status)}
      <div class="card-title">${Utils.escapeHtml(a.activityName)}</div>
      <div class="card-desc">${Utils.truncate(a.description || 'Không có mô tả', 100)}</div>

      ${a.maxParticipants ? `
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin:8px 0 4px">
          <span><i class="fa-solid fa-user-group"></i> ${a.registeredCount} / ${a.maxParticipants} người</span>
          <span style="color:${pct >= 80 ? '#ff2d55' : '#64748b'}">${pct}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct >= 80 ? '#ff2d55' : '#3b82f6'}"></div></div>
      ` : `<div style="font-size:12px;color:#64748b;margin:8px 0"><i class="fa-solid fa-user-group"></i> ${a.registeredCount} người đăng ký</div>`}

      <div class="card-meta" style="margin-top:10px">
        <span><i class="fa-solid fa-calendar-days"></i> ${Utils.formatDateTime(a.time)}</span>
        <span><i class="fa-solid fa-location-dot"></i> ${Utils.escapeHtml(a.location || 'TBD')}</span>
      </div>
    </div>
    <div class="card-footer" onclick="event.stopPropagation()">
      <button onclick="openDetail(${a.activityID})" class="btn-outline" style="flex:1;padding:8px;font-size:13px">Chi tiết</button>
      ${regBtn}
    </div>
  </div>`;
}
// ── Phân trang ────────────────────────────────────────────────────────────────
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
      color:${i === currentPage ? '#ff2d55' : '#64748b'};cursor:pointer;font-size:13px;font-family:Arial,sans-serif;transition:all 0.2s`;
    btn.onclick = () => { currentPage = i; renderActivities(); window.scrollTo({ top: 400, behavior: 'smooth' }); };
    wrap.appendChild(btn);
  }

  // Chèn sau grid
  document.getElementById('actGrid').after(wrap);
}

function removePagination() {
  document.getElementById('pagination')?.remove();
}

// ── Xóa bộ lọc ────────────────────────────────────────────────────────────────
function clearFilter() {
  document.getElementById('searchAct').value = '';
  document.getElementById('statusFilter').value = '';
  currentPage = 1;
  renderActivities();
}

// ── Mở modal chi tiết ─────────────────────────────────────────────────────────
async function openDetail(id) {
  const modal   = document.getElementById('detailModal');
  const body    = document.getElementById('detailBody');
  body.innerHTML = '<div class="loading" style="padding:60px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  modal.classList.add('open');

  try {
    const r = await API.getActivity(id);
    const a = r.data;
  
    const pct = a.maxParticipants
      ? Math.min(100, Math.round((a.registeredCount / a.maxParticipants) * 100))
      : 0;
    const isFull = a.maxParticipants && a.registeredCount >= a.maxParticipants;
    // Thêm vào sau phần header, trước status + title
const imagesHtml = (a.image && a.image.length > 0) 
  ? `
    <div style="margin-bottom:16px;border-radius:12px;overflow:hidden">
      <div style="display:flex;overflow-x:auto;gap:8px;padding-bottom:8px">
        ${a.image.map(url => `
          <img src="${url.startsWith('http') ? url : 'http://localhost:5190' + url}" 
               style="min-width:100px;height:100px;object-fit:cover;border-radius:8px;cursor:pointer"
               onclick="window.open(this.src)">
        `).join('')}
      </div>
    </div>
  `
  : '';

// Sau đó chèn imagesHtml vào body.innerHTML

    let regSection = '';
    if (a.status === 'Open' && !isFull) {
      if (Auth.isLoggedIn()) {
        regSection = `<button id="modalRegBtn" onclick="registerActivity(${a.activityID}, this, true)"
          class="btn-primary w-100" style="padding:12px;margin-top:4px;font-size:15px">
           Đăng ký tham gia
        </button>`;
      } else {
        regSection = `
          <div style="background:#111827;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;text-align:center;margin-top:8px">
            <p style="color:#94a3b8;font-size:13px;margin-bottom:10px">Đăng nhập để đăng ký tham gia hoạt động</p>
            <button onclick="location.href='login.html'" class="btn-primary" style="padding:9px 20px">Đăng nhập ngay</button>
          </div>`;
      }
    } else if (isFull) {
      regSection = `<div style="text-align:center;padding:12px;background:rgba(255,45,85,0.07);border-radius:8px;border:1px solid rgba(255,45,85,0.15);color:#ff6b84;font-size:13px;margin-top:8px">
        ⛔ Hoạt động đã đủ số lượng người tham gia
      </div>`;
    } else if (a.status === 'Cancelled') {
      regSection = `<div style="text-align:center;padding:12px;background:rgba(100,116,139,0.1);border-radius:8px;border:1px solid rgba(100,116,139,0.2);color:#64748b;font-size:13px;margin-top:8px">
        🚫 Hoạt động đã bị hủy
      </div>`;
    } else if (a.status === 'Closed') {
      regSection = `<div style="text-align:center;padding:12px;background:rgba(100,116,139,0.1);border-radius:8px;border:1px solid rgba(100,116,139,0.2);color:#64748b;font-size:13px;margin-top:8px">
        🔒 Đã đóng đăng ký
      </div>`;
    }

    body.innerHTML = `
      <!-- Header -->
      <div class="modal-header">
        <span style="font-size:1.5rem"></span>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
    
      <img src="${a.image && a.image.length > 0 ? (a.image[0].startsWith('http') ? a.image[0] : 'http://localhost:5190' + a.image[0]) : ''}" 
           style="width:100%;height:280px;object-fit:cover;border-radius:8px;margin-bottom:16px;display:${a.image && a.image.length > 0 ? 'block' : 'none'}"
           onerror="this.style.display='none'">
      <!-- Status + Title -->
      <div style="margin-bottom:6px">${Utils.statusLabel(a.status)}</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:16px;line-height:1.3">
        ${Utils.escapeHtml(a.activityName)}
      </div>

      <!-- Thông tin chính -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
        <div style="background:#111827;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px"><i class="fa-solid fa-calendar-days" style="color: rgb(255, 255, 255);"></i> Thời gian</div>
          <div style="font-size:13px;color:#e2e8f0">${Utils.formatDateTime(a.time)}</div>
        </div>
        <div style="background:#111827;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px"><i class="fa-solid fa-location-dot" style="color: rgb(255, 25, 104);"></i> Địa điểm</div>
          <div style="font-size:13px;color:#e2e8f0">${Utils.escapeHtml(a.location || 'Chưa xác định')}</div>
        </div>
        <div style="background:#111827;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px"><i class="fa-solid fa-user" style="color: rgb(255, 255, 255);"></i> Người tổ chức</div>
          <div style="font-size:13px;color:#e2e8f0">${Utils.escapeHtml(a.creatorName || 'BTC')}</div>
        </div>
        <div style="background:#111827;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px"><i class="fa-solid fa-user-group" style="color: rgb(249, 249, 249);"></i> Đăng ký</div>
          <div style="font-size:13px;color:#e2e8f0">
            ${a.registeredCount}${a.maxParticipants ? ' / ' + a.maxParticipants + ' người' : ' người'}
          </div>
        </div>
      </div>

      <!-- Progress bar nếu có giới hạn -->
      ${a.maxParticipants ? `
        <div style="margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:6px">
            <span>Mức độ đăng ký</span>
            <span style="color:${pct >= 80 ? '#ff2d55' : '#64748b'}">${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;background:${pct >= 80 ? '#ff2d55' : '#3b82f6'}"></div>
          </div>
        </div>
      ` : ''}

      <!-- Mô tả -->
      ${a.description ? `
        <div style="margin-bottom:20px">
          <div style="font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px"><i class="fa-solid fa-clipboard-list" style="color: rgb(255, 255, 255);"></i> Mô tả</div>
          <div style="font-size:14px;color:#94a3b8;line-height:1.75;white-space:pre-wrap">${Utils.escapeHtml(a.description)}</div>
        </div>
      ` : ''}

      <!-- Nút đăng ký -->
      ${regSection}
    `;
  } catch (e) {
    body.innerHTML = `
      <div class="modal-header">
        <span></span>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div style="padding:40px;text-align:center;color:#ff2d55">${e.message}</div>`;
  }
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('open');
}

// ── Đăng ký tham gia hoạt động ────────────────────────────────────────────────
async function registerActivity(id, btn, fromModal = false) {
  if (!Auth.isLoggedIn()) {
    Toast.info('Vui lòng đăng nhập để đăng ký');
    setTimeout(() => location.href = 'login.html', 700);
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Đang xử lý...';

  try {
    await API.register({ activityID: id });
    Toast.success('Đăng ký tham gia thành công! 🎉');

    // Cập nhật UI nút
    btn.textContent = '✓ Đã đăng ký';
    btn.className = 'btn-outline';
    btn.style.cssText = fromModal
      ? 'width:100%;padding:12px;font-size:15px;margin-top:4px;color:#22c55e;border-color:#22c55e'
      : 'padding:8px 14px;font-size:13px;color:#22c55e;border-color:#22c55e';
    btn.onclick = null;

    // Cập nhật cache local
    const act = allActivities.find(a => a.activityID === id);
    if (act) act.registeredCount = (act.registeredCount || 0) + 1;

  } catch (e) {
    Toast.error(e.message);
    btn.disabled = false;
    btn.textContent = originalText;
  }
}