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
  loadDashboardCharts();
});

// ── Điều hướng sidebar ────────────────────────────────────────────────────────
function showP(name) {
  document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.adm-item').forEach(i => i.classList.remove('active'));
  document.getElementById('p-' + name)?.classList.add('active');
  document.querySelector(`[data-p="${name}"]`)?.classList.add('active');

  // FIX: đổi loadUsers → UsersPanel.init, loadLogs → LogsPanel.init
  const handlers = {
    members:    () => loadMembers?.(),
    activities: () => loadActivitiesAdmin?.(),
    posts:      () => loadPostsAdmin?.(),
    funds:      () => FundPanel?.init(),
    users:      () => UsersPanel?.init(),
    logs:       () => LogsPanel?.init(),
  };
  handlers[name]?.();
}

// ── Thống kê tổng quan (Overview panel) ──────────────────────────────────────
async function loadStats() {
  try {
    const [mr, ar, pr] = await Promise.all([
      API.getMembers(),
      API.getActivities(),
      API.getPosts(),
    ]);

    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };

    const members = mr.data?.items || mr.data || [];
    const acts    = ar.data?.items || ar.data || [];
    const posts   = pr.data?.items || pr.data || [];

    set('sMembers',  members.filter(m => m.status === 'Active').length);
    set('sOpenActs', acts.filter(a => a.status === 'Open').length);
    set('sPosts',    posts.length);
    set('sAllActs',  acts.length);
  } catch {
    // Thống kê không bắt buộc, bỏ qua lỗi
  }
}

// ── Modal dùng chung cho toàn dashboard ──────────────────────────────────────
function openModal(title, bodyHtml, onSave) {
  const m = document.getElementById('gModal');
  const inner = document.getElementById('gModalInner');
  if (inner) {
    inner.removeAttribute('style');
    inner.classList.remove('member-applications-modal');
  }
  inner.innerHTML = `
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
  const m = document.getElementById('gModal');
  const inner = document.getElementById('gModalInner');
  m.classList.remove('open');
  if (inner) {
    inner.removeAttribute('style');
    inner.classList.remove('member-applications-modal');
  }
}

// ── Navbar cho admin ──────────────────────────────────────────────────────────
function updateNavbar() {
  const el = document.getElementById('navActions');
  if (!el) return;
  const u = Auth.getUser();
  if (!u) return;
  const displayName = Utils.displayText(u.displayName || u.fullName || u.studentCode || u.email, 'Người dùng');
  el.innerHTML = `
    <span class="navbar-user">
      <i class="fa-solid fa-crown" style="color:rgb(255,212,59)"></i>
      ${Utils.escapeHtml(displayName)}
      <span style="color:#475569;font-size:11px">(${u.role})</span>
    </span>
    <button onclick="logout()" class="btn-secondary btn-sm">
      <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
    </button>`;
}
// ── Dashboard charts ─────────────────────────────────────────────────────────
let activitiesByMonthChart = null;
let fundMonthlyChart = null;

async function loadDashboardCharts() {
  await Promise.all([
    loadActivitiesByMonthLineChart(),
    loadTopActivitiesList(),
    loadFundMonthlyChart()
  ]);
}

async function loadActivitiesByMonthLineChart() {
  const canvas = document.getElementById('activitiesByMonthLineChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const yearInput = document.getElementById('activitiesByMonthChartYear');
  if (yearInput && !yearInput.value) {
    yearInput.value = new Date().getFullYear();
  }

  const year = Number(yearInput?.value || new Date().getFullYear());

  try {
    const res = await request('GET', `/dashboard/activities-by-month?year=${year}`, null, true);
    const data = res.data || [];

    if (activitiesByMonthChart) {
      activitiesByMonthChart.destroy();
    }

    activitiesByMonthChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(x => x.month),
        datasets: [{
          label: 'Số hoạt động',
          data: data.map(x => x.count),
          borderColor: '#e8213a',
          backgroundColor: 'rgba(232, 33, 58, 0.12)',
          pointBackgroundColor: '#e8213a',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 3,
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#111827',
              font: {
                family: 'Be Vietnam Pro',
                weight: '700'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.parsed.y} hoạt động`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#111827',
              font: {
                family: 'Be Vietnam Pro',
                weight: '600'
              }
            },
            grid: {
              color: '#f1f5f9'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#111827',
              font: {
                family: 'Be Vietnam Pro',
                weight: '600'
              }
            },
            grid: {
              color: '#e2e8f0'
            }
          }
        }
      }
    });
  } catch (e) {
    console.warn('loadActivitiesByMonthLineChart:', e.message);
  }
}

async function loadFundMonthlyChart() {
  const canvas = document.getElementById('fundMonthlyChart');
  const message = document.getElementById('fundMonthlyChartMessage');
  if (!canvas || typeof Chart === 'undefined') return;

  const yearInput = document.getElementById('fundMonthlyChartYear');
  if (yearInput && !yearInput.value) {
    yearInput.value = new Date().getFullYear();
  }

  const year = Number(yearInput?.value || new Date().getFullYear());

  try {
    if (message) message.style.display = 'none';
    canvas.style.display = 'block';

    const reports = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        request('GET', `/funds/reports?year=${year}&month=${index + 1}`, null, true)
      )
    );

    const data = reports.map(r => r.data || {});
    const labels = Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`);
    const income = data.map(x => Number(x.totalIncome || 0));
    const expense = data.map(x => Number(x.totalExpense || 0));
    const net = data.map(x => Number(x.netAmount || 0));

    if (fundMonthlyChart) {
      fundMonthlyChart.destroy();
    }

    const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

    fundMonthlyChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Thu',
            data: income,
            backgroundColor: 'rgba(22, 163, 74, 0.78)',
            borderColor: '#15803d',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 28,
            categoryPercentage: 0.62,
            barPercentage: 0.82
          },
          {
            type: 'bar',
            label: 'Chi',
            data: expense,
            backgroundColor: 'rgba(232, 33, 58, 0.78)',
            borderColor: '#e8213a',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 28,
            categoryPercentage: 0.62,
            barPercentage: 0.82
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 6,
            right: 16,
            bottom: 0,
            left: 0
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#111827',
              boxWidth: 16,
              boxHeight: 10,
              padding: 16,
              font: {
                family: 'Be Vietnam Pro',
                weight: '700'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: context => `${context.dataset.label}: ${money(context.parsed.y)}`,
              afterBody: items => {
                const index = items[0]?.dataIndex ?? 0;
                return `Chênh lệch: ${money(net[index])}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#111827',
              font: {
                family: 'Be Vietnam Pro',
                weight: '600'
              }
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#111827',
              font: {
                family: 'Be Vietnam Pro',
                weight: '600'
              },
              callback: value => {
                const number = Number(value || 0);
                if (Math.abs(number) >= 1000000) {
                  return `${(number / 1000000).toLocaleString('vi-VN')} tr`;
                }
                if (Math.abs(number) >= 1000) {
                  return `${(number / 1000).toLocaleString('vi-VN')}k`;
                }
                return `${number.toLocaleString('vi-VN')} đ`;
              }
            },
            grid: {
              color: '#e2e8f0'
            }
          }
        }
      }
    });
  } catch (e) {
    console.warn('loadFundMonthlyChart:', e.message);
    canvas.style.display = 'none';
    if (message) {
      message.textContent = 'Không tải được dữ liệu thu / chi quỹ';
      message.style.display = 'block';
    }
  }
}

async function loadTopActivitiesList() {
  const wrap = document.getElementById('topActivitiesList');
  if (!wrap) return;

  try {
    const res = await request('GET', '/dashboard/top-activities?top=5', null, true);
    const data = res.data || [];

    if (!data.length) {
      wrap.innerHTML = `
        <div style="text-align:center;padding:30px;color:#111827">
          Chưa có dữ liệu đăng ký
        </div>`;
      return;
    }

    const max = Math.max(...data.map(x => x.registeredCount || 0), 1);

    wrap.innerHTML = data.map((item, index) => {
      const percent = Math.round(((item.registeredCount || 0) / max) * 100);

      return `
        <div class="top-activity-item">
          <div class="top-activity-rank">${index + 1}</div>
          <div class="top-activity-info">
            <div class="top-activity-name" title="${Utils.escapeHtml(item.activityName || '')}">
              ${Utils.escapeHtml(item.activityName || 'Không tên')}
            </div>
            <div class="top-activity-count">
              ${item.registeredCount || 0} lượt đăng ký
            </div>
            <div class="top-activity-bar">
              <div class="top-activity-fill" style="width:${percent}%"></div>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:30px;color:#e8213a">
        Không tải được thống kê hoạt động
      </div>`;
  }
}
