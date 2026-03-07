// Load and render media items (beats, movies, tvshows)

document.addEventListener('DOMContentLoaded', () => {
  const category = document.body.dataset.mediahub;
  if (category && category !== 'beats') {
    // beats.html uses its own inline React player
    loadMediaHubPage(category);
  }

  if (document.getElementById('mediahub-featured')) {
    loadMediaHubFeatured();
  }
});

// ─── Load page content ────────────────────────────────────────────────────────

async function loadMediaHubPage(category) {
  const grid        = document.getElementById('mediahub-grid');
  const searchInput = document.getElementById('search-input');
  if (!grid) return;

  grid.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading...</p></div>';

  if (typeof getMediaHubByCategory !== 'function') {
    grid.innerHTML = '<p class="error-text">Firebase not configured. Add your config to js/firebase.js.</p>';
    return;
  }

  let items = [];
  try {
    items = await getMediaHubByCategory(category);
  } catch (e) {
    grid.innerHTML = '<p class="error-text">Could not load items. Check Firebase config.</p>';
    return;
  }

  function render(list) {
    if (list.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>No items found.</p></div>';
      return;
    }
    grid.innerHTML = '';
    list.forEach(item => grid.appendChild(buildMediaCard(item, category)));
  }

  render(items);

  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      const q = searchInput.value.toLowerCase();
      render(items.filter(i =>
        (i.title   || '').toLowerCase().includes(q) ||
        (i.creator || '').toLowerCase().includes(q) ||
        (i.genre   || '').toLowerCase().includes(q)
      ));
    }, 200));
  }
}

// ─── Featured mediahub on mediahub.html ───────────────────────────────────────

async function loadMediaHubFeatured() {
  const container = document.getElementById('mediahub-featured');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

  if (typeof getAllMediaHub !== 'function') {
    container.innerHTML = '<p class="error-text">Firebase not configured.</p>';
    return;
  }

  try {
    const items = await getAllMediaHub();
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No media added yet.</p></div>';
      return;
    }
    container.innerHTML = '';
    items.slice(0, 9).forEach(item => {
      container.appendChild(buildMediaCard(item, item.category));
    });
  } catch (e) {
    container.innerHTML = '<p class="error-text">Could not load media. Check Firebase config.</p>';
  }
}

// ─── Card builders ────────────────────────────────────────────────────────────

function buildMediaCard(item, category) {
  if (category === 'beats') return buildBeatCard(item);
  return buildMovieCard(item, category);
}

function buildMovieCard(item, category) {
  const card = document.createElement('div');
  card.className = 'media-card';

  const catLabel = { movies: 'Film', tvshows: 'TV Show' }[category] || category;

  const poster = item.imageURL
    ? `<img class="media-card-poster" src="${item.imageURL}" alt="${item.title}">`
    : `<div class="media-card-poster-placeholder"><img src="assets/icons/movie.svg" style="width:48px;height:48px;opacity:0.4;" alt=""></div>`;

  const videoEmbed = item.videoURL
    ? `<div class="video-embed"><iframe src="${item.videoURL}" allowfullscreen loading="lazy" title="${item.title} — trailer"></iframe></div>`
    : '';

  const titleEl = item.infoLink
    ? `<a href="${item.infoLink}" target="_blank" rel="noopener noreferrer" class="media-card-title media-card-title-link">${item.title}</a>`
    : `<h3 class="media-card-title">${item.title}</h3>`;

  card.innerHTML = `
    ${videoEmbed || poster}
    <div class="media-card-body">
      <span class="media-card-genre">${item.genre || catLabel}</span>
      ${titleEl}
      ${item.creator     ? `<p class="media-card-creator">${item.creator}</p>`         : ''}
      ${item.description ? `<p class="media-card-description">${item.description}</p>` : ''}
      ${item.stars       ? `<p class="media-card-stars">Starring: ${item.stars}</p>`   : ''}
    </div>
  `;
  return card;
}

function buildBeatCard(item) {
  const card = document.createElement('article');
  card.className = 'beat-card';

  const cover = item.imageURL
    ? `<img class="beat-cover" src="${item.imageURL}" alt="${item.title}">`
    : `<div class="beat-cover-fallback">🎵</div>`;

  const titleEl = item.songLink
    ? `<a href="${item.songLink}" target="_blank" rel="noopener noreferrer" class="beat-title">${item.title}</a>`
    : `<h3 class="beat-title">${item.title}</h3>`;

  const artistEl = item.creator
    ? (item.artistLink
        ? `<a href="${item.artistLink}" target="_blank" rel="noopener noreferrer" class="beat-artist">${item.creator}</a>`
        : `<span class="beat-artist">${item.creator}</span>`)
    : '';

  const audioEl = item.audioURL
    ? `<audio class="beat-audio-player" controls preload="none" src="${item.audioURL}" style="width:100%;margin-top:8px;height:36px;border-radius:var(--radius-md);"></audio>`
    : '';

  card.innerHTML = `
    <div class="beat-inner">
      <div class="beat-cover-wrap">
        ${cover}
        <div class="beat-cover-glow"></div>
      </div>
      <div class="beat-body">
        ${item.genre ? `<span class="beat-genre">${item.genre}</span>` : ''}
        <div class="beat-title-row">
          ${titleEl}
          ${artistEl}
        </div>
        ${item.description ? `<p class="beat-desc">${item.description}</p>` : ''}
        ${audioEl}
      </div>
    </div>
  `;
  return card;
}