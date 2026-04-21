// ================================================
// admin-core.js
// Khởi động dashboard, điều hướng sidebar,
// thống kê tổng quan, và modal dùng chung
// ================================================

document.addEventListener('DOMContentLoaded', () => {
  // Kiểm tra quyền truy cập
  if (!Auth.isLoggedIn() || (!Auth.isExecutive() && !Auth.isAdmin())) {
    Toast.error('Không có quyền truy cập');
    setTimeout(() => location.href = 'index1.html', 800);
    return;
  }

  // Ẩn các mục chỉ dành cho Admin nếu là ExecutiveBoard
  if (!Auth.isAdmin()) {
    document.getElementById('adminGrpLbl')?.remove();
    document.getElementById('usersBtn')?.remove();
    document.getElementById('logsBtn')?.remove();
  }

  // Hiển thị ngày hiện tại
  const el = document.getElementById('dateLabel');
  if (el) {
    el.textContent = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  updateNavbar();
  loadStats();
});

// ── Điều hướng sidebar ────────────────────────────────────────────────────────
function showP(name) {
  document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.adm-item').forEach(i => i.classList.remove('active'));
  document.getElementById('p-' + name)?.classList.add('active');
  document.querySelector(`[data-p="${name}"]`)?.classList.add('active');

  const handlers = {
    members:    loadMembers,
    activities: loadActivitiesAdmin,
    posts:      loadPostsAdmin,
    users:      loadUsers,
    logs:       loadLogs,
  };
  handlers[name]?.();
}

// ── Thống kê tổng quan (Overview panel) ──────────────────────────────────────
async function loadStats() {
  try {
    const [mr, ar, pr] = await Promise.all([
      request('GET', '/members', null, true),
      request('GET', '/activities', null, true),
      request('GET', '/posts', null, true),
    ]);

    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };

    const members = mr.data?.items || mr.data || [];
    const acts    = ar.data?.items || ar.data || [];
    const posts   = pr.data?.items || pr.data || [];

    set('sMembers',  members.length);
    set('sOpenActs', acts.filter(a => a.status === 'Open').length);
    set('sPosts',    posts.length);
    set('sAllActs',  acts.length);
  } catch(e) {
    console.error('loadStats error:', e);
  }
}

// ── Modal dùng chung cho toàn dashboard ──────────────────────────────────────
function openModal(title, bodyHtml, onSave) {
  const m = document.getElementById('gModal');
  document.getElementById('gModalInner').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${Utils.escapeHtml(title)}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    ${bodyHtml}`;
  m.classList.add('open');
  m._save = onSave;
  m.onclick = e => { if (e.target === m) closeModal(); };
}

function closeModal() {
  document.getElementById('gModal').classList.remove('open');
}

// ── Navbar cho admin ──────────────────────────────────────────────────────────
function updateNavbar() {
  const el = document.getElementById('navActions');
  if (!el) return;
  const u = Auth.getUser();
  if (!u) return;
  el.innerHTML = `
    <span class="navbar-user">
      <i class="fa-solid fa-crown" style="color:rgb(255,212,59)"></i>
      ${Utils.escapeHtml(u.username)}
      <span style="color:#475569;font-size:11px">(${u.role})</span>
    </span>
    <button onclick="logout()" class="btn-secondary btn-sm">
      <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
    </button>`;
}