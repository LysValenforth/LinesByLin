// Navigation, post loading, back-to-top

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initBackToTop();

  const pageCategory = document.body.dataset.category;
  if (pageCategory) {
    loadPageContent(pageCategory);
  }

  const mediahubCategory = document.body.dataset.mediahub;
  if (mediahubCategory && mediahubCategory !== 'beats') {
    loadMediahubContent(mediahubCategory);
  }

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


async function loadFeaturedPosts() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading works...</p></div>';

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


const POSTS_PER_PAGE = 5;

async function loadPageContent(category) {
  const grid        = document.getElementById('posts-grid');
  const searchInput = document.getElementById('search-input');
  if (!grid) return;

  grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading...</p></div>';

  let allPosts = [];
  try {
    allPosts = await getPostsByCategory(category);
  } catch (e) {
    grid.innerHTML = '<p class="error-text">Could not load posts. Check your Firebase config.</p>';
    return;
  }

  let currentPage    = 1;
  let filteredPosts  = allPosts;

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

    // Build pagination controls
    if (totalPages <= 1) return;

    // Prev button
    const prev = document.createElement('button');
    prev.className = 'pagination-btn' + (page === 1 ? ' disabled' : '');
    prev.innerHTML = '← Prev';
    prev.disabled  = page === 1;
    prev.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderPage(filteredPosts, currentPage); scrollToGrid(); }
    });
    paginationEl.appendChild(prev);

    // Page number buttons
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

    // Next button
    const next = document.createElement('button');
    next.className = 'pagination-btn' + (page === totalPages ? ' disabled' : '');
    next.innerHTML = 'Next →';
    next.disabled  = page === totalPages;
    next.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderPage(filteredPosts, currentPage); scrollToGrid(); }
    });
    paginationEl.appendChild(next);

    // Page info
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
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      filteredPosts = allPosts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        stripHTML(p.content || '').toLowerCase().includes(q)
      );
      currentPage = 1;
      renderPage(filteredPosts, currentPage);
    });
  }
}

// ─── Page Content Pagination ────────────────────────

const MEDIAHUB_PER_PAGE = 8;

async function loadMediahubContent(category) {
  const grid        = document.getElementById('mediahub-grid');
  const searchInput = document.getElementById('search-input');
  if (!grid) return;

  grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading...</p></div>';

  let allItems = [];
  try {
    allItems = await getMediaHubByCategory(category);
  } catch (e) {
    grid.innerHTML = '<p class="error-text">Could not load content. Check your Firebase config.</p>';
    return;
  }

  let currentPage   = 1;
  let filteredItems = allItems;

  let paginationEl = document.getElementById('pagination');
  if (!paginationEl) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'pagination';
    paginationEl.className = 'pagination';
    grid.parentNode.insertBefore(paginationEl, grid.nextSibling);
  }

  function renderPage(items, page) {
    grid.innerHTML = '';
    paginationEl.innerHTML = '';

    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>No items found.</p></div>';
      return;
    }

    const totalPages = Math.ceil(items.length / MEDIAHUB_PER_PAGE);
    const start      = (page - 1) * MEDIAHUB_PER_PAGE;
    const pageItems  = items.slice(start, start + MEDIAHUB_PER_PAGE);

    pageItems.forEach(item => grid.appendChild(buildMediaCard(item)));

    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.className = 'pagination-btn' + (page === 1 ? ' disabled' : '');
    prev.innerHTML = '← Prev';
    prev.disabled  = page === 1;
    prev.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderPage(filteredItems, currentPage); scrollToGrid(); }
    });
    paginationEl.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = 'pagination-btn pagination-num' + (i === page ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => {
        currentPage = i;
        renderPage(filteredItems, currentPage);
        scrollToGrid();
      });
      paginationEl.appendChild(btn);
    }

    const next = document.createElement('button');
    next.className = 'pagination-btn' + (page === totalPages ? ' disabled' : '');
    next.innerHTML = 'Next →';
    next.disabled  = page === totalPages;
    next.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderPage(filteredItems, currentPage); scrollToGrid(); }
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

  renderPage(filteredItems, currentPage);

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      filteredItems = allItems.filter(item =>
        (item.title       || '').toLowerCase().includes(q) ||
        (item.creator     || '').toLowerCase().includes(q) ||
        (item.genre       || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
      currentPage = 1;
      renderPage(filteredItems, currentPage);
    });
  }
}

// ─── MediaHub Card Builder ─────────────────────────────────────────────────────

function buildMediaCard(item) {
  const card = document.createElement('div');
  card.className = 'card';

  const title       = item.title       || 'Untitled';
  const creator     = item.creator     || '';
  const genre       = item.genre       || '';
  const description = item.description || '';
  const imageURL    = item.imageURL    || '';
  const rating      = item.rating      || '';
  const year        = item.year        || '';
  const trailerURL  = item.trailerURL  || item.trailer || '';

  const metaParts = [creator, year, genre].filter(Boolean).join(' · ');

  card.innerHTML = `
    ${imageURL ? `<img class="card-image" src="${imageURL}" alt="${title}">` : ''}
    ${genre    ? `<span class="card-category">${genre}</span>` : ''}
    <h3 class="card-title">${title}</h3>
    ${metaParts  ? `<p class="card-date">${metaParts}</p>` : ''}
    ${rating     ? `<p class="card-date">★ ${rating}</p>` : ''}
    ${description ? `<p class="card-preview">${description.slice(0, 140)}${description.length > 140 ? '…' : ''}</p>` : ''}
    ${trailerURL  ? `<a href="${trailerURL}" class="card-link" target="_blank" rel="noopener">Watch Trailer →</a>` : ''}
  `;
  return card;
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
    ${!compact && preview ? `<p class="card-preview">${preview}${preview.length >= 140 ? '…' : ''}</p>` : ''}
    <a href="post.html?id=${post.id}" class="card-link">Read →</a>
  `;
  return card;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHTML(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

(function() {
  let aimBuffer = '';
  let aimTimer  = null;

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
      if (pwd === 'Abigail25+20') {
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
      !this.hasAttribute('data-no-transition')
    ) {
      e.preventDefault();
      document.body.style.transition = 'opacity 0.3s ease';
      document.body.style.opacity = '0';
      setTimeout(() => window.location.href = href, 300);
    }
  });
});