// ================================================
// members.js - Trang danh sách ban chấp hành
// ================================================

const DEPARTMENT_LABELS = {
  'BCN': 'Ban Chủ Nhiệm',
  'BTT': 'Ban Truyền Thông',
  'BPT': 'Ban Phong Trào'
};

// Hàm lấy tên hiển thị
function getDeptLabel(code) {
  return DEPARTMENT_LABELS[code] || code;
}

document.addEventListener('DOMContentLoaded', async () => {
  updateNavbar();
  await fetchMembers();
});

async function fetchMembers() {
  const loading = document.getElementById('boardLoading');
  const content = document.getElementById('boardContent');
  const error   = document.getElementById('boardError');

  try {
    const res  = await fetch('http://localhost:5190/api/member-board');
    const data = await res.json();

    if (!data.success || !data.data?.length) {
      throw new Error('Chưa có dữ liệu thành viên');
    }

    loading.style.display = 'none';
    content.style.display = 'block';
    content.innerHTML = data.data.map(renderDepartment).join('');

    // Trigger staggered animation sau khi render
    triggerStaggeredAnimation();

  } catch (e) {
    loading.style.display = 'none';
    error.style.display   = 'block';
    error.innerHTML = `
      <i class="fa-solid fa-circle-exclamation" style="font-size:2rem;margin-bottom:12px"></i>
      <p>${e.message}</p>`;
  }
}

// Render 1 department section
function renderDepartment(dept) {
  const isBCN     = dept.department === 'BCN';
  const gridClass = isBCN ? 'grid-bcn' : 'grid-dept';

  return `
    <div class="dept-section">
      <div class="dept-header">
        <span class="dept-title">
          <i class="fa-solid fa-users" style="margin-right:6px"></i>
          ${getDeptLabel(dept.department)}  <!-- ← đổi chỗ này -->
        </span>
        <div class="dept-line"></div>
      </div>
      <div class="dept-grid ${gridClass}">
        ${dept.members.map((m, i) => renderCard(m, i)).join('')}
      </div>
    </div>`;
}

// ── Mở modal chi tiết thành viên ──
function openMemberModal(member) {
  // Tạo modal nếu chưa có
  let overlay = document.getElementById('memberModalOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'memberModalOverlay';
    overlay.className = 'member-modal-overlay';
    overlay.innerHTML = `<div class="member-modal" id="memberModal"></div>`;
    document.body.appendChild(overlay);

    // Đóng khi click nền
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMemberModal();
    });

    // Đóng khi nhấn Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMemberModal();
    });
  }

  const initials = (member.fullName || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const imgHtml = member.avatarUrl
    ? `<img class="member-modal-img"
            src="${member.avatarUrl.startsWith('http')
              ? member.avatarUrl
              : 'http://localhost:5190' + member.avatarUrl}"
            alt="${escapeHtml(member.fullName)}"
            onerror="this.style.display='none';
                     this.nextSibling.style.display='flex'">`
    : '';

  // Format ngày tham gia
  const joinDate = member.joinDate
    ? new Date(member.joinDate).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      })
    : 'Chưa cập nhật';

  document.getElementById('memberModal').innerHTML = `
    <button class="member-modal-close" onclick="closeMemberModal()">✕</button>

    <div class="member-modal-img-wrap">
      ${imgHtml}
      <div class="member-modal-img-placeholder"
           style="${member.avatarUrl ? 'display:none' : ''}">
        ${initials}
      </div>
    </div>

    <div class="member-modal-body">
      <div class="member-modal-name">${escapeHtml(member.fullName)}</div>
      <div class="member-modal-position">
        ${escapeHtml(member.position || 'Thành viên')}
      </div>

      <div class="member-modal-info">
        <div class="member-modal-row">
          <div class="member-modal-row-icon">
            <i class="fa-solid fa-building-columns"></i>
          </div>
          <div>
            <div class="member-modal-row-label">Khoa</div>
            <div class="member-modal-row-value">
              ${escapeHtml(member.faculty || 'Chưa cập nhật')}
            </div>
          </div>
        </div>

        <div class="member-modal-row">
          <div class="member-modal-row-icon">
            <i class="fa-solid fa-calendar-plus"></i>
          </div>
          <div>
            <div class="member-modal-row-label">Ngày tham gia</div>
            <div class="member-modal-row-value">${joinDate}</div>
          </div>
        </div>

        <div class="member-modal-row">
          <div class="member-modal-row-icon">
            <i class="fa-solid fa-envelope"></i>
          </div>
          <div>
            <div class="member-modal-row-label">Liên hệ</div>
            <div class="member-modal-row-value">
              ${member.contactEmail
                ? `<a href="mailto:${escapeHtml(member.contactEmail)}"
                      style="color:#60a5fa;text-decoration:none">
                    ${escapeHtml(member.contactEmail)}
                  </a>`
                : (member.email
                  ? `<a href="mailto:${escapeHtml(member.email)}"
                        style="color:#60a5fa;text-decoration:none">
                      ${escapeHtml(member.email)}
                    </a>`
                  : 'Chưa cập nhật')}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Mở modal
  requestAnimationFrame(() => overlay.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function closeMemberModal() {
  const overlay = document.getElementById('memberModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Cập nhật renderCard — thêm onclick ──
function renderCard(member, index) {
  const initials = (member.fullName || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const imgHtml = member.avatarUrl
    ? `<img src="${member.avatarUrl.startsWith('http')
          ? member.avatarUrl
          : 'http://localhost:5190' + member.avatarUrl}"
           alt="${escapeHtml(member.fullName)}"
           onerror="this.style.display='none';
                    this.nextSibling.style.display='flex'">`
    : '';

  // Lưu data vào attribute để dùng khi click
  const memberData = encodeURIComponent(JSON.stringify(member));

  return `
    <div class="member-card" data-index="${index}"
         onclick="openMemberModal(JSON.parse(decodeURIComponent('${memberData}')))">
      <div class="member-card-img">
        ${imgHtml}
        <div class="avatar-placeholder"
             style="${member.avatarUrl ? 'display:none' : ''}">
          ${initials}
        </div>
      </div>
      <div class="member-card-info">
        <div class="member-card-name">${escapeHtml(member.fullName)}</div>
        <div class="member-card-position">
          ${escapeHtml(member.position || 'Thành viên')}
        </div>
      </div>
    </div>`;
}

// Staggered animation: mỗi card hiện lần lượt cách nhau 0.1s
function triggerStaggeredAnimation() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const section = entry.target;
      const cards   = section.querySelectorAll('.member-card');

      cards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.add('show');
        }, i * 100); // 0.1s delay mỗi card
      });

      observer.unobserve(section);
    });
  }, { threshold: 0.1 });

  // Observe từng department section
  document.querySelectorAll('.dept-section').forEach(el => {
    observer.observe(el);
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}