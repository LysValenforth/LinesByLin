// Load and render media items (beats, movies, tvshows)

document.addEventListener('DOMContentLoaded', () => {
  const category = document.body.dataset.mediahub;
  if (category && category !== 'beats') {
    loadMediaHubPage(category);
  }
  if (document.getElementById('mediahub-featured')) {
    loadMediaHubFeatured();
  }
});

async function loadMediaHubPage(category) {
  const grid        = document.getElementById('mediahub-grid');
  const searchInput = document.getElementById('search-input');
  if (!grid) return;

  grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading...</p></div>';

  if (typeof getMediaHubByCategory !== 'function') {
    grid.innerHTML = '<p class="error-text">Firebase not configured.</p>';
    return;
  }

  let items = [];
  try {
    items = await getMediaHubByCategory(category);
  } catch (e) {
    grid.innerHTML = '<p class="error-text">Could not load items. Check Firebase config.</p>';
    return;
  }

  let activeGenre  = 'all';
  let activeStatus = 'all';
  let searchQuery  = '';

  const filterBar = document.createElement('div');
  filterBar.className = 'mh-filter-bar';
  grid.parentNode.insertBefore(filterBar, grid);

  function buildFilterBar(allItems) {
    const genres = ['all', ...new Set(
      allItems.map(i => (i.genre || '').split(',').map(g => g.trim())).flat().filter(Boolean)
    )];
    const statusLabels = { all: 'All', watched: 'Watched', watching: 'Watching', want: 'Want to Watch' };

    filterBar.innerHTML = `
      <div class="mh-filter-row">
        <div class="mh-filter-group">
          <span class="mh-filter-label">Genre</span>
          <div class="mh-pills" id="genre-pills">
            ${genres.map(g => `<button class="mh-pill${g === activeGenre ? ' active' : ''}" data-genre="${g}">${g === 'all' ? 'All' : g}</button>`).join('')}
          </div>
        </div>
        <div class="mh-filter-group">
          <span class="mh-filter-label">Status</span>
          <div class="mh-pills" id="status-pills">
            ${['all','watched','watching','want'].map(s => `<button class="mh-pill mh-pill-status${s === activeStatus ? ' active' : ''}" data-status="${s}">${statusLabels[s]}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="mh-results-count" id="mh-count"></div>
    `;

    filterBar.querySelectorAll('[data-genre]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeGenre = btn.dataset.genre;
        filterBar.querySelectorAll('[data-genre]').forEach(b => b.classList.toggle('active', b.dataset.genre === activeGenre));
        applyFilters();
      });
    });
    filterBar.querySelectorAll('[data-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeStatus = btn.dataset.status;
        filterBar.querySelectorAll('[data-status]').forEach(b => b.classList.toggle('active', b.dataset.status === activeStatus));
        applyFilters();
      });
    });
  }

  function applyFilters() {
    let list = items;
    if (searchQuery) {
      list = list.filter(i =>
        (i.title || '').toLowerCase().includes(searchQuery) ||
        (i.creator || '').toLowerCase().includes(searchQuery) ||
        (i.genre || '').toLowerCase().includes(searchQuery) ||
        (i.description || '').toLowerCase().includes(searchQuery)
      );
    }
    if (activeGenre !== 'all') {
      list = list.filter(i => (i.genre || '').split(',').map(g => g.trim()).includes(activeGenre));
    }
    if (activeStatus !== 'all') {
      list = list.filter(i => (i.status || '') === activeStatus);
    }
    renderGrid(list);
  }

  function renderGrid(list) {
    const countEl = document.getElementById('mh-count');
    if (countEl) {
      countEl.textContent = list.length === items.length
        ? `${items.length} ${items.length === 1 ? 'item' : 'items'}`
        : `${list.length} of ${items.length} items`;
    }
    if (list.length === 0) {
      grid.innerHTML = buildEmptyState(category, activeGenre, activeStatus, searchQuery);
      return;
    }
    grid.innerHTML = '';
    list.forEach(item => grid.appendChild(buildMediaCard(item, category)));
  }

  buildFilterBar(items);
  applyFilters();

  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      searchQuery = searchInput.value.toLowerCase().trim();
      applyFilters();
    }, 200));
  }
}

function buildEmptyState(category, genre, status, query) {
  const catIcons = {
    movies:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M16 4v16M2 9h4M18 9h4M2 15h4M18 15h4"/></svg>`,
    tvshows: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7L12 3l4 4"/><path d="M12 12v5M9 14.5h6"/></svg>`,
    beats:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 9l6 3-6 3V9z" fill="currentColor" stroke="none"/></svg>`,
  };
  const icon = catIcons[category] || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>`;

  let msg = '', sub = '';
  if (query) {
    msg = `No results for "${query}"`;
    sub = 'Try a different search term or clear the filters.';
  } else if (status !== 'all') {
    const labels = { watched: 'watched', watching: 'currently watching', want: 'on your want-to-watch list' };
    msg = `Nothing ${labels[status] || status} yet`;
    sub = genre !== 'all' ? 'Try removing the genre filter.' : 'Add something from the editor.';
  } else if (genre !== 'all') {
    msg = `No ${genre} titles yet`;
    sub = 'Try a different genre or add one from the editor.';
  } else {
    msg = 'Nothing here yet';
    sub = `Add your first ${category === 'tvshows' ? 'show' : category === 'movies' ? 'film' : 'item'} from the editor.`;
  }

  return `
    <div class="mh-empty-state">
      <div class="mh-empty-icon">${icon}</div>
      <p class="mh-empty-msg">${msg}</p>
      <p class="mh-empty-sub">${sub}</p>
    </div>`;
}

async function loadMediaHubFeatured() {
  const container = document.getElementById('mediahub-featured');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  if (typeof getAllMediaHub !== 'function') { container.innerHTML = '<p class="error-text">Firebase not configured.</p>'; return; }
  try {
    const items = await getAllMediaHub();
    if (!items.length) { container.innerHTML = '<div class="empty-state"><p>No media added yet.</p></div>'; return; }
    container.innerHTML = '';
    items.slice(0, 9).forEach(item => container.appendChild(buildMediaCard(item, item.category)));
  } catch (e) {
    container.innerHTML = '<p class="error-text">Could not load media. Check Firebase config.</p>';
  }
}

function buildMediaCard(item, category) {
  if (category === 'beats') return buildBeatCard(item);
  return buildMovieCard(item, category);
}

function buildMovieCard(item, category) {
  const card = document.createElement('div');
  card.className = 'media-card';

  const catLabel = { movies: 'Film', tvshows: 'TV Show' }[category] || category;

  const statusMap = {
    watched:  { label: 'Watched',       cls: 'status-watched'  },
    watching: { label: 'Watching',      cls: 'status-watching' },
    want:     { label: 'Want to Watch', cls: 'status-want'     },
  };
  const statusInfo  = statusMap[item.status];
  const statusBadge = statusInfo ? `<span class="media-status-badge ${statusInfo.cls}">${statusInfo.label}</span>` : '';

  let ratingHTML = '';
  if (item.rating) {
    const r = parseInt(item.rating);
    ratingHTML = `<div class="media-rating">${[1,2,3,4,5].map(n => `<span class="media-heart${n <= r ? ' filled' : ''}">♥</span>`).join('')}</div>`;
  }

  const posterHTML = item.imageURL
    ? `<img class="media-card-poster" src="${item.imageURL}" alt="${item.title}" loading="lazy">`
    : `<div class="media-card-poster-placeholder"><img src="assets/icons/movie.svg" style="width:48px;height:48px;opacity:0.3;" alt=""></div>`;

  const trailerBtn = item.videoURL
    ? `<button class="media-trailer-btn" aria-label="Watch trailer"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Trailer</button>`
    : '';

  const titleHTML = item.infoLink
    ? `<a href="${item.infoLink}" target="_blank" rel="noopener noreferrer" class="media-card-title media-card-title-link">${item.title}</a>`
    : `<h3 class="media-card-title">${item.title}</h3>`;

  const infoBtn = item.infoLink
    ? `<a href="${item.infoLink}" target="_blank" rel="noopener noreferrer" class="media-info-btn">More Info ↗</a>`
    : '';

  card.innerHTML = `
    <div class="media-card-poster-wrap">
      ${posterHTML}
      <div class="media-card-poster-badges">
        ${statusBadge}
        ${trailerBtn ? `<div class="media-card-poster-overlay">${trailerBtn}</div>` : ''}
      </div>
    </div>
    <div class="media-trailer-embed hidden"></div>
    <div class="media-card-body">
      <div class="media-card-meta-row">
        <span class="media-card-genre">${item.genre || catLabel}</span>
        ${ratingHTML}
      </div>
      <div class="media-card-title-row">${titleHTML}</div>
      ${item.creator     ? `<p class="media-card-creator">${item.creator}</p>` : ''}
      ${item.description ? `<p class="media-card-description">${item.description}</p>` : ''}
      ${item.stars       ? `<p class="media-card-stars"><span class="media-stars-label">Starring</span> ${item.stars}</p>` : ''}
      ${infoBtn}
    </div>
  `;

  if (item.videoURL) {
    const btn        = card.querySelector('.media-trailer-btn');
    const embedWrap  = card.querySelector('.media-trailer-embed');
    const posterWrap = card.querySelector('.media-card-poster-wrap');
    btn.addEventListener('click', () => {
      const isOpen = !embedWrap.classList.contains('hidden');
      if (isOpen) {
        embedWrap.innerHTML = '';
        embedWrap.classList.add('hidden');
        posterWrap.style.display = '';
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Trailer`;
      } else {
        embedWrap.innerHTML = `<div class="video-embed"><iframe src="${item.videoURL}" allowfullscreen loading="lazy" title="${item.title} — trailer"></iframe></div>`;
        embedWrap.classList.remove('hidden');
        posterWrap.style.display = 'none';
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Close`;
      }
    });
  }

  return card;
}

function buildBeatCard(item) {
  const card = document.createElement('article');
  card.className = 'beat-card';
  const cover    = item.imageURL ? `<img class="beat-cover" src="${item.imageURL}" alt="${item.title}">` : `<div class="beat-cover-fallback">🎵</div>`;
  const titleEl  = item.songLink ? `<a href="${item.songLink}" target="_blank" rel="noopener noreferrer" class="beat-title">${item.title}</a>` : `<h3 class="beat-title">${item.title}</h3>`;
  const artistEl = item.creator
    ? (item.artistLink ? `<a href="${item.artistLink}" target="_blank" rel="noopener noreferrer" class="beat-artist">${item.creator}</a>` : `<span class="beat-artist">${item.creator}</span>`)
    : '';
  const audioEl  = item.audioURL ? `<audio class="beat-audio-player" controls preload="none" src="${item.audioURL}" style="width:100%;margin-top:8px;height:36px;border-radius:var(--radius-md);"></audio>` : '';

  card.innerHTML = `
    <div class="beat-inner">
      <div class="beat-cover-wrap">${cover}<div class="beat-cover-glow"></div></div>
      <div class="beat-body">
        ${item.genre ? `<span class="beat-genre">${item.genre}</span>` : ''}
        <div class="beat-title-row">${titleEl}${artistEl}</div>
        ${item.description ? `<p class="beat-desc">${item.description}</p>` : ''}
        ${audioEl}
      </div>
    </div>`;
  return card;
}