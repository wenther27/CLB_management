// ================================================
// shared.js — CLB CTXH DUT
// UPDATED: Thêm giấy chứng nhận + điểm danh
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
      if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str);
      return new Date(str);
    };

    const now      = new Date();
    const deadline  = parseLocalDate(a.registrationDeadLine);
    const openDate  = parseLocalDate(a.registrationOpenDate);
    const actTime   = parseLocalDate(a.time);

    const isDeadlinePassed = deadline && deadline <= now;
    const isNotOpenYet     = openDate && openDate > now;
    const isDeadlineNear   = deadline && !isDeadlinePassed &&
      (deadline - now) < 24 * 60 * 60 * 1000;
    const activityHappened = actTime && actTime <= now; // Hoạt động đã diễn ra

    // Kiểm tra user đã đăng ký + điểm danh
    let hasRegistered  = false;
    let hasAttended    = false; // Đã được điểm danh
    if (Auth.isLoggedIn()) {
      try {
        const regCheck = await API.hasRegistered(activityId);
        hasRegistered = regCheck.data === true;

        // Kiểm tra điểm danh từ localStorage (attendance data)
        if (hasRegistered) {
          const attendanceKey = `attendance_${activityId}`;
          const attendanceData = JSON.parse(localStorage.getItem(attendanceKey) || '{}');
          const user = Auth.getUser();
          if (user && attendanceData[user.userID]) {
            hasAttended = true;
          }
        }
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

    // ── Phần đăng ký / hủy / chứng nhận ─────────────────────────────────────
    const canCancel = hasRegistered &&
      a.status !== 'Cancelled' &&
      a.status !== 'Closed' &&
      !isDeadlinePassed;

    // Điều kiện cấp chứng nhận: đã đăng ký + hoạt động đã diễn ra + đã điểm danh
    const canGetCertificate = hasRegistered && activityHappened && hasAttended;
    // Đã đăng ký + hoạt động đã diễn ra nhưng chưa điểm danh
    const waitingAttendance = hasRegistered && activityHappened && !hasAttended;

    let regSection = '';
    if (hasRegistered) {
      let statusBadge = `<div style="margin-bottom:10px;padding:8px 12px;background:#dcfce7;border:1px solid #86efac;border-radius:8px;font-size:13px;color:#16a34a;text-align:center">
        <i class="fa-solid fa-check-circle"></i> Bạn đã đăng ký tham gia hoạt động này
      </div>`;

      if (canGetCertificate) {
        // Đã điểm danh → có thể lấy chứng nhận
        regSection = `
          ${statusBadge}
          <div style="margin-bottom:10px;padding:8px 12px;background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;font-size:13px;color:#1d4ed8;text-align:center">
            <i class="fa-solid fa-clipboard-check"></i> Bạn đã được điểm danh tham gia hoạt động
          </div>
          <button onclick="openCertificateModal(${JSON.stringify(a).replace(/"/g, '&quot;')})"
            style="width:100%;padding:12px;background:linear-gradient(135deg,#166534,#15803d);
                   border:none;border-radius:10px;color:white;font-size:15px;font-weight:700;
                   cursor:pointer;font-family:'Be Vietnam Pro',Arial,sans-serif;
                   display:flex;align-items:center;justify-content:center;gap:9px;
                   transition:all 0.2s;box-shadow:0 4px 14px rgba(22,101,52,0.4)"
            onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(22,101,52,0.5)'"
            onmouseout="this.style.transform='';this.style.boxShadow='0 4px 14px rgba(22,101,52,0.4)'">
            <i class="fa-solid fa-certificate" style="font-size:18px"></i>
            Xem & Tải Giấy Chứng Nhận
          </button>`;
      } else if (waitingAttendance) {
        // Đã đăng ký, hoạt động đã qua nhưng chưa điểm danh
        regSection = `
          ${statusBadge}
          <div style="padding:14px 16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);
                      border-radius:10px;text-align:center">
            <div style="font-size:1.5rem;margin-bottom:8px">⏳</div>
            <div style="font-size:14px;font-weight:700;color:#b45309;margin-bottom:4px">Chờ xác nhận điểm danh</div>
            <div style="font-size:12px;color:#92400e">Ban tổ chức đang xác nhận danh sách tham gia.<br>Giấy chứng nhận sẽ khả dụng sau khi được điểm danh.</div>
          </div>`;
      } else if (canCancel) {
        regSection = `
          ${statusBadge}
          <button onclick="cancelRegistrationFromModal(${a.activityID}, this)"
            class="btn-outline w-100" style="padding:12px;font-size:15px;background:#fff0f3;border-color:#dc2626;color:#dc2626">
            <i class="fa-solid fa-xmark"></i> Hủy đăng ký
          </button>`;
      } else {
        const lockMsg = a.status === 'Cancelled'
          ? 'Hoạt động đã bị hủy'
          : 'Đã hết hạn đăng ký — không thể hủy';
        regSection = `
          ${statusBadge}
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
           <div style="font-size:14px;color:#000000;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;max-width:100%">${Utils.escapeHtml(a.description)}</div>
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

// ══════════════════════════════════════════════════════════════════════════════
// GIẤY CHỨNG NHẬN — Certificate Modal
// ══════════════════════════════════════════════════════════════════════════════

function openCertificateModal(activityData) {
  // Nếu được truyền vào dạng JSON string (từ onclick attribute)
  if (typeof activityData === 'string') {
    try { activityData = JSON.parse(activityData); } catch(e) { return; }
  }

  const user    = Auth.getUser();
  const profile = window._cachedProfile || null;

  // Lấy thông tin thành viên
  const memberName  = profile?.fullName  || user?.username || 'Thành viên';
  const memberClass = profile?.className || user?.className || '';
  const memberFac   = profile?.faculty   || user?.faculty   || '';
  const school      = 'Trường Đại học Bách Khoa - Đại học Đà Nẵng';
  const schoolLine  = memberClass ? `${memberClass}${memberFac ? ' - ' + memberFac : ''} · ${school}` : school;

  // Lấy ngày của hoạt động
  const actDate     = activityData.time ? new Date(activityData.time) : new Date();
  const dayStr      = actDate.getDate();
  const monthStr    = actDate.getMonth() + 1;
  const yearStr     = actDate.getFullYear();
  const dateLabel   = `Đà Nẵng, ngày ${dayStr} tháng ${monthStr} năm ${yearStr}`;
  const actName     = activityData.activityName || 'hoạt động tình nguyện';

  // Tạo overlay
  const overlay = document.createElement('div');
  overlay.id = 'certModal';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;
    padding:20px;animation:certFadeIn 0.3s ease`;

  overlay.innerHTML = `
   

    <div style="max-width:800px;width:100%">

      <!-- Certificate Box -->
      <div id="certModalBox">
        <!-- Viền vàng trong -->
        <div class="cert-border-inner"></div>

        <!-- Góc trang trí -->
        <div class="cert-corner cert-corner-tl">${_cornerSVG()}</div>
        <div class="cert-corner cert-corner-tr">${_cornerSVG()}</div>
        <div class="cert-corner cert-corner-bl">${_cornerSVG()}</div>
        <div class="cert-corner cert-corner-br">${_cornerSVG()}</div>

        <!-- Nội dung -->
        <div id="certPrintArea">
          <!-- Logo placeholder -->
          <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:38px;height:38px;background:#0f4c1e;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;font-size:18px;color:gold;font-weight:900">30</div>
            <div style="width:38px;height:38px;background:#1565c0;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;font-size:16px">🕊️</div>
          </div>

          <div class="cert-org">Đoàn Thanh Niên · Hội Sinh Viên Đại Học Đà Nẵng</div>

          <div class="cert-title">CHỨNG NHẬN</div>

          <div class="cert-sinvien">Sinh viên</div>
          <div class="cert-name" id="certNameField">${Utils.escapeHtml(memberName)}</div>
          <div class="cert-school">${Utils.escapeHtml(schoolLine)}</div>

          <div class="cert-activity" id="certActivityField">
            Đã tham gia hoạt động<br>
            ${Utils.escapeHtml(actName.toUpperCase())}
          </div>

          <!-- Chân trang -->
          <div class="cert-footer">
            <div class="cert-sign">
              <div class="cert-sign-date">${dateLabel}</div>
              <div class="cert-sign-org">TM. Ban Thường Vụ<br>Đoàn Đại Học Đà Nẵng</div>
              <div class="cert-sign-title">Phó Bí Thư</div>
              <span class="cert-signer-name">Ban Tổ Chức CLB CTXH DUT</span>
            </div>
          </div>

          <!-- Con dấu tròn -->
          <div class="cert-seal">${_sealSVG()}</div>
        </div>
      </div>

      <!-- Nút thao tác -->
      <div id="certActions">
        <button onclick="printCertificate()"
          style="padding:11px 24px;background:linear-gradient(135deg,#166534,#15803d);
                 border:none;border-radius:8px;color:white;font-size:14px;font-weight:700;
                 cursor:pointer;font-family:'Be Vietnam Pro',Arial,sans-serif;
                 display:flex;align-items:center;gap:8px;transition:all 0.2s"
          onmouseover="this.style.transform='translateY(-2px)'"
          onmouseout="this.style.transform=''">
          <i class="fa-solid fa-print"></i> In / Lưu PDF
        </button>
        <button onclick="downloadCertificateAsImage('${Utils.escapeHtml(memberName)}','${Utils.escapeHtml(activityData.activityID)}')"
          style="padding:11px 24px;background:linear-gradient(135deg,#1e3a8a,#1d4ed8);
                 border:none;border-radius:8px;color:white;font-size:14px;font-weight:700;
                 cursor:pointer;font-family:'Be Vietnam Pro',Arial,sans-serif;
                 display:flex;align-items:center;gap:8px;transition:all 0.2s"
          onmouseover="this.style.transform='translateY(-2px)'"
          onmouseout="this.style.transform=''">
          <i class="fa-solid fa-download"></i> Tải hình ảnh
        </button>
        <button onclick="closeCertificateModal()"
          style="padding:11px 20px;background:rgba(255,255,255,0.12);
                 border:1px solid rgba(255,255,255,0.25);border-radius:8px;
                 color:white;font-size:14px;cursor:pointer;
                 font-family:'Be Vietnam Pro',Arial,sans-serif;
                 transition:all 0.2s"
          onmouseover="this.style.background='rgba(255,255,255,0.2)'"
          onmouseout="this.style.background='rgba(255,255,255,0.12)'">
          <i class="fa-solid fa-xmark"></i> Đóng
        </button>
      </div>

      <div style="text-align:center;color:rgba(255,255,255,0.5);font-size:11px;margin-top:10px">
        <i class="fa-solid fa-circle-info"></i> Giấy chứng nhận được cấp cho thành viên đã được xác nhận điểm danh
      </div>
    </div>`;

  overlay.onclick = (e) => { if (e.target === overlay) closeCertificateModal(); };
  document.body.appendChild(overlay);
}

// ── SVG góc trang trí xanh lá (giống mẫu) ──────────────────────────────────
function _cornerSVG() {
  return `<svg viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" style="width:130px;height:130px">
    <polygon points="0,0 130,0 0,130" fill="#1a5c2a" opacity="0.9"/>
    <polygon points="0,0 110,0 0,110" fill="#2d7a3a" opacity="0.8"/>
    <polygon points="0,0 85,0 0,85" fill="#f0c040" opacity="0.5"/>
    <polygon points="0,0 60,0 0,60" fill="#1a5c2a" opacity="0.7"/>
    <line x1="0" y1="130" x2="130" y2="0" stroke="#d4a012" stroke-width="2" opacity="0.6"/>
    <line x1="0" y1="100" x2="100" y2="0" stroke="#d4a012" stroke-width="1.5" opacity="0.4"/>
  </svg>`;
}

// ── SVG con dấu tròn ─────────────────────────────────────────────────────────
function _sealSVG() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <circle cx="50" cy="50" r="47" fill="none" stroke="#c0392b" stroke-width="2.5" opacity="0.8"/>
    <circle cx="50" cy="50" r="40" fill="none" stroke="#c0392b" stroke-width="1" opacity="0.5"/>
    <!-- Chữ vòng tròn -->
    <path id="circlePath" fill="none" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"/>
    <text font-size="7" fill="#c0392b" font-family="Arial" font-weight="700" opacity="0.85">
      <textPath href="#circlePath" startOffset="0%">ĐOÀN THANH NIÊN · CLB CTXH · ĐẠI HỌC ĐÀ NẴNG · </textPath>
    </text>
    <!-- Nội dung giữa -->
    <text x="50" y="42" text-anchor="middle" font-size="7" font-weight="700"
          fill="#c0392b" font-family="Arial" opacity="0.85">BAN</text>
    <text x="50" y="51" text-anchor="middle" font-size="7" font-weight="700"
          fill="#c0392b" font-family="Arial" opacity="0.85">CHẤP HÀNH</text>
    <text x="50" y="60" text-anchor="middle" font-size="7" font-weight="700"
          fill="#c0392b" font-family="Arial" opacity="0.85">ĐOÀN</text>
    <text x="50" y="69" text-anchor="middle" font-size="7.5" font-weight="800"
          fill="#c0392b" font-family="Arial" opacity="0.85">ĐẠI HỌC</text>
    <text x="50" y="78" text-anchor="middle" font-size="7.5" font-weight="800"
          fill="#c0392b" font-family="Arial" opacity="0.85">ĐÀ NẴNG</text>
  </svg>`;
}

// ── In chứng nhận ─────────────────────────────────────────────────────────────
function printCertificate() {
  const certBox = document.getElementById('certModalBox');
  if (!certBox) return;

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Giấy Chứng Nhận</title>
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Be+Vietnam+Pro:wght@400;700;800;900&display=swap" rel="stylesheet">
    <style>
      @page { size: A4 landscape; margin: 0; }
      * { margin:0;padding:0;box-sizing:border-box; }
      body { display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f4e8; }
    </style>
  </head><body>
    ${certBox.outerHTML}
    <script>window.onload=()=>{window.print();window.close();}<\/script>
  </body></html>`);
  win.document.close();
}


// ── Tải chứng nhận dạng ảnh ──────────────────────────────────────────────────
async function downloadCertificateAsImage(memberName, activityId) {
  // Dùng html2canvas nếu có, không thì fallback print
  if (typeof html2canvas === 'undefined') {
    Toast.error('Thiếu thư viện html2canvas nên không thể tải ảnh chứng nhận');
    return;
  }

  try {
     
    const certBox = document.getElementById('certModalBox');
    if (!certBox){
      Toast.error('Không tìm thấy nội dung chứng nhận để tải ảnh');
      return;
    }
    const canvas  = await html2canvas(certBox, { scale: 2, useCORS: true, backgroundColor: '#f0f4e8' });
    const link    = document.createElement('a');
    link.download = `chung-nhan-${memberName.replace(/\s+/g,'-')}-${activityId}.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();
    Toast.success('Đã tải giấy chứng nhận!');
  } catch(e) {
    console.error(e);
    Toast.error(e.message || 'Không thể tải ảnh chứng nhận');
  }
}

// ── Đóng modal chứng nhận ─────────────────────────────────────────────────────
function closeCertificateModal() {
  const overlay = document.getElementById('certModal');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transform = 'scale(0.97)';
    overlay.style.transition = 'all 0.25s';
    setTimeout(() => overlay.remove(), 250);
  }
}

// ── Cache profile để dùng trong certificate ───────────────────────────────────
// Gọi hàm này sau khi load profile để certificate biết tên đầy đủ
function cacheMemberProfile(profile) {
  window._cachedProfile = profile;
}

// ══════════════════════════════════════════════════════════════════════════════
// HÀM ĐIỂM DANH (dùng chung, localStorage-based)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách điểm danh của một hoạt động
 * @param {number} activityId
 * @returns {Object} { userId: true/false, ... }
 */
function getAttendanceData(activityId) {
  try {
    return JSON.parse(localStorage.getItem(`attendance_${activityId}`) || '{}');
  } catch { return {}; }
}

/**
 * Lưu dữ liệu điểm danh
 * @param {number} activityId
 * @param {Object} data
 */
function saveAttendanceData(activityId, data) {
  localStorage.setItem(`attendance_${activityId}`, JSON.stringify(data));
}

/**
 * Toggle điểm danh cho một user trong một hoạt động
 * @param {number} activityId
 * @param {number} userId
 * @returns {boolean} trạng thái mới (true = đã điểm danh)
 */
function toggleAttendance(activityId, userId) {
  const data = getAttendanceData(activityId);
  data[userId] = !data[userId];
  saveAttendanceData(activityId, data);
  return data[userId];
}

/**
 * Kiểm tra user đã điểm danh chưa
 * @param {number} activityId
 * @param {number} userId
 * @returns {boolean}
 */
function isAttended(activityId, userId) {
  const data = getAttendanceData(activityId);
  return !!data[userId];
}

// Export ra window
window.getAttendanceData  = getAttendanceData;
window.saveAttendanceData = saveAttendanceData;
window.toggleAttendance   = toggleAttendance;
window.isAttended         = isAttended;

// ══════════════════════════════════════════════════════════════════════════════
// CÁC HÀM GỐC GIỮ NGUYÊN
// ══════════════════════════════════════════════════════════════════════════════

function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('open');
}

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
    Toast.error(e.message || 'Hủy đăng ký thất bại');
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

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

// ── Danh sách đăng ký (có điểm danh) ─────────────────────────────────────────
async function showRegistrationsList(activityId, activityName) {
  let modal = document.getElementById('registrationsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'registrationsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:760px">
        <div class="modal-header">
          <span style="font-size:1.2rem;font-weight:600">Danh sách đăng ký</span>
          <button class="modal-close" onclick="closeRegistrationsModal()">✕</button>
        </div>
        <div id="registrationsBody" style="max-height:520px;overflow-y:auto"></div>
      </div>`;
    document.body.appendChild(modal);
  }
  const body = document.getElementById('registrationsBody');
  body.innerHTML = '<div class="loading" style="padding:40px"><div class="spinner"></div></div>';
  modal.classList.add('open');
  modal.onclick = (e) => { if (e.target === modal) closeRegistrationsModal(); };

  try {
    const [r, activityRes] = await Promise.all([
      API.getActivityRegistrations(activityId, 1, 100),
      API.getActivity(activityId),
    ]);
    const list = r.data?.items || [];
    const activity = activityRes.data;
    const attendanceAllowed = new Date(activity.time) <= new Date();
    const attendedCount = list.filter(reg => reg.isAttended).length;

    if (!list.length) {
      body.innerHTML = '<div style="padding:40px;text-align:center;color:#111827">Chưa có ai đăng ký</div>';
      return;
    }

    body.innerHTML = `
      <div style="padding:4px 0">
        <!-- Header thống kê -->
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:16px;padding:12px 14px;
                    background:linear-gradient(135deg,#f0fdf4,#dcfce7);
                    border:1px solid #86efac;border-radius:10px">
          <div>
            <div style="font-weight:700;font-size:14px;color:#166534">${Utils.escapeHtml(activityName)}</div>
            <div style="font-size:12px;color:#16a34a;margin-top:2px">
              ${list.length} người đăng ký &nbsp;·&nbsp;
              <span id="attendedCountBadge" style="font-weight:700">${attendedCount}</span> đã điểm danh
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="attendAll(${activityId})"
              ${attendanceAllowed ? '' : 'disabled'}
              style="padding:7px 14px;background:#166534;border:none;border-radius:6px;
                     color:white;font-size:12px;font-weight:700;cursor:pointer;
                     font-family:'Be Vietnam Pro',Arial,sans-serif;
                     display:flex;align-items:center;gap:5px"
              title="Điểm danh tất cả">
              <i class="fa-solid fa-check-double"></i> Điểm danh tất cả
            </button>
            <button onclick="clearAllAttendance(${activityId})"
              ${attendanceAllowed ? '' : 'disabled'}
              style="padding:7px 14px;background:transparent;border:1px solid #dc2626;
                     border-radius:6px;color:#dc2626;font-size:12px;font-weight:700;
                     cursor:pointer;font-family:'Be Vietnam Pro',Arial,sans-serif"
              title="Xóa tất cả điểm danh">
              <i class="fa-solid fa-rotate-left"></i> Đặt lại
            </button>
          </div>
        </div>

        ${attendanceAllowed ? '' : `
          <div style="margin-bottom:14px;padding:10px 12px;background:#fef3c7;border:1px solid #fcd34d;
                      border-radius:8px;color:#92400e;font-size:12px;font-weight:600">
            Chỉ có thể điểm danh sau khi hoạt động bắt đầu (${Utils.formatDateTime(activity.time)}).
          </div>`}

        <!-- Bảng danh sách -->
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0;background:#f8f9fc">
              <th style="text-align:left;padding:10px 12px;font-size:11px;color:#475569;
                         font-weight:700;text-transform:uppercase;letter-spacing:0.05em">STT</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;color:#475569;
                         font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Họ tên</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;color:#475569;
                         font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Ngày đăng ký</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;color:#475569;
                         font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Trạng thái ĐK</th>
              <th style="text-align:center;padding:10px 12px;font-size:11px;color:#166534;
                         font-weight:700;text-transform:uppercase;letter-spacing:0.05em">
                <i class="fa-solid fa-clipboard-check"></i> Điểm danh
              </th>
            </tr>
          </thead>
          <tbody id="regTableBody">
            ${list.map((reg, idx) => {
              const attKey = reg.memberID || reg.registrationID;
              const attended = reg.isAttended === true;
              return `
              <tr id="reg-row-${attKey}" style="border-bottom:1px solid #f1f5f9;transition:background 0.2s"
                  onmouseover="this.style.background='#f8f9fc'"
                  onmouseout="this.style.background='transparent'">
                <td style="padding:11px 12px;color:#94a3b8;font-size:12px">${idx + 1}</td>
                <td style="padding:11px 12px">
                  <div style="display:flex;align-items:center;gap:9px">
                    <div style="width:30px;height:30px;border-radius:50%;
                                background:${attended ? '#dcfce7' : '#f1f5f9'};
                                display:flex;align-items:center;justify-content:center;
                                font-size:11px;font-weight:700;
                                color:${attended ? '#166534' : '#94a3b8'};
                                flex-shrink:0;transition:all 0.2s"
                         id="avatar-${attKey}">
                      ${(reg.memberName || '?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                    </div>
                    <div style="font-weight:600;font-size:13px">${Utils.escapeHtml(reg.memberName || '—')}</div>
                  </div>
                </td>
                <td style="padding:11px 12px;font-size:12px;color:#64748b">
                  ${Utils.formatDateTime(reg.registerDate)}
                </td>
                <td style="padding:11px 12px">${Utils.statusLabel(reg.status)}</td>
                <td style="padding:11px 12px;text-align:center">
                  <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;
                                padding:6px 10px;border-radius:8px;transition:background 0.15s;
                                background:${attended ? 'rgba(22,101,52,0.08)' : 'rgba(100,116,139,0.06)'};"
                         id="att-label-${attKey}"
                         onmouseover="this.style.background='${attended ? 'rgba(22,101,52,0.15)' : 'rgba(100,116,139,0.12)'}'"
                         onmouseout="this.style.background='${attended ? 'rgba(22,101,52,0.08)' : 'rgba(100,116,139,0.06)'}'">
                    <input type="checkbox"
                           id="att-${attKey}"
                           ${attended ? 'checked' : ''}
                           ${attendanceAllowed ? '' : 'disabled'}
                           onchange="handleAttendanceToggle(${activityId}, ${reg.registrationID}, ${attKey}, this)"
                           style="width:18px;height:18px;cursor:pointer;accent-color:#166534;
                                  border-radius:4px">
                    <span id="att-text-${attKey}"
                          style="font-size:12px;font-weight:700;
                                 color:${attended ? '#166534' : '#94a3b8'}">
                      ${attended ? 'Đã điểm danh' : 'Chưa điểm danh'}
                    </span>
                  </label>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:#ff2d55">Lỗi: ${e.message}</div>`;
  }
}

// ── Toggle điểm danh từ checkbox ──────────────────────────────────────────────
async function handleAttendanceToggle(activityId, registrationId, attKey, checkbox) {
  const attended = checkbox.checked;
  try {
    await API.updateRegistrationAttendance(registrationId, attended);
    updateAttendanceRowUi(attKey, attended, checkbox);
    updateAttendanceCounterFromDom();
    Toast.success(attended ? 'Đã điểm danh' : 'Đã bỏ điểm danh');
  } catch (e) {
    checkbox.checked = !attended;
    Toast.error(e.message || 'Không thể cập nhật điểm danh');
  }
}

async function attendAll(activityId) {
  if (!confirm('Điểm danh tất cả thành viên trong danh sách?')) return;
  try {
    await API.updateAllAttendance(activityId, true);
    document.querySelectorAll(`input[id^="att-"]`).forEach(cb => {
      cb.checked = true;
      const attKey = cb.id.replace('att-', '');
      updateAttendanceRowUi(attKey, true, cb);
    });
    updateAttendanceCounterFromDom();
    Toast.success('Đã điểm danh tất cả thành viên!');
  } catch (e) {
    Toast.error(e.message || 'Không thể điểm danh tất cả');
  }
}

async function clearAllAttendance(activityId) {
  if (!confirm('Đặt lại tất cả điểm danh? Hành động này không thể hoàn tác.')) return;
  try {
    await API.updateAllAttendance(activityId, false);
    document.querySelectorAll(`input[id^="att-"]`).forEach(cb => {
      cb.checked = false;
      const attKey = cb.id.replace('att-', '');
      updateAttendanceRowUi(attKey, false, cb);
    });
    updateAttendanceCounterFromDom();
    Toast.info('Đã đặt lại tất cả điểm danh');
  } catch (e) {
    Toast.error(e.message || 'Không thể đặt lại điểm danh');
  }
}

function updateAttendanceRowUi(attKey, attended, checkbox) {
  const textEl   = document.getElementById(`att-text-${attKey}`);
  const avatarEl = document.getElementById(`avatar-${attKey}`);
  const labelEl  = checkbox?.closest('label');
  if (textEl)   { textEl.textContent = attended ? 'Đã điểm danh' : 'Chưa điểm danh'; textEl.style.color = attended ? '#166534' : '#94a3b8'; }
  if (avatarEl) { avatarEl.style.background = attended ? '#dcfce7' : '#f1f5f9'; avatarEl.style.color = attended ? '#166534' : '#94a3b8'; }
  if (labelEl)  { labelEl.style.background = attended ? 'rgba(22,101,52,0.08)' : 'rgba(100,116,139,0.06)'; }
}

function updateAttendanceCounterFromDom() {
  const count = document.querySelectorAll('input[id^="att-"]:checked').length;
  const badge = document.getElementById('attendedCountBadge');
  if (badge) badge.textContent = count;
}

function updateAttendanceCounter(activityId) {
  updateAttendanceCounterFromDom();
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
    const r    = await API.getMyRegistrations(1, 50);
    const list = r.data?.items || [];
    if (!list.length) {
      body.innerHTML = '<div style="padding:40px;text-align:center;color:#000000">Bạn chưa đăng ký hoạt động nào</div>';
      return;
    }
    const user = Auth.getUser();
    body.innerHTML = `
      <div style="padding:4px 0">
        <div style="margin-bottom:16px;padding:8px 12px;background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;color:#111827">
          📊 Tổng: ${list.length} hoạt động
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${list.map(reg => {
            const attended = reg.isAttended === true;
            const actDate  = reg.registerDate ? new Date(reg.registerDate) : null;
            const isPast   = actDate && actDate <= new Date();
            return `
            <div style="background:#ffffff;border-radius:10px;padding:14px;
                        border:1px solid #e2e8f0;cursor:pointer;
                        box-shadow:0 1px 4px rgba(0,0,0,0.05)"
                 onclick="showActivityDetail(${reg.activityID})">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div style="font-weight:600;margin-bottom:4px">${Utils.escapeHtml(reg.activityName)}</div>
                  <div style="font-size:12px;color:#111827">
                    <i class="fa-solid fa-calendar-days"></i> ${Utils.formatDateTime(reg.registerDate)}
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
                  ${Utils.statusLabel(reg.status)}
                  ${isPast && attended ? `
                    <span style="font-size:11px;background:#dcfce7;color:#166534;
                                 padding:2px 7px;border-radius:4px;border:1px solid #86efac;font-weight:700">
                      <i class="fa-solid fa-certificate"></i> Có chứng nhận
                    </span>` : ''}
                  ${isPast && !attended ? `
                    <span style="font-size:11px;background:#fef3c7;color:#b45309;
                                 padding:2px 7px;border-radius:4px;border:1px solid #fcd34d;font-weight:700">
                      ⏳ Chờ điểm danh
                    </span>` : ''}
                </div>
              </div>
            </div>`;
          }).join('')}
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

// Certificate exports
window.openCertificateModal      = openCertificateModal;
window.closeCertificateModal     = closeCertificateModal;
window.printCertificate          = printCertificate;
window.downloadCertificateAsImage = downloadCertificateAsImage;
window.cacheMemberProfile        = cacheMemberProfile;

// Attendance exports
window.handleAttendanceToggle = handleAttendanceToggle;
window.attendAll              = attendAll;
window.clearAllAttendance     = clearAllAttendance;
window.updateAttendanceCounter = updateAttendanceCounter;
