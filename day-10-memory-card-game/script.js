/* Memory Match (Mini Projects, Day 10). Plain JavaScript, no libraries. */
(function () {
  'use strict';

  var STORE_KEY = 'vrmm.v1';
  var LEVELS = {
    easy:   { pairs: 6,  cols: 4, rows: 3, label: 'Easy' },
    medium: { pairs: 8,  cols: 4, rows: 4, label: 'Medium' },
    hard:   { pairs: 12, cols: 4, rows: 6, label: 'Hard' }
  };
  var PACKS = {
    animals: { label: 'Animals', cards: [['🐶', 'dog'], ['🐱', 'cat'], ['🦊', 'fox'], ['🐼', 'panda'], ['🐸', 'frog'], ['🦁', 'lion'], ['🐧', 'penguin'], ['🐙', 'octopus'], ['🦄', 'unicorn'], ['🐢', 'turtle'], ['🦋', 'butterfly'], ['🐝', 'bee']] },
    fruits:  { label: 'Fruits', cards: [['🍎', 'apple'], ['🍌', 'banana'], ['🍇', 'grapes'], ['🍓', 'strawberry'], ['🍊', 'orange'], ['🍍', 'pineapple'], ['🍑', 'peach'], ['🍉', 'watermelon'], ['🥝', 'kiwi'], ['🍒', 'cherries'], ['🥭', 'mango'], ['🍋', 'lemon']] },
    space:   { label: 'Space', cards: [['🚀', 'rocket'], ['🌍', 'earth'], ['🌙', 'moon'], ['⭐', 'star'], ['🪐', 'ringed planet'], ['☄️', 'comet'], ['🛸', 'flying saucer'], ['👽', 'alien'], ['🛰️', 'satellite'], ['🌞', 'sun'], ['🔭', 'telescope'], ['🧑‍🚀', 'astronaut']] },
    sports:  { label: 'Sports', cards: [['⚽', 'football'], ['🏀', 'basketball'], ['🏏', 'cricket'], ['🎾', 'tennis'], ['🏐', 'volleyball'], ['🏓', 'table tennis'], ['🏸', 'badminton'], ['🥊', 'boxing glove'], ['🎳', 'bowling'], ['⛳', 'golf'], ['🏒', 'hockey'], ['🎯', 'darts']] }
  };
  var MISMATCH_MS = 850;
  var HISTORY_MAX = 20;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    board: $('board'), moves: $('moves'), time: $('time'), pairs: $('pairs'), best: $('best'),
    hint: $('hint'), restart: $('restart'), levels: $('levels'), pack: $('pack'),
    theme: $('theme'), themeIcon: $('theme-icon'), sound: $('sound'), waves: $('sound-waves'),
    bests: $('bests'), history: $('history'), historyEmpty: $('history-empty'), clear: $('clear-history'),
    win: $('win'), winStars: $('win-stars'), winLine: $('win-line'), winBadge: $('win-badge'),
    winAgain: $('win-again'), confetti: $('confetti')
  };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- storage (every call is guarded, a blocked store never breaks the page) ---------- */
  var data = { settings: { level: 'medium', pack: 'animals', theme: null, sound: true }, best: {}, history: [] };
  var storageOk = true;

  function loadData() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        var s = d.settings || {};
        if (LEVELS[s.level]) data.settings.level = s.level;
        if (PACKS[s.pack]) data.settings.pack = s.pack;
        if (s.theme === 'light' || s.theme === 'dark') data.settings.theme = s.theme;
        if (typeof s.sound === 'boolean') data.settings.sound = s.sound;
        if (d.best && typeof d.best === 'object') {
          Object.keys(LEVELS).forEach(function (k) {
            var b = d.best[k];
            if (b && isFinite(b.moves) && isFinite(b.time)) data.best[k] = { moves: Math.floor(b.moves), time: Math.floor(b.time) };
          });
        }
        if (Array.isArray(d.history)) {
          data.history = d.history.filter(function (h) {
            return h && LEVELS[h.level] && isFinite(h.moves) && isFinite(h.time) && isFinite(h.at);
          }).slice(0, HISTORY_MAX).map(function (h) {
            return { level: h.level, pack: PACKS[h.pack] ? h.pack : 'animals', moves: Math.floor(h.moves), time: Math.floor(h.time), at: Number(h.at) };
          });
        }
      }
    } catch (e) { storageOk = false; }
  }
  function saveData() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { storageOk = false; }
  }

  /* ---------- helpers ---------- */
  function randomInt(n) {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = randomInt(i + 1);
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }
  function fmtTime(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function stars(level, moves) {
    var p = LEVELS[level].pairs;
    if (moves <= Math.ceil(p * 1.6)) return 3;
    if (moves <= Math.ceil(p * 2.4)) return 2;
    return 1;
  }
  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- sound (tiny tones, only after a tap) ---------- */
  var audio = null;
  function tone(freq, start, dur, type, vol) {
    if (!data.settings.sound) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audio) audio = new AC();
      if (audio.state === 'suspended') audio.resume();
      var t0 = audio.currentTime + start;
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(audio.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* sound is optional */ }
  }
  var sfx = {
    flip: function () { tone(520, 0, 0.06, 'triangle', 0.05); },
    match: function () { tone(660, 0, 0.12, 'sine', 0.09); tone(880, 0.1, 0.18, 'sine', 0.09); },
    miss: function () { tone(220, 0, 0.18, 'sawtooth', 0.04); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.25, 'triangle', 0.09); }); }
  };

  /* ---------- game state ---------- */
  var game = null;
  var timerId = null;

  function newGame() {
    var lv = LEVELS[data.settings.level];
    var pack = PACKS[data.settings.pack].cards;
    var picks = shuffle(pack.slice()).slice(0, lv.pairs);
    var deck = [];
    picks.forEach(function (c, i) {
      deck.push({ pair: i, emoji: c[0], name: c[1] });
      deck.push({ pair: i, emoji: c[0], name: c[1] });
    });
    shuffle(deck);
    game = {
      level: data.settings.level, deck: deck, open: [], matched: 0, moves: 0,
      started: false, over: false, locked: false, elapsed: 0, startedAt: 0, miss: null
    };
    stopTimer();
    renderBoard();
    updateStats();
    setHint('Flip two cards to find a pair.');
  }

  function renderBoard() {
    var lv = LEVELS[game.level];
    els.board.textContent = '';
    els.board.style.setProperty('--cols', lv.cols);
    els.board.style.setProperty('--rows', lv.rows);
    els.board.dataset.level = game.level;
    game.deck.forEach(function (c, i) {
      var b = mk('button', 'card');
      b.type = 'button';
      b.dataset.i = i;
      b.setAttribute('aria-label', 'Card ' + (i + 1) + ', face down');
      b.style.setProperty('--d', (i * 28) + 'ms');
      var inner = mk('span', 'card__inner');
      inner.appendChild(mk('span', 'card__face card__back'));
      var front = mk('span', 'card__face card__front');
      front.appendChild(mk('span', 'card__emoji', c.emoji));
      inner.appendChild(front);
      b.appendChild(inner);
      els.board.appendChild(b);
    });
    els.board.classList.remove('deal');
    void els.board.offsetWidth;
    if (!reduceMotion) els.board.classList.add('deal');
  }

  function cardEl(i) { return els.board.children[i]; }

  function setCard(i, state) {
    var b = cardEl(i), c = game.deck[i];
    b.classList.toggle('is-open', state !== 'down');
    b.classList.toggle('is-matched', state === 'matched');
    b.setAttribute('aria-label', 'Card ' + (i + 1) + (state === 'down' ? ', face down' : ': ' + c.name + (state === 'matched' ? ', matched' : '')));
    if (state === 'matched') b.disabled = true;
  }

  function startTimer() {
    game.started = true;
    game.startedAt = Date.now();
    timerId = setInterval(tick, 250);
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
  function currentElapsed() {
    if (!game.started) return game.elapsed;
    return game.elapsed + (timerId ? Math.floor((Date.now() - game.startedAt) / 1000) : 0);
  }
  function tick() { els.time.textContent = fmtTime(currentElapsed()); }

  function updateStats() {
    var lv = LEVELS[game.level];
    els.moves.textContent = game.moves;
    els.time.textContent = fmtTime(currentElapsed());
    els.pairs.textContent = game.matched + '/' + lv.pairs;
    var b = data.best[game.level];
    els.best.textContent = b ? b.moves + ' moves' : '--';
    els.best.title = b ? 'Best time ' + fmtTime(b.time) : '';
  }
  function setHint(text) { els.hint.textContent = text; }

  function flip(i) {
    if (!game || game.over || game.locked) return;
    if (game.open.indexOf(i) !== -1) return;
    if (game.deck[i].done) return;
    if (!game.started) startTimer();
    sfx.flip();
    game.open.push(i);
    setCard(i, 'up');
    if (game.open.length < 2) { setHint('Now find its twin.'); return; }

    game.moves++;
    var a = game.open[0], b = game.open[1];
    if (game.deck[a].pair === game.deck[b].pair) {
      game.deck[a].done = game.deck[b].done = true;
      game.matched++;
      game.open = [];
      setTimeout(function () {
        setCard(a, 'matched'); setCard(b, 'matched');
        sfx.match();
        cardEl(a).classList.add('pop'); cardEl(b).classList.add('pop');
      }, reduceMotion ? 0 : 280);
      setHint('A match! ' + game.deck[a].name.charAt(0).toUpperCase() + game.deck[a].name.slice(1) + '.');
      updateStats();
      if (game.matched === LEVELS[game.level].pairs) finish();
    } else {
      game.locked = true;
      setHint('Not a pair. Remember where they are.');
      updateStats();
      setTimeout(function () {
        sfx.miss();
        cardEl(a).classList.add('shake'); cardEl(b).classList.add('shake');
      }, 260);
      setTimeout(function () {
        cardEl(a).classList.remove('shake'); cardEl(b).classList.remove('shake');
        setCard(a, 'down'); setCard(b, 'down');
        game.open = [];
        game.locked = false;
        if (!game.over) setHint('Flip two cards to find a pair.');
      }, MISMATCH_MS);
    }
  }

  function finish() {
    game.over = true;
    game.elapsed = currentElapsed();
    stopTimer();
    var level = game.level, moves = game.moves, time = game.elapsed;
    var prev = data.best[level];
    var isBest = !prev || moves < prev.moves || (moves === prev.moves && time < prev.time);
    if (isBest) data.best[level] = { moves: moves, time: time };
    data.history.unshift({ level: level, pack: data.settings.pack, moves: moves, time: time, at: Date.now() });
    data.history = data.history.slice(0, HISTORY_MAX);
    saveData();
    updateStats();
    renderScores();
    setHint('All pairs found!');
    var n = stars(level, moves);
    setTimeout(function () {
      els.winStars.textContent = '★'.repeat(n) + '☆'.repeat(3 - n);
      els.winStars.setAttribute('aria-label', n + ' out of 3 stars');
      els.winLine.textContent = LEVELS[level].label + ': ' + moves + ' moves in ' + fmtTime(time) + '.';
      els.winBadge.hidden = !isBest;
      if (typeof els.win.showModal === 'function') { if (!els.win.open) els.win.showModal(); } else els.win.setAttribute('open', '');
      sfx.win();
      burst();
      els.winAgain.focus();
    }, reduceMotion ? 100 : 650);
  }

  function burst() {
    if (reduceMotion) return;
    var colors = ['#ffd25e', '#ff6a3d', '#3ee6e6', '#ff5c8a', '#ffffff'];
    els.confetti.textContent = '';
    for (var i = 0; i < 46; i++) {
      var p = mk('span', 'confetti__bit');
      p.style.setProperty('--x', (randomInt(100)) + '%');
      p.style.setProperty('--dx', (randomInt(160) - 80) + 'px');
      p.style.setProperty('--r', (randomInt(720) - 360) + 'deg');
      p.style.setProperty('--delay', (randomInt(500)) + 'ms');
      p.style.setProperty('--dur', (1800 + randomInt(1400)) + 'ms');
      p.style.background = colors[i % colors.length];
      els.confetti.appendChild(p);
    }
    setTimeout(function () { els.confetti.textContent = ''; }, 3600);
  }

  /* ---------- scores panel ---------- */
  function renderScores() {
    els.bests.textContent = '';
    Object.keys(LEVELS).forEach(function (k) {
      var li = mk('li', 'bests__row');
      li.appendChild(mk('span', 'bests__name', LEVELS[k].label));
      var b = data.best[k];
      li.appendChild(mk('span', 'bests__val', b ? b.moves + ' moves · ' + fmtTime(b.time) : 'not played yet'));
      els.bests.appendChild(li);
    });
    els.history.textContent = '';
    data.history.forEach(function (h) {
      var li = mk('li', 'history__row');
      var d = new Date(h.at);
      li.appendChild(mk('span', 'history__lv', LEVELS[h.level].label));
      li.appendChild(mk('span', 'history__sc', h.moves + ' moves · ' + fmtTime(h.time)));
      li.appendChild(mk('span', 'history__dt', isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })));
      els.history.appendChild(li);
    });
    els.historyEmpty.hidden = data.history.length > 0;
    els.clear.hidden = data.history.length === 0;
  }

  /* ---------- controls ---------- */
  function syncLevelButtons() {
    Array.prototype.forEach.call(els.levels.querySelectorAll('.seg__btn'), function (b) {
      var on = b.dataset.level === data.settings.level;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
  }
  function setLevel(k) {
    if (!LEVELS[k] || k === data.settings.level) return;
    data.settings.level = k; saveData(); syncLevelButtons(); newGame();
  }

  function applyTheme(t) {
    var theme = t || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    var light = theme === 'light';
    els.theme.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    els.themeIcon.setAttribute('d', light
      ? 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 17.7l1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z'
      : 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z');
  }
  function applySound() {
    var on = data.settings.sound;
    els.sound.setAttribute('aria-pressed', on ? 'true' : 'false');
    els.sound.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    els.waves.style.display = on ? '' : 'none';
  }

  function bind() {
    els.board.addEventListener('click', function (e) {
      var b = e.target.closest('.card');
      if (b) flip(Number(b.dataset.i));
    });
    els.board.addEventListener('keydown', function (e) {
      var b = e.target.closest('.card');
      if (!b) return;
      var i = Number(b.dataset.i), cols = LEVELS[game.level].cols, n = game.deck.length, j = -1;
      if (e.key === 'ArrowRight') j = i + 1;
      else if (e.key === 'ArrowLeft') j = i - 1;
      else if (e.key === 'ArrowDown') j = i + cols;
      else if (e.key === 'ArrowUp') j = i - cols;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      if (j >= 0 && j < n) { e.preventDefault(); cardEl(j).focus(); }
    });
    els.restart.addEventListener('click', function () { newGame(); });
    els.levels.addEventListener('click', function (e) {
      var b = e.target.closest('.seg__btn');
      if (b) setLevel(b.dataset.level);
    });
    els.levels.addEventListener('keydown', function (e) {
      var keys = Object.keys(LEVELS), idx = keys.indexOf(data.settings.level), nx = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nx = (idx + 1) % keys.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nx = (idx + keys.length - 1) % keys.length;
      if (nx >= 0) { e.preventDefault(); setLevel(keys[nx]); els.levels.querySelector('[data-level="' + keys[nx] + '"]').focus(); }
    });
    els.pack.addEventListener('change', function () {
      data.settings.pack = els.pack.value; saveData(); newGame();
    });
    els.theme.addEventListener('click', function () {
      data.settings.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(data.settings.theme); saveData();
    });
    els.sound.addEventListener('click', function () {
      data.settings.sound = !data.settings.sound; applySound(); saveData(); sfx.flip();
    });
    els.clear.addEventListener('click', function () { data.history = []; saveData(); renderScores(); });
    els.winAgain.addEventListener('click', function () { els.win.close(); newGame(); });
    els.win.addEventListener('click', function (e) { if (e.target === els.win) els.win.close(); });
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'select' || tag === 'input' || tag === 'textarea') return;
      if (els.win.open) return;
      if (e.key === 'r' || e.key === 'R') { newGame(); }
    });
    document.addEventListener('visibilitychange', function () {
      if (!game || !game.started || game.over) return;
      if (document.hidden && timerId) { game.elapsed = currentElapsed(); stopTimer(); }
      else if (!document.hidden && !timerId) { game.startedAt = Date.now(); timerId = setInterval(tick, 250); }
    });
  }

  /* ---------- start ---------- */
  loadData();
  applyTheme(data.settings.theme);
  applySound();
  Object.keys(PACKS).forEach(function (k) {
    var o = mk('option', '', PACKS[k].label); o.value = k; els.pack.appendChild(o);
  });
  els.pack.value = data.settings.pack;
  syncLevelButtons();
  bind();
  renderScores();
  newGame();
})();
