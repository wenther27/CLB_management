// ================================================
// admin-posts.js — FULL VERSION với Rich Editor
// Tính năng:
// - Danh sách bài viết (bảng + filter)
// - Tạo/sửa bài viết với Rich Text Editor (Quill-like tự build)
// - Upload ảnh bìa + gallery
// - Tags, tóm tắt, ghim bài
// - Publish/Unpublish/Xóa
// - Preview bài viết trước khi đăng
// ================================================

// ── LOAD DANH SÁCH ───────────────────────────────────────────────────────────
async function loadPostsAdmin() {
  const tbody = document.getElementById('pBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="loading" style="padding:30px">
    <div class="spinner" style="margin:0 auto"></div></td></tr>`;

  try {
    const r = await API.getPosts('?status=all&pageSize=100');
    const list = r.data?.items || r.data || [];

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#475569">
        <div style="font-size:2rem;margin-bottom:10px">📝</div>
        Chưa có bài viết nào. <button onclick="openPostEditor()" class="btn-primary btn-sm" style="margin-left:10px">Tạo ngay</button>
      </td></tr>`;
      return;
    }

    const CAT_CLS = {
      'Tin tức': 'badge-gold', 'Thông báo': 'badge-blue',
      'Hoạt động': 'badge-open', 'Tuyển thành viên': 'badge-red',
      'Chia sẻ': 'badge-blue'
    };

    tbody.innerHTML = list.map(p => `
      <tr>
        <td style="color:#475569;font-size:12px;width:44px">${p.postID}</td>
        <td style="max-width:280px">
          <div style="display:flex;align-items:flex-start;gap:10px">
            ${p.coverImageUrl
              ? `<img src="${p.coverImageUrl.startsWith('http') ? p.coverImageUrl : 'http://localhost:5190' + p.coverImageUrl}"
                   style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0">`
              : `<div style="width:48px;height:48px;background:#1e293b;border-radius:6px;flex-shrink:0;
                             display:flex;align-items:center;justify-content:center;font-size:1.2rem">📝</div>`}
            <div>
              <div style="font-weight:700;font-size:13px;line-height:1.3;color:white">
                ${Utils.escapeHtml(p.title || '(Không có tiêu đề)')}
                ${p.isPinned ? `<i class="fa-solid fa-thumbtack" style="color:#f59e0b;font-size:10px;margin-left:4px"></i>` : ''}
              </div>
              <div style="font-size:11px;color:#475569;margin-top:2px">
                ${Utils.escapeHtml(Utils.truncate(p.summary || p.content?.replace(/<[^>]+>/g, '') || '', 60))}
              </div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${CAT_CLS[p.category] || 'badge-gold'}">${Utils.escapeHtml(p.category)}</span>
        </td>
        <td style="color:#94a3b8;font-size:12px;white-space:nowrap">${Utils.formatDateTime(p.createdDate)}</td>
        <td style="color:#64748b;font-size:12px">
          <i class="fa-regular fa-eye"></i> ${p.viewCount || 0}
          ${p.readTime ? `<br><i class="fa-regular fa-clock"></i> ${p.readTime}p` : ''}
        </td>
        <td>${Utils.statusLabel(p.status)}</td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button onclick="previewPost(${p.postID})" class="btn-outline btn-sm" title="Xem trước" style="padding:5px 8px">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button onclick="editPost(${p.postID})" class="btn-outline btn-sm" title="Chỉnh sửa" style="padding:5px 8px">
              <i class="fa-solid fa-pen"></i>
            </button>
            ${p.status === 'Published'
              ? `<button onclick="togglePublish(${p.postID}, false)" 
                   style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
                          color:#f59e0b;padding:5px 8px;border-radius:5px;cursor:pointer;
                          font-size:12px;font-family:Arial,sans-serif" title="Ẩn bài">
                   <i class="fa-solid fa-eye-slash"></i>
                 </button>`
              : `<button onclick="togglePublish(${p.postID}, true)"
                   style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);
                          color:#22c55e;padding:5px 8px;border-radius:5px;cursor:pointer;
                          font-size:12px;font-family:Arial,sans-serif" title="Đăng bài">
                   <i class="fa-solid fa-paper-plane"></i>
                 </button>`}
            <button onclick="delPost(${p.postID})" class="btn-danger btn-sm" title="Xóa" style="padding:5px 8px">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#ff2d55;padding:20px;text-align:center">
      <i class="fa-solid fa-circle-exclamation"></i> ${e.message}
    </td></tr>`;
  }
}

// ── TOGGLE PUBLISH ────────────────────────────────────────────────────────────
async function togglePublish(id, publish) {
  try {
    const endpoint = publish ? `/posts/${id}/publish` : `/posts/${id}/unpublish`;
    await request('PATCH', endpoint, null, true);
    Toast.success(publish ? 'Đã đăng bài viết!' : 'Đã ẩn bài viết');
    loadPostsAdmin();
    if (typeof loadStats === 'function') loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
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

// ── EDIT (load data → open editor) ───────────────────────────────────────────
async function editPost(id) {
  try {
    const r = await API.getPost(id);
    openPostEditor(r.data);
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── PREVIEW ───────────────────────────────────────────────────────────────────
async function previewPost(id) {
  try {
    const r = await API.getPost(id);
    const p = r.data;
    showPostPreviewModal(p);
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── RICH TEXT EDITOR MODAL ────────────────────────────────────────────────────
let _editorPostId = null;
let _editorImages = [];
let _editorCoverUrl = '';

function openPostEditor(data = {}) {
  _editorPostId = data.postID || null;
  _editorImages = data.images ? [...data.images] : [];
  _editorCoverUrl = data.coverImageUrl || '';

  const isEdit = !!data.postID;
  const tags = parseTags(data.tags);
  const catOptions = ['Tin tức', 'Thông báo', 'Hoạt động', 'Tuyển thành viên', 'Chia sẻ'];

  openModal(isEdit ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới', `
    <style>
      /* Rich Editor Styles */
      .re-toolbar { display:flex;flex-wrap:wrap;gap:3px;padding:8px;background:#1e293b;border-radius:8px 8px 0 0;border:1px solid rgba(255,255,255,0.08);border-bottom:none }
      .re-toolbar button { width:30px;height:28px;border:none;background:transparent;color:#94a3b8;border-radius:5px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-family:Arial,sans-serif }
      .re-toolbar button:hover { background:rgba(255,255,255,0.08);color:white }
      .re-toolbar button.active { background:rgba(255,45,85,0.2);color:#ff2d55 }
      .re-toolbar .re-sep { width:1px;height:20px;background:rgba(255,255,255,0.1);margin:4px 3px;align-self:center }
      .re-toolbar .re-btn-wide { width:auto;padding:0 10px;font-size:12px;font-weight:600 }
      #postEditor { 
        min-height:320px;max-height:420px;overflow-y:auto;
        padding:16px;background:#0f172a;
        border:1px solid rgba(255,255,255,0.08);border-radius:0 0 8px 8px;
        color:#cbd5e1;font-size:14px;line-height:1.85;outline:none;
      }
      #postEditor:focus { border-color:rgba(255,45,85,0.4) }
      #postEditor[placeholder]:empty:before { content:attr(placeholder);color:#334155;pointer-events:none }
      #postEditor h1,#postEditor h2,#postEditor h3 { color:white;margin:0.8em 0 0.4em;font-weight:700 }
      #postEditor h1{font-size:22px}#postEditor h2{font-size:18px}#postEditor h3{font-size:15px}
      #postEditor blockquote { border-left:3px solid #ff2d55;background:rgba(255,45,85,0.06);padding:10px 14px;margin:12px 0;border-radius:0 6px 6px 0;color:#94a3b8 }
      #postEditor a { color:#ff2d55 }
      #postEditor ul,#postEditor ol { margin:6px 0 6px 22px;color:#94a3b8 }
      #postEditor img { max-width:100%;border-radius:8px;margin:8px 0;display:block }
      #postEditor hr { border:none;border-top:1px solid rgba(255,255,255,0.1);margin:16px 0 }
      #postEditor p { margin-bottom:0.6em }
      #postEditor table { border-collapse:collapse;width:100% }
      #postEditor td,#postEditor th { border:1px solid rgba(255,255,255,0.1);padding:6px 10px;font-size:13px }
      #postEditor th { background:#1e293b;font-weight:700 }
      .re-char-count { font-size:11px;color:#334155;text-align:right;margin-top:4px }
      .cover-preview { width:100%;height:160px;object-fit:cover;border-radius:8px;margin-top:8px;display:block }
      .cover-placeholder { width:100%;height:100px;background:#1e293b;border:2px dashed rgba(255,255,255,0.1);border-radius:8px;margin-top:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;color:#475569;transition:border-color 0.2s }
      .cover-placeholder:hover { border-color:#ff2d55;color:#ff2d55 }
      .tag-input-wrap { display:flex;gap:6px;flex-wrap:wrap;background:#1e293b;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:6px 10px;cursor:text;min-height:38px;align-items:center }
      .tag-input-wrap input { background:transparent;border:none;outline:none;color:white;font-size:13px;font-family:Arial,sans-serif;min-width:80px;flex:1 }
      .tag-chip { background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#94a3b8;padding:2px 8px;border-radius:100px;font-size:11px;display:inline-flex;align-items:center;gap:4px }
      .tag-chip button { background:none;border:none;color:#475569;cursor:pointer;padding:0;font-size:10px;line-height:1 }
    </style>

    <!-- Tabs điều hướng -->
    <div style="display:flex;gap:2px;background:#1e293b;border-radius:8px;padding:4px;margin-bottom:16px">
      <button id="etab-write" onclick="switchEditorTab('write')" style="flex:1;padding:8px;border:none;border-radius:6px;background:rgba(255,45,85,0.15);color:#ff2d55;cursor:pointer;font-size:13px;font-weight:700;font-family:Arial,sans-serif">
        <i class="fa-solid fa-pen"></i> Viết nội dung
      </button>
      <button id="etab-settings" onclick="switchEditorTab('settings')" style="flex:1;padding:8px;border:none;border-radius:6px;background:transparent;color:#64748b;cursor:pointer;font-size:13px;font-weight:700;font-family:Arial,sans-serif">
        <i class="fa-solid fa-gear"></i> Cài đặt & Meta
      </button>
    </div>

    <!-- TAB: VIẾT NỘI DUNG -->
    <div id="etab-write-content">
      <!-- Tiêu đề -->
      <div class="form-group">
        <label class="form-label">Tiêu đề bài viết *</label>
        <input id="pe-title" class="form-control" placeholder="Nhập tiêu đề hấp dẫn..."
               value="${Utils.escapeHtml(data.title || '')}" style="font-size:15px">
      </div>

      <!-- Rich Editor -->
      <div class="form-group">
        <label class="form-label">
          Nội dung bài viết *
          <span style="color:#475569;font-weight:400;text-transform:none;float:right">
            <i class="fa-solid fa-circle-info"></i> Hỗ trợ định dạng văn bản phong phú
          </span>
        </label>
        
        <!-- Toolbar -->
        <div class="re-toolbar" id="reToolbar">
          <!-- Heading -->
          <button onclick="execCmd('formatBlock','h1')" title="Tiêu đề 1" class="re-btn-wide">H1</button>
          <button onclick="execCmd('formatBlock','h2')" title="Tiêu đề 2" class="re-btn-wide">H2</button>
          <button onclick="execCmd('formatBlock','h3')" title="Tiêu đề 3" class="re-btn-wide">H3</button>
          <button onclick="execCmd('formatBlock','p')" title="Đoạn văn" class="re-btn-wide">¶</button>
          <div class="re-sep"></div>
          <!-- Format -->
          <button onclick="execCmd('bold')" title="Đậm (Ctrl+B)" id="rb-bold"><i class="fa-solid fa-bold"></i></button>
          <button onclick="execCmd('italic')" title="Nghiêng (Ctrl+I)" id="rb-italic"><i class="fa-solid fa-italic"></i></button>
          <button onclick="execCmd('underline')" title="Gạch chân (Ctrl+U)" id="rb-underline"><i class="fa-solid fa-underline"></i></button>
          <button onclick="execCmd('strikeThrough')" title="Gạch ngang"><i class="fa-solid fa-strikethrough"></i></button>
          <div class="re-sep"></div>
          <!-- Color -->
          <button onclick="showColorPicker()" title="Màu chữ" style="position:relative">
            <i class="fa-solid fa-palette"></i>
            <input type="color" id="textColor" style="position:absolute;opacity:0;width:100%;height:100%;top:0;left:0;cursor:pointer"
                   onchange="execCmd('foreColor', this.value)">
          </button>
          <!-- Align -->
          <button onclick="execCmd('justifyLeft')" title="Căn trái"><i class="fa-solid fa-align-left"></i></button>
          <button onclick="execCmd('justifyCenter')" title="Căn giữa"><i class="fa-solid fa-align-center"></i></button>
          <button onclick="execCmd('justifyRight')" title="Căn phải"><i class="fa-solid fa-align-right"></i></button>
          <div class="re-sep"></div>
          <!-- List -->
          <button onclick="execCmd('insertUnorderedList')" title="Danh sách dấu chấm"><i class="fa-solid fa-list-ul"></i></button>
          <button onclick="execCmd('insertOrderedList')" title="Danh sách số"><i class="fa-solid fa-list-ol"></i></button>
          <div class="re-sep"></div>
          <!-- Block -->
          <button onclick="insertBlockquote()" title="Trích dẫn"><i class="fa-solid fa-quote-left"></i></button>
          <button onclick="execCmd('formatBlock','pre')" title="Code block"><i class="fa-solid fa-code"></i></button>
          <button onclick="insertHR()" title="Đường phân cách"><i class="fa-solid fa-minus"></i></button>
          <div class="re-sep"></div>
          <!-- Media -->
          <button onclick="insertLink()" title="Chèn liên kết"><i class="fa-solid fa-link"></i></button>
          <button onclick="document.getElementById('inlineImgInput').click()" title="Chèn ảnh vào bài">
            <i class="fa-solid fa-image"></i>
          </button>
          <input type="file" id="inlineImgInput" accept="image/*" style="display:none"
                 onchange="insertInlineImage(event)">
          <div class="re-sep"></div>
          <!-- Undo/Redo -->
          <button onclick="execCmd('undo')" title="Hoàn tác (Ctrl+Z)"><i class="fa-solid fa-rotate-left"></i></button>
          <button onclick="execCmd('redo')" title="Làm lại (Ctrl+Y)"><i class="fa-solid fa-rotate-right"></i></button>
          <button onclick="execCmd('removeFormat')" title="Xóa định dạng"><i class="fa-solid fa-eraser"></i></button>
        </div>
        
        <!-- Editor area -->
        <div id="postEditor" contenteditable="true" 
             placeholder="Bắt đầu viết nội dung bài viết tại đây..."
             oninput="updateCharCount()" onkeydown="handleEditorKeydown(event)"
             onmouseup="updateToolbarState()" onkeyup="updateToolbarState()">
        </div>
        <div class="re-char-count" id="charCount">0 từ ước tính • 1 phút đọc</div>
      </div>
    </div>

    <!-- TAB: CÀI ĐẶT -->
    <div id="etab-settings-content" style="display:none">
      
      <!-- Ảnh bìa -->
      <div class="form-group">
        <label class="form-label">Ảnh bìa bài viết</label>
        <div id="coverPreviewWrap">
          ${_editorCoverUrl
            ? `<img src="${_editorCoverUrl.startsWith('http') ? _editorCoverUrl : 'http://localhost:5190' + _editorCoverUrl}" 
                    class="cover-preview" id="coverPreviewImg">
               <div style="display:flex;gap:8px;margin-top:8px">
                 <button onclick="document.getElementById('coverImgInput').click()" class="btn-outline btn-sm">
                   <i class="fa-solid fa-arrows-rotate"></i> Đổi ảnh
                 </button>
                 <button onclick="removeCoverImage()" class="btn-danger btn-sm">
                   <i class="fa-solid fa-trash"></i> Xóa ảnh
                 </button>
               </div>`
            : `<div class="cover-placeholder" onclick="document.getElementById('coverImgInput').click()">
                 <div style="text-align:center">
                   <i class="fa-solid fa-cloud-arrow-up" style="font-size:1.8rem;margin-bottom:8px;display:block"></i>
                   Click để tải ảnh bìa (khuyến nghị 1200×630)
                 </div>
               </div>`}
        </div>
        <input type="file" id="coverImgInput" accept="image/*" style="display:none"
               onchange="uploadCoverImage(event)">
        <div id="coverUploadStatus" style="font-size:12px;color:#64748b;margin-top:4px"></div>
      </div>

      <!-- Gallery -->
      <div class="form-group">
        <label class="form-label">Ảnh trong bài viết (Gallery)</label>
        <div id="galleryPreview" style="display:flex;flex-wrap:wrap;gap:8px;min-height:20px">
          ${_editorImages.map((url, i) => renderGalleryThumb(url, i)).join('')}
        </div>
        <button onclick="document.getElementById('galleryImgInput').click()" 
                class="btn-outline btn-sm" style="margin-top:8px">
          <i class="fa-solid fa-plus"></i> Thêm ảnh gallery
        </button>
        <input type="file" id="galleryImgInput" accept="image/*" multiple style="display:none"
               onchange="uploadGalleryImages(event)">
        <div id="galleryUploadStatus" style="font-size:12px;color:#64748b;margin-top:4px"></div>
      </div>

      <div class="form-row">
        <!-- Danh mục -->
        <div class="form-group">
          <label class="form-label">Danh mục *</label>
          <select id="pe-cat" class="form-control">
            ${catOptions.map(c =>
              `<option value="${c}" ${data.category === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>
        <!-- Trạng thái -->
        <div class="form-group">
          <label class="form-label">Trạng thái</label>
          <select id="pe-status" class="form-control">
            <option value="Draft" ${(!data.status || data.status === 'Draft') ? 'selected' : ''}>
              📝 Lưu nháp
            </option>
            <option value="Published" ${data.status === 'Published' ? 'selected' : ''}>
              🟢 Đăng ngay
            </option>
          </select>
        </div>
      </div>

      <!-- Tóm tắt -->
      <div class="form-group">
        <label class="form-label">Tóm tắt / Mô tả ngắn</label>
        <textarea id="pe-summary" class="form-control" rows="3"
                  placeholder="Mô tả ngắn hiển thị trong danh sách bài viết (150-200 ký tự)..."
                  style="resize:vertical;min-height:80px">${Utils.escapeHtml(data.summary || '')}</textarea>
        <div style="font-size:11px;color:#334155;text-align:right;margin-top:2px" id="summaryCount">0 / 200</div>
      </div>

      <!-- Tags -->
      <div class="form-group">
        <label class="form-label">Tags (nhãn)</label>
        <div class="tag-input-wrap" id="tagInputWrap" onclick="document.getElementById('tagInput').focus()">
          <div id="tagChips" style="display:contents"></div>
          <input id="tagInput" placeholder="Nhập tag và nhấn Enter..."
                 onkeydown="handleTagInput(event)" oninput="checkTagDuplicate()">
        </div>
        <div style="font-size:11px;color:#334155;margin-top:4px">Ví dụ: tình nguyện, từ thiện, dut</div>
      </div>

      <!-- Options -->
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#94a3b8">
          <input type="checkbox" id="pe-pinned" ${data.isPinned ? 'checked' : ''}
                 style="width:16px;height:16px;accent-color:#ff2d55">
          <span><i class="fa-solid fa-thumbtack" style="color:#f59e0b"></i> Ghim bài viết lên đầu</span>
        </label>
      </div>

    </div>

    <!-- Action buttons -->
    <div style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.07)">
      <button onclick="savePost(false)" class="btn-outline" style="flex:1;padding:11px;font-size:14px">
        <i class="fa-regular fa-floppy-disk"></i> Lưu nháp
      </button>
      <button onclick="previewCurrentPost()" class="btn-outline" style="padding:11px 16px;font-size:14px">
        <i class="fa-regular fa-eye"></i> Xem trước
      </button>
      <button onclick="savePost(true)" class="btn-primary" style="flex:1;padding:11px;font-size:14px">
        <i class="fa-solid fa-paper-plane"></i> 
        ${isEdit ? 'Cập nhật' : 'Đăng bài'}
      </button>
    </div>
  `, null);

  // Init editor content
  requestAnimationFrame(() => {
    const editor = document.getElementById('postEditor');
    if (editor && data.content) {
      editor.innerHTML = data.content;
      updateCharCount();
    }

    // Init tags
    if (data.tags) {
      parseTags(data.tags).forEach(t => addTagChip(t));
    }

    // Init summary count
    const sumEl = document.getElementById('pe-summary');
    if (sumEl) {
      sumEl.addEventListener('input', () => {
        const cnt = document.getElementById('summaryCount');
        if (cnt) cnt.textContent = `${sumEl.value.length} / 200`;
      });
      document.getElementById('summaryCount').textContent = `${sumEl.value.length} / 200`;
    }
  });
}

// ── Toolbar helpers ───────────────────────────────────────────────────────────
function execCmd(cmd, value = null) {
  document.getElementById('postEditor')?.focus();
  document.execCommand(cmd, false, value);
  updateToolbarState();
}

function updateToolbarState() {
  const cmds = ['bold', 'italic', 'underline'];
  cmds.forEach(cmd => {
    const btn = document.getElementById(`rb-${cmd}`);
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
  });
}

function insertBlockquote() {
  execCmd('formatBlock', 'blockquote');
}

function insertHR() {
  const editor = document.getElementById('postEditor');
  editor.focus();
  document.execCommand('insertHTML', false, '<hr><p><br></p>');
}

function insertLink() {
  const url = prompt('Nhập URL liên kết:', 'https://');
  if (url) execCmd('createLink', url);
}

function handleEditorKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    execCmd('insertText', '\u00a0\u00a0\u00a0\u00a0');
  }
}

function updateCharCount() {
  const editor = document.getElementById('postEditor');
  if (!editor) return;
  const text = editor.innerText || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(words / 200));
  const cnt = document.getElementById('charCount');
  if (cnt) cnt.textContent = `${words} từ • ${readTime} phút đọc ước tính`;
}

// ── Inline image ──────────────────────────────────────────────────────────────
async function insertInlineImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { Toast.error('Ảnh quá 5MB'); return; }

  const status = document.getElementById('charCount');
  if (status) status.textContent = '⏳ Đang upload ảnh...';

  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('http://localhost:5190/api/upload/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
      body: formData
    });
    const data = await res.json();
    const url = data.data;
    const fullUrl = url.startsWith('http') ? url : 'http://localhost:5190' + url;

    document.getElementById('postEditor').focus();
    document.execCommand('insertHTML', false,
      `<img src="${fullUrl}" alt="" style="max-width:100%;border-radius:8px;margin:8px 0">`);
    
    _editorImages.push(url);
    updateCharCount();
    Toast.success('Đã chèn ảnh vào bài!');
  } catch (e) {
    Toast.error('Upload ảnh thất bại: ' + e.message);
    updateCharCount();
  }
  event.target.value = '';
}

// ── Cover image ───────────────────────────────────────────────────────────────
async function uploadCoverImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { Toast.error('Ảnh quá 5MB'); return; }

  const status = document.getElementById('coverUploadStatus');
  if (status) status.innerHTML = '<span style="color:#f59e0b">⏳ Đang upload...</span>';

  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('http://localhost:5190/api/upload/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
      body: formData
    });
    const data = await res.json();
    const url = data.data;
    _editorCoverUrl = url;

    const fullUrl = url.startsWith('http') ? url : 'http://localhost:5190' + url;
    const wrap = document.getElementById('coverPreviewWrap');
    if (wrap) wrap.innerHTML = `
      <img src="${fullUrl}" class="cover-preview" id="coverPreviewImg">
      <div style="display:flex;gap:8px;margin-top:8px">
        <button onclick="document.getElementById('coverImgInput').click()" class="btn-outline btn-sm">
          <i class="fa-solid fa-arrows-rotate"></i> Đổi ảnh
        </button>
        <button onclick="removeCoverImage()" class="btn-danger btn-sm">
          <i class="fa-solid fa-trash"></i> Xóa ảnh
        </button>
      </div>`;

    if (status) status.innerHTML = '<span style="color:#22c55e">✅ Upload thành công!</span>';
    setTimeout(() => { if (status) status.innerHTML = ''; }, 3000);
    Toast.success('Đã upload ảnh bìa!');
  } catch (e) {
    if (status) status.innerHTML = `<span style="color:#ff2d55">❌ ${e.message}</span>`;
    Toast.error('Upload thất bại: ' + e.message);
  }
  event.target.value = '';
}

function removeCoverImage() {
  _editorCoverUrl = '';
  const wrap = document.getElementById('coverPreviewWrap');
  if (wrap) wrap.innerHTML = `
    <div class="cover-placeholder" onclick="document.getElementById('coverImgInput').click()">
      <div style="text-align:center">
        <i class="fa-solid fa-cloud-arrow-up" style="font-size:1.8rem;margin-bottom:8px;display:block"></i>
        Click để tải ảnh bìa (khuyến nghị 1200×630)
      </div>
    </div>`;
}

// ── Gallery upload ────────────────────────────────────────────────────────────
function renderGalleryThumb(url, index) {
  const src = url.startsWith('http') ? url : 'http://localhost:5190' + url;
  const uid = `gth-${Date.now()}-${index}`;
  return `<div id="${uid}" style="position:relative;width:70px;height:70px;border-radius:6px;overflow:hidden;flex-shrink:0">
    <img src="${src}" style="width:100%;height:100%;object-fit:cover">
    <button onclick="removeGalleryImg('${url}','${uid}')" style="
      position:absolute;top:2px;right:2px;width:16px;height:16px;border-radius:50%;
      background:rgba(0,0,0,0.75);border:none;color:white;font-size:9px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">✕</button>
  </div>`;
}

function removeGalleryImg(url, uid) {
  _editorImages = _editorImages.filter(u => u !== url);
  document.getElementById(uid)?.remove();
}

async function uploadGalleryImages(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const status = document.getElementById('galleryUploadStatus');
  if (status) status.innerHTML = `<span style="color:#f59e0b">⏳ Upload ${files.length} ảnh...</span>`;

  let cnt = 0;
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) { Toast.error(`"${file.name}" quá 5MB, bỏ qua`); continue; }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://localhost:5190/api/upload/image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
        body: formData
      });
      const data = await res.json();
      const url = data.data;
      _editorImages.push(url);

      const preview = document.getElementById('galleryPreview');
      if (preview) {
        const d = document.createElement('div');
        d.innerHTML = renderGalleryThumb(url, Date.now());
        preview.appendChild(d.firstElementChild);
      }
      cnt++;
    } catch (e) {
      Toast.error(`Upload "${file.name}" thất bại`);
    }
  }
  if (status) status.innerHTML = cnt > 0
    ? `<span style="color:#22c55e">✅ Đã upload ${cnt} ảnh</span>` : '';
  setTimeout(() => { if (status) status.innerHTML = ''; }, 3000);
  event.target.value = '';
}

// ── Tags ──────────────────────────────────────────────────────────────────────
let _editorTags = [];

function addTagChip(tag) {
  tag = tag.trim().toLowerCase().replace(/[^a-z0-9àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵýỷỹ\s-]/gi, '');
  if (!tag || _editorTags.includes(tag)) return;
  _editorTags.push(tag);

  const chips = document.getElementById('tagChips');
  if (!chips) return;
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  chip.dataset.tag = tag;
  chip.innerHTML = `#${tag} <button onclick="removeTag('${tag}')" title="Xóa tag">✕</button>`;
  chips.appendChild(chip);
}

function removeTag(tag) {
  _editorTags = _editorTags.filter(t => t !== tag);
  document.querySelector(`.tag-chip[data-tag="${tag}"]`)?.remove();
}

function handleTagInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = document.getElementById('tagInput')?.value.trim();
    if (val) { addTagChip(val); document.getElementById('tagInput').value = ''; }
  } else if (e.key === 'Backspace' && !e.target.value && _editorTags.length) {
    removeTag(_editorTags[_editorTags.length - 1]);
  }
}

function checkTagDuplicate() {}

function parseTags(tags) {
  if (!tags) return [];
  try { return JSON.parse(tags); } catch { return tags.split(',').map(t => t.trim()).filter(Boolean); }
}

// ── Tab switch ────────────────────────────────────────────────────────────────
function switchEditorTab(tab) {
  const tabs = ['write', 'settings'];
  tabs.forEach(t => {
    const btn = document.getElementById(`etab-${t}`);
    const cnt = document.getElementById(`etab-${t}-content`);
    if (!btn || !cnt) return;
    if (t === tab) {
      btn.style.background = 'rgba(255,45,85,0.15)';
      btn.style.color = '#ff2d55';
      cnt.style.display = 'block';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = '#64748b';
      cnt.style.display = 'none';
    }
  });
}

// ── SAVE ─────────────────────────────────────────────────────────────────────
async function savePost(publish) {
  const title = document.getElementById('pe-title')?.value.trim();
  const content = document.getElementById('postEditor')?.innerHTML?.trim();
  const summary = document.getElementById('pe-summary')?.value.trim() || null;
  const category = document.getElementById('pe-cat')?.value;
  const isPinned = document.getElementById('pe-pinned')?.checked || false;
  const statusFromSelect = document.getElementById('pe-status')?.value;

  // Re-init tags from chips
  _editorTags = [...document.querySelectorAll('.tag-chip')].map(c => c.dataset.tag).filter(Boolean);

  if (!title) { 
    switchEditorTab('write');
    Toast.error('Vui lòng nhập tiêu đề bài viết');
    return;
  }
  if (!content || content === '<br>' || content === '') {
    switchEditorTab('write');
    Toast.error('Vui lòng viết nội dung bài viết');
    return;
  }

  const dto = {
    title,
    content,
    summary,
    category: category || 'Tin tức',
    status: publish ? 'Published' : 'Draft',
    tags: _editorTags.length ? JSON.stringify(_editorTags) : null,
    coverImageUrl: _editorCoverUrl || null,
    isPinned,
    imageUrls: _editorImages,
  };

  try {
    if (_editorPostId) {
      await API.updatePost(_editorPostId, dto);
      Toast.success(publish ? 'Cập nhật và đăng bài thành công!' : 'Đã lưu bản nháp!');
    } else {
      await API.createPost(dto);
      Toast.success(publish ? 'Đăng bài thành công! 🎉' : 'Đã lưu bản nháp!');
    }
    closeModal();
    loadPostsAdmin();
    if (typeof loadStats === 'function') loadStats();
  } catch (e) {
    Toast.error(e.message);
  }
}

// ── PREVIEW ───────────────────────────────────────────────────────────────────
function previewCurrentPost() {
  const title = document.getElementById('pe-title')?.value || 'Không có tiêu đề';
  const content = document.getElementById('postEditor')?.innerHTML || '';
  const summary = document.getElementById('pe-summary')?.value || '';
  const category = document.getElementById('pe-cat')?.value || 'Tin tức';
  const coverUrl = _editorCoverUrl || '';

  showPostPreviewModal({
    title, content, summary, category,
    coverImageUrl: coverUrl,
    authorName: Auth.getUser()?.username || 'Bạn',
    createdDate: new Date().toISOString(),
    isPinned: document.getElementById('pe-pinned')?.checked || false,
  });
}

function showPostPreviewModal(p) {
  let preview = document.getElementById('postPreviewModal');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'postPreviewModal';
    preview.className = 'modal-overlay';
    preview.innerHTML = `<div class="modal" id="postPreviewBody" 
      style="max-width:760px;padding:0;max-height:88vh;overflow-y:auto"></div>`;
    document.body.appendChild(preview);
    preview.addEventListener('click', (e) => {
      if (e.target === preview) preview.classList.remove('open');
    });
  }

  const CAT_CLS = {
    'Tin tức': 'badge-gold', 'Thông báo': 'badge-blue',
    'Hoạt động': 'badge-open', 'Tuyển thành viên': 'badge-red', 'Chia sẻ': 'badge-blue'
  };
  const catCls = CAT_CLS[p.category] || 'badge-gold';
  const coverSrc = p.coverImageUrl
    ? (p.coverImageUrl.startsWith('http') ? p.coverImageUrl : 'http://localhost:5190' + p.coverImageUrl)
    : '';

  document.getElementById('postPreviewBody').innerHTML = `
    <div style="background:#0f172a;border-radius:14px;overflow:hidden">
      <div style="background:#111827;padding:10px 16px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:12px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.08em">
          <i class="fa-solid fa-eye"></i> Xem trước bài viết
        </span>
        <button onclick="document.getElementById('postPreviewModal').classList.remove('open')"
          style="width:26px;height:26px;border-radius:50%;background:#1e293b;border:1px solid rgba(255,255,255,0.1);
                 color:#94a3b8;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;
                 font-family:Arial,sans-serif">✕</button>
      </div>
      ${coverSrc ? `<img src="${coverSrc}" style="width:100%;height:260px;object-fit:cover;display:block">` : ''}
      <div style="padding:28px 32px">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <span class="badge ${catCls}">${Utils.escapeHtml(p.category)}</span>
          ${p.isPinned ? `<span style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);padding:3px 9px;border-radius:100px;font-size:11px;font-weight:700">
            <i class="fa-solid fa-thumbtack"></i> Ghim</span>` : ''}
        </div>
        <h1 style="font-size:24px;font-weight:700;color:white;margin:0 0 12px;line-height:1.3">
          ${Utils.escapeHtml(p.title || 'Không có tiêu đề')}
        </h1>
        <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#475569;margin-bottom:18px">
          <span><i class="fa-regular fa-user"></i> ${Utils.escapeHtml(p.authorName || 'BTC')}</span>
          <span><i class="fa-regular fa-calendar"></i> ${new Date().toLocaleDateString('vi-VN')}</span>
        </div>
        ${p.summary ? `<div style="background:rgba(59,130,246,0.06);border-left:3px solid #3b82f6;
            border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;font-size:14px;
            color:#94a3b8;font-style:italic">${Utils.escapeHtml(p.summary)}</div>` : ''}
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 20px">
        <div style="font-size:15px;color:#cbd5e1;line-height:1.85">${p.content || ''}</div>
      </div>
    </div>`;

  // Apply post content styles
  const body = document.getElementById('postPreviewBody');
  const contentDiv = body.querySelector('div > div:last-child > div:last-child');
  if (contentDiv) contentDiv.className = 'post-content-body';

  preview.classList.add('open');
}

// ── Export ────────────────────────────────────────────────────────────────────
window.loadPostsAdmin = loadPostsAdmin;
window.openPostEditor = openPostEditor;
window.editPost = editPost;
window.previewPost = previewPost;
window.delPost = delPost;
window.togglePublish = togglePublish;
window.savePost = savePost;
window.switchEditorTab = switchEditorTab;
window.execCmd = execCmd;
window.insertBlockquote = insertBlockquote;
window.insertHR = insertHR;
window.insertLink = insertLink;
window.insertInlineImage = insertInlineImage;
window.uploadCoverImage = uploadCoverImage;
window.removeCoverImage = removeCoverImage;
window.uploadGalleryImages = uploadGalleryImages;
window.removeGalleryImg = removeGalleryImg;
window.handleTagInput = handleTagInput;
window.addTagChip = addTagChip;
window.removeTag = removeTag;
window.previewCurrentPost = previewCurrentPost;
window.updateToolbarState = updateToolbarState;
window.updateCharCount = updateCharCount;
window.handleEditorKeydown = handleEditorKeydown;