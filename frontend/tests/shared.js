// ================================================
// shared.js - Các hàm dùng chung cho toàn bộ website
// CLB CTXH DUT
// ================================================

// ── Hiển thị chi tiết hoạt động (dùng cho cả user và admin) ─────────────────
async function showActivityDetail(activityId, options = {}) {
  const { showAdminButtons = false, onClose = null } = options;
  
  // Tìm hoặc tạo modal container
  let modal = document.getElementById('detailModal');
  let isNewModal = false;
  
  if (!modal) {
    // Nếu chưa có modal, tạo mới
    modal = document.createElement('div');
    modal.id = 'detailModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal" style="max-width:640px" id="detailBody"></div>';
    document.body.appendChild(modal);
    isNewModal = true;
  }
  
  const body = document.getElementById('detailBody');
  if (!body) {
    console.error('Không tìm thấy detailBody');
    return;
  }
  
  body.innerHTML = '<div class="loading" style="padding:60px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  modal.classList.add('open');
  
  // Đóng modal khi click nền
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      if (onClose) onClose();
    }
  };
  
  try {
    const r = await API.getActivity(activityId);
    const a = r.data;
  
    const pct = a.maxParticipants
      ? Math.min(100, Math.round((a.registeredCount / a.maxParticipants) * 100))
      : 0;
    const isFull = a.maxParticipants && a.registeredCount >= a.maxParticipants;
    
    // Xử lý ảnh
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
    
    // Phần đăng ký
    let regSection = '';
    if (a.status === 'Open' && !isFull) {
      if (Auth.isLoggedIn()) {
        regSection = `<button id="modalRegBtn" onclick="registerActivity(${a.activityID}, this, true)"
          class="btn-primary w-100" style="padding:12px;margin-top:4px;font-size:15px">
           <i class="fa-solid fa-person-circle-plus" style="color: rgb(255, 255, 255);"></i> Đăng ký tham gia
        </button>`;
      } else {
        regSection = `
          <div style="background:#111827;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;text-align:center;margin-top:8px">
            <p style="color:#94a3b8;font-size:13px;margin-bottom:10px"> Đăng nhập để đăng ký tham gia hoạt động</p>
            <button onclick="AuthModal.open('login')" class="btn-primary" style="padding:9px 20px">Đăng nhập ngay</button>
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
        <i class="fa-solid fa-lock" style="color: rgb(255, 255, 255);"></i> Đã đóng đăng ký
      </div>`;
    }
    
    // Thêm nút admin nếu cần
    let adminSection = '';
    if (showAdminButtons && Auth.isAdmin()) {
      adminSection = `
        <div style="display:flex;gap:10px;margin-top:16px">
          <button onclick="editActivityFromDetail(${a.activityID})" class="btn-outline" style="flex:1;padding:10px">
            <i class="fa-solid fa-pen" style="color: rgb(255, 255, 255);"></i> Chỉnh sửa hoạt động
          </button>
          <button onclick="deleteActivityFromDetail(${a.activityID})" class="btn-danger" style="flex:1;padding:10px">
            <i class="fa-solid fa-trash" style="color: rgb(255, 255, 255);"></i> Xóa hoạt động
          </button>
        </div>
      `;
    }
    
    body.innerHTML = `
      <div class="modal-header">
        <span style="font-size:1.5rem"></span>
        <button class="modal-close" onclick="closeDetailModal()">✕</button>
      </div>
    
      <img src="${a.image && a.image.length > 0 ? (a.image[0].startsWith('http') ? a.image[0] : 'http://localhost:5190' + a.image[0]) : ''}" 
           style="width:100%;height:280px;object-fit:cover;border-radius:8px;margin-bottom:16px;display:${a.image && a.image.length > 0 ? 'block' : 'none'}"
           onerror="this.style.display='none'">
           
      <div style="margin-bottom:6px">${Utils.statusLabel(a.status)}</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:16px;line-height:1.3">
        ${Utils.escapeHtml(a.activityName)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
        <div style="background:#111827;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#475569;margin-bottom:4px"><i class="fa-solid fa-calendar-days"></i> Thời gian</div>
          <div style="font-size:13px;color:#e2e8f0">${Utils.formatDateTime(a.time)}</div>
        </div>
        <div style="background:#111827;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#475569;margin-bottom:4px"><i class="fa-solid fa-location-dot"></i> Địa điểm</div>
          <div style="font-size:13px;color:#e2e8f0">${Utils.escapeHtml(a.location || 'Chưa xác định')}</div>
        </div>
        <div style="background:#111827;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#475569;margin-bottom:4px"><i class="fa-solid fa-user"></i> Người tổ chức</div>
          <div style="font-size:13px;color:#e2e8f0">${Utils.escapeHtml(a.creatorName || 'BTC')}</div>
        </div>
        <div style="background:#111827;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#475569;margin-bottom:4px"><i class="fa-solid fa-user-group"></i> Đăng ký</div>
          <div style="font-size:13px;color:#e2e8f0">
            ${a.registeredCount}${a.maxParticipants ? ' / ' + a.maxParticipants + ' người' : ' người'}
          </div>
        </div>
      </div>

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

      ${a.description ? `
        <div style="margin-bottom:20px">
          <div style="font-size:11px;color:#475569;margin-bottom:8px"><i class="fa-solid fa-clipboard-list"></i> Mô tả</div>
          <div style="font-size:14px;color:#94a3b8;line-height:1.75;white-space:pre-wrap">${Utils.escapeHtml(a.description)}</div>
        </div>
      ` : ''}
      
   
      
      ${regSection}
      ${adminSection}
    `;
    
  } catch (e) {
    body.innerHTML = `
      <div class="modal-header">
        <span></span>
        <button class="modal-close" onclick="closeDetailModal()">✕</button>
      </div>
      <div style="padding:40px;text-align:center;color:#ff2d55">
        <i class="fa-solid fa-circle-exclamation" style="font-size:48px;margin-bottom:16px"></i>
        <p>${e.message}</p>
      </div>`;
  }
}

// ── Đóng modal chi tiết ──────────────────────────────────────────────────────
function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('open');
}

// ── Hàm đăng ký hoạt động (dùng chung) ───────────────────────────────────────
async function registerActivity(id, btn, fromModal = false) {
  if (!Auth.isLoggedIn()) {
    Toast.info('Vui lòng đăng nhập để đăng ký');
    setTimeout(() => AuthModal.open('login'), 700);
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Đang xử lý...';

  try {
    await API.register(id);
    Toast.success('Đăng ký tham gia thành công! 🎉');

    btn.textContent = '✓ Đã đăng ký';
    btn.className = 'btn-outline';
    btn.onclick = null;
    
    // Cập nhật lại cache nếu có
    if (window.allActivities) {
      const act = window.allActivities.find(a => a.activityID === id);
      if (act) act.registeredCount = (act.registeredCount || 0) + 1;
    }
    
    // Đóng modal sau 1.5 giây nếu đang ở modal
    if (fromModal) {
      setTimeout(() => closeDetailModal(), 1500);
    }

  } catch (e) {
    Toast.error(e.message);
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ── Hàm hỗ trợ cho admin (nếu cần) ───────────────────────────────────────────
async function editActivityFromDetail(activityId) {
  closeDetailModal();
  // Chuyển sang trang admin hoặc mở modal edit
  if (typeof openActModal === 'function') {
    try {
      const r = await API.getActivity(activityId);
      openActModal(r.data);
    } catch(e) {
      Toast.error(e.message);
    }
  } else {
    location.href = `admin-dashboard.html?edit=${activityId}`;
  }
}

async function deleteActivityFromDetail(activityId) {
  if (!confirm('Bạn có chắc chắn muốn xóa hoạt động này?')) return;
  try {
    await API.deleteActivity(activityId);
    Toast.success('Đã xóa hoạt động');
    closeDetailModal();
    if (typeof loadActivitiesAdmin === 'function') loadActivitiesAdmin();
    if (typeof loadStats === 'function') loadStats();
  } catch(e) {
    Toast.error(e.message);
  }
}
