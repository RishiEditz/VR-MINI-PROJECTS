/* Image Gallery with Filters (Mini Projects, Day 14). Plain JavaScript, no libraries. */
(function () {
  'use strict';

  const G = window.GALLERY;
  const ITEMS = G.items;
  const FX = [
    { id: 'none', label: 'Original', css: 'none' },
    { id: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.05)' },
    { id: 'sepia', label: 'Sepia', css: 'sepia(0.85) contrast(1.05)' },
    { id: 'vivid', label: 'Vivid', css: 'saturate(1.9) contrast(1.08)' },
    { id: 'cool', label: 'Cool', css: 'hue-rotate(160deg) saturate(1.2)' },
    { id: 'fade', label: 'Fade', css: 'contrast(0.8) saturate(0.7) brightness(1.1)' },
    { id: 'invert', label: 'Invert', css: 'invert(1) hue-rotate(180deg)' }
  ];
  const KEY = 'day14-gallery';
  const SLIDE_MS = 2600;

  const $ = (id) => document.getElementById(id);
  const el = {
    theme: $('theme'), themeIcon: $('theme-icon'), q: $('q'), chips: $('chips'), count: $('count'),
    grid: $('grid'), empty: $('empty'), viewer: $('viewer'), vCount: $('v-count'), vClose: $('v-close'),
    stage: $('v-stage'), prev: $('v-prev'), next: $('v-next'), fig: $('v-fig'), title: $('v-title'),
    meta: $('v-meta'), fav: $('v-fav'), play: $('v-play'), fx: $('fx'), bright: $('bright')
  };

  const state = { cat: 'All', query: '', favs: new Set(), theme: null, list: [], index: -1, fx: 'none', bright: 100, timer: null, opener: null };

  /* ---------- storage ---------- */
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (Array.isArray(d.favs)) d.favs.forEach(function (id) { if (ITEMS.some(function (i) { return i.id === id; })) state.favs.add(id); });
      if (d.theme === 'light' || d.theme === 'dark') state.theme = d.theme;
      if (typeof d.cat === 'string') state.cat = d.cat;
    } catch (e) { /* ignore broken storage */ }
    if (!state.theme) state.theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    if (state.cat !== 'All' && state.cat !== 'Favorites' && G.categories.indexOf(state.cat) < 0) state.cat = 'All';
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ favs: Array.from(state.favs), theme: state.theme, cat: state.cat })); } catch (e) { /* storage may be blocked */ }
  }

  /* ---------- theme ---------- */
  const MOON = 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z';
  const SUN = 'M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8';
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    el.themeIcon.setAttribute('d', state.theme === 'dark' ? MOON : SUN);
    el.themeIcon.setAttribute('fill', state.theme === 'dark' ? 'currentColor' : 'none');
    el.theme.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', state.theme === 'dark' ? '#240618' : '#fff3e6');
  }

  /* ---------- filtering ---------- */
  function countFor(cat) {
    if (cat === 'All') return ITEMS.length;
    if (cat === 'Favorites') return state.favs.size;
    return ITEMS.filter(function (i) { return i.cat === cat; }).length;
  }
  function matches(item) {
    if (state.cat === 'Favorites' && !state.favs.has(item.id)) return false;
    if (state.cat !== 'All' && state.cat !== 'Favorites' && item.cat !== state.cat) return false;
    const q = state.query.trim().toLowerCase();
    if (!q) return true;
    const hay = (item.title + ' ' + item.cat + ' ' + item.tags.join(' ')).toLowerCase();
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function buildChips() {
    const cats = ['All'].concat(G.categories, ['Favorites']);
    el.chips.innerHTML = '';
    cats.forEach(function (c) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'tab'); b.dataset.cat = c;
      b.innerHTML = '<span>' + c + '</span><small></small>';
      b.addEventListener('click', function () { setCat(c); });
      el.chips.appendChild(b);
    });
  }
  function updateChips() {
    Array.prototype.forEach.call(el.chips.children, function (b) {
      const c = b.dataset.cat;
      b.setAttribute('aria-selected', String(c === state.cat));
      b.tabIndex = c === state.cat ? 0 : -1;
      b.lastChild.textContent = countFor(c);
    });
  }
  function setCat(c) {
    state.cat = c; save(); render();
    const active = el.chips.querySelector('[aria-selected="true"]');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-8-4.9-8-10.6A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 8 2.7c0 5.7-8 10.6-8 10.6z"/></svg>';

  function render() {
    state.list = ITEMS.filter(matches);
    el.grid.innerHTML = '';
    state.list.forEach(function (item, n) {
      const li = document.createElement('li');
      li.className = 'tile tile--' + item.size;
      li.style.setProperty('--i', String(Math.min(n, 12)));
      li.dataset.id = item.id;
      const open = document.createElement('button');
      open.type = 'button'; open.className = 'tile__btn';
      open.setAttribute('aria-label', 'Open ' + item.title);
      open.innerHTML = G.render(item, 'g') + '<span class="tile__cap"><b>' + item.title + '</b><span>' + item.cat + '</span></span>';
      open.addEventListener('click', function () { openViewer(item.id, open); });
      const heart = document.createElement('button');
      heart.type = 'button'; heart.className = 'tile__heart'; heart.innerHTML = HEART;
      heart.setAttribute('aria-label', 'Favorite ' + item.title);
      heart.setAttribute('aria-pressed', String(state.favs.has(item.id)));
      heart.addEventListener('click', function () { toggleFav(item.id, heart); });
      li.appendChild(open); li.appendChild(heart);
      el.grid.appendChild(li);
    });
    el.empty.hidden = state.list.length > 0;
    if (state.cat === 'Favorites' && !state.favs.size && !state.query) el.empty.textContent = 'No favorites yet. Tap the heart on any picture.';
    else el.empty.textContent = 'No pictures match. Try another word or category.';
    const n = state.list.length;
    el.count.textContent = n + (n === 1 ? ' picture' : ' pictures') + (state.cat !== 'All' ? ' in ' + state.cat : '') + (state.query.trim() ? ' for “' + state.query.trim() + '”' : '');
    updateChips();
  }

  function toggleFav(id, btn) {
    if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id);
    save();
    if (state.cat === 'Favorites' && !state.favs.has(id)) {
      if (el.viewer.hidden) { render(); return; }
    }
    if (btn) { btn.setAttribute('aria-pressed', String(state.favs.has(id))); btn.classList.remove('beat'); void btn.offsetWidth; btn.classList.add('beat'); }
    updateChips();
    if (!el.viewer.hidden) syncFav();
    const tile = el.grid.querySelector('[data-id="' + id + '"] .tile__heart');
    if (tile) tile.setAttribute('aria-pressed', String(state.favs.has(id)));
  }

  /* ---------- viewer ---------- */
  function cur() { return state.list[state.index]; }
  function showPicture(dir) {
    const item = cur();
    if (!item) return;
    const paint = function () {
      el.fig.innerHTML = G.render(item, 'v');
      el.title.textContent = item.title;
      el.meta.textContent = item.cat + '  ·  ' + item.tags.slice(0, 3).join(', ');
      el.vCount.textContent = (state.index + 1) + ' / ' + state.list.length;
      syncFav();
      el.fig.classList.remove('out-l', 'out-r');
    };
    if (dir && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.fig.classList.add(dir > 0 ? 'out-l' : 'out-r');
      setTimeout(paint, 140);
    } else paint();
  }
  function syncFav() {
    const item = cur(); if (!item) return;
    const on = state.favs.has(item.id);
    el.fav.setAttribute('aria-pressed', String(on));
    el.fav.textContent = on ? 'Saved' : 'Favorite';
  }
  function openViewer(id, opener) {
    const i = state.list.findIndex(function (x) { return x.id === id; });
    if (i < 0) return;
    state.index = i; state.opener = opener || null;
    el.viewer.hidden = false;
    document.body.classList.add('lock');
    applyFx();
    showPicture(0);
    el.vClose.focus();
  }
  function closeViewer() {
    stopShow();
    el.viewer.hidden = true;
    document.body.classList.remove('lock');
    if (state.opener && document.contains(state.opener)) state.opener.focus();
  }
  function step(d) {
    if (!state.list.length) return;
    state.index = (state.index + d + state.list.length) % state.list.length;
    showPicture(d);
  }
  function applyFx() {
    const f = FX.find(function (x) { return x.id === state.fx; }) || FX[0];
    el.viewer.style.setProperty('--fx', f.css);
    el.viewer.style.setProperty('--br', String(state.bright / 100));
    Array.prototype.forEach.call(el.fx.children, function (b) { b.setAttribute('aria-checked', String(b.dataset.fx === state.fx)); b.tabIndex = b.dataset.fx === state.fx ? 0 : -1; });
    el.bright.value = String(state.bright);
  }
  function buildFx() {
    FX.forEach(function (f) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.fx = f.id; b.textContent = f.label; b.setAttribute('role', 'radio');
      b.addEventListener('click', function () { state.fx = f.id; applyFx(); });
      el.fx.appendChild(b);
    });
  }
  function startShow() {
    stopShow();
    state.timer = setInterval(function () { step(1); }, SLIDE_MS);
    el.play.setAttribute('aria-pressed', 'true'); el.play.textContent = 'Pause';
  }
  function stopShow() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    el.play.setAttribute('aria-pressed', 'false'); el.play.textContent = 'Slideshow';
  }

  /* ---------- events ---------- */
  el.theme.addEventListener('click', function () { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); save(); });
  el.q.addEventListener('input', function () { state.query = el.q.value; render(); });
  el.vClose.addEventListener('click', closeViewer);
  el.prev.addEventListener('click', function () { step(-1); });
  el.next.addEventListener('click', function () { step(1); });
  el.fav.addEventListener('click', function () { const it = cur(); if (it) toggleFav(it.id); });
  el.play.addEventListener('click', function () { if (state.timer) stopShow(); else startShow(); });
  el.bright.addEventListener('input', function () { state.bright = Number(el.bright.value); applyFx(); });
  el.viewer.addEventListener('click', function (e) { if (e.target === el.viewer || e.target === el.stage) closeViewer(); });

  let sx = null, sy = null;
  el.stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  el.stage.addEventListener('touchend', function (e) {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = sy = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  el.chips.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const all = Array.prototype.slice.call(el.chips.children);
    const i = all.findIndex(function (b) { return b.dataset.cat === state.cat; });
    const n = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
    setCat(n.dataset.cat); n.focus(); e.preventDefault();
  });

  document.addEventListener('keydown', function (e) {
    if (el.viewer.hidden) return;
    if (e.key === 'Escape') { closeViewer(); }
    else if (e.key === 'ArrowRight') { step(1); }
    else if (e.key === 'ArrowLeft') { step(-1); }
    else if ((e.key === 'f' || e.key === 'F') && document.activeElement !== el.q) { const it = cur(); if (it) toggleFav(it.id); }
    else if (e.key === ' ' && document.activeElement.tagName !== 'BUTTON' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); if (state.timer) stopShow(); else startShow(); }
    else if (e.key === 'Tab') {
      const f = Array.prototype.filter.call(el.viewer.querySelectorAll('button, input'), function (n) { return !n.disabled && n.tabIndex >= 0 && n.offsetParent !== null; });
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  /* ---------- start ---------- */
  load();
  applyTheme();
  buildChips();
  buildFx();
  render();

  /* A small hook so the page can be tested without clicking. */
  window.__gal = {
    state: state, items: ITEMS,
    setCat: setCat,
    search: function (t) { el.q.value = t; state.query = t; render(); },
    open: function (id) { openViewer(id || (state.list[0] && state.list[0].id)); },
    close: closeViewer, step: step,
    setFx: function (id) { state.fx = id; applyFx(); },
    setBright: function (v) { state.bright = v; applyFx(); },
    play: startShow, stop: stopShow, fav: function (id) { toggleFav(id); },
    theme: function (t) { state.theme = t; applyTheme(); }
  };
})();
