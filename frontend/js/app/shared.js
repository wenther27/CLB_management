// ================================================
// shared.js - Các hàm dùng chung cho toàn bộ website
// CLB CTXH DUT
// ================================================

// ── Hiển thị chi tiết hoạt động (dùng cho cả user và admin) ─────────────────
async function showActivityDetail(activityId, options = {}) {
  const isAdminPage = window.location.pathname.includes('admin-dashboard.html');
  const { showAdminButtons = (Auth.isAdmin() && isAdminPage), onClose = null } = options;
  
  // Tìm hoặc tạo modal container
  let modal = document.getElementById('detailModal');
  
  if (!modal) {
    // Nếu chưa có modal, tạo mới
    modal = document.createElement('div');
    modal.id = 'detailModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal" style="max-width:640px" id="detailBody"></div>';
    document.body.appendChild(modal);
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

    // Tính trạng thái deadline và open date
    const now = new Date();
    const deadline = a.registrationDeadLine ? new Date(a.registrationDeadLine) : null;
    const openDate = a.registrationOpenDate ? new Date(a.registrationOpenDate) : null;
    const isDeadlinePassed = deadline && deadline <= now;
    const isNotOpenYet = openDate && openDate > now;
    const isDeadlineNear = deadline && !isDeadlinePassed && (deadline - now) < 24 * 60 * 60 * 1000;

    // Kiểm tra user đã đăng ký chưa
    let hasRegistered = false;
    if (Auth.isLoggedIn()) {
      try {
        const regCheck = await API.hasRegistered(activityId);
        hasRegistered = regCheck.data === true;
      } catch(e) { 
        console.error('Error checking registration:', e);
      }
    }
    
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

    // Banner cảnh báo
    let deadlineBanner = '';
    if (isDeadlinePassed && a.status === 'Open') {
      deadlineBanner = `<div style="background:rgba(255,45,85,0.1);border:1px solid rgba(255,45,85,0.3);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#ff6b84">
        🔒 Đã hết hạn đăng ký
      </div>`;
    } else if (isDeadlineNear) {
      deadlineBanner = `<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#f59e0b">
        ⚠️ Sắp hết hạn đăng ký 
      </div>`;
    } else if (isNotOpenYet) {
      deadlineBanner = `<div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#60a5fa">
        🕐 Chưa đến thời gian nhận đăng ký (mở lúc ${Utils.formatDateTime(a.registrationOpenDate)})
      </div>`;
    }

    // Phần đăng ký/hủy đăng ký
    let regSection = '';
    if (hasRegistered) {
      regSection = `<button onclick="cancelRegistrationFromModal(${a.activityID}, this)"
        class="btn-outline w-100" style="padding:12px;margin-top:4px;font-size:15px;background:rgba(255,45,85,0.1);border-color:#ff2d55;color:#ff2d55">
        <i class="fa-solid fa-xmark"></i> Hủy đăng ký
      </button>`;
    } else if (a.status === 'Open' && !isFull && !isDeadlinePassed && !isNotOpenYet) {
      if (Auth.isLoggedIn()) {
        regSection = `<button onclick="registerActivityFromModal(${a.activityID}, this)"
          class="btn-primary w-100" style="padding:12px;margin-top:4px;font-size:15px">
          <i class="fa-solid fa-person-circle-plus"></i> Đăng ký tham gia
        </button>`;
      } else {
        regSection = `
          <div style="background:#111827;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;text-align:center;margin-top:8px">
            <p style="color:#94a3b8;font-size:13px;margin-bottom:10px">Đăng nhập để đăng ký tham gia hoạt động</p>
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
    } else if (a.status === 'Closed' || isDeadlinePassed) {
      regSection = `<div style="text-align:center;padding:12px;background:rgba(100,116,139,0.1);border-radius:8px;border:1px solid rgba(100,116,139,0.2);color:#64748b;font-size:13px;margin-top:8px">
        <i class="fa-solid fa-lock"></i> Đã đóng đăng ký
      </div>`;
    } else if (isNotOpenYet) {
      regSection = `<div style="text-align:center;padding:12px;background:rgba(59,130,246,0.07);border-radius:8px;border:1px solid rgba(59,130,246,0.2);color:#60a5fa;font-size:13px;margin-top:8px">
        🕐 Chưa đến thời gian mở đăng ký (${Utils.formatDateTime(a.registrationOpenDate)})
      </div>`;
    }
    
    // Thêm nút admin nếu cần
    let adminSection = '';
    if (showAdminButtons && Auth.isAdmin()) {
      adminSection = `
        <div style="display:flex;gap:10px;margin-top:16px">
          <button onclick="editActivityFromDetail(${a.activityID})" class="btn-outline" style="flex:1;padding:10px">
            <i class="fa-solid fa-pen"></i> Chỉnh sửa hoạt động
          </button>
          <button onclick="deleteActivityFromDetail(${a.activityID})" class="btn-danger" style="flex:1;padding:10px">
            <i class="fa-solid fa-trash"></i> Xóa hoạt động
          </button>
        </div>
      `;
    }
    
    body.innerHTML = `
      <div class="modal-header">
        <span style="font-size:1.5rem"></span>
        <button class="modal-close" onclick="closeDetailModal()">✕</button>
      </div>
    
      ${a.image && a.image.length > 0 ? `
        <img src="${a.image[0].startsWith('http') ? a.image[0] : 'http://localhost:5190' + a.image[0]}" 
             style="width:100%;height:280px;object-fit:cover;border-radius:8px;margin-bottom:16px"
             onerror="this.style.display='none'">
      ` : ''}
           
      <div style="margin-bottom:6px">${Utils.statusLabel(a.status)}</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:16px;line-height:1.3">
        ${Utils.escapeHtml(a.activityName)}
      </div>

      ${deadlineBanner}

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
          <div style="font-size:11px;color:#475569;margin-bottom:4px"><i class="fa-solid fa-calendar-plus"></i> Mở đăng ký</div>
          <div style="font-size:13px;color:${isNotOpenYet ? '#60a5fa' : '#e2e8f0'}">
            ${a.registrationOpenDate ? Utils.formatDateTime(a.registrationOpenDate) : 'Ngay khi tạo'}
          </div>
        </div>
        <div style="background:#111827;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#475569;margin-bottom:4px"><i class="fa-solid fa-calendar-xmark"></i> Hạn đăng ký</div>
          <div style="font-size:13px;color:${isDeadlinePassed ? '#ff6b84' : isDeadlineNear ? '#f59e0b' : '#e2e8f0'}">
            ${a.registrationDeadLine ? Utils.formatDateTime(a.registrationDeadLine) : 'Không giới hạn'}
          </div>
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
      
      ${hasRegistered ? `<div style="margin-bottom:12px;padding:8px 12px;background:rgba(34,197,94,0.1);border-radius:8px;font-size:13px;color:#22c55e;text-align:center">
        <i class="fa-solid fa-check-circle"></i> Bạn đã đăng ký tham gia hoạt động này
      </div>` : ''}
      
      ${regSection}
      ${adminSection}
    `;
    
  } catch (e) {
    console.error('Error in showActivityDetail:', e);
    body.innerHTML = `
      <div class="modal-header">
        <span></span>
        <button class="modal-close" onclick="closeDetailModal()">✕</button>
      </div>
      <div style="padding:40px;text-align:center;color:#ff2d55">
        <i class="fa-solid fa-circle-exclamation" style="font-size:48px;margin-bottom:16px"></i>
        <p>${e.message}</p>
        <button onclick="closeDetailModal()" class="btn-primary btn-sm" style="margin-top:16px">Đóng</button>
      </div>`;
  }
}

// ── Đóng modal chi tiết ──────────────────────────────────────────────────────
function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('open');
}

// ── Hàm đăng ký hoạt động từ modal ───────────────────────────────────────────
async function registerActivityFromModal(activityId, btn) {
  if (!Auth.isLoggedIn()) {
    Toast.info('Vui lòng đăng nhập để đăng ký');
    setTimeout(() => AuthModal.open('login'), 700);
    return;
  }

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

  try {
    await API.register(activityId);
    Toast.success('Đăng ký tham gia thành công! 🎉');

    // Cập nhật lại cache nếu có
    if (window.allActivities) {
      const act = window.allActivities.find(a => a.activityID === activityId);
      if (act) act.registeredCount = (act.registeredCount || 0) + 1;
    }
    
    // Cập nhật userRegistrations nếu có
    if (typeof userRegistrations !== 'undefined') {
      userRegistrations.set(activityId, true);
    }
    
    // Đóng modal sau 1.5 giây
    setTimeout(() => closeDetailModal(), 1500);
    
    // Refresh lại danh sách nếu có hàm renderActivities
    if (typeof renderActivities === 'function') {
      renderActivities();
    }

  } catch (e) {
    Toast.error(e.message || 'Đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ── Hàm hủy đăng ký từ modal ────────────────────────────────────────────────
async function cancelRegistrationFromModal(activityId, btn) {
  if (!confirm('Bạn có chắc muốn hủy đăng ký hoạt động này?')) return;
  
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
  
  try {
    await API.cancelRegistration(activityId);
    Toast.success('Hủy đăng ký thành công');
    
    // Đóng modal
    closeDetailModal();
    
    // Cập nhật lại cache
    if (window.allActivities) {
      const act = window.allActivities.find(a => a.activityID === activityId);
      if (act) {
        act.registeredCount = Math.max(0, (act.registeredCount || 0) - 1);
      }
    }
    
    // Cập nhật userRegistrations nếu có
    if (typeof userRegistrations !== 'undefined') {
      userRegistrations.set(activityId, false);
    }
    
    // Refresh lại danh sách nếu có hàm renderActivities
    if (typeof renderActivities === 'function') {
      renderActivities();
    }
    
  } catch (e) {
    Toast.error(e.message || 'Hủy đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ── Hàm đăng ký hoạt động từ card (dùng trong activity.js) ───────────────────
async function registerActivityFromCard(activityId, btn) {
  if (!Auth.isLoggedIn()) {
    Toast.info('Vui lòng đăng nhập để đăng ký');
    setTimeout(() => AuthModal.open('login'), 700);
    return;
  }

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

  try {
    await API.register(activityId);
    Toast.success('Đăng ký tham gia thành công! 🎉');
    
    // Cập nhật số lượng đăng ký
    if (window.allActivities) {
      const act = window.allActivities.find(a => a.activityID === activityId);
      if (act) {
        act.registeredCount = (act.registeredCount || 0) + 1;
      }
    }
    
    // Cập nhật trạng thái đăng ký
    if (typeof userRegistrations !== 'undefined') {
      userRegistrations.set(activityId, true);
    }
    
    // Render lại danh sách nếu có hàm renderActivities
    if (typeof renderActivities === 'function') {
      renderActivities();
    }

  } catch (e) {
    Toast.error(e.message || 'Đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ── Hàm hủy đăng ký từ card (dùng trong activity.js) ─────────────────────────
async function cancelRegistrationFromCard(activityId, btn) {
  if (!confirm('Bạn có chắc muốn hủy đăng ký hoạt động này?')) return;
  
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
  
  try {
    await API.cancelRegistration(activityId);
    Toast.success('Hủy đăng ký thành công');
    
    // Cập nhật lại số lượng đăng ký trong cache
    if (window.allActivities) {
      const act = window.allActivities.find(a => a.activityID === activityId);
      if (act) {
        act.registeredCount = Math.max(0, (act.registeredCount || 0) - 1);
      }
    }
    
    // Cập nhật trạng thái đăng ký của user
    if (typeof userRegistrations !== 'undefined') {
      userRegistrations.set(activityId, false);
    }
    
    // Render lại danh sách nếu có hàm renderActivities
    if (typeof renderActivities === 'function') {
      renderActivities();
    }
    
  } catch (e) {
    Toast.error(e.message || 'Hủy đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ── Hàm hỗ trợ cho admin ─────────────────────────────────────────────────────
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
    // Chuyển hướng đến admin dashboard với query param
    window.location.href = `admin-dashboard.html?tab=activities&edit=${activityId}`;
  }
}

async function deleteActivityFromDetail(activityId) {
  if (!confirm('Bạn có chắc chắn muốn xóa hoạt động này? Hành động không thể hoàn tác!')) return;
  
  try {
    await API.deleteActivity(activityId);
    Toast.success('Đã xóa hoạt động');
    closeDetailModal();
    
    // Refresh lại danh sách nếu có hàm tương ứng
    if (typeof loadActivitiesAdmin === 'function') {
      loadActivitiesAdmin();
    }
    if (typeof loadStats === 'function') {
      loadStats();
    }
    if (typeof renderActivities === 'function') {
      await loadActivities();
    }
  } catch(e) {
    Toast.error(e.message);
  }
}

// ── Hàm xem danh sách người đăng ký (admin) ─────────────────────────────────
async function showRegistrationsList(activityId, activityName) {
  let modal = document.getElementById('registrationsModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'registrationsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:700px">
        <div class="modal-header">
          <span style="font-size:1.2rem;font-weight:600">Danh sách đăng ký</span>
          <button class="modal-close" onclick="closeRegistrationsModal()">✕</button>
        </div>
        <div id="registrationsBody" style="max-height:500px;overflow-y:auto"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  const body = document.getElementById('registrationsBody');
  body.innerHTML = '<div class="loading" style="padding:40px"><div class="spinner"></div></div>';
  modal.classList.add('open');
  
  modal.onclick = (e) => {
    if (e.target === modal) closeRegistrationsModal();
  };
  
  try {
    const r = await API.getActivityRegistrations(activityId, 1, 100);
    const registrations = r.data?.items || [];
    
    if (registrations.length === 0) {
      body.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b">Chưa có ai đăng ký hoạt động này</div>';
      return;
    }
    
    body.innerHTML = `
      <div style="padding:4px 0">
        <div style="margin-bottom:16px;padding:8px 12px;background:#111827;border-radius:8px">
          <strong>${Utils.escapeHtml(activityName)}</strong> — ${registrations.length} người đăng ký
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.1)">
              <th style="text-align:left;padding:10px 8px">Họ tên</th>
              <th style="text-align:left;padding:10px 8px">Ngày đăng ký</th>
              <th style="text-align:left;padding:10px 8px">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${registrations.map(reg => `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                <td style="padding:10px 8px">${Utils.escapeHtml(reg.memberName)}</td>
                <td style="padding:10px 8px;font-size:13px;color:#94a3b8">${Utils.formatDateTime(reg.registerDate)}</td>
                <td style="padding:10px 8px">${Utils.statusLabel(reg.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:#ff2d55">Lỗi: ${e.message}</div>`;
  }
}

function closeRegistrationsModal() {
  const modal = document.getElementById('registrationsModal');
  if (modal) modal.classList.remove('open');
}

// ── Hàm xem lịch sử đăng ký của tôi (member) ────────────────────────────────
async function showMyRegistrations() {
  let modal = document.getElementById('myRegistrationsModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'myRegistrationsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:700px">
        <div class="modal-header">
          <span style="font-size:1.2rem;font-weight:600">📋 Lịch sử đăng ký của tôi</span>
          <button class="modal-close" onclick="closeMyRegistrationsModal()">✕</button>
        </div>
        <div id="myRegistrationsBody" style="max-height:500px;overflow-y:auto"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  const body = document.getElementById('myRegistrationsBody');
  body.innerHTML = '<div class="loading" style="padding:40px"><div class="spinner"></div></div>';
  modal.classList.add('open');
  
  modal.onclick = (e) => {
    if (e.target === modal) closeMyRegistrationsModal();
  };
  
  try {
    const r = await API.getMyRegistrations(1, 50);
    const registrations = r.data?.items || [];
    
    if (registrations.length === 0) {
      body.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b">Bạn chưa đăng ký hoạt động nào</div>';
      return;
    }
    
    body.innerHTML = `
      <div style="padding:4px 0">
        <div style="margin-bottom:16px;padding:8px 12px;background:#111827;border-radius:8px">
          📊 Tổng số: ${registrations.length} hoạt động đã đăng ký
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${registrations.map(reg => `
            <div style="background:#0f172a;border-radius:10px;padding:14px;border:1px solid rgba(255,255,255,0.06);cursor:pointer"
                 onclick="showActivityDetail(${reg.activityID})">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                <div>
                  <div style="font-weight:600;margin-bottom:4px">${Utils.escapeHtml(reg.activityName)}</div>
                  <div style="font-size:12px;color:#64748b">
                    <i class="fa-solid fa-calendar-days"></i> ${Utils.formatDateTime(reg.registerDate)}
                  </div>
                </div>
                <div>${Utils.statusLabel(reg.status)}</div>
              </div>
              <div style="font-size:12px;color:#94a3b8;display:flex;gap:16px;margin-top:8px">
                <span><i class="fa-regular fa-clock"></i> Đăng ký lúc: ${Utils.formatDateTime(reg.registerDate)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:#ff2d55">Lỗi: ${e.message}</div>`;
  }
}

function closeMyRegistrationsModal() {
  const modal = document.getElementById('myRegistrationsModal');
  if (modal) modal.classList.remove('open');
}

// ── Hàm load lại toàn bộ dữ liệu (refresh) ───────────────────────────────────
async function refreshAllData() {
  Toast.info('Đang làm mới dữ liệu...');
  
  try {
    // Refresh activities
    if (typeof loadActivities === 'function') {
      await loadActivities();
    }
    
    // Refresh admin activities if on admin page
    if (typeof loadActivitiesAdmin === 'function') {
      await loadActivitiesAdmin();
    }
    
    // Refresh stats if on admin page
    if (typeof loadStats === 'function') {
      await loadStats();
    }
    
    Toast.success('Đã làm mới dữ liệu');
  } catch (e) {
    Toast.error('Làm mới thất bại: ' + e.message);
  }
}

// ── Export functions ra global ────────────────────────────────────────────────
window.showActivityDetail = showActivityDetail;
window.closeDetailModal = closeDetailModal;
window.registerActivityFromModal = registerActivityFromModal;
window.registerActivityFromCard = registerActivityFromCard;
window.cancelRegistrationFromModal = cancelRegistrationFromModal;
window.cancelRegistrationFromCard = cancelRegistrationFromCard;
window.editActivityFromDetail = editActivityFromDetail;
window.deleteActivityFromDetail = deleteActivityFromDetail;
window.showRegistrationsList = showRegistrationsList;
window.closeRegistrationsModal = closeRegistrationsModal;
window.showMyRegistrations = showMyRegistrations;
window.closeMyRegistrationsModal = closeMyRegistrationsModal;
window.refreshAllData = refreshAllData;

// Alias để tương thích với code cũ
window.registerActivity = registerActivityFromCard;
window.cancelRegistration = cancelRegistrationFromCard;