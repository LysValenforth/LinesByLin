// Section creation, drag-drop, gather

let dragSrc = null;

// ── Section-level Undo Stack ──────────────────────────────────────────────────
const sectionHistory = [];   // [{action:'add'|'delete'|'move', snapshot:[...]}]
const MAX_HISTORY = 30;

function snapshotSections() {
  return [...document.querySelectorAll('#editor-sections .editor-section')].map(w => ({
    type:    w.dataset.type,
    content: (() => {
      if (w.dataset.type === 'image') {
        const b = w.querySelector('.section-image');
        return b?.dataset.imageUrl || b?.querySelector('img')?.src || '';
      }
      if (w.dataset.type === 'divider') return '';
      const b = w.querySelector('[contenteditable]');
      return b ? b.innerHTML : '';
    })()
  }));
}

function pushHistory(label) {
  sectionHistory.push({ label, snap: snapshotSections() });
  if (sectionHistory.length > MAX_HISTORY) sectionHistory.shift();
}

function undoSectionAction() {
  if (sectionHistory.length === 0) { showToast('Nothing to undo.', 'warn'); return; }
  const { snap } = sectionHistory.pop();
  const container = document.getElementById('editor-sections');
  container.innerHTML = '';
  snap.forEach(sec => addSection(sec, false)); // false = no history push
  if (typeof markDirty === 'function') markDirty();
  showToast('Undone.', 'info');
}

document.addEventListener('DOMContentLoaded', () => {
  bindSectionButtons();

  // Ctrl+Z / Cmd+Z undo
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      // Only intercept if no contenteditable has focus (let browser handle inline undo)
      const active = document.activeElement;
      if (!active || active.getAttribute('contenteditable') !== 'true') {
        e.preventDefault();
        undoSectionAction();
      }
    }
    // Tab / Shift+Tab between sections
    if (e.key === 'Tab') {
      const active = document.activeElement;
      const sec = active?.closest('.editor-section');
      if (!sec) return;
      e.preventDefault();
      const sections = [...document.querySelectorAll('#editor-sections .editor-section')];
      const idx = sections.indexOf(sec);
      const target = e.shiftKey ? sections[idx - 1] : sections[idx + 1];
      const editableTarget = target?.querySelector('[contenteditable="true"]');
      if (editableTarget) {
        editableTarget.focus();
        // Place cursor at end
        const range = document.createRange();
        const sel   = window.getSelection();
        range.selectNodeContents(editableTarget);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  });

  // Dim toolbar when no section is focused
  document.addEventListener('focusin', (e) => {
    const inSection = e.target?.closest('#editor-sections');
    const toolbar   = document.querySelector('.editor-toolbar-top');
    if (toolbar) toolbar.classList.toggle('toolbar-active', !!inSection);
  });
  document.addEventListener('focusout', (e) => {
    // Small delay so clicking a toolbar button doesn't cause flicker
    setTimeout(() => {
      const focused  = document.activeElement;
      const inSection = focused?.closest('#editor-sections');
      const inToolbar = focused?.closest('.editor-toolbar-top');
      const toolbar   = document.querySelector('.editor-toolbar-top');
      if (toolbar) toolbar.classList.toggle('toolbar-active', !!(inSection || inToolbar));
    }, 100);
  });
});

// ─── Bind Buttons ─────────────────────────────────────────────────────────────

function bindSectionButtons() {
  document.getElementById('btn-add-title')?.addEventListener('click', () => {
    pushHistory('add-title');
    addSection({ type: 'title', content: 'Section Title' });
  });
  document.getElementById('btn-add-text')?.addEventListener('click', () => {
    pushHistory('add-text');
    addSection({ type: 'text', content: '<p>Write your text here...</p>' });
  });
  document.getElementById('btn-add-paragraph')?.addEventListener('click', () => {
    pushHistory('add-paragraph');
    addSection({ type: 'paragraph', content: '<p>A new paragraph. Click to edit.</p>' });
  });
  document.getElementById('btn-add-quote')?.addEventListener('click', () => {
    pushHistory('add-quote');
    addSection({ type: 'quote', content: 'A beautiful thought goes here...' });
  });
  document.getElementById('btn-add-divider')?.addEventListener('click', () => {
    pushHistory('add-divider');
    addSection({ type: 'divider', content: '' });
  });
}

// ─── Add Section to Canvas ────────────────────────────────────────────────────

function addSection(sec, record = true) {
  const container = document.getElementById('editor-sections');
  if (!container) return;

  // Show canvas, hide placeholder
  const noMsg = document.getElementById('no-post-msg');
  const canvasInner = document.getElementById('editor-canvas-inner');
  if (noMsg) noMsg.style.display = 'none';
  if (canvasInner) canvasInner.style.display = 'block';

  const wrapper = document.createElement('div');
  wrapper.className = 'editor-section';
  wrapper.draggable = true;
  wrapper.dataset.type = sec.type;

  // Drag handle (left side)
  const handle = document.createElement('div');
  handle.className = 'section-handle';
  handle.title = 'Drag to reorder';
  handle.textContent = '⠿';

  // Side controls (right side) — now includes duplicate
  const sideCtrls = document.createElement('div');
  sideCtrls.className = 'section-controls-side';
  sideCtrls.innerHTML = `
    <button class="section-btn-side section-btn-up"    title="Move up">↑</button>
    <button class="section-btn-side section-btn-down"  title="Move down">↓</button>
    <button class="section-btn-side section-btn-dupe"  title="Duplicate">⊕</button>
    <button class="section-btn-side section-btn-del"   title="Delete section">×</button>
  `;

  // Content block
  const block = document.createElement('div');

  switch (sec.type) {
    case 'title':
      block.className = 'section-title-block';
      block.setAttribute('contenteditable', 'true');
      block.setAttribute('data-placeholder', 'Section title...');
      block.innerHTML = sec.content || 'Section Title';
      break;
    case 'text':
    case 'paragraph':
      block.className = `section-${sec.type}`;
      block.setAttribute('contenteditable', 'true');
      block.setAttribute('data-placeholder', 'Write something...');
      block.innerHTML = sec.content || '';
      break;
    case 'quote':
      block.className = 'section-quote';
      block.setAttribute('contenteditable', 'true');
      block.setAttribute('data-placeholder', 'A quote...');
      block.innerHTML = sec.content || '';
      break;
    case 'image':
      block.className = 'section-image';
      if (sec.content) {
        block.innerHTML = `<img src="${sec.content}" alt="Post image">`;
        block.dataset.imageUrl = sec.content;
      } else {
        block.innerHTML = `<div class="section-image-placeholder">Click to upload an image</div>`;
        block.querySelector('.section-image-placeholder')?.addEventListener('click', () => {
          document.getElementById('image-upload-input')?.click();
        });
      }
      break;
    case 'divider':
      block.innerHTML = `<div class="section-divider-line"></div>`;
      break;
    default:
      block.className = 'section-text';
      block.setAttribute('contenteditable', 'true');
      block.innerHTML = sec.content || '';
  }

  wrapper.appendChild(handle);
  wrapper.appendChild(block);
  wrapper.appendChild(sideCtrls);
  container.appendChild(wrapper);

  // Control events
  sideCtrls.querySelector('.section-btn-del').addEventListener('click', () => {
    pushHistory('delete');
    wrapper.remove();
    if (typeof markDirty === 'function') markDirty();
    updateWordCount();
    // Soft-undo toast
    showToast('Section deleted — Ctrl+Z to undo', 'info');
  });

  sideCtrls.querySelector('.section-btn-up').addEventListener('click', () => {
    const prev = wrapper.previousElementSibling;
    if (prev) { pushHistory('move'); container.insertBefore(wrapper, prev); if (typeof markDirty === 'function') markDirty(); }
  });

  sideCtrls.querySelector('.section-btn-down').addEventListener('click', () => {
    const next = wrapper.nextElementSibling;
    if (next) { pushHistory('move'); container.insertBefore(next, wrapper); if (typeof markDirty === 'function') markDirty(); }
  });

  sideCtrls.querySelector('.section-btn-dupe').addEventListener('click', () => {
    pushHistory('duplicate');
    const dupeSec = {
      type:    wrapper.dataset.type,
      content: block.getAttribute('contenteditable') === 'true'
        ? block.innerHTML
        : (block.dataset.imageUrl || '')
    };
    // Insert after current wrapper
    const clone = document.createElement('div'); // temp marker
    wrapper.after(clone);
    addSection(dupeSec, false);
    // Move newly appended section to right after wrapper
    const all = [...container.querySelectorAll('.editor-section')];
    const newSec = all[all.length - 1];
    clone.replaceWith(newSec);
    if (typeof markDirty === 'function') markDirty();
  });

  // Drag events
  wrapper.addEventListener('dragstart', (e) => {
    dragSrc = wrapper;
    wrapper.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  wrapper.addEventListener('dragend', () => {
    wrapper.classList.remove('dragging');
    container.querySelectorAll('.editor-section').forEach(el => el.classList.remove('drag-over'));
    dragSrc = null;
    pushHistory('drag');
    if (typeof markDirty === 'function') markDirty();
  });
  wrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dragSrc && dragSrc !== wrapper) {
      container.querySelectorAll('.editor-section').forEach(el => el.classList.remove('drag-over'));
      wrapper.classList.add('drag-over');
    }
  });
  wrapper.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dragSrc && dragSrc !== wrapper) {
      const items = [...container.querySelectorAll('.editor-section')];
      const si = items.indexOf(dragSrc);
      const ti = items.indexOf(wrapper);
      container.insertBefore(dragSrc, si < ti ? wrapper.nextElementSibling : wrapper);
    }
    container.querySelectorAll('.editor-section').forEach(el => el.classList.remove('drag-over'));
  });

  // Focus contenteditable + mark dirty on input
  if (block.getAttribute('contenteditable') === 'true') {
    setTimeout(() => block.focus(), 50);
    block.addEventListener('input', () => {
      if (typeof markDirty === 'function') markDirty();
      updateWordCount();
    });
  }
}

// ─── Gather Sections from DOM ─────────────────────────────────────────────────

function gatherSections() {
  const sections = [];
  document.querySelectorAll('#editor-sections .editor-section').forEach(wrapper => {
    const type  = wrapper.dataset.type;
    const block = wrapper.querySelector('[contenteditable], .section-image, .section-divider-line');
    let content = '';

    if (type === 'image') {
      const imgBlock = wrapper.querySelector('.section-image');
      content = imgBlock?.dataset.imageUrl || imgBlock?.querySelector('img')?.src || '';
    } else if (type === 'divider') {
      content = '';
    } else if (block) {
      content = block.innerHTML;
    }

    sections.push({ type, content });
  });
  return sections;
}