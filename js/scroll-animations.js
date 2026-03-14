/* ═══════════════════════════════════════════════════════════════
   LINESBYLIN — scroll-animations.js  v2
   Bidirectional scroll animations (enter & exit).
   Place LAST inside <body>, after all other scripts:
     <script src="js/scroll-animations.js"></script>
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Bail if reduced-motion is preferred ───────────────────── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ══════════════════════════════════════════════════════════════
     OBSERVER
     threshold: [0, 0.18] lets us fire both on enter AND on leave.
     When intersecting    → mark visible   (animate IN)
     When not intersecting → mark not visible (animate OUT)
  ══════════════════════════════════════════════════════════════ */
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.dataset.saVisible = entry.isIntersecting ? 'true' : 'false';
    });
  }, {
    threshold: [0, 0.18],
    rootMargin: '0px 0px -40px 0px'
  });

  /* ── Utility: register one element ─────────────────────────── */
  function register(el, type, delay) {
    el.dataset.sa = type;
    if (delay) el.dataset.saDelay = String(delay);
    /* Start hidden — set visible=false so CSS transition state is set */
    el.dataset.saVisible = 'false';
    observer.observe(el);
  }

  /* ══════════════════════════════════════════════════════════════
     1. SECTION HEADERS & GENERIC BLOCKS — fade-up
  ══════════════════════════════════════════════════════════════ */
  [
    '.section-header',
    '.section-title',
    '.section-subtitle',
    '.about-eyebrow',
    '.about-heading',
    '.about-quote',
    '.about-body',
    '.about-tags',
    '.about-cta',
  ].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      register(el, 'fade-up');
    });
  });

  /* ══════════════════════════════════════════════════════════════
     2. ABOUT SPLIT — image from left, text from right
  ══════════════════════════════════════════════════════════════ */
  var aboutArt  = document.querySelector('#about .about-art');
  var aboutText = document.querySelector('#about .about-text-col');
  if (aboutArt)  register(aboutArt,  'from-left');
  if (aboutText) register(aboutText, 'from-right');

  /* ══════════════════════════════════════════════════════════════
     3. ABOUT STATS — stagger
  ══════════════════════════════════════════════════════════════ */
  document.querySelectorAll('.about-stat').forEach(function (el, i) {
    register(el, 'fade-up', i + 1);
  });

  /* ══════════════════════════════════════════════════════════════
     4. CONTACT SECTION
        — quote block fades up
        — "Let's Connect." heading does clip-path reveal
        — subline fades up with a delay
  ══════════════════════════════════════════════════════════════ */
  var contact = document.getElementById('contact');
  if (contact) {
    /* Quote block (first big div inside contact) */
    var quoteBlock = contact.querySelector('div');
    if (quoteBlock) register(quoteBlock, 'fade-up');

    /* Heading + contacts row (second big div) */
    var connectRow = contact.querySelectorAll('div')[1];
    if (connectRow) {
      var heading  = connectRow.querySelector('h2');
      var subpara  = connectRow.querySelector('p');
      var rightCol = connectRow.children[1];

      if (heading)  register(heading,  'reveal');
      if (subpara)  register(subpara,  'fade-up', 2);
      if (rightCol) register(rightCol, 'fade-up', 3);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     5. STATIC GRIDS — stagger children that already exist
  ══════════════════════════════════════════════════════════════ */
  function staggerGrid(gridEl) {
    var children = Array.from(gridEl.children).filter(function (c) {
      /* Skip loading spinners */
      return !c.classList.contains('loading');
    });
    children.forEach(function (card, i) {
      register(card, 'fade-up', Math.min(i + 1, 6));
    });
  }

  ['#featured-grid', '#code-preview-grid', '#collections-grid'].forEach(function (sel) {
    var grid = document.querySelector(sel);
    if (!grid) return;

    /* Stagger any cards already in DOM */
    if (grid.children.length > 0) staggerGrid(grid);

    /* Watch for Firebase populating the grid later */
    var done = false;
    var mo = new MutationObserver(function () {
      if (done) return;
      var realCards = grid.querySelectorAll(
        '.card, .code-preview-card, .collection-card-gl, article'
      );
      if (!realCards.length) return;
      done = true;
      mo.disconnect();
      /* Small tick so the grid is fully in the DOM before we observe */
      setTimeout(function () { staggerGrid(grid); }, 60);
    });
    mo.observe(grid, { childList: true, subtree: false });
  });

})();