// Navigation, post loading, back-to-top

// ─── Debounce ──────────────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initBackToTop();

  const pageCategory = document.body.dataset.category;
  if (pageCategory) {
    loadPageContent(pageCategory);
  }

  // Media pages (movies, tvshows) are now handled by mediahub.js
  // Beats page uses its own inline React component

  if (document.getElementById('featured-grid')) {
    loadFeaturedPosts();
  }
});

// ─── Navigation ───────────────────────────────────────────────────────────────

function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const menu   = document.getElementById('nav-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
  }

  document.querySelectorAll('.dropdown').forEach(dd => {
    const link = dd.querySelector('.dropdown-toggle');
    if (link) {
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          dd.classList.toggle('open');
        }
      });
    }
  });
}

// ─── Back To Top ──────────────────────────────────────────────────────────────

function initBackToTop() {
  const btn = document.getElementById('progressWrap');
  if (!btn) return;

  const path = btn.querySelector('.progress-circle path');
  const pathLength = path.getTotalLength();

  path.style.strokeDasharray  = pathLength;
  path.style.strokeDashoffset = pathLength;

  function updateProgress() {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const progress   = pathLength - (scrollTop / docHeight) * pathLength;
    path.style.strokeDashoffset = progress;
    btn.classList.toggle('active-progress', scrollTop > 400);
  }

  window.addEventListener('scroll', updateProgress);
  updateProgress();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ─── Featured Posts (Home) ────────────────────────────────────────────────────

async function loadFeaturedPosts() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading works...</p></div>';

  if (typeof getAllPosts !== 'function') {
    grid.innerHTML = '<p class="error-text">Firebase not configured. Add your config to js/firebase.js.</p>';
    return;
  }

  try {
    const posts = await getAllPosts();
    if (posts.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><img src="assets/icons/home.svg" style="width:48px;height:48px;opacity:0.4;" alt=""></div><p>No posts yet. Start creating in the Editor!</p></div>';
      return;
    }
    grid.innerHTML = '';
    posts.slice(0, 6).forEach(post => grid.appendChild(buildCard(post, true)));
  } catch (e) {
    grid.innerHTML = '<p class="error-text">Could not load posts. Check your Firebase config in js/firebase.js.</p>';
  }
}

// ─── Sort Helper ──────────────────────────────────────────────────────────────

function sortByDate(posts, order) {
  return [...posts].sort((a, b) => {
    const da = a.date ? new Date(a.date) : 0;
    const db = b.date ? new Date(b.date) : 0;
    return order === 'oldest' ? da - db : db - da;
  });
}

// ─── Page Content (Blog / Poems / Stories) ────────────────────────────────────

const POSTS_PER_PAGE = 5;

async function loadPageContent(category) {
  const grid        = document.getElementById('posts-grid');
  const searchInput = document.getElementById('search-input');
  if (!grid) return;

  grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading...</p></div>';

  if (typeof getPostsByCategory !== 'function') {
    grid.innerHTML = '<p class="error-text">Firebase not configured. Add your config to js/firebase.js.</p>';
    return;
  }

  let allPosts = [];
  try {
    allPosts = await getPostsByCategory(category);
  } catch (e) {
    grid.innerHTML = '<p class="error-text">Could not load posts. Check your Firebase config.</p>';
    return;
  }

  // Default: newest first
  allPosts = sortByDate(allPosts, 'newest');

  let currentPage   = 1;
  let filteredPosts = allPosts;
  let sortOrder     = 'newest';

  // ── Sort controls ─────────────────────────────────────────────────────────
  const sortWrap = document.createElement('div');
  sortWrap.className = 'sort-wrap';
  sortWrap.innerHTML = `
    <span class="sort-label">Sort:</span>
    <button class="sort-btn active" data-sort="newest">Newest</button>
    <button class="sort-btn" data-sort="oldest">Oldest</button>
  `;
  grid.parentNode.insertBefore(sortWrap, grid);

  sortWrap.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sortOrder = btn.dataset.sort;
      sortWrap.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const q = searchInput ? searchInput.value.toLowerCase() : '';
      filteredPosts = sortByDate(
        q ? allPosts.filter(p =>
          p.title.toLowerCase().includes(q) ||
          stripHTML(p.content || '').toLowerCase().includes(q)
        ) : allPosts,
        sortOrder
      );
      currentPage = 1;
      renderPage(filteredPosts, currentPage);
    });
  });

  // ── Pagination container ──────────────────────────────────────────────────
  let paginationEl = document.getElementById('pagination');
  if (!paginationEl) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'pagination';
    paginationEl.className = 'pagination';
    grid.parentNode.insertBefore(paginationEl, grid.nextSibling);
  }

  function renderPage(posts, page) {
    grid.innerHTML = '';
    paginationEl.innerHTML = '';

    if (posts.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><img src="assets/icons/blog.svg" style="width:40px;height:40px;opacity:0.4;" alt=""></div><p>No posts found.</p></div>';
      return;
    }

    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
    const start      = (page - 1) * POSTS_PER_PAGE;
    const pagePosts  = posts.slice(start, start + POSTS_PER_PAGE);

    pagePosts.forEach(post => grid.appendChild(buildCard(post, false)));

    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.className = 'pagination-btn' + (page === 1 ? ' disabled' : '');
    prev.innerHTML = 'Prev';
    prev.disabled  = page === 1;
    prev.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderPage(filteredPosts, currentPage); scrollToGrid(); }
    });
    paginationEl.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = 'pagination-btn pagination-num' + (i === page ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => {
        currentPage = i;
        renderPage(filteredPosts, currentPage);
        scrollToGrid();
      });
      paginationEl.appendChild(btn);
    }

    const next = document.createElement('button');
    next.className = 'pagination-btn' + (page === totalPages ? ' disabled' : '');
    next.innerHTML = 'Next';
    next.disabled  = page === totalPages;
    next.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderPage(filteredPosts, currentPage); scrollToGrid(); }
    });
    paginationEl.appendChild(next);

    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Page ${page} of ${totalPages}`;
    paginationEl.appendChild(info);
  }

  function scrollToGrid() {
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  renderPage(filteredPosts, currentPage);

  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      const q = searchInput.value.toLowerCase();
      filteredPosts = sortByDate(
        q ? allPosts.filter(p =>
          p.title.toLowerCase().includes(q) ||
          stripHTML(p.content || '').toLowerCase().includes(q)
        ) : allPosts,
        sortOrder
      );
      currentPage = 1;
      renderPage(filteredPosts, currentPage);
    }, 200));
  }
}

// ─── Card Builder ──────────────────────────────────────────────────────────────

function buildCard(post, compact) {
  const card = document.createElement('div');
  card.className = 'card';

  const date = post.date
    ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const catIcons = {
    blog:    'assets/icons/blog.svg',
    poem:    'assets/icons/poem.svg',
    story:   'assets/icons/story.svg',
    beats:   'assets/icons/music.svg',
    movies:  'assets/icons/movie.svg',
    tvshows: 'assets/icons/tv.svg'
  };
  const catNames = { blog: 'Blog', poem: 'Poem', story: 'Story', beats: 'Beats', movies: 'Movie', tvshows: 'TV Show' };
  const icon = catIcons[post.category] ? `<img src="${catIcons[post.category]}" class="nav-icon" alt="">` : '';
  const catLabel = `${icon} ${catNames[post.category] || post.category}`;
  const preview  = stripHTML(post.content || '').slice(0, 140);

  card.innerHTML = `
    ${post.imageURL ? `<img class="card-image" src="${post.imageURL}" alt="${post.title}">` : ''}
    <span class="card-category">${catLabel}</span>
    <h3 class="card-title">${post.title}</h3>
    <p class="card-date">${date}</p>
    ${!compact && preview ? `<p class="card-preview">${preview}${preview.length >= 140 ? '&hellip;' : ''}</p>` : ''}
    <a href="post.html?id=${post.id}" class="card-link">Read</a>
  `;
  return card;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHTML(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

// ─── AIM Shortcut (Editor Access) ─────────────────────────────────────────────

(function() {
  let aimBuffer = '';
  let aimTimer  = null;

  function checkAccess(input) {
    try {
      return btoa(unescape(encodeURIComponent(input))) === 'QWJpZ2FpbDI1KzIw';
    } catch(e) { return false; }
  }

  document.addEventListener('keydown', function(e) {
    const el  = document.activeElement;
    const tag = el ? el.tagName.toLowerCase() : '';
    if (['input','textarea','select'].includes(tag) || el?.isContentEditable) {
      aimBuffer = '';
      return;
    }

    if (e.key.length !== 1) return;

    aimBuffer += e.key.toLowerCase();
    if (aimBuffer.length > 3) aimBuffer = aimBuffer.slice(-3);

    clearTimeout(aimTimer);
    aimTimer = setTimeout(function() { aimBuffer = ''; }, 2000);

    if (aimBuffer === 'aim') {
      aimBuffer = '';
      clearTimeout(aimTimer);
      if (window.location.pathname.endsWith('editor.html')) return;
      const pwd = prompt('Enter access code:');
      if (checkAccess(pwd)) {
        window.location.href = 'editor.html';
      } else if (pwd !== null) {
        alert('Access Denied');
      }
    }
  });
}());

// ─── Smooth Page Transitions ──────────────────────────────────────────────────

document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (
      href &&
      !href.startsWith('#') &&
      !href.startsWith('mailto') &&
      !href.startsWith('javascript') &&
      href !== '' &&
      !this.hasAttribute('data-no-transition') &&
      !this.target
    ) {
      e.preventDefault();
      document.body.classList.add('page-exit');
      setTimeout(() => window.location.href = href, 280);
    }
  });
});