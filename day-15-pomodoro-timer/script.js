/* Pomodoro Focus Timer (Mini Projects, Day 15). Plain JavaScript, no libraries. */
(function () {
  'use strict';

  var KEY = 'day15-pomodoro';
  var CIRC = 2 * Math.PI * 88;
  var MODES = {
    focus: { label: 'Focus', done: 'Focus session done. Time for a break.' },
    short: { label: 'Short break', done: 'Break is over. Ready to focus?' },
    long: { label: 'Long break', done: 'Long break is over. Fresh start!' }
  };
  var LIMITS = {
    focus: { min: 1, max: 90, step: 5 },
    short: { min: 1, max: 30, step: 1 },
    long: { min: 1, max: 60, step: 5 },
    every: { min: 2, max: 8, step: 1 }
  };

  function $(id) { return document.getElementById(id); }
  var el = {
    time: $('time'), label: $('label'), sub: $('sub'), arc: $('arc'), dial: $('dial'), start: $('start'),
    reset: $('reset'), skip: $('skip'), task: $('task'), cycle: $('cycle'), modes: $('modes'),
    sound: $('sound'), soundWave: $('sound-wave'), theme: $('theme'), themeIcon: $('theme-icon'),
    sessions: $('st-sessions'), minutes: $('st-minutes'), streak: $('st-streak'), week: $('week'),
    clear: $('clear-stats'), settings: $('settings'), auto: $('auto'), toast: $('toast')
  };

  var state = {
    mode: 'focus',
    settings: { focus: 25, short: 5, long: 15, every: 4, auto: false },
    remaining: 25 * 60 * 1000,
    running: false,
    endAt: 0,
    cycle: 0,
    history: {},
    task: '',
    sound: true,
    theme: null
  };
  var tickId = null, toastId = null, audio = null, wake = null;

  /* ---------- helpers ---------- */
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dayKey(new Date()); }
  function modeMs(mode) { return state.settings[mode] * 60 * 1000; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fmt(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }

  /* ---------- storage ---------- */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (d.settings) {
        Object.keys(LIMITS).forEach(function (k) {
          var v = Number(d.settings[k]);
          if (isFinite(v)) state.settings[k] = clamp(Math.round(v), LIMITS[k].min, LIMITS[k].max);
        });
        state.settings.auto = !!d.settings.auto;
      }
      if (d.history && typeof d.history === 'object') {
        Object.keys(d.history).forEach(function (k) {
          var h = d.history[k];
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && h && isFinite(h.s) && isFinite(h.m)) state.history[k] = { s: +h.s, m: +h.m };
        });
      }
      if (MODES[d.mode]) state.mode = d.mode;
      if (isFinite(d.cycle)) state.cycle = clamp(Math.round(d.cycle), 0, state.settings.every);
      if (typeof d.task === 'string') state.task = d.task.slice(0, 60);
      if (d.sound === false) state.sound = false;
      if (d.theme === 'light' || d.theme === 'dark') state.theme = d.theme;
      state.remaining = modeMs(state.mode);
      if (isFinite(d.remaining) && d.remaining > 0 && d.remaining <= modeMs(state.mode)) state.remaining = d.remaining;
      if (d.running && isFinite(d.endAt)) {
        state.running = true;
        state.endAt = d.endAt;
      }
    } catch (e) { /* storage blocked or broken: start fresh */ }
    if (!state.theme) state.theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        settings: state.settings, history: state.history, mode: state.mode, cycle: state.cycle,
        task: state.task, sound: state.sound, theme: state.theme,
        remaining: state.remaining, running: state.running, endAt: state.endAt
      }));
    } catch (e) { /* ignore */ }
  }

  /* ---------- sound and notices ---------- */
  function ensureAudio() {
    if (!audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { try { audio = new AC(); } catch (e) { audio = null; } }
    }
    if (audio && audio.state === 'suspended') audio.resume();
  }
  function chime() {
    if (!state.sound || !audio) return;
    var notes = [660, 880, 1320];
    notes.forEach(function (f, i) {
      var t = audio.currentTime + i * 0.2;
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + 0.5);
    });
  }
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    el.toast.classList.remove('show');
    void el.toast.offsetWidth;
    el.toast.classList.add('show');
    clearTimeout(toastId);
    toastId = setTimeout(function () { el.toast.hidden = true; }, 3600);
  }
  function holdScreen(on) {
    try {
      if (on && navigator.wakeLock && !wake) {
        navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }, function () {});
      } else if (!on && wake) { wake.release(); wake = null; }
    } catch (e) { /* not supported */ }
  }

  /* ---------- stats ---------- */
  function addSession(minutes) {
    var k = today();
    var h = state.history[k] || (state.history[k] = { s: 0, m: 0 });
    h.s += 1; h.m += minutes;
    var keys = Object.keys(state.history).sort();
    while (keys.length > 60) delete state.history[keys.shift()];
  }
  function streakDays() {
    var d = new Date(), n = 0;
    if (!(state.history[dayKey(d)] && state.history[dayKey(d)].s > 0)) d.setDate(d.getDate() - 1);
    while (state.history[dayKey(d)] && state.history[dayKey(d)].s > 0) { n += 1; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderStats() {
    var t = state.history[today()] || { s: 0, m: 0 };
    el.sessions.textContent = t.s;
    el.minutes.textContent = Math.round(t.m);
    el.streak.textContent = streakDays();
    var days = [], max = 1, i, d, k, h;
    for (i = 6; i >= 0; i--) {
      d = new Date(); d.setDate(d.getDate() - i);
      k = dayKey(d); h = state.history[k] ? state.history[k].m : 0;
      days.push({ label: 'SMTWTFS'.charAt(d.getDay()), m: h, now: i === 0 });
      if (h > max) max = h;
    }
    el.week.innerHTML = '';
    days.forEach(function (x) {
      var col = document.createElement('div'); col.className = 'week__col' + (x.now ? ' is-today' : '');
      var bar = document.createElement('span'); bar.className = 'week__bar';
      bar.style.setProperty('--h', x.m > 0 ? Math.max(8, Math.round(x.m / max * 100)) : 0);
      bar.title = Math.round(x.m) + ' min';
      var lab = document.createElement('span'); lab.className = 'week__lab'; lab.textContent = x.label;
      var val = document.createElement('span'); val.className = 'week__val'; val.textContent = x.m > 0 ? Math.round(x.m) : '';
      col.appendChild(val); col.appendChild(bar); col.appendChild(lab);
      el.week.appendChild(col);
    });
    el.week.setAttribute('aria-label', 'Focus minutes in the last seven days: ' + days.map(function (x) { return Math.round(x.m); }).join(', '));
  }

  /* ---------- rendering ---------- */
  function renderCycle() {
    el.cycle.innerHTML = '';
    for (var i = 0; i < state.settings.every; i++) {
      var dot = document.createElement('span');
      dot.className = 'dot' + (i < state.cycle ? ' is-done' : '') + (state.mode === 'focus' && i === state.cycle ? ' is-now' : '');
      el.cycle.appendChild(dot);
    }
    el.cycle.setAttribute('aria-label', state.cycle + ' of ' + state.settings.every + ' focus sessions done in this cycle');
  }
  function renderSettings() {
    ['focus', 'short', 'long', 'every'].forEach(function (k) {
      el.settings.querySelector('[data-key="' + k + '"] output').textContent = state.settings[k];
    });
    el.auto.checked = state.settings.auto;
  }
  function renderTime() {
    var total = modeMs(state.mode);
    var left = state.running ? state.endAt - Date.now() : state.remaining;
    left = clamp(left, 0, total);
    el.time.textContent = fmt(left);
    el.arc.style.strokeDashoffset = String(CIRC * (1 - left / total));
    document.title = state.running ? fmt(left) + ' · ' + MODES[state.mode].label : 'Pomodoro Focus Timer';
  }
  function renderMode() {
    document.body.setAttribute('data-mode', state.mode);
    el.label.textContent = MODES[state.mode].label;
    Array.prototype.forEach.call(el.modes.querySelectorAll('.mode'), function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-mode') === state.mode ? 'true' : 'false');
    });
    renderCycle();
  }
  function renderRun() {
    el.start.textContent = state.running ? 'Pause' : (state.remaining < modeMs(state.mode) ? 'Resume' : 'Start');
    el.start.classList.toggle('is-running', state.running);
    el.dial.classList.toggle('is-running', state.running);
    el.sub.textContent = state.running
      ? (state.task && state.mode === 'focus' ? state.task : (state.mode === 'focus' ? 'Stay with it' : 'Rest your eyes'))
      : (state.remaining < modeMs(state.mode) ? 'Paused' : 'Ready when you are');
  }
  function renderSound() {
    el.sound.setAttribute('aria-pressed', String(state.sound));
    el.sound.setAttribute('aria-label', state.sound ? 'Sound is on' : 'Sound is off');
    el.soundWave.style.display = state.sound ? '' : 'none';
  }
  function renderTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    var light = state.theme === 'light';
    el.theme.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    el.themeIcon.setAttribute('d', light
      ? 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'
      : 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z');
    el.themeIcon.setAttribute('fill', light ? 'none' : 'currentColor');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#fff1e6' : '#1c0a0e');
  }
  function renderAll() {
    renderMode(); renderTime(); renderRun(); renderSettings(); renderSound(); renderTheme(); renderStats();
    el.task.value = state.task;
  }

  /* ---------- timer ---------- */
  function startTicking() {
    clearInterval(tickId);
    tickId = setInterval(tick, 200);
  }
  function tick() {
    if (!state.running) return;
    if (state.endAt - Date.now() <= 0) { complete(true); return; }
    renderTime();
  }
  function start() {
    if (state.running) return;
    ensureAudio();
    state.running = true;
    state.endAt = Date.now() + state.remaining;
    holdScreen(true);
    startTicking();
    save(); renderTime(); renderRun();
  }
  function pause() {
    if (!state.running) return;
    state.remaining = clamp(state.endAt - Date.now(), 0, modeMs(state.mode));
    state.running = false;
    clearInterval(tickId);
    holdScreen(false);
    save(); renderTime(); renderRun();
  }
  function setMode(mode, keepRunning) {
    state.mode = mode;
    state.remaining = modeMs(mode);
    if (!keepRunning) { state.running = false; clearInterval(tickId); holdScreen(false); }
    save(); renderMode(); renderTime(); renderRun();
  }
  function nextMode() {
    if (state.mode === 'focus') return state.cycle >= state.settings.every ? 'long' : 'short';
    if (state.mode === 'long') state.cycle = 0;
    return 'focus';
  }
  function complete(loud) {
    var finished = state.mode;
    if (finished === 'focus') {
      addSession(state.settings.focus);
      state.cycle = Math.min(state.cycle + 1, state.settings.every);
    }
    var next = nextMode();
    var wasRunning = state.running;
    state.running = false; clearInterval(tickId);
    el.dial.classList.add('pulse');
    setTimeout(function () { el.dial.classList.remove('pulse'); }, 1400);
    if (loud) { chime(); toast(MODES[finished].done); }
    setMode(next, false);
    renderStats();
    if (state.settings.auto && wasRunning) start();
  }
  function skip() {
    var wasRunning = state.running;
    var next = nextMode();
    state.running = false; clearInterval(tickId);
    setMode(next, false);
    if (wasRunning && state.settings.auto) start();
  }
  function reset() {
    state.running = false; clearInterval(tickId); holdScreen(false);
    state.remaining = modeMs(state.mode);
    save(); renderTime(); renderRun();
  }

  /* ---------- events ---------- */
  el.start.addEventListener('click', function () { state.running ? pause() : start(); });
  el.reset.addEventListener('click', reset);
  el.skip.addEventListener('click', skip);
  el.modes.addEventListener('click', function (e) {
    var b = e.target.closest('.mode');
    if (b) setMode(b.getAttribute('data-mode'), false);
  });
  el.task.addEventListener('input', function () { state.task = el.task.value.slice(0, 60); save(); renderRun(); });
  el.task.addEventListener('keydown', function (e) { if (e.key === 'Enter') el.task.blur(); });
  el.sound.addEventListener('click', function () { state.sound = !state.sound; if (state.sound) { ensureAudio(); chime(); } save(); renderSound(); });
  el.theme.addEventListener('click', function () { state.theme = state.theme === 'light' ? 'dark' : 'light'; save(); renderTheme(); });
  el.auto.addEventListener('change', function () { state.settings.auto = el.auto.checked; save(); });
  el.clear.addEventListener('click', function () {
    if (!Object.keys(state.history).length) { toast('Nothing to clear yet.'); return; }
    if (window.confirm('Clear your focus history on this device?')) { state.history = {}; save(); renderStats(); toast('History cleared.'); }
  });
  el.settings.addEventListener('click', function (e) {
    var b = e.target.closest('.btn--step');
    if (!b) return;
    var key = b.closest('.set__row').getAttribute('data-key');
    var lim = LIMITS[key];
    var cur = state.settings[key];
    var step = Number(b.getAttribute('data-d')) * lim.step;
    var v = clamp(cur + step, lim.min, lim.max);
    if (lim.step > 1 && Number(b.getAttribute('data-d')) > 0 && cur < lim.step) v = clamp(lim.step, lim.min, lim.max);
    state.settings[key] = v;
    if (key === 'every') state.cycle = Math.min(state.cycle, v);
    if (key === state.mode && !state.running) state.remaining = modeMs(state.mode);
    save(); renderSettings(); renderCycle(); renderTime(); renderRun();
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'BUTTON' || t.tagName === 'TEXTAREA')) return;
    if (e.key === ' ') { e.preventDefault(); state.running ? pause() : start(); }
    else if (e.key === 'r' || e.key === 'R') reset();
    else if (e.key === 's' || e.key === 'S') skip();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      if (state.running) { tick(); if (state.running && !wake) holdScreen(true); }
      renderStats();
    }
  });

  /* ---------- start up ---------- */
  load();
  renderAll();
  if (state.running) {
    if (state.endAt - Date.now() <= 0) complete(false);
    else startTicking();
  }

  /* small hook for automated checks */
  window.__pomo = {
    state: state,
    start: start, pause: pause, reset: reset, skip: skip,
    setMode: function (m) { setMode(m, false); },
    left: function () { return state.running ? state.endAt - Date.now() : state.remaining; },
    rewind: function (ms) { if (state.running) { state.endAt -= ms; } else { state.remaining = Math.max(0, state.remaining - ms); } renderTime(); },
    seed: function (h) { state.history = h; save(); renderStats(); },
    theme: function (t) { state.theme = t; save(); renderTheme(); }
  };
})();
