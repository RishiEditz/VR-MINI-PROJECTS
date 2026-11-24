/* Random Quote Generator (Mini Projects, Day 12). Plain JavaScript, no libraries.
   All quotes are original lines written for this project. */
(function () {
  'use strict';

  var QUOTES = {
    focus: [
      'Do the one thing in front of you, then the next one.',
      'A quiet hour of real work beats a loud day of busy.',
      'Close the extra tabs. Open the one that matters.',
      'Small steps taken daily are quietly louder than big plans.',
      'Focus is just saying no to ten good ideas.',
      'Start before you feel ready; ready shows up on the way.',
      'Your attention is your budget. Spend it on purpose.',
      'Finish the boring part first and the rest feels lighter.',
      'Progress is rarely loud. It looks like showing up again.',
      'Put your phone down and your goal up.',
      'Ten focused minutes can move a mountain of maybe.',
      'Clear desk, clear head, clear next step.'
    ],
    courage: [
      'Being scared and starting anyway is what brave really means.',
      'The first draft is allowed to be messy. It just has to exist.',
      'You do not need the whole staircase, only the first step.',
      'Fear shrinks every time you walk toward it.',
      'A wrong turn still teaches you the map.',
      'Say the idea out loud; it gets braver in the open air.',
      'Failing once is data. Quitting forever is the only real loss.',
      'Courage is a muscle, and today is leg day.',
      'Ask the question. The silence in your head is louder than any answer.',
      'Try the hard version. Your future self is taking notes.',
      'Not yet is a very different sentence from never.',
      'Every expert once pressed the button with shaky hands.'
    ],
    create: [
      'Make it ugly first, then make it better.',
      'Ideas are shy; they visit people who keep a notebook open.',
      'Copy the method, not the result, and your own voice appears.',
      'A blank page is a door, not a wall.',
      'Combine two things nobody put together and call it yours.',
      'Constraints are a gift: they tell your creativity where to go.',
      'Show your work before it feels finished.',
      'Curiosity is just creativity wearing running shoes.',
      'Today is a good day to build something small and strange.',
      'Sketch it, break it, rebuild it, share it.',
      'Great things start as tiny experiments that did not give up.',
      'Your odd little idea might be the exact thing someone needs.'
    ],
    life: [
      'Good days are built from ordinary mornings.',
      'Be kind; everyone is carrying a bigger bag than they show.',
      'Rest is part of the work, not a break from it.',
      'You are allowed to grow slowly and still be on time.',
      'Gratitude turns enough into plenty.',
      'The best time to begin is the awkward one.',
      'Drink water, take a walk, call a friend. Repeat.',
      'Comparison steals the joy that your own pace brings.',
      'Celebrate small wins; they are the real milestones.',
      'A little patience goes a long way down any road.',
      'Smile at a stranger and watch the day rearrange itself.',
      'Make today the kind of day you would like to remember.'
    ],
    code: [
      'Every bug is a lesson that has not been explained yet.',
      'Write code for the human who reads it next, even if that is you.',
      'Make it work, make it clear, then make it fast.',
      'Naming things is hard because thinking clearly is hard.',
      'The best line of code is the one you did not have to write.',
      'Read the error message. It is trying to help you.',
      'Commit small and commit often; your future self will say thanks.',
      'A tiny project finished beats a giant project imagined.',
      'Debugging is a conversation between your idea and reality.',
      'Simple code ages well, clever code ages in dog years.',
      'Ship the version that works, then improve what users touch.',
      'Learning to code is learning to break big problems into small ones.'
    ]
  };

  var MOODS = [
    { id: 'all', label: 'All' },
    { id: 'focus', label: 'Focus' },
    { id: 'courage', label: 'Courage' },
    { id: 'create', label: 'Create' },
    { id: 'life', label: 'Life' },
    { id: 'code', label: 'Code' }
  ];
  var MOOD_LABEL = { focus: 'Focus', courage: 'Courage', create: 'Create', life: 'Life', code: 'Code' };

  // One gradient per quote slot (dark theme / light theme), cycled so neighbours differ.
  var PALETTES = [
    ['#4a1c96', '#e23a8c', '#ffb48a'],
    ['#12285e', '#2f6fe4', '#6fe3d6'],
    ['#3c0f5a', '#b83ad0', '#ff8fb1'],
    ['#5a1a2a', '#e8503a', '#ffd27a'],
    ['#0d3a4a', '#13a39a', '#b8f06a'],
    ['#2a1470', '#7a52ff', '#ff9ad5'],
    ['#4a123c', '#d3326a', '#ffc58a'],
    ['#0e2f5a', '#2a9bd8', '#c6a8ff']
  ];

  var ALL = [];
  Object.keys(QUOTES).forEach(function (mood) {
    QUOTES[mood].forEach(function (text) { ALL.push({ id: ALL.length, mood: mood, text: text }); });
  });

  var KEY_FAVS = 'rqg.favs', KEY_THEME = 'rqg.theme', KEY_MOOD = 'rqg.mood';
  var AUTO_MS = 6000;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    quote: $('quote'), text: $('q-text'), tag: $('q-tag'), num: $('q-num'),
    moods: $('moods'), next: $('next'), prev: $('prev'), fav: $('fav'), favLabel: $('fav-label'), favIcon: $('fav-icon'),
    copy: $('copy'), share: $('share'), card: $('card'), auto: $('auto'),
    autobar: $('autobar'), autofill: $('autobar-fill'), toast: $('toast'),
    theme: $('theme'), themeIcon: $('theme-icon'),
    favsOpen: $('favs-open'), favsCount: $('favs-count'),
    drawer: $('drawer'), drawerClose: $('drawer-close'), favlist: $('favlist'), favsEmpty: $('favs-empty'), favsClear: $('favs-clear')
  };

  var state = {
    mood: 'all',
    bag: [],          // shuffled ids still unseen in this round
    history: [],      // ids shown, newest last
    pos: -1,          // index into history of the quote on screen
    favs: [],         // saved quote ids
    auto: false, autoTimer: 0, autoStart: 0, raf: 0, toastTimer: 0, paletteIdx: 0
  };

  // ---------- storage (safe if blocked) ----------
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ } }

  // ---------- helpers ----------
  function pool() {
    return ALL.filter(function (q) { return state.mood === 'all' || q.mood === state.mood; });
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function refill(avoidId) {
    state.bag = shuffle(pool().map(function (q) { return q.id; }));
    // never start a new round with the quote that just ended the last one
    if (state.bag.length > 1 && state.bag[state.bag.length - 1] === avoidId) {
      state.bag.unshift(state.bag.pop());
    }
  }
  function drawId() {
    var current = state.pos >= 0 ? state.history[state.pos] : -1;
    if (!state.bag.length) refill(current);
    var id = state.bag.pop();
    if (id === current && state.bag.length) { var other = state.bag.pop(); state.bag.push(id); id = other; }
    return id;
  }
  function currentQuote() { return state.pos >= 0 ? ALL[state.history[state.pos]] : null; }
  function isFav(id) { return state.favs.indexOf(id) !== -1; }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 1800);
  }

  // ---------- rendering ----------
  function setPalette(n) {
    var p = PALETTES[n % PALETTES.length];
    var s = document.documentElement.style;
    s.setProperty('--q0', p[0]); s.setProperty('--q1', p[1]); s.setProperty('--q2', p[2]);
  }

  function render(animate) {
    var q = currentQuote();
    if (!q) return;
    els.text.textContent = q.text;
    els.tag.textContent = MOOD_LABEL[q.mood];
    els.num.textContent = state.history.length > 1 ? '#' + (state.pos + 1) : '';
    els.text.classList.toggle('long', q.text.length > 70);
    setPalette(q.id);
    if (animate) {
      els.quote.classList.remove('swap'); void els.quote.offsetWidth; els.quote.classList.add('swap');
    }
    els.prev.disabled = state.pos <= 0;
    renderFavButton();
  }

  function renderFavButton() {
    var q = currentQuote(); var on = q && isFav(q.id);
    els.fav.setAttribute('aria-pressed', on ? 'true' : 'false');
    els.fav.setAttribute('aria-label', on ? 'Remove from favorites' : 'Save to favorites');
    els.favLabel.textContent = on ? 'Saved' : 'Save';
    els.favIcon.setAttribute('fill', on ? 'currentColor' : 'none');
    els.fav.classList.toggle('on', !!on);
    els.favsCount.hidden = state.favs.length === 0;
    els.favsCount.textContent = String(state.favs.length);
  }

  function renderMoods() {
    els.moods.innerHTML = '';
    MOODS.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', m.id === state.mood ? 'true' : 'false');
      b.dataset.mood = m.id; b.textContent = m.label;
      els.moods.appendChild(b);
    });
  }

  function renderFavList() {
    els.favlist.innerHTML = '';
    state.favs.forEach(function (id) {
      var q = ALL[id];
      var li = document.createElement('li'); li.className = 'favitem';
      var p = document.createElement('p'); p.textContent = q.text;
      var meta = document.createElement('span'); meta.className = 'favmeta'; meta.textContent = MOOD_LABEL[q.mood];
      var show = document.createElement('button'); show.type = 'button'; show.className = 'btn btn--small'; show.dataset.show = String(id); show.textContent = 'Show';
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn--small btn--danger'; del.dataset.del = String(id); del.textContent = 'Remove';
      var row = document.createElement('div'); row.className = 'favrow';
      row.appendChild(meta); row.appendChild(show); row.appendChild(del);
      li.appendChild(p); li.appendChild(row);
      els.favlist.appendChild(li);
    });
    els.favsEmpty.hidden = state.favs.length > 0;
    els.favsClear.hidden = state.favs.length === 0;
  }

  // ---------- actions ----------
  function next() {
    if (state.pos < state.history.length - 1) {
      state.pos += 1;                      // moving forward through earlier quotes
    } else {
      state.history.push(drawId());
      if (state.history.length > 60) { state.history.shift(); }
      state.pos = state.history.length - 1;
    }
    render(true);
    restartAuto();
  }

  function prev() {
    if (state.pos > 0) { state.pos -= 1; render(true); restartAuto(); }
  }

  function setMood(id) {
    if (id === state.mood) return;
    state.mood = id; save(KEY_MOOD, id);
    state.bag = []; state.history = []; state.pos = -1;
    renderMoods();
    next();
  }

  function toggleFav() {
    var q = currentQuote(); if (!q) return;
    var i = state.favs.indexOf(q.id);
    if (i === -1) { state.favs.push(q.id); toast('Saved to favorites'); } else { state.favs.splice(i, 1); toast('Removed from favorites'); }
    save(KEY_FAVS, state.favs); renderFavButton(); renderFavList();
    els.fav.classList.remove('pop'); void els.fav.offsetWidth; els.fav.classList.add('pop');
  }

  function quoteString(q) { return '“' + q.text + '”'; }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject();
    });
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  function copy() {
    var q = currentQuote(); if (!q) return;
    copyText(quoteString(q)).then(function () { toast('Copied'); }, function () { toast('Could not copy here'); });
  }

  function share() {
    var q = currentQuote(); if (!q) return;
    if (navigator.share) {
      navigator.share({ title: 'A quote for you', text: quoteString(q) }).catch(function () { /* cancelled */ });
    } else {
      copy();
    }
  }

  function wrapLines(ctx, text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var trial = cur ? cur + ' ' + w : w;
      if (ctx.measureText(trial).width <= maxW || !cur) { cur = trial; } else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function savePicture() {
    var q = currentQuote(); if (!q) return;
    var p = PALETTES[q.id % PALETTES.length];
    var W = 1080, H = 1080, c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, p[0]); g.addColorStop(0.55, p[1]); g.addColorStop(1, p[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.font = 'bold 420px Georgia, serif'; ctx.textBaseline = 'top';
    ctx.fillText('“', 60, 20);
    ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'alphabetic';
    var size = q.text.length > 70 ? 64 : 76, lines;
    for (; size >= 44; size -= 4) {
      ctx.font = 'bold ' + size + 'px "Segoe UI", system-ui, Arial, sans-serif';
      lines = wrapLines(ctx, q.text, W - 220);
      if (lines.length <= 7) break;
    }
    var lh = Math.round(size * 1.3), y = (H - lines.length * lh) / 2 + size * 0.8;
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 12;
    lines.forEach(function (ln, i) { ctx.fillText(ln, 110, y + i * lh); });
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '600 34px "Segoe UI", system-ui, Arial, sans-serif';
    ctx.fillText(MOOD_LABEL[q.mood].toUpperCase() + '  ·  MINI PROJECTS DAY 12', 110, H - 90);
    c.toBlob(function (blob) {
      if (!blob) { toast('Could not make the picture'); return; }
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'quote-' + (q.id + 1) + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast('Picture saved');
    }, 'image/png');
  }

  // ---------- auto play ----------
  function stopAutoLoop() { clearTimeout(state.autoTimer); cancelAnimationFrame(state.raf); els.autofill.style.width = '0%'; }
  function restartAuto() {
    stopAutoLoop();
    if (!state.auto) return;
    state.autoStart = performance.now();
    state.autoTimer = setTimeout(next, AUTO_MS);
    var tick = function (now) {
      var f = Math.min(1, (now - state.autoStart) / AUTO_MS);
      els.autofill.style.width = (f * 100).toFixed(1) + '%';
      if (f < 1 && state.auto) state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }
  function toggleAuto() {
    state.auto = !state.auto;
    els.auto.setAttribute('aria-pressed', state.auto ? 'true' : 'false');
    els.auto.textContent = 'Auto play: ' + (state.auto ? 'on' : 'off');
    els.autobar.hidden = !state.auto;
    restartAuto();
  }

  // ---------- favorites drawer ----------
  var lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement; renderFavList();
    els.drawer.classList.add('open'); els.drawer.setAttribute('aria-hidden', 'false');
    els.drawerClose.focus();
  }
  function closeDrawer() {
    els.drawer.classList.remove('open'); els.drawer.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function drawerOpen() { return els.drawer.classList.contains('open'); }

  function showFav(id) {
    state.history.push(id); state.pos = state.history.length - 1;
    closeDrawer(); render(true); restartAuto();
  }
  function removeFav(id) {
    state.favs = state.favs.filter(function (x) { return x !== id; });
    save(KEY_FAVS, state.favs); renderFavList(); renderFavButton();
  }

  // ---------- theme ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    els.theme.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    var moon = 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z';
    var sun = 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8';
    var isDark = t === 'dark';
    els.themeIcon.setAttribute('d', isDark ? sun : moon);
    els.themeIcon.setAttribute('fill', isDark ? 'none' : 'currentColor');
    els.themeIcon.setAttribute('stroke', 'currentColor');
    els.themeIcon.setAttribute('stroke-width', isDark ? '2.2' : '1.5');
    els.themeIcon.setAttribute('stroke-linecap', 'round');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#1c0638' : '#fde8f0');
  }
  function toggleTheme() {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t); save(KEY_THEME, t);
  }

  // ---------- events ----------
  els.next.addEventListener('click', next);
  els.prev.addEventListener('click', prev);
  els.fav.addEventListener('click', toggleFav);
  els.copy.addEventListener('click', copy);
  els.share.addEventListener('click', share);
  els.card.addEventListener('click', savePicture);
  els.auto.addEventListener('click', toggleAuto);
  els.theme.addEventListener('click', toggleTheme);
  els.favsOpen.addEventListener('click', openDrawer);
  els.drawerClose.addEventListener('click', closeDrawer);
  els.drawer.addEventListener('click', function (e) { if (e.target === els.drawer) closeDrawer(); });
  els.favsClear.addEventListener('click', function () { state.favs = []; save(KEY_FAVS, state.favs); renderFavList(); renderFavButton(); });
  els.favlist.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.show) showFav(Number(t.dataset.show));
    if (t.dataset.del) removeFav(Number(t.dataset.del));
  });
  els.moods.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (b) setMood(b.dataset.mood);
  });
  els.moods.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var chips = Array.prototype.slice.call(els.moods.querySelectorAll('.chip'));
    var i = chips.findIndex(function (c) { return c.dataset.mood === state.mood; });
    i = (i + (e.key === 'ArrowRight' ? 1 : -1) + chips.length) % chips.length;
    e.preventDefault(); setMood(chips[i].dataset.mood);
    els.moods.querySelectorAll('.chip')[i].focus();
  });
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && drawerOpen()) { closeDrawer(); return; }
    if (drawerOpen()) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === ' ' && tag !== 'button') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' && !els.moods.contains(e.target)) { prev(); }
    else if (e.key === 'ArrowRight' && !els.moods.contains(e.target)) { next(); }
    else if ((e.key === 'f' || e.key === 'F') && tag !== 'input') { toggleFav(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopAutoLoop(); else restartAuto(); });

  // ---------- start ----------
  var savedFavs = load(KEY_FAVS, []);
  state.favs = Array.isArray(savedFavs) ? savedFavs.filter(function (n) { return typeof n === 'number' && ALL[n]; }) : [];
  var savedMood = load(KEY_MOOD, 'all');
  state.mood = MOODS.some(function (m) { return m.id === savedMood; }) ? savedMood : 'all';
  var savedTheme = load(KEY_THEME, null);
  applyTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme
    : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  renderMoods();
  next();
})();
