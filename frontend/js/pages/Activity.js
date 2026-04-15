// ================================================
// activity.js - Chỉ xử lý riêng cho trang activities
// ================================================

let allActivities = [];
let currentPage = 1;
const PAGE_SIZE = 9;
let userRegistrations = new Map(); // Lưu trạng thái đăng ký của user

document.addEventListener('DOMContentLoaded', async () => {
  updateNavbar();
  await loadActivities();
});

// Kiểm tra user đã đăng ký các hoạt động chưa
async function checkUserRegistrations(activities) {
    if (!Auth.isLoggedIn()) {
        userRegistrations.clear();
        return;
    }
    
    try {
        const promises = activities.map(async (act) => {
            try {
                const r = await API.hasRegistered(act.activityID);
                return { id: act.activityID, registered: r.data };
            } catch {
                return { id: act.activityID, registered: false };
            }
        });
        
        const results = await Promise.all(promises);
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
    
    // Kiểm tra user đã đăng ký hoạt động nào chưa
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
  const hasRegistered = userRegistrations.get(a.activityID) || false;

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

  // Xác định nút hành động dựa trên trạng thái
  let actionBtn = '';
  
  if (hasRegistered) {
    // Đã đăng ký - hiển thị nút hủy
    actionBtn = `<button onclick="cancelRegistration(${a.activityID}, this)" 
                   class="btn-outline" style="padding:8px 14px;font-size:13px;background:rgba(255,45,85,0.1);border-color:#ff2d55;color:#ff2d55">
                    <i class="fa-solid fa-xmark"></i> Hủy đăng ký
                  </button>`;
  } else if (a.status === 'Open' && !isFull) {
    // Chưa đăng ký và hoạt động đang mở
    if (Auth.isLoggedIn()) {
      actionBtn = `<button onclick="registerActivity(${a.activityID}, this)" 
                     class="btn-primary" style="padding:8px 14px;font-size:13px">
                      <i class="fa-solid fa-check"></i> Đăng ký
                    </button>`;
    } else {
      actionBtn = `<button onclick="AuthModal.open('login')" 
                     class="btn-outline" style="padding:8px 14px;font-size:13px">
                      Đăng nhập để đăng ký
                    </button>`;
    }
  } else if (isFull) {
    actionBtn = `<span class="badge badge-inactive" style="padding:8px 12px">Đã đủ chỗ</span>`;
  } else if (a.status === 'Closed') {
    actionBtn = `<span class="badge badge-closed" style="padding:8px 12px">Đã đóng đăng ký</span>`;
  } else if (a.status === 'Cancelled') {
    actionBtn = `<span class="badge badge-inactive" style="padding:8px 12px">Đã hủy</span>`;
  }

  return `
  <div class="card" style="cursor:pointer;overflow:hidden" onclick="showActivityDetail(${a.activityID})">
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
      ${hasRegistered ? `<div style="margin-top:8px;font-size:12px;color:#22c55e"><i class="fa-solid fa-check-circle"></i> Bạn đã đăng ký</div>` : ''}
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
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
    
    try {
        await API.cancelRegistration(activityId);
        Toast.success('Hủy đăng ký thành công');
        
        // Cập nhật lại số lượng đăng ký trong cache
        const act = allActivities.find(a => a.activityID === activityId);
        if (act) {
            act.registeredCount = Math.max(0, (act.registeredCount || 0) - 1);
        }
        
        // Cập nhật trạng thái đăng ký của user
        userRegistrations.set(activityId, false);
        
        // Render lại danh sách
        renderActivities();
        
    } catch (e) {
        Toast.error(e.message || 'Hủy đăng ký thất bại');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Cập nhật hàm đăng ký
async function registerActivity(id, btn) {
    if (!Auth.isLoggedIn()) {
        Toast.info('Vui lòng đăng nhập để đăng ký');
        setTimeout(() => AuthModal.open('login'), 700);
        return;
    }

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

    try {
        await API.register(id);
        Toast.success('Đăng ký tham gia thành công! 🎉');
        
        // Cập nhật số lượng đăng ký
        const act = allActivities.find(a => a.activityID === id);
        if (act) {
            act.registeredCount = (act.registeredCount || 0) + 1;
        }
        
        // Cập nhật trạng thái đăng ký
        userRegistrations.set(id, true);
        
        // Render lại danh sách
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
      color:${i === currentPage ? '#ff2d55' : '#64748b'};cursor:pointer;font-size:13px;transition:all 0.2s`;
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

// Export functions để dùng trong shared.js
window.cancelRegistration = cancelRegistration;
window.registerActivity = registerActivity;