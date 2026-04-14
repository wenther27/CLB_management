// ================================================
// admin-posts.js
// Quản lý bài viết: danh sách, tạo, sửa, xóa
// ================================================

// ── Load danh sách bài viết ───────────────────────────────────────────────────
async function loadPostsAdmin() {
  const tbody = document.getElementById('pBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner" style="margin:0 auto"></div></td></tr>';

  try {
    // Admin xem tất cả kể cả Draft
    const r = await API.getPosts('?status=');
    const list = r.data?.items || r.data || [];

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#475569">Chưa có bài viết nào</td></tr>';
      return;
    }

    const catCls = {
      'Tin tức':          'badge-gold',
      'Thông báo':        'badge-blue',
      'Hoạt động':        'badge-open',
      'Tuyển thành viên': 'badge-red',
    };

    tbody.innerHTML = list.map(p => `
      <tr>
        <td style="color:#475569;font-size:12px">${p.postID}</td>
        <td>
          <div style="font-weight:700;font-size:13px">
            ${Utils.escapeHtml(p.title || Utils.truncate(p.content, 50))}
          </div>
          ${p.authorName
            ? `<div style="color:#475569;font-size:11px">✍️ ${Utils.escapeHtml(p.authorName)}</div>`
            : ''}
        </td>
        <td>
          <span class="badge ${catCls[p.category] || 'badge-gold'}">
            ${Utils.escapeHtml(p.category)}
          </span>
        </td>
        <td style="color:#94a3b8;font-size:13px">${Utils.formatDate(p.createdDate)}</td>
        <td>${Utils.statusLabel(p.status)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button onclick="editPost(${p.postID})" class="btn-outline btn-sm" title="Sửa">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="delPost(${p.postID})" class="btn-danger btn-sm" title="Xóa">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}

// ── Modal tạo / sửa bài viết ─────────────────────────────────────────────────
function openPostModal(data = {}) {
  const cats = ['Tin tức', 'Thông báo', 'Hoạt động', 'Tuyển thành viên'];

  openModal(data.postID ? 'Chỉnh sửa bài viết' : 'Đăng bài viết mới', `
    <div class="form-group">
      <label class="form-label">Tiêu đề</label>
      <input id="pf-title" class="form-control" placeholder="Tiêu đề bài viết..."
             value="${Utils.escapeHtml(data.title || '')}">
    </div>

    <div class="form-group">
      <label class="form-label">Nội dung *</label>
      <textarea id="pf-content" class="form-control" style="min-height:150px"
                placeholder="Nội dung bài viết...">${Utils.escapeHtml(data.content || '')}</textarea>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Danh mục</label>
        <select id="pf-cat" class="form-control">
          ${cats.map(c => `
            <option value="${c}" ${data.category === c ? 'selected' : ''}>${c}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select id="pf-st" class="form-control">
          <option value="Published" ${(!data.status || data.status === 'Published') ? 'selected' : ''}>Đã đăng</option>
          <option value="Draft"     ${data.status === 'Draft' ? 'selected' : ''}>Lưu nháp</option>
        </select>
      </div>
    </div>

    <button type="button" onclick="savePost(${data.postID || 0})"
      class="btn-primary w-100" style="padding:11px">
      <i class="fa-solid fa-floppy-disk"></i>
      ${data.postID ? 'Cập nhật bài viết' : 'Đăng bài viết'}
    </button>
  `, null);
}

// ── Lưu bài viết (tạo / cập nhật) ───────────────────────────────────────────
async function savePost(id) {
  const d = {
    title:    document.getElementById('pf-title').value.trim()   || null,
    content:  document.getElementById('pf-content').value.trim(),
    category: document.getElementById('pf-cat').value,
    status:   document.getElementById('pf-st').value,
  };

  if (!d.content) { Toast.error('Vui lòng nhập nội dung bài viết'); return; }

  try {
    if (id) {
      await API.updatePost(id, d);
      Toast.success('Cập nhật bài viết thành công');
    } else {
      await API.createPost(d);
      Toast.success('Đăng bài viết thành công');
    }
    closeModal();
    loadPostsAdmin();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Sửa bài viết (load data → mở modal) ─────────────────────────────────────
async function editPost(id) {
  try {
    const r = await API.getPost(id);
    openPostModal(r.data);
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Xóa bài viết ─────────────────────────────────────────────────────────────
async function delPost(id) {
  if (!confirm('Xóa bài viết này?')) return;
  try {
    await API.deletePost(id);
    Toast.success('Đã xóa bài viết');
    loadPostsAdmin();
    loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}