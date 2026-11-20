/* Personal Notes (Mini Projects, Day 9)
   Plain JavaScript, no libraries. Notes live only in this browser (localStorage). */
(() => {
  'use strict';

  const KEY = 'vrmp.notes.v1';
  const THEME_KEY = 'vrmp.notes.theme';
  const COLORS = ['yellow', 'pink', 'green', 'blue', 'purple', 'orange'];
  const COLOR_NAME = { yellow: 'Yellow', pink: 'Pink', green: 'Green', blue: 'Blue', purple: 'Purple', orange: 'Orange' };
  const MAX_TAGS = 8;
  const MAX_NOTES = 1000;
  const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

  const $ = (id) => document.getElementById(id);
  const wide = window.matchMedia('(min-width: 800px)');

  let storageOK = true;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { storageOK = false; return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { storageOK = false; return false; } }

  // ---------- helpers ----------
  const now = () => Date.now();
  const uid = () => now().toString(36) + Math.random().toString(36).slice(2, 8);

  function cleanTag(raw) {
    return String(raw == null ? '' : raw).trim().toLowerCase().replace(/^#+/, '')
      .replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 24);
  }

  function normalizeNote(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const t = now();
    const tags = [];
    if (Array.isArray(raw.tags)) {
      for (const x of raw.tags) {
        const c = cleanTag(x);
        if (c && !tags.includes(c) && tags.length < MAX_TAGS) tags.push(c);
      }
    }
    const created = Number.isFinite(raw.created) ? raw.created : t;
    const updated = Number.isFinite(raw.updated) ? raw.updated : created;
    return {
      id: typeof raw.id === 'string' && raw.id && raw.id.length <= 40 ? raw.id : uid(),
      title: typeof raw.title === 'string' ? raw.title.slice(0, 120) : '',
      body: typeof raw.body === 'string' ? raw.body.slice(0, 20000) : '',
      tags,
      color: COLORS.includes(raw.color) ? raw.color : '',
      pinned: raw.pinned === true,
      created,
      updated
    };
  }

  const isEmpty = (n) => !n.title.trim() && !n.body.trim() && n.tags.length === 0;
  const wordCount = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

  function ago(ts) {
    const diff = now() - ts;
    const m = Math.floor(diff / 60000);
    if (diff < 45000) return 'Just now';
    if (m < 60) return (m < 1 ? 1 : m) + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' h ago';
    const d = Math.floor(h / 24);
    if (d === 1) return 'Yesterday';
    if (d < 7) return d + ' days ago';
    return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- state ----------
  let notes = [];
  const ui = { q: '', tag: '', color: '', sort: 'edited' };
  let currentId = null;
  let saveTimer = 0;
  let toastTimer = 0;
  let toastUndo = null;

  function demoNotes() {
    const t = now();
    const H = 3600000;
    const D = 24 * H;
    return [
      { id: 'demo-welcome', title: 'Welcome to Personal Notes', pinned: true, color: 'yellow', tags: ['welcome', 'tips'],
        body: 'Tap New to write a note. It saves by itself as you type.\n\nPin the ones you need first, give them a colour, add tags, and use search to find anything fast.\n\nThese are demo notes. Delete them whenever you like.',
        created: t - 3 * D, updated: t - 25 * 60000 },
      { id: 'demo-groceries', title: 'Groceries', color: 'green', tags: ['home'],
        body: 'Milk\nEggs\nRice, 2 kg\nTomatoes\nCoriander\nCurd',
        created: t - 2 * D, updated: t - 5 * H },
      { id: 'demo-ideas', title: 'App ideas', color: 'purple', tags: ['ideas', 'work'],
        body: 'A habit streak board\nA tiny budget planner\nA reading list with progress\nA colour palette picker',
        created: t - 6 * D, updated: t - 2 * D },
      { id: 'demo-trip', title: 'Weekend trip packing', color: 'blue', tags: ['travel', 'home'],
        body: 'Charger and power bank\nLight jacket\nWater bottle\nSunglasses\nPrinted tickets',
        created: t - 5 * D, updated: t - 1 * D },
      { id: 'demo-meeting', title: 'Sprint planning notes', color: 'orange', tags: ['work'],
        body: 'Ship the login fix first.\nDesign review on Thursday.\nAsk about the test environment.',
        created: t - 4 * D, updated: t - 3 * D },
      { id: 'demo-quote', title: 'A line worth keeping', color: 'pink', tags: ['ideas'],
        body: 'Small steps every day beat big plans someday.',
        created: t - 8 * D, updated: t - 7 * D }
    ];
  }

  function load() {
    const raw = lsGet(KEY);
    if (raw == null) return demoNotes().map(normalizeNote);
    try {
      const data = JSON.parse(raw);
      if (!data || data.v !== 1 || !Array.isArray(data.notes)) throw new Error('shape');
      return data.notes.slice(0, MAX_NOTES).map(normalizeNote).filter(Boolean);
    } catch (e) {
      lsSet(KEY + '.broken', raw); // keep the unreadable copy instead of losing it
      return demoNotes().map(normalizeNote);
    }
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    const out = notes.filter((n) => !isEmpty(n));
    const ok = lsSet(KEY, JSON.stringify({ v: 1, notes: out }));
    setStatus(ok ? 'Saved' : 'Not saved: storage is blocked', !ok);
    $('storage-warn').hidden = ok && storageOK;
  }

  function scheduleSave() {
    setStatus('Saving...');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 350);
  }

  function setStatus(text, bad) {
    const s = $('status');
    s.textContent = text;
    s.classList.toggle('status--bad', !!bad);
  }

  const byId = (id) => notes.find((n) => n.id === id) || null;
  const current = () => (currentId ? byId(currentId) : null);

  // ---------- filtering ----------
  function matches(n) {
    if (ui.color && n.color !== ui.color) return false;
    if (ui.tag && !n.tags.includes(ui.tag)) return false;
    if (ui.q) {
      const q = ui.q.toLowerCase();
      const hay = (n.title + '\n' + n.body + '\n' + n.tags.join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function compare(a, b) {
    if (ui.sort === 'created') return b.created - a.created;
    if (ui.sort === 'title') return (a.title || '~').localeCompare(b.title || '~', undefined, { sensitivity: 'base' });
    return b.updated - a.updated;
  }

  // Appends text to parent, wrapping every match of the query in <mark>.
  function highlight(parent, text, q) {
    if (!q) { parent.textContent = text; return; }
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    let i = 0;
    for (;;) {
      const at = lower.indexOf(needle, i);
      if (at < 0) break;
      if (at > i) parent.appendChild(document.createTextNode(text.slice(i, at)));
      parent.appendChild(el('mark', '', text.slice(at, at + needle.length)));
      i = at + needle.length;
    }
    if (i < text.length) parent.appendChild(document.createTextNode(text.slice(i)));
  }

  // ---------- rendering ----------
  function renderFilters() {
    const cw = $('color-filter');
    cw.textContent = '';
    const all = el('button', 'dot dot--all', 'All');
    all.type = 'button';
    all.setAttribute('aria-pressed', String(!ui.color));
    all.addEventListener('click', () => { ui.color = ''; renderAll(); });
    cw.appendChild(all);
    for (const c of COLORS) {
      const b = el('button', 'dot dot--' + c);
      b.type = 'button';
      b.setAttribute('aria-label', COLOR_NAME[c] + ' notes');
      b.setAttribute('aria-pressed', String(ui.color === c));
      b.appendChild(el('span', 'dot__fill'));
      b.addEventListener('click', () => { ui.color = ui.color === c ? '' : c; renderAll(); });
      cw.appendChild(b);
    }

    const counts = new Map();
    for (const n of notes) for (const t of n.tags) counts.set(t, (counts.get(t) || 0) + 1);
    if (ui.tag && !counts.has(ui.tag)) ui.tag = '';
    const tw = $('tag-filter');
    tw.textContent = '';
    tw.hidden = counts.size === 0;
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([t, c]) => {
      const b = el('button', 'chip');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(ui.tag === t));
      b.appendChild(document.createTextNode('#' + t + ' '));
      b.appendChild(el('span', 'chip__n', String(c)));
      b.addEventListener('click', () => { ui.tag = ui.tag === t ? '' : t; renderAll(); });
      tw.appendChild(b);
    });
  }

  function noteCard(n) {
    const art = el('article', 'note' + (n.id === currentId ? ' is-open' : ''));
    if (n.color) art.dataset.color = n.color;
    const open = el('button', 'note__open');
    open.type = 'button';
    open.dataset.id = n.id;
    if (n.id === currentId) open.setAttribute('aria-current', 'true');
    const title = el('h3', 'note__title');
    highlight(title, n.title.trim() || 'Untitled note', ui.q);
    const snip = el('p', 'note__snip');
    const body = n.body.replace(/\s+/g, ' ').trim().slice(0, 160);
    highlight(snip, body || 'No text yet', ui.q);
    open.appendChild(title);
    open.appendChild(snip);
    if (n.tags.length) {
      const row = el('span', 'note__tags');
      for (const t of n.tags.slice(0, 4)) row.appendChild(el('span', 'tag', '#' + t));
      open.appendChild(row);
    }
    open.appendChild(el('span', 'note__date', ago(n.updated)));
    open.addEventListener('click', () => openNote(n.id, true));
    const pin = el('button', 'note__pin');
    pin.type = 'button';
    pin.setAttribute('aria-pressed', String(n.pinned));
    pin.setAttribute('aria-label', (n.pinned ? 'Unpin ' : 'Pin ') + (n.title.trim() || 'untitled note'));
    pin.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M14 3l7 7-2 1-2.5-.5-3.3 3.3.5 4.2-1.4 1.4-3.4-3.4L4 20l-1-1 4.1-4.8-3.4-3.4 1.4-1.4 4.2.5 3.3-3.3L12 5z" fill="currentColor"/></svg>';
    pin.addEventListener('click', () => {
      n.pinned = !n.pinned;
      n.updated = now();
      persist();
      if (n.id === currentId) syncEditorPin(n);
      renderAll();
    });
    art.appendChild(open);
    art.appendChild(pin);
    return art;
  }

  function renderList() {
    const list = $('list');
    list.textContent = '';
    const shown = notes.filter(matches);
    const pinned = shown.filter((n) => n.pinned).sort(compare);
    const rest = shown.filter((n) => !n.pinned).sort(compare);
    const frag = document.createDocumentFragment();
    const group = (label, items) => {
      if (!items.length) return;
      if (pinned.length && rest.length) frag.appendChild(el('h2', 'group', label));
      const grid = el('div', 'grid');
      items.forEach((n) => grid.appendChild(noteCard(n)));
      frag.appendChild(grid);
    };
    group('Pinned', pinned);
    group('Notes', rest);
    list.appendChild(frag);

    const total = notes.filter((n) => !isEmpty(n) || n.id === currentId).length;
    const filtered = ui.q || ui.tag || ui.color;
    $('count').textContent = filtered ? shown.length + ' of ' + total + ' notes' : total + (total === 1 ? ' note' : ' notes');
    const empty = $('empty');
    empty.hidden = shown.length > 0;
    if (!empty.hidden) {
      $('empty-title').textContent = filtered ? 'Nothing matches' : 'No notes yet';
      $('empty-text').textContent = filtered ? 'Try another word, tag or colour.' : 'Tap New to write your first one.';
      $('empty-clear').hidden = !filtered;
    }
  }

  function renderAll() {
    renderFilters();
    renderList();
  }

  // ---------- editor ----------
  function syncEditorPin(n) {
    const b = $('pin');
    b.setAttribute('aria-pressed', String(n.pinned));
    b.textContent = n.pinned ? 'Pinned' : 'Pin';
  }

  function renderSwatches(n) {
    const wrap = $('swatches');
    wrap.textContent = '';
    ['', ...COLORS].forEach((c) => {
      const label = el('label', 'swatch' + (c ? ' swatch--' + c : ' swatch--none'));
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'color';
      input.value = c;
      input.checked = n.color === c;
      input.setAttribute('aria-label', c ? COLOR_NAME[c] : 'No colour');
      input.addEventListener('change', () => {
        const cur = current();
        if (!cur) return;
        cur.color = c;
        touch(cur);
      });
      label.appendChild(input);
      label.appendChild(el('span', 'swatch__fill'));
      wrap.appendChild(label);
    });
  }

  function renderTagChips(n) {
    const wrap = $('tagchips');
    wrap.textContent = '';
    n.tags.forEach((t) => {
      const b = el('button', 'tagchip', '#' + t);
      b.type = 'button';
      b.setAttribute('aria-label', 'Remove tag ' + t);
      b.appendChild(el('span', 'tagchip__x', '×'));
      b.addEventListener('click', () => {
        const cur = current();
        if (!cur) return;
        cur.tags = cur.tags.filter((x) => x !== t);
        renderTagChips(cur);
        touch(cur);
        $('f-tag').focus();
      });
      wrap.appendChild(b);
    });
    $('f-tag').hidden = n.tags.length >= MAX_TAGS;
  }

  function updateMeta(n) {
    $('counts').textContent = wordCount(n.body) + (wordCount(n.body) === 1 ? ' word' : ' words') + ' · ' + n.body.length + ' characters';
    $('edited').textContent = 'Edited ' + ago(n.updated).toLowerCase();
  }

  function setEditing(on) {
    document.body.classList.toggle('editing', on);
    syncInert();
  }

  // On narrow screens the editor is a full-screen sheet: keep the hidden half out of the tab order.
  function syncInert() {
    const editing = document.body.classList.contains('editing');
    const narrow = !wide.matches;
    $('listpane').inert = narrow && editing;
    $('editor').inert = narrow && !editing;
  }

  function showEditor(n) {
    $('editor-empty').hidden = !!n;
    $('editor-body').hidden = !n;
    $('editor').dataset.color = n && n.color ? n.color : '';
    if (!n) return;
    $('f-title').value = n.title;
    $('f-body').value = n.body;
    $('f-tag').value = '';
    renderSwatches(n);
    renderTagChips(n);
    syncEditorPin(n);
    updateMeta(n);
    setStatus(storageOK ? 'Saved' : 'Not saved: storage is blocked', !storageOK);
  }

  function discardIfEmpty() {
    const n = current();
    if (n && isEmpty(n)) notes = notes.filter((x) => x !== n);
  }

  function openNote(id, focus) {
    if (currentId && currentId !== id) discardIfEmpty();
    currentId = id;
    const n = current();
    showEditor(n);
    setEditing(!!n);
    renderAll();
    if (n && focus) $(n.title || n.body ? 'f-body' : 'f-title').focus({ preventScroll: true });
  }

  function closeEditor(focusCard) {
    const id = currentId;
    discardIfEmpty();
    persist();
    currentId = null;
    showEditor(null);
    setEditing(false);
    renderAll();
    if (focusCard && id) {
      const card = document.querySelector('.note__open[data-id="' + CSS.escape(id) + '"]');
      if (card) card.focus({ preventScroll: true });
    }
  }

  function newNote() {
    discardIfEmpty();
    // a fresh note starts inside the active filter, so it does not vanish from the list
    const n = normalizeNote({ id: uid(), title: '', body: '', tags: ui.tag ? [ui.tag] : [], color: ui.color, created: now(), updated: now() });
    n.tags = ui.tag ? [ui.tag] : [];
    notes.unshift(n);
    ui.q = '';
    $('q').value = '';
    currentId = n.id;
    showEditor(n);
    setEditing(true);
    renderAll();
    $('f-title').focus({ preventScroll: true });
  }

  function touch(n) {
    n.updated = now();
    $('editor').dataset.color = n.color || '';
    updateMeta(n);
    scheduleSave();
    renderList();
  }

  function addTag(raw) {
    const n = current();
    if (!n) return false;
    const t = cleanTag(raw);
    if (!t) return false;
    if (n.tags.includes(t)) return true;
    if (n.tags.length >= MAX_TAGS) { toast('A note can have up to ' + MAX_TAGS + ' tags.'); return false; }
    n.tags.push(t);
    renderTagChips(n);
    touch(n);
    renderFilters();
    return true;
  }

  function deleteCurrent() {
    const n = current();
    if (!n) return;
    const index = notes.indexOf(n);
    const wasEmpty = isEmpty(n);
    notes.splice(index, 1);
    currentId = null;
    showEditor(null);
    setEditing(false);
    persist();
    renderAll();
    if (!wasEmpty) {
      toast('Note deleted', () => {
        notes.splice(Math.min(index, notes.length), 0, n);
        persist();
        renderAll();
        toast('Note restored');
      });
    }
  }

  // ---------- toast ----------
  function toast(text, undo) {
    const t = $('toast');
    $('toast-text').textContent = text;
    toastUndo = undo || null;
    $('toast-undo').hidden = !undo;
    t.hidden = false;
    t.classList.remove('toast--in');
    void t.offsetWidth; // restart the entrance animation
    t.classList.add('toast--in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undo ? 7000 : 3200);
  }
  function hideToast() {
    $('toast').hidden = true;
    toastUndo = null;
  }

  // ---------- export / import ----------
  function pad(x) { return String(x).padStart(2, '0'); }

  function exportNotes() {
    const out = notes.filter((n) => !isEmpty(n));
    if (!out.length) { toast('Nothing to export yet.'); return; }
    const d = new Date();
    const name = 'notes-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '.json';
    const payload = { app: 'personal-notes', v: 1, exported: d.toISOString(), notes: out };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Exported ' + out.length + (out.length === 1 ? ' note' : ' notes'));
  }

  // Pure merge step, kept separate so it is easy to test.
  function mergeNotes(existing, incoming) {
    const list = existing.slice();
    let added = 0;
    let updated = 0;
    let same = 0;
    for (const n of incoming) {
      const at = list.findIndex((x) => x.id === n.id);
      if (at < 0) { if (list.length < MAX_NOTES) { list.push(n); added++; } } else if (n.updated > list[at].updated) { list[at] = n; updated++; } else { same++; }
    }
    return { list, added, updated, same };
  }

  async function importFile(file) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { toast('That file is too large.'); return; }
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { toast('That file is not a notes backup.'); return; }
    const arr = Array.isArray(data) ? data : data && Array.isArray(data.notes) ? data.notes : null;
    if (!arr) { toast('That file is not a notes backup.'); return; }
    const incoming = arr.map(normalizeNote).filter((n) => n && !isEmpty(n));
    if (!incoming.length) { toast('No notes found in that file.'); return; }
    discardIfEmpty();
    const before = notes.slice();
    const r = mergeNotes(notes, incoming);
    notes = r.list;
    if (currentId && !byId(currentId)) { currentId = null; showEditor(null); setEditing(false); }
    persist();
    renderAll();
    const bits = [];
    if (r.added) bits.push(r.added + ' added');
    if (r.updated) bits.push(r.updated + ' updated');
    if (r.same) bits.push(r.same + ' already here');
    toast('Imported: ' + bits.join(', '), () => {
      notes = before;
      if (currentId && !byId(currentId)) { currentId = null; showEditor(null); setEditing(false); }
      persist();
      renderAll();
      toast('Import undone');
    });
  }

  // ---------- theme ----------
  function applyTheme(mode) {
    document.documentElement.dataset.theme = mode;
    const light = mode === 'light';
    const b = $('theme');
    b.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    $('theme-icon').setAttribute('d', light
      ? 'M12 4V2h0v2zm0 18v-2h0v2zM4 12H2h2zm18 0h-2 2zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM5.6 4.2 4.2 5.6l1.8 1.8 1.4-1.4zM18 16.6l-1.4 1.4 1.8 1.8 1.4-1.4zM4.2 18.4l1.4 1.4 1.8-1.8L6 16.6zM16.6 6l1.4 1.4 1.8-1.8-1.4-1.4z'
      : 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f3ecff' : '#2a0f5c');
  }

  function initTheme() {
    const saved = lsGet(THEME_KEY);
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(saved === 'light' || saved === 'dark' ? saved : prefersLight ? 'light' : 'dark');
  }

  // ---------- wiring ----------
  function wire() {
    $('new').addEventListener('click', newNote);
    $('back').addEventListener('click', () => closeEditor(true));
    $('delete').addEventListener('click', deleteCurrent);
    $('export').addEventListener('click', exportNotes);
    $('import').addEventListener('click', () => $('import-file').click());
    $('import-file').addEventListener('change', (e) => { importFile(e.target.files[0]); e.target.value = ''; });
    $('theme').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      lsSet(THEME_KEY, next);
    });
    $('toast-undo').addEventListener('click', () => {
      const fn = toastUndo;
      hideToast();
      if (fn) fn();
    });
    $('empty-clear').addEventListener('click', () => {
      ui.q = ''; ui.tag = ''; ui.color = '';
      $('q').value = '';
      renderAll();
    });

    $('q').addEventListener('input', (e) => { ui.q = e.target.value.trim(); renderList(); });
    $('sort').addEventListener('change', (e) => { ui.sort = e.target.value; renderList(); });

    $('f-title').addEventListener('input', (e) => { const n = current(); if (n) { n.title = e.target.value; touch(n); } });
    $('f-body').addEventListener('input', (e) => { const n = current(); if (n) { n.body = e.target.value; touch(n); } });
    $('pin').addEventListener('click', () => {
      const n = current();
      if (!n) return;
      n.pinned = !n.pinned;
      syncEditorPin(n);
      touch(n);
    });

    const tagInput = $('f-tag');
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (addTag(tagInput.value)) tagInput.value = '';
      } else if (e.key === 'Backspace' && !tagInput.value) {
        const n = current();
        if (n && n.tags.length) { n.tags.pop(); renderTagChips(n); touch(n); renderFilters(); }
      }
    });
    tagInput.addEventListener('blur', () => { if (tagInput.value.trim() && addTag(tagInput.value)) tagInput.value = ''; });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (e.key === 'Escape') {
        if (document.activeElement === $('q') && $('q').value) { $('q').value = ''; ui.q = ''; renderList(); return; }
        if (currentId && !wide.matches) closeEditor(true);
        return;
      }
      if (typing) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); newNote(); }
      else if (e.key === '/') { e.preventDefault(); $('q').focus(); }
    });

    window.addEventListener('pagehide', () => { if (saveTimer) persist(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) persist(); });
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY) return;
      notes = load();
      if (currentId && !byId(currentId)) { currentId = null; showEditor(null); setEditing(false); }
      renderAll();
    });
    if (wide.addEventListener) wide.addEventListener('change', syncInert); else wide.addListener(syncInert);
    setInterval(() => { if (!document.hidden && !saveTimer) { renderList(); const n = current(); if (n) updateMeta(n); } }, 60000);
  }

  function init() {
    initTheme();
    notes = load();
    wire();
    renderAll();
    showEditor(null);
    syncInert();
    $('storage-warn').hidden = storageOK;
    if (storageOK && lsGet(KEY) == null) persist(); // keep the demo notes so the first visit is stable
  }

  init();
  window.__notes = { mergeNotes, cleanTag, normalizeNote, get notes() { return notes; } };
})();
