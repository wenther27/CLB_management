// ================================================
// admin-posts.js — UPDATED VERSION
// Quản lý bài viết: danh sách, tạo, sửa, xóa
// Mở rộng layout form, hỗ trợ upload ảnh, hiển thị like
// ================================================

// ── Load danh sách bài viết ───────────────────────────────────────────────────
async function loadPostsAdmin() {
  const tbody = document.getElementById('pBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner" style="margin:0 auto"></div></td></tr>';

  try {
    const r = await API.getPosts('');
    const list = r.data?.items || r.data || [];

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#475569">Chưa có bài viết nào</td></tr>';
      return;
    }

    const catCls = {
      'Tin tức':          'badge-gold',
      'Thông báo':        'badge-blue',
      'Hoạt động':        'badge-open',
      'Tuyển thành viên': 'badge-red',
    };
    const catIco = { 'Tin tức':'📰', 'Thông báo':'📢', 'Hoạt động':'🎯', 'Tuyển thành viên':'⭐' };

    // Đọc like counts từ localStorage
    const likeCounts = JSON.parse(localStorage.getItem('ctxh_like_counts') || '{}');

    tbody.innerHTML = list.map(p => {
      const preview = (p.content || '').slice(0, 60) + (p.content?.length > 60 ? '...' : '');
      const likeCount = likeCounts[p.postID] || 0;
      const imgCount = (p.images || []).length;

      return `
      <tr>
        <td style="color:#111827;font-size:12px">${p.postID}</td>
        <td style="max-width:260px">
          ${p.title ? `<div style="font-weight:700;font-size:13px;margin-bottom:3px">${Utils.escapeHtml(p.title)}</div>` : ''}
          <div style="color:#111827;font-size:12px;line-height:1.5">${Utils.escapeHtml(preview)}</div>
          ${imgCount > 0 ? `<div style="font-size:11px;color:#111827;margin-top:3px"><i class="fa-solid fa-image"></i> ${imgCount} ảnh</div>` : ''}
        </td>
        <td>
          <span class="badge ${catCls[p.category] || 'badge-gold'}">
            ${catIco[p.category] || '📁'} ${Utils.escapeHtml(p.category)}
          </span>
        </td>
        <td>
          ${p.authorName
            ? `<div style="font-size:13px;color:#111827"><i class="fa-solid fa-user" style="color:#111827;margin-right:4px"></i>${Utils.escapeHtml(p.authorName)}</div>`
            : '<span style="color:#111827;font-size:12px">—</span>'}
        </td>
        <td style="color:#111827;font-size:12px">${Utils.formatDate(p.createdDate)}</td>
        <td>
          ${Utils.statusLabel(p.status)}
          ${likeCount > 0 ? `<div style="font-size:11px;color:#ff2d55;margin-top:3px"><i class="fa-solid fa-heart"></i> ${likeCount} lượt thích</div>` : ''}
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button onclick="previewPost(${p.postID})" class="btn-outline btn-sm" title="Xem trước">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button onclick="editPost(${p.postID})" class="btn-outline btn-sm" title="Sửa">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="togglePostStatus(${p.postID}, '${p.status}')" 
              class="btn-sm" title="${p.status === 'Published' ? 'Ẩn bài' : 'Đăng bài'}"
              style="${p.status === 'Published' 
                ? 'background:#f1f5f9;border:1px solid #cbd5e1;color:#111827;color:#64748b;border-radius:5px;cursor:pointer;padding:6px 12px;font-family:Arial,sans-serif'
                : 'background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#22c55e;border-radius:5px;cursor:pointer;padding:6px 12px;font-family:Arial,sans-serif'}">
              ${p.status === 'Published' 
                ? '<i class="fa-solid fa-eye-slash"></i>' 
                : '<i class="fa-solid fa-upload"></i>'}
            </button>
            <button onclick="delPost(${p.postID})" class="btn-danger btn-sm" title="Xóa">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#ff2d55;padding:20px">${e.message}</td></tr>`;
  }
}

// ── Toggle post status (Published ↔ Draft) ────────────────────────────────────
async function togglePostStatus(id, currentStatus) {
  const newStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
  const msg = newStatus === 'Published' ? 'Đăng bài viết này?' : 'Ẩn bài viết này khỏi trang public?';
  if (!confirm(msg)) return;
  try {
    await API.updatePost(id, { status: newStatus });
    Toast.success(newStatus === 'Published' ? '✅ Đã đăng bài viết' : '🙈 Đã ẩn bài viết');
    loadPostsAdmin();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Preview post ──────────────────────────────────────────────────────────────
async function previewPost(id) {
  openModal('Xem trước bài viết',
    '<div class="loading" style="padding:40px"><div class="spinner" style="margin:auto"></div></div>',
    null);

  try {
    const r = await API.getPost(id);
    const p = r.data;
    const catCfg = {
      'Tin tức':   { cls: 'badge-gold',  ico: '📰' },
      'Thông báo': { cls: 'badge-blue',  ico: '📢' },
      'Hoạt động': { cls: 'badge-open',  ico: '🎯' },
      'Tuyển thành viên': { cls: 'badge-red', ico: '⭐' },
    };
    const cfg = catCfg[p.category] || { cls: 'badge-closed', ico: '📁' };
    const images = p.images || [];

    document.getElementById('gModalInner').innerHTML = `
      <div class="modal-header">
        <div class="modal-title"><i class="fa-solid fa-eye"></i> Xem trước</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <!-- Post preview (Facebook-style) -->
      <div style="background:#ffffff;border-radius:12px;padding:18px;border:1px solid #e2e8f0">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#ff2d55,#ff6b84);
                      display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:white;flex-shrink:0">
            ${(p.authorName || 'C').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <div>
            <div style="font-weight:700;font-size:14px">${Utils.escapeHtml(p.authorName || 'CLB CTXH DUT')}</div>
            <div style="font-size:12px;color:#475569;display:flex;align-items:center;gap:8px">
              ${Utils.formatDateTime(p.createdDate)}
              <span class="badge ${cfg.cls}" style="font-size:10px;padding:2px 7px">${cfg.ico} ${Utils.escapeHtml(p.category)}</span>
            </div>
          </div>
        </div>

        <!-- Title -->
        ${p.title ? `<div style="font-size:17px;font-weight:700;margin-bottom:10px;line-height:1.4">${Utils.escapeHtml(p.title)}</div>` : ''}

        <!-- Content -->
        <div style="font-size:14px;color:#111827;line-height:1.8;white-space:pre-wrap;word-break:break-word;margin-bottom:12px">
          ${Utils.escapeHtml(p.content || '')}
        </div>

        <!-- Images -->
        ${images.length > 0 ? `
          <div style="display:grid;grid-template-columns:${images.length === 1 ? '1fr' : '1fr 1fr'};gap:4px;border-radius:8px;overflow:hidden;margin-top:12px">
            ${images.slice(0, 2).map(url => {
              const src = url.startsWith('http') ? url : `http://localhost:5190${url}`;
              return `<img src="${src}" style="width:100%;height:180px;object-fit:cover" onerror="this.style.display='none'">`;
            }).join('')}
          </div>
        ` : ''}

        <!-- Actions preview -->
        <div style="display:flex;gap:4px;margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0">
          <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px;border-radius:8px;background:#fff1f3;color:#ff2d55;font-size:13px;font-weight:600">
            <i class="fa-solid fa-heart"></i> Thích
          </div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px;border-radius:8px;background:#f8fafc;color:#475569;font-size:13px;font-weight:600">
            <i class="fa-solid fa-share-nodes"></i> Chia sẻ
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:16px">
        <button onclick="editPost(${id});closeModal()" class="btn-outline" style="flex:1;padding:10px">
          <i class="fa-solid fa-pen"></i> Chỉnh sửa
        </button>
        <button onclick="closeModal()" class="btn-secondary" style="padding:10px 20px">Đóng</button>
      </div>`;

  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Modal tạo / sửa bài viết — EXPANDED LAYOUT ───────────────────────────────
function openPostModal(data = {}) {
  // Ảnh đã có sẵn
  const existingImages = (data.images || []).map((url, i) => renderPostPreviewItem(url, i)).join('');
  const isEdit = !!data.postID;

  openModal(isEdit ? 'Chỉnh sửa bài viết' : '✍️ Đăng bài viết mới', `
    <!-- Thông tin cơ bản -->
    <div class="form-group">
      <label class="form-label">Tiêu đề bài viết</label>
      <input id="pf-title" class="form-control" 
             placeholder="Nhập tiêu đề hấp dẫn..." 
             value="${Utils.escapeHtml(data.title || '')}"
             style="font-size:15px;font-weight:600">
    </div>

    <!-- Nội dung -->
    <div class="form-group">
      <label class="form-label">Nội dung bài viết *</label>
      <textarea id="pf-content" class="form-control" 
                style="min-height:200px;font-size:14px;line-height:1.8;resize:vertical"
                placeholder="Chia sẻ thông tin, sự kiện, thông báo... Nội dung sẽ được hiển thị đầy đủ trên trang Tin tức.">${Utils.escapeHtml(data.content || '')}</textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:4px">
        <span id="pf-char-count" style="font-size:11px;color:#334155">0 ký tự</span>
      </div>
    </div>

    <!-- Danh mục + Trạng thái -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Danh mục *</label>
        <select id="pf-cat" class="form-control">
          ${['Tin tức', 'Thông báo', 'Hoạt động', 'Tuyển thành viên'].map(c =>
            `<option value="${c}" ${data.category === c ? 'selected' : ''}>${c}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select id="pf-st" class="form-control">
          <option value="Published" ${(!data.status || data.status === 'Published') ? 'selected' : ''}>
            ✅ Đăng công khai
          </option>
          <option value="Draft" ${data.status === 'Draft' ? 'selected' : ''}>
            📝 Lưu nháp
          </option>
        </select>
      </div>
    </div>

    <!-- Ảnh đính kèm -->
    <div class="form-group">
      <label class="form-label">
        Ảnh đính kèm
        <span style="color:#475569;font-weight:400;font-size:11px">(tối đa 4 ảnh, mỗi ảnh ≤ 5MB)</span>
      </label>

      <div id="pf-dropzone"
        onclick="document.getElementById('pf-fileInput').click()"
        ondragover="pfHandleDragOver(event)"
        ondragleave="pfHandleDragLeave(event)"
        ondrop="pfHandleDrop(event)"
        style="border:2px dashed #cbd5e1;border-radius:10px;padding:24px;
               text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s;
               margin-bottom:10px">
        <div style="font-size:1.8rem;margin-bottom:8px">🖼️</div>
        <div style="font-size:13px;color:#111827">
          Kéo thả ảnh vào đây hoặc
          <span style="color:#ff2d55;font-weight:700">click để chọn</span>
        </div>
        <div style="font-size:11px;color:#334155;margin-top:3px">JPG, PNG, WEBP, GIF · Tối đa 4 ảnh</div>
      </div>

      <input type="file" id="pf-fileInput" accept="image/*" multiple style="display:none"
             onchange="pfHandleFileSelect(event)">

      <div id="pf-preview" style="display:flex;flex-wrap:wrap;gap:8px;min-height:0">
        ${existingImages}
      </div>

      <div id="pf-uploadStatus" style="font-size:12px;color:#111827;margin-top:6px;min-height:16px"></div>
    </div>

    <!-- Preview box -->
    <div style="background:#ffffff;border-radius:10px;padding:14px;border:1px solid #e2e8f0;margin-bottom:16px">
      <div style="font-size:11px;color:#334155;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">
        <i class="fa-solid fa-eye"></i> Xem trước
      </div>
      <div id="pf-live-preview" style="font-size:13px;color:#111827;font-style:italic">
        Nhập nội dung để xem trước...
      </div>
    </div>

    <!-- Save button -->
    <div style="display:flex;gap:10px">
      <button type="button" onclick="savePost(${data.postID || 0})"
        class="btn-primary" style="flex:1;padding:12px;font-size:15px;font-weight:700">
        <i class="fa-solid fa-${isEdit ? 'floppy-disk' : 'paper-plane'}"></i>
        ${isEdit ? 'Cập nhật bài viết' : 'Đăng bài viết'}
      </button>
      <button type="button" onclick="saveDraft(${data.postID || 0})"
        class="btn-secondary" style="padding:12px 18px;font-size:13px">
        📝 Lưu nháp
      </button>
    </div>
  `, null);

  // Init post image URLs
  window._postImageUrls = data.images ? [...data.images] : [];

  // Live preview
  const contentEl = document.getElementById('pf-content');
  const titleEl   = document.getElementById('pf-title');
  const charEl    = document.getElementById('pf-char-count');
  const previewEl = document.getElementById('pf-live-preview');

  function updatePreview() {
    const title   = titleEl.value.trim();
    const content = contentEl.value.trim();
    charEl.textContent = content.length + ' ký tự';

    if (!title && !content) {
      previewEl.innerHTML = '<span style="color:#334155;font-style:italic">Nhập nội dung để xem trước...</span>';
      return;
    }

    previewEl.innerHTML = `
      ${title ? `<div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:6px">${Utils.escapeHtml(title)}</div>` : ''}
      <div style="color:#111827;line-height:1.7;font-size:13px;font-style:normal;white-space:pre-wrap">
        ${Utils.escapeHtml(content.slice(0, 200))}${content.length > 200 ? '...' : ''}
      </div>`;
  }

  contentEl?.addEventListener('input', updatePreview);
  titleEl?.addEventListener('input', updatePreview);

  // Trigger once if editing
  if (isEdit) updatePreview();
}

// ── Lưu bài viết ─────────────────────────────────────────────────────────────
async function savePost(id) {
  await _doSavePost(id, document.getElementById('pf-st')?.value || 'Published');
}

async function saveDraft(id) {
  await _doSavePost(id, 'Draft');
}

async function _doSavePost(id, status) {
  const d = {
    title:    document.getElementById('pf-title')?.value.trim() || null,
    content:  document.getElementById('pf-content')?.value.trim(),
    category: document.getElementById('pf-cat')?.value,
    status:   status,
    imageUrls: window._postImageUrls || [],
  };

  if (!d.content) { Toast.error('Vui lòng nhập nội dung bài viết'); return; }

  try {
    if (id) {
      await API.updatePost(id, d);
      Toast.success(status === 'Published' ? '✅ Cập nhật và đăng bài thành công' : '📝 Đã lưu nháp');
    } else {
      await API.createPost(d);
      Toast.success(status === 'Published' ? '🎉 Đăng bài viết thành công!' : '📝 Đã lưu nháp');
    }
    closeModal();
    loadPostsAdmin();
    if (typeof loadStats === 'function') loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Sửa bài viết ─────────────────────────────────────────────────────────────
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
  if (!confirm('Xóa bài viết này? Hành động không thể hoàn tác.')) return;
  try {
    await API.deletePost(id);
    Toast.success('Đã xóa bài viết');
    loadPostsAdmin();
    if (typeof loadStats === 'function') loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── Post image upload helpers ─────────────────────────────────────────────────
function renderPostPreviewItem(url, index) {
  const src = url.startsWith('http') ? url : `http://localhost:5190${url}`;
  const uid = `pimg-${Date.now()}-${index}`;
  return `
    <div id="${uid}" style="position:relative;width:90px;height:90px;border-radius:8px;overflow:hidden;
         border:1px solid rgba(255,255,255,0.1);flex-shrink:0">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover">
      <button onclick="removePostImage('${url}','${uid}')"
        style="position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;
               background:rgba(0,0,0,0.7);border:none;color:white;font-size:11px;
               cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">✕</button>
    </div>`;
}

function removePostImage(url, wrapId) {
  window._postImageUrls = (window._postImageUrls || []).filter(u => u !== url);
  document.getElementById(wrapId)?.remove();
}

function pfHandleDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('pf-dropzone');
  if (dz) { dz.style.borderColor = '#ff2d55'; dz.style.background = 'rgba(255,45,85,0.05)'; }
}

function pfHandleDragLeave() {
  const dz = document.getElementById('pf-dropzone');
  if (dz) { dz.style.borderColor = '#cbd5e1'; dz.style.background = 'transparent'; }
}

function pfHandleDrop(e) {
  e.preventDefault();
  pfHandleDragLeave();
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) pfUploadImages(files);
}

function pfHandleFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length) pfUploadImages(files);
  e.target.value = '';
}

async function pfUploadImages(files) {
  const MAX_IMAGES = 4;
  const remaining = MAX_IMAGES - (window._postImageUrls || []).length;

  if (remaining <= 0) {
    Toast.error(`Đã đủ ${MAX_IMAGES} ảnh, vui lòng xóa bớt`);
    return;
  }

  const toUpload = files.slice(0, remaining);
  if (files.length > remaining) Toast.info(`Chỉ upload thêm ${remaining} ảnh`);

  const status = document.getElementById('pf-uploadStatus');
  if (status) status.innerHTML = `<span style="color:#f59e0b">⏳ Đang upload ${toUpload.length} ảnh...</span>`;

  let successCount = 0;

  for (const file of toUpload) {
    if (file.size > 5 * 1024 * 1024) {
      Toast.error(`"${file.name}" quá 5MB, bỏ qua`);
      continue;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:5190/api/upload/image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type');
      if (!ct?.includes('application/json')) throw new Error('Server không trả về JSON');

      const data = await res.json();
      if (!data?.data) throw new Error('Server không trả về URL ảnh');

      const url = data.data;
      window._postImageUrls = window._postImageUrls || [];
      window._postImageUrls.push(url);

      const preview = document.getElementById('pf-preview');
      if (preview) {
        const idx = Date.now() + Math.random();
        const div = document.createElement('div');
        div.innerHTML = renderPostPreviewItem(url, idx);
        preview.appendChild(div.firstElementChild);
      }
      successCount++;

    } catch (e) {
      Toast.error(`Lỗi upload "${file.name}": ${e.message}`);
    }
  }

  if (status) {
    status.innerHTML = successCount > 0
      ? `<span style="color:#22c55e">✅ Đã upload ${successCount} ảnh</span>`
      : `<span style="color:#ff2d55">❌ Upload thất bại</span>`;
    setTimeout(() => { if (status) status.innerHTML = ''; }, 3000);
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
window.loadPostsAdmin    = loadPostsAdmin;
window.openPostModal     = openPostModal;
window.savePost          = savePost;
window.saveDraft         = saveDraft;
window.editPost          = editPost;
window.delPost           = delPost;
window.previewPost       = previewPost;
window.togglePostStatus  = togglePostStatus;
window.removePostImage   = removePostImage;
window.pfHandleDragOver  = pfHandleDragOver;
window.pfHandleDragLeave = pfHandleDragLeave;
window.pfHandleDrop      = pfHandleDrop;
window.pfHandleFileSelect= pfHandleFileSelect;
window.pfUploadImages    = pfUploadImages;