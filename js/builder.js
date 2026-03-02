// Section creation, drag-drop, gather

let dragSrc = null;

document.addEventListener('DOMContentLoaded', () => {
  bindSectionButtons();
});

// ─── Bind Buttons ─────────────────────────────────────────────────────────────

function bindSectionButtons() {
  document.getElementById('btn-add-title')?.addEventListener('click', () => {
    addSection({ type: 'title', content: 'Section Title' });
  });
  document.getElementById('btn-add-text')?.addEventListener('click', () => {
    addSection({ type: 'text', content: '<p>Write your text here...</p>' });
  });
  document.getElementById('btn-add-paragraph')?.addEventListener('click', () => {
    addSection({ type: 'paragraph', content: '<p>A new paragraph. Click to edit.</p>' });
  });
  document.getElementById('btn-add-quote')?.addEventListener('click', () => {
    addSection({ type: 'quote', content: 'A beautiful thought goes here...' });
  });
  document.getElementById('btn-add-divider')?.addEventListener('click', () => {
    addSection({ type: 'divider', content: '' });
  });
}

// ─── Add Section to Canvas ────────────────────────────────────────────────────

function addSection(sec) {
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

  // Side controls (right side)
  const sideCtrls = document.createElement('div');
  sideCtrls.className = 'section-controls-side';
  sideCtrls.innerHTML = `
    <button class="section-btn-side section-btn-up"  title="Move up">↑</button>
    <button class="section-btn-side section-btn-down" title="Move down">↓</button>
    <button class="section-btn-side section-btn-del"  title="Delete section">X</button>
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
  sideCtrls.querySelector('.section-btn-del').addEventListener('click', () => wrapper.remove());
  sideCtrls.querySelector('.section-btn-up').addEventListener('click', () => {
    const prev = wrapper.previousElementSibling;
    if (prev) container.insertBefore(wrapper, prev);
  });
  sideCtrls.querySelector('.section-btn-down').addEventListener('click', () => {
    const next = wrapper.nextElementSibling;
    if (next) container.insertBefore(next, wrapper);
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

  // Focus contenteditable
  if (block.getAttribute('contenteditable') === 'true') {
    setTimeout(() => block.focus(), 50);
  }
}

// ─── Gather Sections from DOM ─────────────────────────────────────────────────

function gatherSections() {
  const sections = [];
  document.querySelectorAll('#editor-sections .editor-section').forEach(wrapper => {
    const type  = wrapper.dataset.type;
    const block = wrapper.querySelector('[contenteditable], .section-image, .section-divider-line, .section-title-block');
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
