(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const card = $('timer-card');
  const tabEl = { sw: $('tab-sw'), cd: $('tab-cd') };
  const panelEl = { sw: $('panel-sw'), cd: $('panel-cd') };
  const el = {
    swTime: $('sw-time'), swState: $('sw-state'), swArc: $('sw-arc'),
    swToggle: $('sw-toggle'), swLap: $('sw-lap'), swReset: $('sw-reset'),
    laps: $('laps'), lapsEmpty: $('laps-empty'), lapCount: $('lap-count'), clearLaps: $('clear-laps'),
    cdTime: $('cd-time'), cdState: $('cd-state'), cdArc: $('cd-arc'),
    cdToggle: $('cd-toggle'), cdReset: $('cd-reset'), cdAlert: $('cd-alert'),
    inputs: $('timer-inputs'), inH: $('in-h'), inM: $('in-m'), inS: $('in-s'),
    presets: document.querySelectorAll('[data-preset]'),
    sound: $('sound'),
  };

  const CIRC = 2 * Math.PI * 46;
  const MAX_LAPS = 50;
  const DEFAULT_CD_MS = 5 * 60 * 1000;
  const pad = (n) => String(n).padStart(2, '0');

  /* Safe localStorage access */
  const store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (_) {
        /* storage full or blocked: the app still works */
      }
    },
  };

  /* Formatting */
  function fmtStopwatch(ms) {
    const cs = Math.floor(ms / 10);
    const c = cs % 100;
    const s = Math.floor(cs / 100) % 60;
    const m = Math.floor(cs / 6000) % 60;
    const h = Math.floor(cs / 360000);
    return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s) + '.' + pad(c);
  }

  function fmtCountdown(ms) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  }

  function setArc(arcEl, fraction) {
    const f = Math.min(1, Math.max(0, fraction));
    arcEl.style.strokeDasharray = CIRC.toFixed(2);
    arcEl.style.strokeDashoffset = (CIRC * (1 - f)).toFixed(2);
  }

  /* Stopwatch state. Time comes from performance.now(), so the value never drifts. */
  const sw = { running: false, base: 0, startedAt: 0, laps: [], lastLapTotal: 0 };

  function swElapsed(now) {
    const t = now === undefined ? performance.now() : now;
    return sw.base + (sw.running ? t - sw.startedAt : 0);
  }

  function swStart() {
    if (sw.running) return;
    sw.running = true;
    sw.startedAt = performance.now();
    kick();
  }

  function swPause() {
    if (!sw.running) return;
    sw.base = swElapsed();
    sw.running = false;
    renderStopwatch(true);
  }

  function swToggle() {
    if (sw.running) swPause();
    else swStart();
  }

  function swLapPress() {
    if (!sw.running) return;
    const total = swElapsed();
    const split = total - sw.lastLapTotal;
    sw.laps.push({ split: Math.round(split), total: Math.round(total) });
    if (sw.laps.length > MAX_LAPS) sw.laps.shift();
    sw.lastLapTotal = total;
    store.set('stopwatch.laps', sw.laps);
    renderLaps();
  }

  function swReset() {
    sw.running = false;
    sw.base = 0;
    sw.startedAt = 0;
    sw.laps = [];
    sw.lastLapTotal = 0;
    store.set('stopwatch.laps', sw.laps);
    renderLaps();
    renderStopwatch(true);
  }

  function clearLaps() {
    sw.laps = [];
    sw.lastLapTotal = swElapsed();
    store.set('stopwatch.laps', sw.laps);
    renderLaps();
  }

  let lastSwText = '';
  function renderStopwatch(force) {
    const ms = swElapsed();
    const text = fmtStopwatch(ms);
    if (force || text !== lastSwText) {
      el.swTime.textContent = text;
      lastSwText = text;
    }
    setArc(el.swArc, (ms % 60000) / 60000);

    let state = 'Ready';
    if (sw.running) state = 'Running';
    else if (ms > 0) state = 'Paused';
    el.swState.textContent = state;
    el.swToggle.textContent = sw.running ? 'Pause' : (ms > 0 ? 'Resume' : 'Start');
    el.swToggle.classList.toggle('btn--primary', !sw.running);
    el.swLap.disabled = !sw.running;
  }

  function renderLaps() {
    el.laps.textContent = '';
    const splits = sw.laps.map((l) => l.split);
    const fast = splits.length > 1 ? Math.min(...splits) : null;
    const slow = splits.length > 1 ? Math.max(...splits) : null;

    for (let i = sw.laps.length - 1; i >= 0; i--) {
      const lap = sw.laps[i];
      const li = document.createElement('li');
      li.className = 'lap';
      if (fast !== null && lap.split === fast) li.classList.add('lap--fast');
      if (slow !== null && lap.split === slow && slow !== fast) li.classList.add('lap--slow');

      const n = document.createElement('span');
      n.className = 'lap__n';
      n.textContent = 'Lap ' + (i + 1);

      const split = document.createElement('span');
      split.className = 'lap__split';
      split.textContent = fmtStopwatch(lap.split);

      const total = document.createElement('span');
      total.className = 'lap__total';
      total.textContent = fmtStopwatch(lap.total);

      li.append(n, split, total);
      el.laps.appendChild(li);
    }

    const count = sw.laps.length;
    el.lapCount.textContent = count + (count === 1 ? ' lap' : ' laps');
    el.lapsEmpty.hidden = count > 0;
    el.clearLaps.disabled = count === 0;
  }

  /* Countdown state */
  const cd = {
    total: DEFAULT_CD_MS,
    remaining: DEFAULT_CD_MS,
    running: false,
    endAt: 0,
    finishTimer: null,
    alarmTimer: null,
    alarmBeeps: 0,
    alarmOn: false,
  };

  function cdNow() {
    return cd.running ? Math.max(0, cd.endAt - performance.now()) : cd.remaining;
  }

  function cdStart() {
    if (cd.running) return;
    if (cd.remaining <= 0) {
      el.cdAlert.textContent = 'Set a time above zero first.';
      return;
    }
    stopAlarm(false);
    el.cdAlert.textContent = '';
    cd.running = true;
    cd.endAt = performance.now() + cd.remaining;
    clearTimeout(cd.finishTimer);
    cd.finishTimer = setTimeout(cdFinish, cd.remaining);
    setInputsLocked(true);
    kick();
  }

  function cdPause() {
    if (!cd.running) return;
    cd.remaining = cdNow();
    cd.running = false;
    clearTimeout(cd.finishTimer);
    setInputsLocked(false);
    renderCountdown(true);
  }

  function cdToggle() {
    if (cd.running) cdPause();
    else cdStart();
  }

  function cdFinish() {
    clearTimeout(cd.finishTimer);
    cd.running = false;
    cd.remaining = 0;
    setInputsLocked(false);
    startAlarm();
    renderCountdown(true);
  }

  function cdReset() {
    stopAlarm(false);
    cd.running = false;
    clearTimeout(cd.finishTimer);
    cd.remaining = cd.total;
    el.cdAlert.textContent = '';
    setInputsLocked(false);
    renderCountdown(true);
  }

  function setDuration(ms) {
    stopAlarm(false);
    cd.running = false;
    clearTimeout(cd.finishTimer);
    cd.total = ms;
    cd.remaining = ms;
    store.set('countdown.last', ms);
    fillInputs(ms);
    el.cdAlert.textContent = ms > 0 ? '' : 'Set a time above zero first.';
    renderCountdown(true);
  }

  function setInputsLocked(locked) {
    el.inputs.disabled = locked;
    el.presets.forEach((b) => { b.disabled = locked; });
  }

  function readInputs() {
    const clampField = (field, max) => {
      let v = parseInt(field.value, 10);
      if (!Number.isFinite(v) || v < 0) v = 0;
      if (v > max) v = max;
      field.value = String(v);
      return v;
    };
    const h = clampField(el.inH, 99);
    const m = clampField(el.inM, 59);
    const s = clampField(el.inS, 59);
    return (h * 3600 + m * 60 + s) * 1000;
  }

  function fillInputs(ms) {
    const sec = Math.round(ms / 1000);
    el.inH.value = String(Math.floor(sec / 3600));
    el.inM.value = String(Math.floor((sec % 3600) / 60));
    el.inS.value = String(sec % 60);
  }

  function markPreset(ms) {
    el.presets.forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.preset) * 1000 === ms));
    });
  }

  let lastCdText = '';
  function renderCountdown(force) {
    const ms = cdNow();
    const text = fmtCountdown(ms);
    if (force || text !== lastCdText) {
      el.cdTime.textContent = text;
      lastCdText = text;
    }
    setArc(el.cdArc, cd.total > 0 ? ms / cd.total : 0);

    let state = 'Set a time';
    if (cd.alarmOn) state = 'Time is up';
    else if (cd.running) state = 'Running';
    else if (cd.remaining < cd.total) state = 'Paused';
    else if (cd.total > 0) state = 'Ready';
    el.cdState.textContent = state;
    el.cdToggle.textContent = cd.running ? 'Pause' : (cd.remaining < cd.total && cd.remaining > 0 ? 'Resume' : 'Start');
    el.cdToggle.classList.toggle('btn--primary', !cd.running);
    markPreset(cd.total);
  }

  /* Alarm: three tones, repeated until Esc or Reset */
  let audioCtx = null;
  let soundOn = store.get('sound.on', true) !== false;

  function beep() {
    if (!soundOn) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime + 0.02;
      [0, 0.42, 0.84].forEach((dt, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i === 2 ? 1046 : 880;
        gain.gain.setValueAtTime(0.0001, t0 + dt);
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + dt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.3);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t0 + dt);
        osc.stop(t0 + dt + 0.32);
      });
    } catch (_) {
      /* no audio available: the visual alert still runs */
    }
  }

  function startAlarm() {
    cd.alarmOn = true;
    cd.alarmBeeps = 0;
    card.classList.add('is-alarm');
    el.cdAlert.textContent = 'Time is up. Press Esc or Reset to stop.';
    beep();
    clearInterval(cd.alarmTimer);
    cd.alarmTimer = setInterval(() => {
      cd.alarmBeeps += 1;
      if (cd.alarmBeeps >= 10) {
        stopAlarm(true);
        return;
      }
      beep();
    }, 1600);
  }

  function stopAlarm(resetAfter) {
    const was = cd.alarmOn;
    cd.alarmOn = false;
    clearInterval(cd.alarmTimer);
    card.classList.remove('is-alarm');
    if (!was) return;
    if (resetAfter) {
      cd.remaining = cd.total;
      el.cdAlert.textContent = 'Alarm stopped. Press Start to run it again.';
      renderCountdown(true);
    } else {
      el.cdAlert.textContent = '';
    }
  }

  /* Animation loop: only runs while a timer is moving */
  let raf = 0;
  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function loop() {
    raf = 0;
    renderStopwatch(false);
    renderCountdown(false);
    if (sw.running || cd.running) kick();
  }

  /* Tabs */
  function setMode(mode, moveFocus) {
    ['sw', 'cd'].forEach((m) => {
      const on = m === mode;
      tabEl[m].setAttribute('aria-selected', String(on));
      tabEl[m].tabIndex = on ? 0 : -1;
      panelEl[m].hidden = !on;
    });
    card.dataset.mode = mode;
    if (moveFocus) tabEl[mode].focus();
  }

  function currentMode() {
    return card.dataset.mode === 'cd' ? 'cd' : 'sw';
  }

  function toggleCurrent() {
    if (currentMode() === 'sw') swToggle();
    else cdToggle();
  }

  function resetCurrent() {
    if (currentMode() === 'sw') swReset();
    else cdReset();
  }

  /* Events */
  tabEl.sw.addEventListener('click', () => setMode('sw', false));
  tabEl.cd.addEventListener('click', () => setMode('cd', false));

  [tabEl.sw, tabEl.cd].forEach((tab) => {
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const next = tab.dataset.mode === 'sw' ? 'cd' : 'sw';
      setMode(next, true);
    });
  });

  el.swToggle.addEventListener('click', swToggle);
  el.swLap.addEventListener('click', swLapPress);
  el.swReset.addEventListener('click', swReset);
  el.clearLaps.addEventListener('click', clearLaps);

  el.cdToggle.addEventListener('click', () => {
    if (!cd.running && cd.remaining === cd.total && !cd.alarmOn) {
      // Start from the typed values if they changed
      const ms = readInputs();
      if (ms !== cd.total) setDuration(ms);
      if (ms <= 0) {
        el.cdAlert.textContent = 'Set a time above zero first.';
        return;
      }
    }
    cdToggle();
  });
  el.cdReset.addEventListener('click', cdReset);

  [el.inH, el.inM, el.inS].forEach((field) => {
    field.addEventListener('change', () => setDuration(readInputs()));
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setDuration(readInputs());
      }
    });
  });

  el.presets.forEach((btn) => {
    btn.addEventListener('click', () => {
      setDuration(Number(btn.dataset.preset) * 1000);
    });
  });

  el.sound.addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('sound.on', soundOn);
    el.sound.textContent = soundOn ? 'Sound on' : 'Sound off';
    el.sound.setAttribute('aria-pressed', String(soundOn));
    if (soundOn && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  });

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

    if (e.key === 'Escape') {
      if (cd.alarmOn) {
        stopAlarm(true);
        e.preventDefault();
      }
      return;
    }
    if (typing) return;

    if (e.key === ' ' || e.code === 'Space') {
      // Buttons already handle Space and Enter with a click
      if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return;
      e.preventDefault();
      toggleCurrent();
      return;
    }

    const key = e.key.toLowerCase();
    if (key === 'l') {
      if (currentMode() === 'sw') {
        e.preventDefault();
        swLapPress();
      }
    } else if (key === 'r') {
      e.preventDefault();
      resetCurrent();
    } else if (key === '1') {
      setMode('sw', false);
    } else if (key === '2') {
      setMode('cd', false);
    }
  });

  /* Restore saved state */
  function restore() {
    const savedLaps = store.get('stopwatch.laps', []);
    if (Array.isArray(savedLaps)) {
      sw.laps = savedLaps
        .filter((l) => l && Number.isFinite(l.split) && Number.isFinite(l.total))
        .slice(-MAX_LAPS);
    }
    const last = store.get('countdown.last', DEFAULT_CD_MS);
    const ms = Number.isFinite(last) && last >= 1000 && last <= 359999000 ? last : DEFAULT_CD_MS;
    cd.total = ms;
    cd.remaining = ms;
    fillInputs(ms);
    el.sound.textContent = soundOn ? 'Sound on' : 'Sound off';
    el.sound.setAttribute('aria-pressed', String(soundOn));
  }

  restore();
  renderLaps();
  renderStopwatch(true);
  renderCountdown(true);
  setMode('sw', false);
})();
