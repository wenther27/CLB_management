const FundContributionPanel = {
  periods: [],
  currentPeriodId: null,

  money(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
  },

  async init() {
    await this.loadPeriods();
  },

  async loadPeriods() {
    const tbody = document.getElementById('fundPeriodBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="loading"><div class="spinner"></div></td></tr>';
    try {
      const r = await API.getFundCollectionPeriods();
      this.periods = r.data || [];
      if (!this.periods.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="fund-empty">Chưa có đợt thu quỹ tháng</td></tr>';
        return;
      }
      tbody.innerHTML = this.periods.map(p => `
        <tr>
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
                title="Xem danh sách đóng quỹ"
                aria-label="Xem danh sách đóng quỹ tháng ${String(p.month).padStart(2, '0')}/${p.year}"
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
      tbody.innerHTML = `<tr><td colspan="8" style="color:#e8213a">${e.message}</td></tr>`;
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
      <div class="modal" style="max-width:920px">
        <div class="modal-header">
          <span style="font-size:1.2rem;font-weight:600">Danh sách đóng quỹ</span>
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
      const monthLabel = period ? `${String(period.month).padStart(2, '0')}/${period.year}` : '—';
      const statusLabel = period?.status === 'Open' ? 'Đang mở' : 'Đã đóng';
      const statusClass = period?.status === 'Open' ? 'approved' : 'rejected';

      body.innerHTML = `
        <div class="fund-members-modal-wrap">
          <div class="fund-members-summary">
            <div>
              <div class="fund-members-title">Quỹ tháng ${monthLabel}</div>
              <div class="fund-members-meta">
                ${paidCount}/${list.length} thành viên đã đóng
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
                  <th>Đã đóng lúc</th>
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
                      ? '<span class="fund-pill approved">Đã đóng</span>'
                      : '<span class="fund-pill pending">Chưa đóng</span>'}</td>
                    <td>${m.paidAt ? Utils.formatDateTime(m.paidAt) : '—'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="8" class="fund-empty">Chưa có thành viên trong tháng này</td></tr>'}
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
    openModal('Mở đợt thu quỹ tháng', `
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
          <label class="form-label">Hạn đóng</label>
          <input id="fp-due" class="form-control" type="date">
        </div>
      </div>
      <button class="btn-primary w-100" onclick="FundContributionPanel.savePeriod()">
        <i class="fa-solid fa-floppy-disk"></i> Mở đợt thu quỹ
      </button>
    `);
  },

  async savePeriod() {
    const payload = {
      year: Number(document.getElementById('fp-year').value),
      month: Number(document.getElementById('fp-month').value),
      amount: Number(document.getElementById('fp-amount').value),
      dueDate: document.getElementById('fp-due').value || null
    };
    if (!payload.amount) {
      Toast.error('Vui lòng nhập số tiền quỹ');
      return;
    }
    try {
      await API.createFundCollectionPeriod(payload);
      Toast.success('Đã mở đợt thu quỹ tháng');
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
