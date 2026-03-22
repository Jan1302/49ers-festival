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

function exportJSON() {
  const all = getAllCheckboxes();
  const items = {};
  all.forEach(cb => {
    items[cb.dataset.id] = cb.checked;
  });
  const comments = {};
  document.querySelectorAll('.comment-area, .item-comment').forEach(ta => {
    if (ta.value.trim()) {
      comments[ta.dataset.commentId] = ta.value;
    }
  });
  const data = {
    lastSaved: new Date().toISOString(),
    items: items,
    comments: comments
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
      const data = JSON.parse(e.target.result);
      applyState(data);
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      // Restore comments if present
      if (data.comments) {
        document.querySelectorAll('.comment-area, .item-comment').forEach(el => {
          if (data.comments[el.dataset.commentId] !== undefined) {
            el.value = data.comments[el.dataset.commentId];
            if (el.classList.contains('item-comment')) {
              el.classList.toggle('has-content', el.value.trim().length > 0);
            }
          }
        });
        localStorage.setItem('festival49ers_comments', JSON.stringify(data.comments));
      }
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

  // === COMMENT PERSISTENCE ===
  let commentTimer;

  function saveComments() {
    const comments = {};
    document.querySelectorAll('.comment-area, .item-comment').forEach(el => {
      if (el.value.trim()) {
        comments[el.dataset.commentId] = el.value;
      }
    });
    localStorage.setItem('festival49ers_comments', JSON.stringify(comments));
  }

  function loadComments() {
    try {
      const saved = localStorage.getItem('festival49ers_comments');
      if (saved) {
        const comments = JSON.parse(saved);
        document.querySelectorAll('.comment-area, .item-comment').forEach(el => {
          if (comments[el.dataset.commentId]) {
            el.value = comments[el.dataset.commentId];
            if (el.classList.contains('item-comment')) {
              el.classList.add('has-content');
            }
          }
        });
      }
    } catch(e) {}
  }

  document.querySelectorAll('.comment-area, .item-comment').forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(commentTimer);
      if (el.classList.contains('item-comment')) {
        el.classList.toggle('has-content', el.value.trim().length > 0);
      }
      commentTimer = setTimeout(saveComments, 500);
    });
  });

  loadComments();
});
