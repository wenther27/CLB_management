const FundContributionPanel = {
  periods: [],
  members: [],
  activities: [],
  currentPeriodId: null,

  money(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
  },

  async init() {
    await Promise.all([this.loadMembers(), this.loadActivities(), this.loadPeriods()]);
  },

  async loadMembers() {
    try {
      const r = await API.getMembers('?pageSize=500&status=Active');
      this.members = r.data?.items || r.data || [];
    } catch {
      this.members = [];
    }
  },

  async loadActivities() {
    try {
      const r = await API.getActivities();
      this.activities = r.data?.items || r.data || [];
    } catch {
      this.activities = [];
    }
  },

  periodTitle(p) {
    return p?.title || `Quỹ tháng ${String(p?.month || '').padStart(2, '0')}/${p?.year || ''}`;
  },

  async loadPeriods() {
    const tbody = document.getElementById('fundPeriodBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="loading"><div class="spinner"></div></td></tr>';
    try {
      const r = await API.getFundCollectionPeriods();
      this.periods = r.data || [];
      if (!this.periods.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="fund-empty">Chưa có đợt thu quỹ</td></tr>';
        return;
      }
      tbody.innerHTML = this.periods.map(p => `
        <tr>
          <td>
            <strong>${Utils.escapeHtml(this.periodTitle(p))}</strong>
            <div style="color:#64748b;font-size:13px;margin-top:4px">${Utils.escapeHtml(p.category || 'Đóng quỹ')}</div>
          </td>
          <td>${String(p.month).padStart(2, '0')}/${p.year}</td>
          <td>${this.money(p.amount)}</td>
          <td>${p.paidMembers}/${p.totalMembers}</td>
          <td>${this.money(p.collectedAmount)}</td>
          <td>${this.money(p.remainingAmount)}</td>
          <td>${p.dueDate ? Utils.formatDate(p.dueDate) : '—'}</td>
          <td><span class="fund-pill ${p.status === 'Open' ? 'approved' : 'rejected'}">${p.status === 'Open' ? 'Đang mở' : 'Đã đóng'}</span></td>
          <td>
            <div class="fund-actions">
              <button
                class="btn-outline btn-sm"
                title="Xem danh sách nộp quỹ"
                aria-label="Xem danh sách nộp quỹ ${Utils.escapeHtml(this.periodTitle(p))}"
                onclick="FundContributionPanel.openMembersModal(${p.fundCollectionPeriodID})">
                <i class="fa-solid fa-users"></i>
              </button>
              <button class="btn-outline btn-sm" onclick="FundContributionPanel.toggleStatus(${p.fundCollectionPeriodID}, '${p.status === 'Open' ? 'Closed' : 'Open'}')">
                <i class="fa-solid fa-${p.status === 'Open' ? 'lock' : 'lock-open'}"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="9" style="color:#e8213a">${e.message}</td></tr>`;
    }
  },

  getPeriod(periodId) {
    return this.periods.find(p => p.fundCollectionPeriodID === periodId);
  },

  ensureMembersModal() {
    let modal = document.getElementById('fundMembersModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'fundMembersModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:980px">
        <div class="modal-header">
          <span style="font-size:1.2rem;font-weight:600">Danh sách nộp quỹ</span>
          <button class="modal-close" onclick="FundContributionPanel.closeMembersModal()">✕</button>
        </div>
        <div id="fundMembersModalBody" style="max-height:560px;overflow-y:auto"></div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  },

  closeMembersModal() {
    document.getElementById('fundMembersModal')?.classList.remove('open');
  },

  async openMembersModal(periodId) {
    this.currentPeriodId = periodId;
    const modal = this.ensureMembersModal();
    const body = document.getElementById('fundMembersModalBody');
    const period = this.getPeriod(periodId);
    if (!body) return;

    body.innerHTML = '<div class="loading" style="padding:40px"><div class="spinner"></div></div>';
    modal.classList.add('open');
    modal.onclick = e => {
      if (e.target === modal) this.closeMembersModal();
    };

    try {
      const r = await API.getFundPeriodMembers(periodId);
      const list = r.data || [];
      const paidCount = list.filter(m => m.status === 'Paid').length;
      const periodLabel = period ? `${String(period.month).padStart(2, '0')}/${period.year}` : '—';
      const statusLabel = period?.status === 'Open' ? 'Đang mở' : 'Đã đóng';
      const statusClass = period?.status === 'Open' ? 'approved' : 'rejected';

      body.innerHTML = `
        <div class="fund-members-modal-wrap">
          <div class="fund-members-summary">
            <div>
              <div class="fund-members-title">${Utils.escapeHtml(this.periodTitle(period))}</div>
              <div class="fund-members-meta">
                Kỳ ${periodLabel} · ${paidCount}/${list.length} thành viên đã nộp
                ${period ? ` · Đã thu ${this.money(period.collectedAmount)} · Còn thiếu ${this.money(period.remainingAmount)}` : ''}
              </div>
            </div>
            <span class="fund-pill ${statusClass}">${statusLabel}</span>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Thành viên</th>
                  <th>Lớp</th>
                  <th>Khoa</th>
                  <th>Số tiền</th>
                  <th>Mã thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Đã nộp lúc</th>
                </tr>
              </thead>
              <tbody>
                ${list.length ? list.map((m, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${Utils.escapeHtml(m.fullName)}</td>
                    <td>${Utils.escapeHtml(m.className || '—')}</td>
                    <td>${Utils.escapeHtml(m.faculty || '—')}</td>
                    <td>${this.money(m.expectedAmount)}</td>
                    <td><code>${m.paymentCode}</code></td>
                    <td>${m.status === 'Paid'
                      ? '<span class="fund-pill approved">Đã nộp</span>'
                      : '<span class="fund-pill pending">Chưa nộp</span>'}</td>
                    <td>${m.paidAt ? Utils.formatDateTime(m.paidAt) : '—'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="8" class="fund-empty">Chưa có thành viên trong đợt thu này</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (e) {
      body.innerHTML = `<div style="padding:40px;text-align:center;color:#e8213a">Lỗi: ${e.message}</div>`;
    }
  },

  openPeriodModal() {
    const now = new Date();
    const activityOptions = this.activities.map(a =>
      `<option value="${a.activityID}">${Utils.escapeHtml(a.activityName)}</option>`
    ).join('');

    openModal('Tạo đợt thu quỹ', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tên đợt thu *</label>
          <input id="fp-title" class="form-control" value="Quỹ tháng ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}">
        </div>
        <div class="form-group">
          <label class="form-label">Danh mục *</label>
          <input id="fp-category" class="form-control" list="fp-category-list" value="Đóng quỹ tháng" placeholder="Ví dụ: Thu quỹ tháng, Ủng hộ hoạt động...">
          <datalist id="fp-category-list">
            <option value="Đóng quỹ tháng"></option>
            <option value="Ủng hộ hoạt động"></option>
            <option value="Thu quỹ bổ sung"></option>
            <option value="Ủng hộ CLB"></option>
          </datalist>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Năm *</label>
          <input id="fp-year" class="form-control" type="number" value="${now.getFullYear()}" min="2020">
        </div>
        <div class="form-group">
          <label class="form-label">Tháng *</label>
          <input id="fp-month" class="form-control" type="number" value="${now.getMonth() + 1}" min="1" max="12">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Số tiền mỗi thành viên *</label>
          <input id="fp-amount" class="form-control" type="number" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Hạn nộp</label>
          <input id="fp-due" class="form-control" type="date">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Gắn với hoạt động</label>
        <select id="fp-activity" class="form-control">
          <option value="">Không gắn hoạt động</option>
          ${activityOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Chọn thành viên phải nộp *</label>
        <div class="fund-member-picker">
          <div class="fund-member-picker-toolbar">
            <input id="fp-member-search" class="form-control" placeholder="Tìm theo tên, lớp, khoa..." oninput="FundContributionPanel.filterMemberPicker()">
            <button type="button" class="btn-outline btn-sm" onclick="FundContributionPanel.toggleAllMembers(true)">Chọn tất cả</button>
            <button type="button" class="btn-outline btn-sm" onclick="FundContributionPanel.toggleAllMembers(false)">Bỏ chọn</button>
          </div>
          <div class="fund-member-picker-meta"><span id="fp-member-count">0</span> thành viên được chọn</div>
          <div id="fp-member-list" class="fund-member-picker-list">
            ${this.memberPickerRows()}
          </div>
        </div>
      </div>
      <button class="btn-primary w-100" onclick="FundContributionPanel.savePeriod()">
        <i class="fa-solid fa-floppy-disk"></i> Tạo đợt thu và gửi QR
      </button>
    `);
    this.updateSelectedCount();
  },

  memberPickerRows() {
    if (!this.members.length) {
      return '<div class="fund-empty" style="padding:18px">Không tải được danh sách thành viên</div>';
    }
    return this.members.map(m => `
      <label class="fund-member-picker-row" data-search="${Utils.escapeHtml(`${m.fullName} ${m.className || ''} ${m.faculty || ''}`.toLowerCase())}">
        <input type="checkbox" class="fp-member-check" value="${m.memberID}" onchange="FundContributionPanel.updateSelectedCount()">
        <span class="member-avatar-mini">${Utils.escapeHtml((m.fullName || '?').trim().charAt(0).toUpperCase())}</span>
        <span>
          <strong>${Utils.escapeHtml(m.fullName)}</strong>
          <small>${Utils.escapeHtml([m.className, m.faculty].filter(Boolean).join(' · ') || '—')}</small>
        </span>
      </label>
    `).join('');
  },

  filterMemberPicker() {
    const keyword = (document.getElementById('fp-member-search')?.value || '').trim().toLowerCase();
    document.querySelectorAll('.fund-member-picker-row').forEach(row => {
      row.style.display = row.dataset.search.includes(keyword) ? 'flex' : 'none';
    });
  },

  toggleAllMembers(checked) {
    document.querySelectorAll('.fund-member-picker-row').forEach(row => {
      if (row.style.display === 'none') return;
      const box = row.querySelector('.fp-member-check');
      if (box) box.checked = checked;
    });
    this.updateSelectedCount();
  },

  updateSelectedCount() {
    const count = document.querySelectorAll('.fp-member-check:checked').length;
    const el = document.getElementById('fp-member-count');
    if (el) el.textContent = count;
  },

  async savePeriod() {
    const memberIDs = Array.from(document.querySelectorAll('.fp-member-check:checked'))
      .map(x => Number(x.value))
      .filter(Boolean);

    const payload = {
      year: Number(document.getElementById('fp-year').value),
      month: Number(document.getElementById('fp-month').value),
      title: document.getElementById('fp-title').value.trim(),
      category: document.getElementById('fp-category').value.trim(),
      amount: Number(document.getElementById('fp-amount').value),
      dueDate: document.getElementById('fp-due').value || null,
      activityID: Number(document.getElementById('fp-activity').value) || null,
      memberIDs
    };
    if (!payload.title || !payload.category || !payload.amount) {
      Toast.error('Vui lòng nhập tên đợt thu, danh mục và số tiền');
      return;
    }
    if (!memberIDs.length) {
      Toast.error('Vui lòng chọn ít nhất một thành viên phải nộp');
      return;
    }
    try {
      await API.createFundCollectionPeriod(payload);
      Toast.success('Đã tạo đợt thu và gửi QR vào hồ sơ thành viên');
      closeModal();
      await this.loadPeriods();
    } catch (e) {
      Toast.error(e.message);
    }
  },

  async toggleStatus(id, status) {
    try {
      await API.updateFundCollectionPeriodStatus(id, status);
      Toast.success(status === 'Open' ? 'Đã mở lại đợt thu' : 'Đã đóng đợt thu');
      await this.loadPeriods();
    } catch (e) {
      Toast.error(e.message);
    }
  }
};

window.FundContributionPanel = FundContributionPanel;
