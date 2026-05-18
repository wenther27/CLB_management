const MemberFundPanel = {
  currentContribution: null,
  history: [],
  selectedContributionId: null,
  refreshTimer: null,

  async init() {
    await this.load();
  },

  money(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
  },

  async load() {
    const wrap = document.getElementById('memberFundContent');
    if (!wrap) return;
    wrap.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const [currentResult, historyResult] = await Promise.all([
        API.getMyCurrentFundContribution(),
        API.getMyFundContributionHistory()
      ]);

      this.currentContribution = currentResult.data;
      this.history = historyResult.data || [];

      if (!this.history.length && this.currentContribution) {
        this.history = [this.currentContribution];
      }

      if (!this.history.length) {
        this.stopAutoRefresh();
        wrap.innerHTML = '<div class="empty" style="padding:32px">Hiện chưa có đợt thu quỹ nào.</div>';
        return;
      }

      if (!this.selectedContributionId || !this.history.some(item => item.fundContributionID === this.selectedContributionId)) {
        this.selectedContributionId =
          this.currentContribution?.fundContributionID ||
          this.history[0].fundContributionID;
      }

      this.render();
    } catch (e) {
      wrap.innerHTML = `<div style="color:#ff2d55">${e.message}</div>`;
    }
  },

  getSelectedContribution() {
    return this.history.find(item => item.fundContributionID === this.selectedContributionId) ||
      this.currentContribution ||
      this.history[0] ||
      null;
  },

  selectContribution(id) {
    this.selectedContributionId = Number(id);
    this.render();
  },

  render() {
    const c = this.getSelectedContribution();
    if (!c) return;

    const paid = c.status === 'Paid';
    const periodOpen = c.periodStatus === 'Open';
    const shouldPoll = !paid && periodOpen;
    if (shouldPoll) this.startAutoRefresh();
    else this.stopAutoRefresh();

    document.getElementById('memberFundContent').innerHTML = `
      ${this.renderSelector()}
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <div>
            <div style="font-size:16px;font-weight:800">Quỹ tháng ${String(c.month).padStart(2, '0')}/${c.year}</div>
            <div style="color:#64748b;margin-top:6px">Số tiền cần đóng: <strong>${this.money(c.expectedAmount)}</strong></div>
            <div style="color:#64748b;margin-top:4px">Nội dung chuyển khoản: <code>${c.paymentCode}</code></div>
            <div style="color:#64748b;margin-top:4px">Hạn đóng: ${c.dueDate ? Utils.formatDate(c.dueDate) : 'Không giới hạn'}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
            ${periodOpen
              ? '<span class="badge badge-active">Đang mở</span>'
              : '<span class="badge badge-closed">Đã đóng</span>'}
            ${paid
              ? '<span class="badge badge-active">Đã nộp</span>'
              : '<span class="badge badge-open">Chưa nộp</span>'}
          </div>
        </div>

        ${paid ? `
          <div style="margin-top:18px;color:#15803d;font-weight:700">
            <i class="fa-solid fa-circle-check"></i> Đã xác thực lúc ${Utils.formatDateTime(c.paidAt)}
          </div>
        ` : periodOpen ? `
          <div style="display:grid;grid-template-columns:220px 1fr;gap:18px;align-items:center;margin-top:18px">
            <img src="${c.qrUrl}" alt="Mã QR đóng quỹ tháng" style="width:220px;height:220px;object-fit:contain;border:1px solid #e2e8f0;border-radius:12px;background:#fff">
            <div style="color:#334155;line-height:1.7">
              <div><strong>Quét mã để chuyển khoản</strong></div>
              <div>Ngân hàng nhận: MB</div>
              <div>Số tiền và nội dung đã được điền sẵn trong QR.</div>
              <div style="margin-top:10px;color:#b45309">
                Sau khi ngân hàng báo giao dịch thành công, hệ thống sẽ tự kiểm tra và cập nhật trạng thái.
              </div>
              <button type="button" class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="MemberFundPanel.refreshNow()">
                <i class="fa-solid fa-arrows-rotate"></i> Kiểm tra lại
              </button>
            </div>
          </div>
        ` : `
          <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:#fff7ed;color:#9a3412">
            <i class="fa-solid fa-circle-info"></i>
            Đợt quỹ này đã đóng và bạn chưa nộp. Nếu cần xử lý bổ sung, hãy liên hệ quản lý CLB.
          </div>
        `}
      </div>
    `;
  },

  renderSelector() {
    return `
      <div style="margin-bottom:18px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px">
        <div style="font-size:16px;font-weight:800;margin-bottom:14px">Chọn quỹ</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${this.history.map(item => {
            const active = item.fundContributionID === this.selectedContributionId;
            const memberLabel = item.status === 'Paid' ? 'Đã nộp' : 'Chưa nộp';
            const periodLabel = item.periodStatus === 'Open' ? 'Đang mở' : 'Đã đóng';
            return `
              <button type="button"
                onclick="MemberFundPanel.selectContribution(${item.fundContributionID})"
                style="
                  border:1px solid ${active ? '#ff2d55' : '#e2e8f0'};
                  background:${active ? '#fff1f4' : '#fff'};
                  color:#0f172a;
                  border-radius:999px;
                  padding:10px 14px;
                  display:flex;
                  align-items:center;
                  gap:8px;
                  cursor:pointer;
                  font-weight:${active ? 700 : 600};
                ">
                <span>Tháng ${String(item.month).padStart(2, '0')}/${item.year}</span>
                <span style="color:${item.status === 'Paid' ? '#15803d' : '#b45309'}">${memberLabel}</span>
                <span style="color:#64748b">· ${periodLabel}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  startAutoRefresh() {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') this.load();
    }, 8000);
  },

  stopAutoRefresh() {
    if (!this.refreshTimer) return;
    clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  },

  async refreshNow() {
    await this.load();
  }
};

window.MemberFundPanel = MemberFundPanel;
window.addEventListener('beforeunload', () => MemberFundPanel.stopAutoRefresh());
