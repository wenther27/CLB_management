// ================================================
// shared.js — CLB CTXH DUT
// FIX: Timezone lệch 7 tiếng khi kiểm tra open/deadline
// ================================================

// ── Hiển thị chi tiết hoạt động ─────────────────────────────────────────────
async function showActivityDetail(activityId, options = {}) {
  const isAdminPage = window.location.pathname.toLowerCase().includes('admin-dashboard');
  const { showAdminButtons = (Auth.isAdmin() && isAdminPage), onClose = null } = options;

  let modal = document.getElementById('detailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'detailModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal" style="max-width:640px" id="detailBody"></div>';
    document.body.appendChild(modal);
  }

  const body = document.getElementById('detailBody');
  if (!body) return;

  body.innerHTML = '<div class="loading" style="padding:60px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  modal.classList.add('open');

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


    const parseLocalDate = (str) => {
      if (!str) return null;
      // Nếu đã có timezone info → parse thẳng (trường hợp backend trả về đúng)
      if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str);
      // Không có suffix → parse như local time (= giờ HN) → đúng
      return new Date(str);
    };

    const now     = new Date();                              // giờ HN local
    const deadline = parseLocalDate(a.registrationDeadLine);
    const openDate = parseLocalDate(a.registrationOpenDate);

    const isDeadlinePassed = deadline && deadline <= now;
    const isNotOpenYet     = openDate && openDate > now;
    const isDeadlineNear   = deadline && !isDeadlinePassed &&
      (deadline - now) < 24 * 60 * 60 * 1000;

    // Kiểm tra user đã đăng ký chưa
    let hasRegistered = false;
    if (Auth.isLoggedIn()) {
      try {
        const regCheck = await API.hasRegistered(activityId);
        hasRegistered = regCheck.data === true;
      } catch (e) { console.error('check registration error:', e); }
    }

    // Banner cảnh báo
    let deadlineBanner = '';
    if (isDeadlinePassed && a.status === 'Open') {
      deadlineBanner = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#dc2626">
        🔒 Đã hết hạn đăng ký
      </div>`;
    } else if (isDeadlineNear) {
      deadlineBanner = `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#b45309">
        ⚠️ Sắp hết hạn đăng ký
      </div>`;
    } else if (isNotOpenYet) {
      deadlineBanner = `<div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#1d4ed8">
        🕐 Chưa đến thời gian nhận đăng ký (mở lúc ${Utils.formatDateTime(a.registrationOpenDate)})
      </div>`;
    }

    // ── Phần đăng ký / hủy đăng ký ─────────────────────────────────────────
    // Chỉ cho phép hủy khi chưa hết hạn và hoạt động còn mở
    const canCancel = hasRegistered &&
      a.status !== 'Cancelled' &&
      a.status !== 'Closed' &&
      !isDeadlinePassed;

    let regSection = '';
    if (hasRegistered) {
      if (canCancel) {
        regSection = `
          <div style="margin-bottom:10px;padding:8px 12px;background:#dcfce7;border:1px solid #86efac;border-radius:8px;font-size:13px;color:#16a34a;text-align:center">
            <i class="fa-solid fa-check-circle"></i> Bạn đã đăng ký tham gia hoạt động này
          </div>
          <button onclick="cancelRegistrationFromModal(${a.activityID}, this)"
            class="btn-outline w-100" style="padding:12px;font-size:15px;background:#fff0f3;border-color:#dc2626;color:#dc2626">
            <i class="fa-solid fa-xmark"></i> Hủy đăng ký
          </button>`;
      } else {
        const lockMsg = a.status === 'Cancelled'
          ? 'Hoạt động đã bị hủy'
          : 'Đã hết hạn đăng ký — không thể hủy';
        regSection = `
          <div style="margin-bottom:10px;padding:8px 12px;background:#dcfce7;border:1px solid #86efac;border-radius:8px;font-size:13px;color:#16a34a;text-align:center">
            <i class="fa-solid fa-check-circle"></i> Bạn đã đăng ký tham gia hoạt động này
          </div>
          <div style="text-align:center;padding:10px;background:rgba(100,116,139,0.1);border-radius:8px;border:1px solid rgba(100,116,139,0.2);color:#000000;font-size:13px">
            <i class="fa-solid fa-lock"></i> ${lockMsg}
          </div>`;
      }
    } else if (a.status === 'Open' && !isFull && !isDeadlinePassed && !isNotOpenYet) {
      if (Auth.isLoggedIn()) {
        regSection = `<button onclick="registerActivityFromModal(${a.activityID}, this)"
          class="btn-primary w-100" style="padding:12px;margin-top:4px;font-size:15px">
          <i class="fa-solid fa-person-circle-plus"></i> Đăng ký tham gia
        </button>`;
      } else {
        regSection = `
          <div style="background:#f8f9fc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center;margin-top:8px">
            <p style="color:#111827;font-size:13px;margin-bottom:10px">Đăng nhập để đăng ký tham gia hoạt động</p>
            <button onclick="AuthModal.open('login')" class="btn-primary" style="padding:9px 20px">Đăng nhập ngay</button>
          </div>`;
      }
    } else if (isFull) {
      regSection = `<div style="text-align:center;padding:12px;background:#fee2e2;border-radius:8px;border:1px solid #fca5a5;color:#dc2626;font-size:13px;margin-top:8px">
        ⛔ Hoạt động đã đủ số lượng người tham gia
      </div>`;
    } else if (a.status === 'Cancelled') {
      regSection = `<div style="text-align:center;padding:12px;background:rgba(100,116,139,0.1);border-radius:8px;border:1px solid rgba(100,116,139,0.2);color:#000000;font-size:13px;margin-top:8px">
        🚫 Hoạt động đã bị hủy
      </div>`;
    } else if (a.status === 'Closed' || isDeadlinePassed) {
      regSection = `<div style="text-align:center;padding:12px;background:rgba(100,116,139,0.1);border-radius:8px;border:1px solid rgba(100,116,139,0.2);color:#000000;font-size:13px;margin-top:8px">
        <i class="fa-solid fa-lock"></i> Đã đóng đăng ký
      </div>`;
    } else if (isNotOpenYet) {
      regSection = `<div style="text-align:center;padding:12px;background:#dbeafe;border-radius:8px;border:1px solid #93c5fd;color:#1d4ed8;font-size:13px;margin-top:8px">
        🕐 Chưa đến thời gian mở đăng ký (${Utils.formatDateTime(a.registrationOpenDate)})
      </div>`;
    }

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
        </div>`;
    }

    body.innerHTML = `
      <div class="modal-header">
        <span></span>
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
        <div style="background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#111827;margin-bottom:4px"><i class="fa-solid fa-calendar-days"></i> Thời gian</div>
          <div style="font-size:13px;color:#111827">${Utils.formatDateTime(a.time)}</div>
        </div>
        <div style="background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#111827;margin-bottom:4px"><i class="fa-solid fa-location-dot"></i> Địa điểm</div>
          <div style="font-size:13px;color:#111827">${Utils.escapeHtml(a.location || 'Chưa xác định')}</div>
        </div>
        <div style="background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#111827;margin-bottom:4px"><i class="fa-solid fa-calendar-plus"></i> Mở đăng ký</div>
          <div style="font-size:13px;color:${isNotOpenYet ? '#1d4ed8' : '#111827'}">
            ${a.registrationOpenDate ? Utils.formatDateTime(a.registrationOpenDate) : 'Ngay khi tạo'}
          </div>
        </div>
        <div style="background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#111827;margin-bottom:4px"><i class="fa-solid fa-calendar-xmark"></i> Hạn đăng ký</div>
          <div style="font-size:13px;color:${isDeadlinePassed ? '#dc2626' : isDeadlineNear ? '#b45309' : '#111827'}">
            ${a.registrationDeadLine ? Utils.formatDateTime(a.registrationDeadLine) : 'Không giới hạn'}
          </div>
        </div>
        <div style="background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#111827;margin-bottom:4px"><i class="fa-solid fa-user"></i> Người tổ chức</div>
          <div style="font-size:13px;color:#111827">${Utils.escapeHtml(a.creatorName || 'BTC')}</div>
        </div>
        <div style="background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#111827;margin-bottom:4px"><i class="fa-solid fa-user-group"></i> Đăng ký</div>
          <div style="font-size:13px;color:#111827">
            ${a.registeredCount}${a.maxParticipants ? ' / ' + a.maxParticipants + ' người' : ' người'}
          </div>
        </div>
      </div>

      ${a.maxParticipants ? `
        <div style="margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#000000;margin-bottom:6px">
            <span>Mức độ đăng ký</span>
            <span style="color:${pct >= 80 ? '#ff2d55' : '#000000'}">${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;background:${pct >= 80 ? '#ff2d55' : '#3b82f6'}"></div>
          </div>
        </div>
      ` : ''}

      ${a.description ? `
        <div style="margin-bottom:20px">
          <div style="font-size:11px;color:#000000;margin-bottom:8px"><i class="fa-solid fa-clipboard-list"></i> Mô tả</div>
          <div style="font-size:14px;color:#000000;line-height:1.75;white-space:pre-wrap">${Utils.escapeHtml(a.description)}</div>
        </div>
      ` : ''}

      ${regSection}
      ${adminSection}`;

  } catch (e) {
    body.innerHTML = `
      <div class="modal-header"><span></span>
        <button class="modal-close" onclick="closeDetailModal()">✕</button>
      </div>
      <div style="padding:40px;text-align:center;color:#ff2d55">
        <i class="fa-solid fa-circle-exclamation" style="font-size:48px;margin-bottom:16px"></i>
        <p>${e.message}</p>
      </div>`;
  }
}

function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('open');
}

// ── Đăng ký từ modal ─────────────────────────────────────────────────────────
async function registerActivityFromModal(activityId, btn) {
  if (!Auth.isLoggedIn()) {
    Toast.info('Vui lòng đăng nhập để đăng ký');
    setTimeout(() => AuthModal.open('login'), 700);
    return;
  }
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
  try {
    await API.register(activityId);
    Toast.success('Đăng ký tham gia thành công! 🎉');
    if (window.allActivities) {
      const act = window.allActivities.find(a => a.activityID === activityId);
      if (act) act.registeredCount = (act.registeredCount || 0) + 1;
    }
    if (typeof userRegistrations !== 'undefined') userRegistrations.set(activityId, true);
    setTimeout(() => closeDetailModal(), 1500);
    if (typeof renderActivities === 'function') renderActivities();
  } catch (e) {
    Toast.error(e.message || 'Đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

// ── Hủy đăng ký từ modal ─────────────────────────────────────────────────────
async function cancelRegistrationFromModal(activityId, btn) {
  if (!confirm('Bạn có chắc muốn hủy đăng ký hoạt động này?')) return;
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
  try {
    await API.cancelRegistration(activityId);
    Toast.success('Hủy đăng ký thành công');
    if (window.allActivities) {
      const act = window.allActivities.find(a => a.activityID === activityId);
      if (act) act.registeredCount = Math.max(0, (act.registeredCount || 0) - 1);
    }
    if (typeof userRegistrations !== 'undefined') userRegistrations.set(activityId, false);
    closeDetailModal();
    if (typeof renderActivities === 'function') renderActivities();
  } catch (e) {
    // Hiển thị đúng message từ backend (ví dụ: "Đã hết hạn đăng ký...")
    Toast.error(e.message || 'Hủy đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

// ── Đăng ký / hủy từ card ────────────────────────────────────────────────────
async function registerActivityFromCard(activityId, btn) {
  if (!Auth.isLoggedIn()) {
    Toast.info('Vui lòng đăng nhập để đăng ký');
    setTimeout(() => AuthModal.open('login'), 700);
    return;
  }
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    await API.register(activityId);
    Toast.success('Đăng ký tham gia thành công! 🎉');
    if (window.allActivities) {
      const act = window.allActivities.find(a => a.activityID === activityId);
      if (act) act.registeredCount = (act.registeredCount || 0) + 1;
    }
    if (typeof userRegistrations !== 'undefined') userRegistrations.set(activityId, true);
    if (typeof renderActivities === 'function') renderActivities();
  } catch (e) {
    Toast.error(e.message || 'Đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

async function cancelRegistrationFromCard(activityId, btn) {
  if (!confirm('Bạn có chắc muốn hủy đăng ký hoạt động này?')) return;
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    await API.cancelRegistration(activityId);
    Toast.success('Hủy đăng ký thành công');
    if (window.allActivities) {
      const act = window.allActivities.find(a => a.activityID === activityId);
      if (act) act.registeredCount = Math.max(0, (act.registeredCount || 0) - 1);
    }
    if (typeof userRegistrations !== 'undefined') userRegistrations.set(activityId, false);
    if (typeof renderActivities === 'function') renderActivities();
  } catch (e) {
    Toast.error(e.message || 'Hủy đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

// ── Admin helpers ─────────────────────────────────────────────────────────────
async function editActivityFromDetail(activityId) {
  closeDetailModal();
  if (typeof openActModal === 'function') {
    try { const r = await API.getActivity(activityId); openActModal(r.data); }
    catch (e) { Toast.error(e.message); }
  }
}

async function deleteActivityFromDetail(activityId) {
  if (!confirm('Bạn có chắc chắn muốn xóa hoạt động này? Hành động không thể hoàn tác!')) return;
  try {
    await API.deleteActivity(activityId);
    Toast.success('Đã xóa hoạt động');
    closeDetailModal();
    if (typeof loadActivitiesAdmin === 'function') loadActivitiesAdmin();
    if (typeof loadStats === 'function') loadStats();
    if (typeof renderActivities === 'function') renderActivities();
  } catch (e) { Toast.error(e.message); }
}

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
      </div>`;
    document.body.appendChild(modal);
  }
  const body = document.getElementById('registrationsBody');
  body.innerHTML = '<div class="loading" style="padding:40px"><div class="spinner"></div></div>';
  modal.classList.add('open');
  modal.onclick = (e) => { if (e.target === modal) closeRegistrationsModal(); };
  try {
    const r = await API.getActivityRegistrations(activityId, 1, 100);
    const list = r.data?.items || [];
    if (!list.length) { body.innerHTML = '<div style="padding:40px;text-align:center;color:#000000">Chưa có ai đăng ký</div>'; return; }
    body.innerHTML = `
      <div style="padding:4px 0">
        <div style="margin-bottom:16px;padding:8px 12px;background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;color:#111827">
          <strong>${Utils.escapeHtml(activityName)}</strong> — ${list.length} người đăng ký
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid #e2e8f0">
            <th style="text-align:left;padding:10px 8px">Họ tên</th>
            <th style="text-align:left;padding:10px 8px">Ngày đăng ký</th>
            <th style="text-align:left;padding:10px 8px">Trạng thái</th>
          </tr></thead>
          <tbody>
            ${list.map(reg => `
              <tr style="border-bottom:1px solid #f1f3f8">
                <td style="padding:10px 8px">${Utils.escapeHtml(reg.memberName)}</td>
                <td style="padding:10px 8px;font-size:13px;color:#111827">${Utils.formatDateTime(reg.registerDate)}</td>
                <td style="padding:10px 8px">${Utils.statusLabel(reg.status)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:#ff2d55">Lỗi: ${e.message}</div>`;
  }
}

function closeRegistrationsModal() {
  const modal = document.getElementById('registrationsModal');
  if (modal) modal.classList.remove('open');
}

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
      </div>`;
    document.body.appendChild(modal);
  }
  const body = document.getElementById('myRegistrationsBody');
  body.innerHTML = '<div class="loading" style="padding:40px"><div class="spinner"></div></div>';
  modal.classList.add('open');
  modal.onclick = (e) => { if (e.target === modal) closeMyRegistrationsModal(); };
  try {
    const r = await API.getMyRegistrations(1, 50);
    const list = r.data?.items || [];
    if (!list.length) { body.innerHTML = '<div style="padding:40px;text-align:center;color:#000000">Bạn chưa đăng ký hoạt động nào</div>'; return; }
    body.innerHTML = `
      <div style="padding:4px 0">
        <div style="margin-bottom:16px;padding:8px 12px;background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;color:#111827">📊 Tổng: ${list.length} hoạt động</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${list.map(reg => `
            <div style="background:#ffffff;border-radius:10px;padding:14px;border:1px solid #e2e8f0;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.05)"
                 onclick="showActivityDetail(${reg.activityID})">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div style="font-weight:600;margin-bottom:4px">${Utils.escapeHtml(reg.activityName)}</div>
                  <div style="font-size:12px;color:#111827"><i class="fa-solid fa-calendar-days"></i> ${Utils.formatDateTime(reg.registerDate)}</div>
                </div>
                ${Utils.statusLabel(reg.status)}
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch (e) {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:#ff2d55">Lỗi: ${e.message}</div>`;
  }
}

function closeMyRegistrationsModal() {
  const modal = document.getElementById('myRegistrationsModal');
  if (modal) modal.classList.remove('open');
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.showActivityDetail          = showActivityDetail;
window.closeDetailModal            = closeDetailModal;
window.registerActivityFromModal   = registerActivityFromModal;
window.registerActivityFromCard    = registerActivityFromCard;
window.cancelRegistrationFromModal = cancelRegistrationFromModal;
window.cancelRegistrationFromCard  = cancelRegistrationFromCard;
window.editActivityFromDetail      = editActivityFromDetail;
window.deleteActivityFromDetail    = deleteActivityFromDetail;
window.showRegistrationsList       = showRegistrationsList;
window.closeRegistrationsModal     = closeRegistrationsModal;
window.showMyRegistrations         = showMyRegistrations;
window.closeMyRegistrationsModal   = closeMyRegistrationsModal;
window.registerActivity   = registerActivityFromCard;
window.cancelRegistration = cancelRegistrationFromCard;