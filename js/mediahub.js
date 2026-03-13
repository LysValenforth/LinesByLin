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

function _mhDebounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ── Movies / TV Shows page ────────────────────────────────────────────────────
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
    items = (await getMediaHubByCategory(category)).filter(i => i.category !== 'code');
  } catch (e) {
    grid.innerHTML = '<p class="error-text">Could not load items. Check Firebase config.</p>';
    return;
  }

  let activeGenre  = 'all';
  let activeStatus = 'all';
  let activeRating = 'all';   // 'all' | '5' | '7' | '9'
  let activeSort   = 'date';  // 'date' | 'rating-high' | 'title'
  let searchQuery  = '';

  const filterBar = document.createElement('div');
  filterBar.className = 'mh-filter-bar';
  grid.parentNode.insertBefore(filterBar, grid);

  function getGenres(all) {
    const s = new Set();
    all.forEach(i => (i.genre||'').split(',').map(g=>g.trim()).filter(Boolean).forEach(g=>s.add(g)));
    return ['all', ...s];
  }

  function buildFilterBar() {
    const genres     = getGenres(items);
    const hasRatings = items.some(i => i.rating);

    filterBar.innerHTML = `
      <div class="mhfb-rows">

        <div class="mhfb-row">
          <span class="mhfb-label">Genre</span>
          <div class="mhfb-pills" id="genre-pills">
            ${genres.map(g=>`<button class="mhfb-pill${g===activeGenre?' active':''}" data-genre="${g}">${g==='all'?'All':g}</button>`).join('')}
          </div>
        </div>

        <div class="mhfb-row">
          <span class="mhfb-label">Status</span>
          <div class="mhfb-pills" id="status-pills">
            ${[{v:'all',l:'All'},{v:'watched',l:'✓ Watched'},{v:'watching',l:'▶ Watching'},{v:'want',l:'+ Want'}]
              .map(s=>`<button class="mhfb-pill mhfb-pill-status${s.v===activeStatus?' active':''}" data-status="${s.v}">${s.l}</button>`).join('')}
          </div>
        </div>

        ${hasRatings ? `
        <div class="mhfb-row">
          <span class="mhfb-label">Rating</span>
          <div class="mhfb-pills" id="rating-pills">
            ${[{v:'all',l:'Any'},{v:'5',l:'5+ ★'},{v:'7',l:'7+ ★'},{v:'9',l:'9+ ★'}]
              .map(r=>`<button class="mhfb-pill${r.v===activeRating?' active':''}" data-rating="${r.v}">${r.l}</button>`).join('')}
          </div>
        </div>` : ''}

        <div class="mhfb-row">
          <span class="mhfb-label">Sort</span>
          <div class="mhfb-pills" id="sort-pills">
            ${[{v:'date',l:'Latest'},{v:'rating-high',l:'Rating ↓'},{v:'title',l:'A–Z'}]
              .map(s=>`<button class="mhfb-pill${s.v===activeSort?' active':''}" data-sort="${s.v}">${s.l}</button>`).join('')}
          </div>
        </div>

      </div>

      <div class="mhfb-meta">
        <span class="mhfb-count" id="mh-count"></span>
        <button class="mhfb-clear" id="mh-clear" style="display:none">✕ Clear</button>
      </div>`;

    filterBar.querySelectorAll('[data-genre]').forEach(b=>b.addEventListener('click',()=>{
      activeGenre=b.dataset.genre;
      filterBar.querySelectorAll('[data-genre]').forEach(x=>x.classList.toggle('active',x.dataset.genre===activeGenre));
      applyFilters();
    }));
    filterBar.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>{
      activeStatus=b.dataset.status;
      filterBar.querySelectorAll('[data-status]').forEach(x=>x.classList.toggle('active',x.dataset.status===activeStatus));
      applyFilters();
    }));
    filterBar.querySelectorAll('[data-rating]').forEach(b=>b.addEventListener('click',()=>{
      activeRating=b.dataset.rating;
      filterBar.querySelectorAll('[data-rating]').forEach(x=>x.classList.toggle('active',x.dataset.rating===activeRating));
      applyFilters();
    }));
    filterBar.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{
      activeSort=b.dataset.sort;
      filterBar.querySelectorAll('[data-sort]').forEach(x=>x.classList.toggle('active',x.dataset.sort===activeSort));
      applyFilters();
    }));
    document.getElementById('mh-clear')?.addEventListener('click',()=>{
      activeGenre='all'; activeStatus='all'; activeRating='all'; activeSort='date'; searchQuery='';
      if (searchInput) searchInput.value='';
      buildFilterBar(); applyFilters();
    });
  }

  function applyFilters() {
    let list = [...items];
    if (searchQuery) list = list.filter(i=>
      (i.title||'').toLowerCase().includes(searchQuery)||
      (i.creator||'').toLowerCase().includes(searchQuery)||
      (i.genre||'').toLowerCase().includes(searchQuery)||
      (i.description||'').toLowerCase().includes(searchQuery)||
      (i.stars||'').toLowerCase().includes(searchQuery)
    );
    if (activeGenre!=='all')  list = list.filter(i=>(i.genre||'').split(',').map(g=>g.trim()).includes(activeGenre));
    if (activeStatus!=='all') list = list.filter(i=>(i.status||'')===activeStatus);
    if (activeRating!=='all') { const min=parseInt(activeRating); list=list.filter(i=>parseInt(i.rating||0)>=min); }

    list.sort((a,b)=>{
      if (activeSort==='rating-high') return (parseInt(b.rating)||0)-(parseInt(a.rating)||0);
      if (activeSort==='title')       return (a.title||'').localeCompare(b.title||'');
      return new Date(b.date||0)-new Date(a.date||0);
    });

    const isFiltered = activeGenre!=='all'||activeStatus!=='all'||activeRating!=='all'||activeSort!=='date'||searchQuery;
    const clr = document.getElementById('mh-clear');
    if (clr) clr.style.display = isFiltered ? '' : 'none';

    renderGrid(list);
  }

  function renderGrid(list) {
    const countEl = document.getElementById('mh-count');
    if (countEl) countEl.textContent = list.length===items.length
      ? `${items.length} ${items.length===1?'title':'titles'}`
      : `${list.length} of ${items.length}`;
    if (!list.length) { grid.innerHTML = buildEmptyState(category, activeGenre, activeStatus, searchQuery); return; }
    grid.innerHTML='';
    list.forEach(item=>{ const c=buildMediaCard(item,category); if(c) grid.appendChild(c); });
  }

  buildFilterBar();
  applyFilters();

  if (searchInput) {
    searchInput.addEventListener('input', _mhDebounce(()=>{
      searchQuery=searchInput.value.toLowerCase().trim(); applyFilters();
    },200));
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────
function buildEmptyState(category, genre, status, query) {
  const icons = {
    movies: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M16 4v16M2 9h4M18 9h4M2 15h4M18 15h4"/></svg>`,
    tvshows:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7L12 3l4 4"/></svg>`,
  };
  let msg='Nothing here yet', sub='Add something from the editor.';
  if (query) { msg=`No results for "${query}"`; sub='Try a different search or clear filters.'; }
  else if (status!=='all') { msg='Nothing with that status'; sub='Try a different filter.'; }
  else if (genre!=='all')  { msg=`No ${genre} titles yet`; sub='Try a different genre.'; }
  return `<div class="mh-empty-state"><div class="mh-empty-icon">${icons[category]||''}</div><p class="mh-empty-msg">${msg}</p><p class="mh-empty-sub">${sub}</p></div>`;
}

// ── Featured (mediahub.html) ──────────────────────────────────────────────────
async function loadMediaHubFeatured() {
  const container = document.getElementById('mediahub-featured');
  if (!container) return;
  container.innerHTML='<div class="loading"><div class="loading-spinner"></div></div>';
  if (typeof getAllMediaHub!=='function') { container.innerHTML='<p class="error-text">Firebase not configured.</p>'; return; }
  const searchInput = document.getElementById('search-input');
  let allItems=[];
  try { allItems=(await getAllMediaHub()).filter(i=>i.category!=='code'); }
  catch(e) { container.innerHTML='<p class="error-text">Could not load media.</p>'; return; }

  function renderFeatured(items) {
    container.innerHTML='';
    const secs=[
      {key:'movies', label:'Movies',  icon:'assets/icons/movie.svg', href:'movies.html',  grid:'mhf-movie-grid',max:6},
      {key:'tvshows',label:'TV Shows',icon:'assets/icons/tv.svg',    href:'tvshows.html', grid:'mhf-movie-grid',max:6},
      {key:'beats',  label:'Beats',   icon:'assets/icons/music.svg', href:'beats.html',   grid:'mhf-beats-grid',max:9},
    ];
    let any=false;
    secs.forEach(({key,label,icon,href,grid,max})=>{
      const si=items.filter(i=>i.category===key); if(!si.length) return; any=true;
      const h=document.createElement('div'); h.className='mhf-section-header';
      h.innerHTML=`<div class="mhf-section-title"><img src="${icon}" alt="" style="width:20px;height:20px;opacity:0.7;"><span>${label}</span></div><a href="${href}" class="mhf-view-all">View all →</a>`;
      container.appendChild(h);
      const g=document.createElement('div'); g.className=grid;
      si.slice(0,max).forEach(item=>{ const c=key==='beats'?buildBeatCard(item):buildMovieCard(item,key); if(c) g.appendChild(c); });
      container.appendChild(g);
    });
    if(!any) container.innerHTML='<div class="empty-state"><p>No media added yet.</p></div>';
  }

  renderFeatured(allItems);
  if (searchInput) {
    searchInput.addEventListener('input',_mhDebounce(()=>{
      const q=searchInput.value.toLowerCase().trim();
      renderFeatured(!q?allItems:allItems.filter(i=>
        (i.title||'').toLowerCase().includes(q)||(i.creator||'').toLowerCase().includes(q)||(i.genre||'').toLowerCase().includes(q)
      ));
    },200));
  }
}

// ── Card dispatcher ───────────────────────────────────────────────────────────
function buildMediaCard(item,category) {
  if (category==='code')  return null;
  if (category==='beats') return buildBeatCard(item);
  return buildMovieCard(item,category);
}

// ── Movie / TV card ───────────────────────────────────────────────────────────
function buildMovieCard(item, category) {
  const card=document.createElement('div');
  card.className='media-card media-card-vertical';
  const sm={watched:{label:'Watched',cls:'status-watched'},watching:{label:'Watching',cls:'status-watching'},want:{label:'Want to Watch',cls:'status-want'}};
  const si=sm[item.status];
  const badge=si?`<span class="media-status-badge ${si.cls}">${si.label}</span>`:'';
  const poster=item.imageURL
    ?`<img class="media-card-poster" src="${item.imageURL}" alt="${item.title}" loading="lazy">`
    :`<div class="media-card-poster-placeholder"><img src="assets/icons/${category==='tvshows'?'tv':'movie'}.svg" style="width:48px;height:48px;opacity:0.3;" alt=""></div>`;
  const genres=(item.genre||'').split(',').map(g=>g.trim()).filter(Boolean).slice(0,2);
  const pills=genres.map(g=>`<span class="mc-genre-pill">${g}</span>`).join('');
  const ratingMini=item.rating?`<span class="mc-rating-mini"><span class="mc-star">★</span>${parseInt(item.rating)}<span class="mc-rating-denom">/10</span></span>`:'';

  card.innerHTML=`
    <div class="mc-poster-wrap">
      ${poster}${badge}
      <div class="mc-poster-overlay"><span class="mc-view-hint">View Details</span></div>
    </div>
    <div class="mc-body">
      ${pills?`<div class="mc-genres">${pills}</div>`:''}
      <h3 class="mc-title">${item.title}</h3>
      ${item.creator?`<p class="mc-director"><span class="mc-meta-label">${category==='tvshows'?'Creator':'Dir.'}</span> ${item.creator.split(',')[0].trim()}</p>`:''}
      ${item.stars?`<p class="mc-stars-row"><span class="mc-meta-label">Stars</span> ${item.stars.split(',').slice(0,2).join(', ')}</p>`:''}
      ${ratingMini?`<div class="mc-rating-row">${ratingMini}</div>`:''}
    </div>`;
  card.addEventListener('click',()=>openMediaModal(item,category));
  return card;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function ensureMediaModal() {
  if (document.getElementById('media-detail-modal')) return;
  const modal=document.createElement('div');
  modal.id='media-detail-modal'; modal.className='mdm-backdrop';
  modal.innerHTML=`<div class="mdm-box" role="dialog" aria-modal="true"><button class="mdm-close" aria-label="Close">&times;</button><div class="mdm-left" id="mdm-poster-col"></div><div class="mdm-right" id="mdm-info-col"></div></div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeMediaModal();});
  modal.querySelector('.mdm-close').addEventListener('click',closeMediaModal);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMediaModal();});
}

function openMediaModal(item,category) {
  ensureMediaModal();
  const modal=document.getElementById('media-detail-modal');
  const posterCol=document.getElementById('mdm-poster-col');
  const infoCol=document.getElementById('mdm-info-col');
  posterCol.innerHTML=item.imageURL?`<img class="mdm-poster" src="${item.imageURL}" alt="${item.title}">`:`<div class="mdm-poster-fallback"><img src="assets/icons/${category==='tvshows'?'tv':'movie'}.svg" style="width:56px;opacity:0.3;" alt=""></div>`;
  const sm={watched:{label:'Watched',cls:'status-watched'},watching:{label:'Watching',cls:'status-watching'},want:{label:'Want to Watch',cls:'status-want'}};
  const si=sm[item.status];
  const badge=si?`<span class="media-status-badge ${si.cls}" style="position:static;display:inline-block;margin-bottom:8px;">${si.label}</span>`:'';
  const genres=(item.genre||'').split(',').map(g=>g.trim()).filter(Boolean);
  const pills=genres.map(g=>`<span class="mc-genre-pill">${g}</span>`).join('');
  const titleEl=item.infoLink?`<a href="${item.infoLink}" target="_blank" rel="noopener noreferrer" class="mdm-title-link">${item.title}</a>`:item.title;
  let ratingHTML='';
  if (item.rating) {
    const r=parseInt(item.rating);
    ratingHTML=`<div class="mdm-rating-row"><span class="mdm-section-label">My Rating</span><div class="mdm-stars">${Array.from({length:10},(_,i)=>`<span class="mdm-star${i<r?' filled':''}">★</span>`).join('')}</div><span class="mdm-rating-num">${r}/10</span></div>`;
  }
  infoCol.innerHTML=`
    ${badge}
    <h2 class="mdm-title">${titleEl}</h2>
    ${pills?`<div class="mc-genres" style="margin-bottom:8px;">${pills}</div>`:''}
    ${item.creator?`<p class="mdm-meta"><span class="mc-meta-label">${category==='tvshows'?'Creator':'Director'}</span> ${item.creator}</p>`:''}
    ${item.stars?`<p class="mdm-meta"><span class="mc-meta-label">Starring</span> ${item.stars}</p>`:''}
    ${ratingHTML}
    ${item.description?`<div class="mdm-review-block"><span class="mdm-section-label">Synopsis</span><p class="mdm-review-text">${item.description}</p></div>`:''}
    ${item.notes?`<div class="mdm-review-block"><span class="mdm-section-label">Why I Like It</span><p class="mdm-review-text">${item.notes}</p></div>`:''}
    ${item.videoURL?`<button class="mdm-trailer-btn" id="mdm-trailer-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Watch Trailer</button><div class="mdm-trailer-embed hidden" id="mdm-trailer-embed"></div>`:''}`;
  if (item.videoURL) {
    const btn=infoCol.querySelector('#mdm-trailer-btn'), embed=infoCol.querySelector('#mdm-trailer-embed');
    btn.addEventListener('click',()=>{
      const open=!embed.classList.contains('hidden');
      embed.innerHTML=open?'':`<div class="video-embed"><iframe src="${item.videoURL}" allowfullscreen loading="lazy"></iframe></div>`;
      embed.classList.toggle('hidden',open);
      btn.innerHTML=open?`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Watch Trailer`:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Close Trailer`;
    });
  }
  modal.classList.add('open');
  document.body.style.overflow='hidden';
}

function closeMediaModal() {
  const modal=document.getElementById('media-detail-modal');
  if (!modal) return;
  modal.classList.remove('open'); document.body.style.overflow='';
  const embed=document.getElementById('mdm-trailer-embed');
  if (embed) embed.innerHTML='';
}

// ── Beat card ─────────────────────────────────────────────────────────────────
function buildBeatCard(item) {
  const card=document.createElement('article'); card.className='mh-beat-card';
  const cover=item.imageURL?`<img class="mh-beat-cover" src="${item.imageURL}" alt="${item.title}">`:`<div class="mh-beat-cover-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;opacity:0.35;"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg></div>`;
  const titleEl=item.songLink?`<a href="${item.songLink}" target="_blank" rel="noopener noreferrer" class="mh-beat-title">${item.title}</a>`:`<span class="mh-beat-title">${item.title}</span>`;
  const artistEl=item.creator?(item.artistLink?`<a href="${item.artistLink}" target="_blank" rel="noopener noreferrer" class="mh-beat-artist">${item.creator}</a>`:`<span class="mh-beat-artist">${item.creator}</span>`):'';
  const audioEl=item.audioURL?`<audio class="mh-beat-audio" controls preload="none" src="${item.audioURL}"></audio>`:'';
  card.innerHTML=`${cover}<div class="mh-beat-body">${item.genre?`<span class="mc-genre-pill" style="align-self:flex-start;">${item.genre}</span>`:''}<div class="mh-beat-title-row">${titleEl}${artistEl?`<span class="mh-beat-sep">·</span>${artistEl}`:''}</div>${item.description?`<p class="mh-beat-desc">${item.description}</p>`:''}${audioEl}</div>`;
  return card;
}