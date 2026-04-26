// ================================================
// posts.js - Trang Tin tức CLB CTXH DUT
// Xử lý: hiển thị bài viết, like, share, filter
// Nền sáng - chữ đen
// ================================================

// ── State ──────────────────────────────────────────────────────────────────────
let allPosts = [];
let currentCategory = '';
let likedPosts = new Set(JSON.parse(localStorage.getItem('ctxh_liked_posts') || '[]'));
let likeCounts = JSON.parse(localStorage.getItem('ctxh_like_counts') || '{}');

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateNavbar();
  await loadPosts();
});

// ── Load posts from API ────────────────────────────────────────────────────────
async function loadPosts() {
  const feed = document.getElementById('postsFeed');
  if (feed) {
    feed.innerHTML = '<div style="text-align:center;padding:60px"><div class="spinner" style="margin:0 auto"></div><p style="margin-top:12px;color:#64748b">Đang tải bài viết...</p></div>';
  }
  
  try {
    const r = await API.getPosts();
    
    // Xử lý dữ liệu từ API
    let posts = [];
    if (r.data && Array.isArray(r.data.items)) {
      posts = r.data.items;
    } else if (Array.isArray(r.data)) {
      posts = r.data;
    } else if (Array.isArray(r)) {
      posts = r;
    } else {
      posts = [];
    }
    
    // Lọc bài viết đã đăng
    allPosts = posts.filter(p => p.status === 'Published');
    
    renderFeed();
    renderSidebar();
  } catch (e) {
    if (feed) {
      feed.innerHTML = `
        <div style="text-align:center;padding:60px 20px;background:white;border-radius:20px">
          <div style="font-size:3rem;margin-bottom:14px">📭</div>
          <p style="color:#e8213a;margin-bottom:14px">${e.message}</p>
          <button class="btn-outline" onclick="loadPosts()" style="padding:10px 24px">🔄 Thử lại</button>
        </div>`;
    }
  }
}

// ── Render full post feed ─────────────────────────────────────────────────────
function renderFeed() {
  const keyword = (document.getElementById('searchPost')?.value || '').toLowerCase().trim();

  let filtered = allPosts.filter(p => {
    const matchKw = !keyword
      || (p.title || '').toLowerCase().includes(keyword)
      || (p.content || '').toLowerCase().includes(keyword)
      || (p.authorName || '').toLowerCase().includes(keyword);
    const matchCat = !currentCategory || p.category === currentCategory;
    return matchKw && matchCat;
  });

  const countEl = document.getElementById('postsCount');
  if (countEl) countEl.textContent = `${filtered.length} bài viết`;

  const feed = document.getElementById('postsFeed');

  if (!filtered.length) {
    feed.innerHTML = `
      <div style="text-align:center;padding:60px 20px;background:white;border-radius:20px">
        <div style="font-size:3rem;margin-bottom:14px">🔍</div>
        <p style="color:#475569">Không tìm thấy bài viết phù hợp</p>
        <button class="btn-outline" style="margin-top:12px;padding:10px 24px" onclick="clearFilters()">Xóa bộ lọc</button>
      </div>`;
    return;
  }

  feed.innerHTML = filtered.map(p => renderPostCard(p)).join('');
}

// ── Render a single post card (có ảnh) ────────────────────────────────────────
function renderPostCard(p) {
  const catCfg = getCatConfig(p.category);
  const initials = getInitials(p.authorName || 'CLB');
  const likeCount = likeCounts[p.postID] || 0;
  const isLiked = likedPosts.has(p.postID);

  // Xử lý nội dung
  const CONTENT_LIMIT = 350;
  const fullContent = p.content || '';
  const isLong = fullContent.length > CONTENT_LIMIT;
  const shortContent = isLong ? fullContent.slice(0, CONTENT_LIMIT) + '...' : fullContent;

  const contentHtml = isLong
    ? `<div class="post-content-text" id="content-${p.postID}-short">${escapeHtml(shortContent)}</div>
       <div class="post-content-text" id="content-${p.postID}-full" style="display:none">${escapeHtml(fullContent)}</div>
       <button class="read-more-btn" id="readmore-${p.postID}" onclick="toggleReadMore(${p.postID})">Xem thêm</button>`
    : `<div class="post-content-text">${escapeHtml(fullContent)}</div>`;

  // Xử lý ảnh đính kèm
  const images = p.images || [];
  const imagesHtml = images.length > 0 ? buildImagesGrid(images) : '';

  // Like section
  const likeSection = likeCount > 0 ? `
    <div class="post-reactions-summary">
      <div class="reactions-left" onclick="toggleLike(${p.postID})">
        <div class="reaction-emoji-stack">
          <div class="reaction-emoji">❤️</div>
        </div>
        <span class="reactions-count">${likeCount} người thích</span>
      </div>
    </div>
    <div class="post-divider"></div>
  ` : '';

  return `
  <article class="post-card" id="post-${p.postID}">
    <!-- Header -->
    <div class="post-header">
      <div class="post-avatar">${initials}</div>
      <div class="post-author-info">
        <div class="post-author-name">${escapeHtml(p.authorName || 'CLB CTXH DUT')}</div>
        <div class="post-meta-row">
          <span class="post-date">${Utils.formatDateTime(p.createdDate || p.publishedDate)}</span>
          <div class="post-dot"></div>
          <span class="badge ${catCfg.cls}" style="font-size:11px;padding:3px 10px">${escapeHtml(p.category)}</span>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="post-body">
      ${p.title ? `<div class="post-title-text">${escapeHtml(p.title)}</div>` : ''}
      ${contentHtml}
      ${imagesHtml}
    </div>

    ${likeCount > 0 ? '<div class="post-divider"></div>' : ''}
    ${likeSection}

    <!-- Actions -->
    <div class="post-actions">
      <button class="post-action-btn ${isLiked ? 'liked' : ''}" id="like-btn-${p.postID}" onclick="toggleLike(${p.postID})">
        <span class="btn-icon">
          ${isLiked ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>'}
        </span>
        <span id="like-label-${p.postID}">${isLiked ? 'Đã thích' : 'Thích'}</span>
      </button>
      <button class="post-action-btn" onclick="sharePost(${p.postID}, '${escapeHtml(p.title || p.content?.slice(0, 40) || '')}')">
        <span class="btn-icon"><i class="fa-solid fa-share-nodes"></i></span>
        <span>Chia sẻ</span>
      </button>
    </div>
  </article>`;
}

// ── Build images grid (hiển thị ảnh) ──────────────────────────────────────────
function buildImagesGrid(images) {
  const count = Math.min(images.length, 3);
  const cls = `post-images-grid count-${count}`;
  
  const imgs = images.slice(0, count).map((url, idx) => {
    // Xử lý URL ảnh
    let src = url;
    if (!src.startsWith('http')) {
      if (src.startsWith('/uploads')) {
        src = `http://localhost:5190${src}`;
      } else if (src.startsWith('uploads')) {
        src = `http://localhost:5190/${src}`;
      } else {
        src = `http://localhost:5190${src.startsWith('/') ? src : '/' + src}`;
      }
    }
    
    // Grid đặc biệt cho 3 ảnh
    if (count === 3 && idx === 0) {
      return `<img src="${src}" alt="Hình ảnh bài viết" onclick="event.stopPropagation(); openLightbox('${src}')" loading="lazy" onerror="this.style.display='none'">`;
    }
    return `<img src="${src}" alt="Hình ảnh bài viết" onclick="event.stopPropagation(); openLightbox('${src}')" loading="lazy" onerror="this.style.display='none'">`;
  }).join('');
  
  // Style đặc biệt cho 3 ảnh
  if (count === 3) {
    return `<div class="${cls}" style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div style="grid-row:span 2">${imgs.split('</div>')[0]}</div>
      <div style="display:flex;flex-direction:column;gap:6px">${imgs.split('</div>').slice(1).join('</div>')}</div>
    </div>`;
  }
  
  return `<div class="${cls}">${imgs}</div>`;
}

// ── Toggle read more ──────────────────────────────────────────────────────────
function toggleReadMore(postId) {
  const shortEl = document.getElementById(`content-${postId}-short`);
  const fullEl = document.getElementById(`content-${postId}-full`);
  const btn = document.getElementById(`readmore-${postId}`);
  const isExpanded = fullEl && fullEl.style.display !== 'none';

  if (isExpanded) {
    if (fullEl) fullEl.style.display = 'none';
    if (shortEl) shortEl.style.display = 'block';
    if (btn) btn.textContent = 'Xem thêm';
  } else {
    if (shortEl) shortEl.style.display = 'none';
    if (fullEl) fullEl.style.display = 'block';
    if (btn) btn.textContent = 'Thu gọn';
  }
}

// ── Like / Unlike ─────────────────────────────────────────────────────────────
function toggleLike(postId) {
  const btn = document.getElementById(`like-btn-${postId}`);
  const lbl = document.getElementById(`like-label-${postId}`);

  if (!Auth.isLoggedIn()) {
    Toast.info('Đăng nhập để thả ❤️ bài viết');
    setTimeout(() => AuthModal.open('login'), 600);
    return;
  }

  const wasLiked = likedPosts.has(postId);

  if (wasLiked) {
    likedPosts.delete(postId);
    likeCounts[postId] = Math.max(0, (likeCounts[postId] || 1) - 1);
    if (btn) btn.classList.remove('liked');
    if (lbl) lbl.textContent = 'Thích';
    Toast.info('Đã bỏ thích bài viết');
  } else {
    likedPosts.add(postId);
    likeCounts[postId] = (likeCounts[postId] || 0) + 1;
    if (btn) btn.classList.add('liked');
    if (lbl) lbl.textContent = 'Đã thích';
    Toast.success('❤️ Đã thích bài viết!');
  }

  // Lưu localStorage
  localStorage.setItem('ctxh_liked_posts', JSON.stringify([...likedPosts]));
  localStorage.setItem('ctxh_like_counts', JSON.stringify(likeCounts));

  // Cập nhật UI
  updateReactionsSummary(postId);
}

// ── Cập nhật reactions summary ─────────────────────────────────────────────────
function updateReactionsSummary(postId) {
  const articleEl = document.getElementById(`post-${postId}`);
  if (!articleEl) return;

  const count = likeCounts[postId] || 0;
  
  // Xóa summary cũ
  const existingSummary = articleEl.querySelector('.post-reactions-summary');
  if (existingSummary) {
    const prevDivider = existingSummary.previousElementSibling;
    existingSummary.remove();
    if (prevDivider && prevDivider.classList.contains('post-divider') && count === 0) {
      prevDivider.remove();
    }
  }

  // Thêm mới nếu count > 0
  if (count > 0) {
    const actionsDiv = articleEl.querySelector('.post-actions');
    const reactionHtml = `
      <div class="post-reactions-summary">
        <div class="reactions-left" onclick="toggleLike(${postId})">
          <div class="reaction-emoji-stack">
            <div class="reaction-emoji">❤️</div>
          </div>
          <span class="reactions-count">${count} người thích</span>
        </div>
      </div>
      <div class="post-divider"></div>`;
    
    if (actionsDiv) {
      actionsDiv.insertAdjacentHTML('beforebegin', reactionHtml);
    }
  }
}

// ── Share post ────────────────────────────────────────────────────────────────
function sharePost(postId, title) {
  if (navigator.share) {
    navigator.share({
      title: title || 'CLB CTXH DUT',
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      Toast.success('Đã sao chép liên kết!');
    }).catch(() => {
      Toast.info('Chia sẻ: ' + window.location.href);
    });
  }
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar() {
  // Category counts
  const cats = {};
  allPosts.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });

  const catIco = { 'Tin tức': '📰', 'Thông báo': '📢', 'Hoạt động': '🎯', 'Tuyển thành viên': '⭐' };
  const catCls = { 'Tin tức': 'badge-gold', 'Thông báo': 'badge-blue', 'Hoạt động': 'badge-open', 'Tuyển thành viên': 'badge-red' };

  const catHtml = Object.entries(cats).map(([name, cnt]) => `
    <div class="category-list-item" onclick="filterByCategory('${name}', null)">
      <span style="font-size:13px;color:#334155">${catIco[name] || '📁'} ${name}</span>
      <span class="badge ${catCls[name] || 'badge-closed'}" style="font-size:11px">${cnt}</span>
    </div>`).join('');

  const sidebarCats = document.getElementById('sidebarCategories');
  if (sidebarCats) {
    sidebarCats.innerHTML = catHtml || '<div style="color:#64748b;font-size:13px">Chưa có danh mục</div>';
  }

  // Trending (most liked)
  const trending = [...allPosts].sort((a, b) => {
    const likesA = likeCounts[a.postID] || 0;
    const likesB = likeCounts[b.postID] || 0;
    return likesB - likesA;
  }).slice(0, 5);

  const trendHtml = trending.map((p, i) => `
    <div class="trending-item" onclick="scrollToPost(${p.postID})">
      <div class="trending-num">${String(i + 1).padStart(2, '0')}</div>
      <div>
        <div class="trending-title">${escapeHtml((p.title || p.content || '').slice(0, 55))}${(p.title || p.content || '').length > 55 ? '...' : ''}</div>
        <div class="trending-cat">${p.category || ''} · ${Utils.formatDate(p.createdDate)}</div>
      </div>
    </div>`).join('');

  const trendingPosts = document.getElementById('trendingPosts');
  if (trendingPosts) {
    trendingPosts.innerHTML = trendHtml || '<div style="color:#64748b;font-size:13px">Chưa có bài viết</div>';
  }
}

// ── Scroll to post ────────────────────────────────────────────────────────────
function scrollToPost(postId) {
  const el = document.getElementById(`post-${postId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.boxShadow = '0 0 0 3px rgba(232,33,58,0.4)';
    el.style.transition = 'box-shadow 0.2s';
    setTimeout(() => {
      el.style.boxShadow = '';
    }, 1500);
  }
}

// ── Filters ───────────────────────────────────────────────────────────────────
function filterByCategory(cat, clickedEl) {
  currentCategory = cat;

  document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
  if (clickedEl) {
    clickedEl.classList.add('active');
  } else {
    const tags = document.querySelectorAll('.category-tag');
    for (let tag of tags) {
      if (tag.textContent.includes(cat)) {
        tag.classList.add('active');
        break;
      }
    }
  }

  renderFeed();
}

function filterPosts() {
  renderFeed();
}

function clearFilters() {
  currentCategory = '';
  document.getElementById('searchPost').value = '';
  document.querySelectorAll('.category-tag').forEach((t, i) => {
    if (i === 0) t.classList.add('active');
    else t.classList.remove('active');
  });
  renderFeed();
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(src) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (img) img.src = src;
  if (lightbox) lightbox.classList.add('open');
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (lightbox) lightbox.classList.remove('open');
  if (img) setTimeout(() => { img.src = ''; }, 300);
}

// Event listener cho ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function getInitials(name) {
  return (name || 'C').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getCatConfig(cat) {
  const map = {
    'Tin tức':          { cls: 'badge-gold',  ico: '📰' },
    'Thông báo':        { cls: 'badge-blue',  ico: '📢' },
    'Hoạt động':        { cls: 'badge-open',  ico: '🎯' },
    'Tuyển thành viên': { cls: 'badge-red',   ico: '⭐' },
  };
  return map[cat] || { cls: 'badge-closed', ico: '📁' };
}

// Export to window
window.loadPosts = loadPosts;
window.renderFeed = renderFeed;
window.toggleLike = toggleLike;
window.toggleReadMore = toggleReadMore;
window.sharePost = sharePost;
window.filterByCategory = filterByCategory;
window.filterPosts = filterPosts;
window.clearFilters = clearFilters;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.scrollToPost = scrollToPost;