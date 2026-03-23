// Highlight current page in navigation
document.addEventListener('DOMContentLoaded', function() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === currentPage) {
      a.classList.add('active');
    }
  });
});

// ── TAB SWITCHING ──
function switchTab(e, id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  e.target.classList.add('active');
  document.getElementById(id).classList.add('active');
}

// ── SCROLL PROGRESS BAR ──
window.addEventListener('scroll', () => {
  const winScroll = document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  document.getElementById('progressBar').style.width = (winScroll / height * 100) + '%';
});

// ── MOBILE NAV ──
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('open');
  });
});

// ── SMOOTH SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      const offset = 60;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
    }
  });
});

// ══════════════════════════════════════════════════════
//  CHECKLIST PERSISTENCE
// ══════════════════════════════════════════════════════

const LS_KEY = 'festival49ers_checklist';

function getAllCheckboxes() {
  return document.querySelectorAll('.checklist input[type="checkbox"][data-id]');
}

function updateProgress() {
  const all = getAllCheckboxes();
  const done = Array.from(all).filter(cb => cb.checked).length;
  const total = all.length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  const textEl = document.getElementById('fabProgressText') || document.getElementById('progressText');
  const fillEl = document.getElementById('fabProgressFill') || document.getElementById('progressFill');
  if (textEl) textEl.textContent = done + ' / ' + total + ' erledigt (' + pct + '%)';
  if (fillEl) fillEl.style.width = pct + '%';
}

function saveToLocalStorage() {
  const all = getAllCheckboxes();
  const items = {};
  all.forEach(cb => {
    items[cb.dataset.id] = cb.checked;
  });
  const data = {
    lastSaved: new Date().toISOString(),
    items: items
  };
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  updateLastSavedDisplay(data.lastSaved);
}

function loadFromLocalStorage() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    applyState(data);
  } catch(e) {
    console.warn('Konnte Checklist-Status nicht laden:', e);
  }
}

function applyState(data) {
  if (!data || !data.items) return;
  const all = getAllCheckboxes();
  all.forEach(cb => {
    const id = cb.dataset.id;
    if (id in data.items) {
      cb.checked = data.items[id];
      const li = cb.closest('li');
      if (li) {
        if (cb.checked) {
          li.classList.add('done');
        } else {
          li.classList.remove('done');
        }
      }
    }
  });
  if (data.lastSaved) updateLastSavedDisplay(data.lastSaved);
  updateProgress();
}

function updateLastSavedDisplay(isoString) {
  const el = document.getElementById('lastSaved');
  if (!el) return;
  try {
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    const str = pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear()
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    el.textContent = 'Stand: ' + str;
  } catch(e) {
    el.textContent = 'Stand: ' + isoString;
  }
}

// ══════════════════════════════════════════════════════
//  COMMENT THREAD SYSTEM (named, mergeable)
// ══════════════════════════════════════════════════════

const COMMENT_KEY = 'festival49ers_comments_v2';
const NAME_KEY = 'festival49ers_username';

function getUserName() {
  const input = document.getElementById('fab-username');
  return input ? input.value.trim() : '';
}

function getDateStr() {
  const d = new Date();
  return d.getDate().toString().padStart(2,'0') + '.' +
         (d.getMonth()+1).toString().padStart(2,'0') + '.' +
         d.getFullYear();
}

function getAllCommentData() {
  try {
    const raw = localStorage.getItem(COMMENT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function saveAllCommentData(data) {
  localStorage.setItem(COMMENT_KEY, JSON.stringify(data));
}

function renderCommentThread(threadEl) {
  const id = threadEl.dataset.commentId;
  const data = getAllCommentData();
  const entries = data[id] || [];

  const entriesContainer = threadEl.querySelector('.comment-entries');
  entriesContainer.innerHTML = '';

  entries.forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = 'comment-entry';
    div.innerHTML = `
      <span class="comment-author">${escapeHtml(entry.name)}:</span>
      <span class="comment-text">${escapeHtml(entry.text)}</span>
      <span class="comment-date">${escapeHtml(entry.date || '')}</span>
      <button class="comment-delete" title="L&ouml;schen" data-thread-id="${id}" data-entry-idx="${idx}">&times;</button>
    `;
    entriesContainer.appendChild(div);
  });
}

function addComment(threadId, text) {
  const name = getUserName();
  if (!name) { alert('Bitte zuerst deinen Namen eingeben (unten links)!'); return; }
  if (!text.trim()) return;

  const data = getAllCommentData();
  if (!data[threadId]) data[threadId] = [];
  data[threadId].push({
    name: name,
    text: text.trim(),
    date: getDateStr()
  });
  saveAllCommentData(data);
}

function deleteComment(threadId, idx) {
  const data = getAllCommentData();
  if (data[threadId]) {
    data[threadId].splice(idx, 1);
    if (data[threadId].length === 0) delete data[threadId];
    saveAllCommentData(data);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initCommentThreads() {
  document.querySelectorAll('.comment-thread').forEach(thread => {
    renderCommentThread(thread);

    const input = thread.querySelector('.comment-add input');
    const btn = thread.querySelector('.comment-add button');
    if (!input || !btn) return;

    function submitComment() {
      const text = input.value;
      if (!text.trim()) return;
      addComment(thread.dataset.commentId, text);
      input.value = '';
      renderCommentThread(thread);
    }

    btn.addEventListener('click', submitComment);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submitComment(); }
    });
  });

  // Delete buttons (event delegation)
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('comment-delete')) {
      const threadId = e.target.dataset.threadId;
      const idx = parseInt(e.target.dataset.entryIdx);
      deleteComment(threadId, idx);
      const thread = document.querySelector(`.comment-thread[data-comment-id="${threadId}"]`);
      if (thread) renderCommentThread(thread);
    }
  });
}

// Name persistence
function initUserName() {
  const input = document.getElementById('fab-username');
  if (!input) return;
  const saved = localStorage.getItem(NAME_KEY);
  if (saved) input.value = saved;
  input.addEventListener('input', () => {
    localStorage.setItem(NAME_KEY, input.value);
  });
}

// Migration from old comment format
function migrateOldComments() {
  try {
    const oldRaw = localStorage.getItem('festival49ers_comments');
    if (!oldRaw) return;
    const old = JSON.parse(oldRaw);
    const newData = getAllCommentData();
    let migrated = false;
    Object.entries(old).forEach(([id, val]) => {
      if (typeof val === 'string' && val.trim()) {
        if (!newData[id]) newData[id] = [];
        const exists = newData[id].some(e => e.text === val);
        if (!exists) {
          newData[id].push({ name: 'Import', text: val, date: '' });
          migrated = true;
        }
      }
    });
    if (migrated) {
      saveAllCommentData(newData);
    }
    localStorage.removeItem('festival49ers_comments');
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
//  EXPORT / IMPORT
// ══════════════════════════════════════════════════════

function exportJSON() {
  const all = getAllCheckboxes();
  const items = {};
  all.forEach(cb => {
    items[cb.dataset.id] = cb.checked;
  });
  const commentData = getAllCommentData();
  const data = {
    lastSaved: new Date().toISOString(),
    items: items,
    comments: commentData
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'festival_status.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  updateLastSavedDisplay(data.lastSaved);
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      applyState(imported);
      localStorage.setItem(LS_KEY, JSON.stringify(imported));
      // Merge comments (don't overwrite, append new entries)
      if (imported.comments) {
        const existing = getAllCommentData();
        Object.entries(imported.comments).forEach(([id, entries]) => {
          if (!existing[id]) existing[id] = [];
          // Handle both new array format and old string format
          if (Array.isArray(entries)) {
            entries.forEach(entry => {
              // Check if this exact entry already exists (by name+text+date)
              const isDuplicate = existing[id].some(e =>
                e.name === entry.name && e.text === entry.text && e.date === entry.date
              );
              if (!isDuplicate) existing[id].push(entry);
            });
          } else if (typeof entries === 'string' && entries.trim()) {
            // Old format: string value
            const isDuplicate = existing[id].some(e => e.text === entries);
            if (!isDuplicate) {
              existing[id].push({ name: 'Import', text: entries, date: '' });
            }
          }
        });
        saveAllCommentData(existing);
      }
      // Re-render all comment threads on page
      document.querySelectorAll('.comment-thread').forEach(t => renderCommentThread(t));
      alert('Status erfolgreich geladen!');
    } catch(err) {
      alert('Fehler beim Lesen der JSON-Datei: ' + err.message);
    }
  };
  reader.readAsText(file);
  // Reset so the same file can be loaded again
  event.target.value = '';
}

// ── ATTACH CHECKBOX LISTENERS ──
document.addEventListener('DOMContentLoaded', () => {
  const all = getAllCheckboxes();
  all.forEach(cb => {
    cb.addEventListener('change', () => {
      const li = cb.closest('li');
      if (li) {
        if (cb.checked) {
          li.classList.add('done');
        } else {
          li.classList.remove('done');
        }
      }
      saveToLocalStorage();
      updateProgress();
    });
  });

  // Load saved state
  loadFromLocalStorage();
  updateProgress();

  // Initialize comment system
  initUserName();
  migrateOldComments();
  initCommentThreads();
});
