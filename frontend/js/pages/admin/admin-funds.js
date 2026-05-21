const FundPanel = {
  activities: [],
  transactions: [],
  budgets: [],
  receiptUploading: false,
  report: null,
  reportYear: null,
  reportMonth: null,

  async init() {
    await Promise.all([
      this.loadActivities(),
      this.loadOverview(),
      this.loadTransactions(),
      this.loadBudgets(),
      this.loadReport(),
      FundContributionPanel?.init()
    ]);
  },

  money(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
  },

  async loadActivities() {
    try {
      const r = await API.getActivities();
      this.activities = r.data?.items || r.data || [];
    } catch {
      this.activities = [];
    }
  },

  async loadOverview() {
    try {
      const r = await API.getFundOverview();
      const d = r.data || {};
      document.getElementById('fundBalance').textContent = this.money(d.currentBalance);
      document.getElementById('fundIncomeMonth').textContent = this.money(d.totalIncomeThisMonth);
      document.getElementById('fundExpenseMonth').textContent = this.money(d.totalExpenseThisMonth);
      document.getElementById('fundPending').textContent = `${this.money(d.pendingAmount)} (${d.pendingCount || 0})`;
    } catch (e) {
      Toast.error(e.message);
    }
  },

  async loadTransactions() {
    const status = document.getElementById('fundTxStatus')?.value || '';
    const type = document.getElementById('fundTxType')?.value || '';
    const tbody = document.getElementById('fundTxBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="loading"><div class="spinner"></div></td></tr>';

    try {
      const r = await API.getFundTransactions(`?status=${encodeURIComponent(status)}&type=${encodeURIComponent(type)}`);
      this.transactions = r.data || [];
      this.renderTransactions();
      this.renderApprovals();
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="9" style="color:#e8213a">${e.message}</td></tr>`;
    }
  },

  renderTransactions() {
    const tbody = document.getElementById('fundTxBody');
    if (!tbody) return;

    const keyword = (document.getElementById('fundTxSearch')?.value || '').trim().toLowerCase();
    const list = keyword
      ? this.transactions.filter(t => [
          t.fundTransactionID,
          t.type === 'Income' ? 'Thu' : 'Chi',
          t.amount,
          t.category,
          t.activityName,
          t.createdBy,
          t.transactionDate,
          t.status
        ].join(' ').toLowerCase().includes(keyword))
      : this.transactions;

      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="fund-empty">Chưa có giao dịch</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(t => `
        <tr>
          <td>#${t.fundTransactionID}</td>
          <td><span class="fund-pill ${t.type === 'Income' ? 'income' : 'expense'}">${t.type === 'Income' ? 'Thu' : 'Chi'}</span></td>
          <td><strong>${this.money(t.amount)}</strong></td>
          <td>${Utils.escapeHtml(t.category || '—')}</td>
          <td>${Utils.escapeHtml(t.activityName || '—')}</td>
          <td>${Utils.escapeHtml(t.createdBy || '—')}</td>
          <td>${Utils.formatDate(t.transactionDate)}</td>
          <td>${this.statusBadge(t.status)}</td>
          <td>
            <div class="fund-actions">
              ${t.receiptUrl ? `<button class="btn-outline btn-sm" onclick="FundPanel.openReceipt('${t.receiptUrl}')" title="Xem hóa đơn"><i class="fa-solid fa-receipt"></i></button>` : ''}
              ${t.status === 'Pending' ? `
                <button class="btn-outline btn-sm" onclick="FundPanel.openTransactionModal(${t.fundTransactionID})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-danger btn-sm" onclick="FundPanel.deleteTransaction(${t.fundTransactionID})"><i class="fa-solid fa-trash"></i></button>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');
  },

  renderApprovals() {
    const tbody = document.getElementById('fundApprovalBody');
    if (!tbody) return;
    const pending = this.transactions.filter(t => t.status === 'Pending');
    if (!pending.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="fund-empty">Không có giao dịch chờ duyệt</td></tr>';
      return;
    }
    tbody.innerHTML = pending.map(t => `
      <tr>
        <td>#${t.fundTransactionID}</td>
        <td>${t.type === 'Income' ? 'Thu' : 'Chi'}</td>
        <td><strong>${this.money(t.amount)}</strong></td>
        <td>${Utils.escapeHtml(t.category || '—')}</td>
        <td>${Utils.escapeHtml(t.createdBy || '—')}</td>
        <td>
          <div class="fund-actions">
            <button class="btn-outline btn-sm" onclick="FundPanel.openTransactionModal(${t.fundTransactionID})">
              <i class="fa-solid fa-pen"></i> Sửa
            </button>
            <button class="btn-primary btn-sm" onclick="FundPanel.updateStatus(${t.fundTransactionID}, 'Approved')">
              <i class="fa-solid fa-check"></i> Duyệt
            </button>
            <button class="btn-danger btn-sm" onclick="FundPanel.updateStatus(${t.fundTransactionID}, 'Rejected')">
              <i class="fa-solid fa-xmark"></i> Từ chối
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  statusBadge(status) {
    const labels = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối' };
    return `<span class="fund-pill ${status.toLowerCase()}">${labels[status] || status}</span>`;
  },

  async loadBudgets() {
    const wrap = document.getElementById('fundBudgetList');
    if (!wrap) return;
    try {
      const r = await API.getFundBudgets();
      this.budgets = r.data || [];
      if (!this.budgets.length) {
        wrap.innerHTML = '<div class="fund-empty">Chưa có ngân sách hoạt động</div>';
        return;
      }
      wrap.innerHTML = this.budgets.map(b => {
        const percent = b.plannedAmount > 0 ? Math.min(100, Math.round((b.approvedExpense / b.plannedAmount) * 100)) : 0;
        return `
          <div class="fund-budget-item">
            <div class="fund-budget-title">${Utils.escapeHtml(b.activityName)}</div>
            <div style="font-size:13px;color:#64748b;margin-top:6px">
              Đã chi ${this.money(b.approvedExpense)} / ${this.money(b.plannedAmount)}
            </div>
            <div class="fund-progress"><span style="width:${percent}%"></span></div>
            <div style="display:flex;justify-content:space-between;gap:10px;margin-top:10px;font-size:13px">
              <span>Còn lại</span>
              <strong>${this.money(b.remainingAmount)}</strong>
            </div>
            <button class="btn-outline btn-sm" style="margin-top:12px" onclick="FundPanel.openBudgetModal(${b.activityBudgetID})">
              <i class="fa-solid fa-pen"></i> Chỉnh sửa
            </button>
          </div>
        `;
      }).join('');
    } catch (e) {
      wrap.innerHTML = `<div class="fund-empty" style="color:#e8213a">${e.message}</div>`;
    }
  },

  async loadReport() {
    const year = Number(document.getElementById('fundReportYear')?.value || new Date().getFullYear());
    const monthRaw = document.getElementById('fundReportMonth')?.value || '';
    const month = monthRaw ? Number(monthRaw) : '';
    try {
      const r = await API.getFundReport(`?year=${year}${month ? `&month=${month}` : ''}`);
      const d = r.data || {};
      this.report = d;
      this.reportYear = year;
      this.reportMonth = month || null;
      document.getElementById('fundReportIncome').textContent = this.money(d.totalIncome);
      document.getElementById('fundReportExpense').textContent = this.money(d.totalExpense);
      document.getElementById('fundReportNet').textContent = this.money(d.netAmount);

      const txWrap = document.getElementById('fundReportTransactions');
      txWrap.innerHTML = (d.transactions || []).length
        ? (d.transactions || []).map(t => `
            <tr>
              <td>#${t.fundTransactionID}</td>
              <td>${Utils.formatDate(t.transactionDate)}</td>
              <td><span class="fund-pill ${t.type === 'Income' ? 'income' : 'expense'}">${t.type === 'Income' ? 'Thu' : 'Chi'}</span></td>
              <td><strong>${this.money(t.amount)}</strong></td>
              <td>${Utils.escapeHtml(t.category || '—')}</td>
              <td>${Utils.escapeHtml(t.activityName || '—')}</td>
              <td>${Utils.escapeHtml(t.createdBy || '—')}</td>
              <td>${Utils.escapeHtml(t.description || '—')}</td>
            </tr>`).join('')
        : '<tr><td colspan="8" class="fund-empty">Chưa có giao dịch đã duyệt trong kỳ này</td></tr>';
    } catch (e) {
      Toast.error(e.message);
    }
  },

  openTransactionModal(id = null) {
    const data = id ? this.transactions.find(t => t.fundTransactionID === id) : null;
    const activityOptions = this.activities.map(a =>
      `<option value="${a.activityID}" ${data?.activityID === a.activityID ? 'selected' : ''}>${Utils.escapeHtml(a.activityName)}</option>`
    ).join('');
    openModal(data ? 'Chỉnh sửa giao dịch' : 'Tạo giao dịch quỹ', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Loại giao dịch *</label>
          <select id="ff-type" class="form-control">
            <option value="Income" ${data?.type === 'Income' ? 'selected' : ''}>Thu</option>
            <option value="Expense" ${!data || data?.type === 'Expense' ? 'selected' : ''}>Chi</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Số tiền *</label>
          <input id="ff-amount" class="form-control" type="number" min="0" value="${data?.amount || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Danh mục *</label>
          <input id="ff-category" class="form-control" value="${Utils.escapeHtml(data?.category || '')}" placeholder="Ví dụ: Tài trợ, mua vật dụng...">
        </div>
        <div class="form-group">
          <label class="form-label">Ngày giao dịch</label>
          <input id="ff-date" class="form-control" type="date" value="${data?.transactionDate ? new Date(data.transactionDate).toISOString().slice(0, 10) : ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Gắn với hoạt động</label>
        <select id="ff-activity" class="form-control">
          <option value="">Không gắn hoạt động</option>
          ${activityOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả</label>
        <textarea id="ff-desc" class="form-control" style="min-height:80px">${Utils.escapeHtml(data?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Hóa đơn / minh chứng</label>
        <input id="ff-receipt-file" type="file" accept="image/*" hidden onchange="FundPanel.uploadReceipt(this)">
        <input id="ff-receipt" type="hidden" value="${Utils.escapeHtml(data?.receiptUrl || '')}">
        <label class="fund-receipt-upload" for="ff-receipt-file">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <strong>Chọn ảnh minh chứng từ máy</strong>
          <span>JPG, PNG, WEBP, GIF · tối đa 5MB</span>
        </label>
        <div id="ff-receipt-status"></div>
        <div id="ff-receipt-preview">
          ${this.receiptPreviewMarkup(data?.receiptUrl || '')}
        </div>
      </div>
      <button class="btn-primary w-100" onclick="FundPanel.saveTransaction(${id || 0})">
        <i class="fa-solid fa-floppy-disk"></i> ${data ? 'Cập nhật giao dịch' : 'Tạo giao dịch chờ duyệt'}
      </button>
    `);
  },

  async saveTransaction(id) {
    const payload = {
      type: document.getElementById('ff-type').value,
      amount: Number(document.getElementById('ff-amount').value),
      category: document.getElementById('ff-category').value.trim(),
      transactionDate: document.getElementById('ff-date').value || null,
      activityID: Number(document.getElementById('ff-activity').value) || null,
      description: document.getElementById('ff-desc').value.trim() || null,
      receiptUrl: document.getElementById('ff-receipt').value.trim() || null
    };
    if (!payload.amount || !payload.category) {
      Toast.error('Vui lòng nhập số tiền và danh mục');
      return;
    }
    if (this.receiptUploading) {
      Toast.info('Ảnh minh chứng đang tải lên, vui lòng chờ một chút');
      return;
    }
    try {
      if (id) await API.updateFundTransaction(id, payload);
      else await API.createFundTransaction(payload);
      Toast.success(id ? 'Đã cập nhật giao dịch' : 'Đã tạo giao dịch chờ duyệt');
      closeModal();
      await Promise.all([this.loadOverview(), this.loadTransactions(), this.loadReport()]);
    } catch (e) {
      Toast.error(e.message);
    }
  },

  async updateStatus(id, status) {
    try {
      await API.updateFundTransactionStatus(id, status);
      Toast.success(status === 'Approved' ? 'Đã duyệt giao dịch' : 'Đã từ chối giao dịch');
      await Promise.all([this.loadOverview(), this.loadTransactions(), this.loadBudgets(), this.loadReport()]);
    } catch (e) {
      Toast.error(e.message);
    }
  },

  async deleteTransaction(id) {
    if (!confirm('Xóa giao dịch chờ duyệt này?')) return;
    try {
      await API.deleteFundTransaction(id);
      Toast.success('Đã xóa giao dịch');
      await Promise.all([this.loadOverview(), this.loadTransactions()]);
    } catch (e) {
      Toast.error(e.message);
    }
  },

  openBudgetModal(id = null) {
    const data = id ? this.budgets.find(b => b.activityBudgetID === id) : null;
    const activityOptions = this.activities.map(a =>
      `<option value="${a.activityID}" ${data?.activityID === a.activityID ? 'selected' : ''}>${Utils.escapeHtml(a.activityName)}</option>`
    ).join('');
    openModal(data ? 'Chỉnh sửa ngân sách hoạt động' : 'Tạo ngân sách hoạt động', `
      <div class="form-group">
        <label class="form-label">Hoạt động *</label>
        <select id="fb-activity" class="form-control">
          <option value="">Chọn hoạt động</option>
          ${activityOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ngân sách dự trù *</label>
        <input id="fb-amount" class="form-control" type="number" min="0" value="${data?.plannedAmount || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Ghi chú</label>
        <textarea id="fb-note" class="form-control" style="min-height:80px">${Utils.escapeHtml(data?.note || '')}</textarea>
      </div>
      <button class="btn-primary w-100" onclick="FundPanel.saveBudget(${id || 0})">
        <i class="fa-solid fa-floppy-disk"></i> Lưu ngân sách
      </button>
    `);
  },

  async saveBudget(id) {
    const payload = {
      activityID: Number(document.getElementById('fb-activity').value),
      plannedAmount: Number(document.getElementById('fb-amount').value),
      note: document.getElementById('fb-note').value.trim() || null
    };
    if (!payload.activityID) {
      Toast.error('Vui lòng chọn hoạt động');
      return;
    }
    try {
      if (id) await API.updateFundBudget(id, payload);
      else await API.saveFundBudget(payload);
      Toast.success('Đã lưu ngân sách hoạt động');
      closeModal();
      await this.loadBudgets();
    } catch (e) {
      Toast.error(e.message);
    }
  },

  openReceipt(url) {
    const src = url.startsWith('http') ? url : `http://localhost:5190${url}`;
    let modal = document.getElementById('fundReceiptModal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fundReceiptModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal fund-receipt-modal">
          <div class="modal-header">
            <span style="font-size:1.2rem;font-weight:600">Ảnh minh chứng</span>
            <button class="modal-close" onclick="FundPanel.closeReceiptModal()">✕</button>
          </div>
          <div class="fund-receipt-modal-body">
            <img id="fundReceiptModalImage" alt="Ảnh minh chứng giao dịch">
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    const image = document.getElementById('fundReceiptModalImage');
    if (image) image.src = src;
    modal.classList.add('open');
    modal.onclick = e => {
      if (e.target === modal) this.closeReceiptModal();
    };
  },

  closeReceiptModal() {
    document.getElementById('fundReceiptModal')?.classList.remove('open');
  },

  receiptPreviewMarkup(url) {
    if (!url) return '';
    const src = url.startsWith('http') ? url : `http://localhost:5190${url}`;
    return `
      <div class="fund-receipt-preview">
        <img src="${src}" alt="Ảnh minh chứng giao dịch">
        <div class="fund-receipt-preview-meta">
          <strong>Đã có minh chứng</strong>
          <div class="fund-receipt-actions">
            <button type="button" class="btn-outline btn-sm" onclick="FundPanel.openReceipt('${url}')">
              <i class="fa-solid fa-eye"></i> Xem ảnh
            </button>
            <button type="button" class="btn-danger btn-sm" onclick="FundPanel.clearReceipt()">
              <i class="fa-solid fa-trash"></i> Xóa
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async uploadReceipt(input) {
    const file = input.files?.[0];
    if (!file) return;

    const status = document.getElementById('ff-receipt-status');
    const preview = document.getElementById('ff-receipt-preview');
    const hidden = document.getElementById('ff-receipt');

    this.receiptUploading = true;
    if (status) status.innerHTML = '<div style="margin-top:10px;color:#64748b"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải ảnh lên...</div>';

    try {
      const result = await API.uploadReceipt(file);
      const url = result.data;
      if (hidden) hidden.value = url;
      if (preview) preview.innerHTML = this.receiptPreviewMarkup(url);
      if (status) status.innerHTML = '<div style="margin-top:10px;color:#15803d">Đã tải ảnh minh chứng.</div>';
    } catch (e) {
      if (status) status.innerHTML = `<div style="margin-top:10px;color:#e8213a">${e.message}</div>`;
      Toast.error(e.message);
    } finally {
      this.receiptUploading = false;
      input.value = '';
    }
  },

  clearReceipt() {
    const hidden = document.getElementById('ff-receipt');
    const preview = document.getElementById('ff-receipt-preview');
    const status = document.getElementById('ff-receipt-status');
    if (hidden) hidden.value = '';
    if (preview) preview.innerHTML = '';
    if (status) status.innerHTML = '<div style="margin-top:10px;color:#64748b">Đã bỏ minh chứng khỏi giao dịch này.</div>';
  },

  exportReportExcel() {
    if (!this.report) {
      Toast.info('Báo cáo chưa tải xong');
      return;
    }

    const periodLabel = this.reportMonth
      ? `Tháng ${this.reportMonth}/${this.reportYear}`
      : `Năm ${this.reportYear}`;

    const transactionRows = (this.report.transactions || []).length
      ? (this.report.transactions || []).map(t => `
          <tr>
            <td>#${Number(t.fundTransactionID || 0)}</td>
            <td>${this.escapeExcel(Utils.formatDate(t.transactionDate))}</td>
            <td>${this.escapeExcel(t.type === 'Income' ? 'Thu' : 'Chi')}</td>
            <td>${Number(t.amount || 0)}</td>
            <td>${this.escapeExcel(t.category || '')}</td>
            <td>${this.escapeExcel(t.activityName || '')}</td>
            <td>${this.escapeExcel(t.createdBy || '')}</td>
            <td>${this.escapeExcel(t.description || '')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="8">Chưa có giao dịch đã duyệt trong kỳ này</td></tr>';

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { color: #111827; }
          table { border-collapse: collapse; margin-bottom: 18px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
          th { background: #f1f5f9; font-weight: bold; }
          .summary th { background: #e2e8f0; }
          .income { color: #15803d; font-weight: bold; }
          .expense { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Báo cáo quỹ CLB</h1>
        <p>Kỳ báo cáo: <strong>${periodLabel}</strong></p>

        <table class="summary">
          <tr><th>Chỉ số</th><th>Giá trị</th></tr>
          <tr><td>Tổng thu</td><td class="income">${Number(this.report.totalIncome || 0)}</td></tr>
          <tr><td>Tổng chi</td><td class="expense">${Number(this.report.totalExpense || 0)}</td></tr>
          <tr><td>Chênh lệch</td><td>${Number(this.report.netAmount || 0)}</td></tr>
        </table>

        <h2>Chi tiết giao dịch</h2>
        <table>
          <tr><th>ID</th><th>Ngày</th><th>Loại</th><th>Số tiền</th><th>Danh mục</th><th>Hoạt động</th><th>Người thực hiện</th><th>Mô tả</th></tr>
          ${transactionRows}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-quy-${this.reportYear}${this.reportMonth ? `-${String(this.reportMonth).padStart(2, '0')}` : ''}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  escapeExcel(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

window.FundPanel = FundPanel;
