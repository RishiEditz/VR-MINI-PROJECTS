/*
 * Typing Speed Test
 * - WPM: correct characters / 5 (one word), divided by the minutes that have passed.
 * - Accuracy: keys that matched the passage / every key pressed. Deleting does not count as a key press.
 * - The timer starts on the first key. A full-text test stops when the text is finished;
 *   a 30 or 60 second test stops when the time runs out.
 * - Runs and your personal best are saved in this browser only (localStorage, last 20 runs).
 *   If storage is blocked, the page still works and keeps the runs until you reload.
 */
(() => {
  'use strict';

  const PASSAGES = [
    'Small steps every day can build something big over time. A good habit keeps working quietly for you, even on the days you rest.',
    'Clear code reads like a short story with no surprises in it. Name things well, keep each function small, and the next reader will thank you.',
    'Progress comes from practice, and each round makes the next one easier. Do not worry about speed at first, just aim for clean, steady keys.',
    'The best projects start small, then grow one feature at a time. Finish the simple version first, then add the extras you really want.',
    'Keep your eyes on the screen and let your fingers find the keys. Sit up straight, relax your wrists, and type at a pace you can keep for minutes.',
    'A short quiet break can change the mood of a whole afternoon. Pick one thing you care about and give it ten focused minutes today.'
  ];

  const TICK_MS = 100;
  const CHARS_PER_WORD = 5;
  const AHEAD_CHARS = 300;   // timed tests keep this much text ahead of the typist
  const MIN_WORDS = 10;
  const MAX_WORDS = 300;
  const MAX_RUNS = 20;
  const KEY_HISTORY = 'typing-speed-test.history';
  const KEY_BEST = 'typing-speed-test.best';
  const KEY_OWN = 'typing-speed-test.own-text';

  const $ = (id) => document.getElementById(id);
  const els = {
    box: $('passage-box'),
    passage: $('passage'),
    input: $('typing-input'),
    wpm: $('wpm'),
    accuracy: $('accuracy'),
    timeLabel: $('time-label'),
    time: $('time'),
    progress: $('progress-bar'),
    start: $('start-btn'),
    restart: $('restart-btn'),
    again: $('again-btn'),
    ownBox: $('own-box'),
    ownText: $('own-text'),
    ownCount: $('own-count'),
    ownMsg: $('own-msg'),
    result: $('result'),
    resultTitle: $('result-title'),
    verdict: $('verdict'),
    finalWpm: $('final-wpm'),
    finalAcc: $('final-acc'),
    finalTime: $('final-time'),
    bestMsg: $('best-msg'),
    best: $('best'),
    note: $('history-note'),
    chart: $('chart'),
    empty: $('empty'),
    runs: $('runs'),
    clear: $('clear-btn'),
    sources: document.querySelectorAll('[data-source]'),
    lengths: document.querySelectorAll('[data-length]')
  };

  const state = {
    mode: 'random',      // 'random' or 'own'
    length: 'passage',   // 'passage' (full text), '30' or '60' seconds
    baseTarget: '',      // the text chosen for this round; restart reuses it
    target: '',          // the text being typed (timed tests grow it)
    ownText: '',         // last valid paragraph from the box
    limitMs: 0,          // 0 for full text, otherwise the time limit
    lastPick: -1,
    startTime: 0,        // performance.now() of the first key, 0 means not started
    timerId: null,
    finished: false,
    previousLength: 0,   // length of the box after the last input event
    keysPressed: 0,      // every character added to the box
    keysCorrect: 0       // added characters that matched the text
  };

  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Storage (never throws, never blocks the page) ----------
  let storageOk = true;

  function readStored(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      storageOk = false;
      return fallback;
    }
  }

  function writeStored(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      storageOk = false;
    }
  }

  function isRun(item) {
    return Boolean(item) && typeof item.wpm === 'number' && typeof item.at === 'number';
  }

  let runs = [];
  let best = null;

  function loadHistory() {
    const list = readStored(KEY_HISTORY, []);
    runs = Array.isArray(list) ? list.filter(isRun).slice(0, MAX_RUNS) : [];
    const stored = readStored(KEY_BEST, null);
    best = isRun(stored) ? stored : null;
  }

  /** Adds a finished run. Returns what happened to the personal best. */
  function saveRun(run) {
    const previousBest = best;
    runs.unshift(run);
    runs = runs.slice(0, MAX_RUNS);
    writeStored(KEY_HISTORY, runs);
    const beat = !previousBest || run.wpm > previousBest.wpm;
    if (beat) {
      best = run;
      writeStored(KEY_BEST, best);
    }
    return { beat, hadBest: Boolean(previousBest), previousBest };
  }

  function clearHistory() {
    const ok = window.confirm('Clear all saved runs and your personal best in this browser? This cannot be undone.');
    if (!ok) return;
    runs = [];
    best = null;
    writeStored(KEY_HISTORY, runs);
    writeStored(KEY_BEST, null);
    renderHistory();
  }

  // ---------- Text helpers ----------

  /** Tidy pasted text: straight quotes, plain dashes, one space between words, no emoji. */
  function normalizeText(raw) {
    return String(raw)
      .replace(/[‘’‚′]/g, "'")
      .replace(/[“”„″]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/…/g, '...')
      .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function countWords(text) {
    const t = String(text).trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  /** Checks the own paragraph box. Returns the cleaned text and a message. */
  function ownCheck(raw) {
    const text = normalizeText(raw);
    const words = countWords(text);
    if (words === 0) {
      return { ok: false, text, words, msg: 'Paste or type at least ' + MIN_WORDS + ' words.' };
    }
    if (words < MIN_WORDS) {
      const more = MIN_WORDS - words;
      return { ok: false, text, words, msg: 'Add ' + plural(more, 'more word') + ' (' + MIN_WORDS + ' minimum).' };
    }
    if (words > MAX_WORDS) {
      return { ok: false, text, words, msg: 'Too long: keep it to ' + MAX_WORDS + ' words or fewer.' };
    }
    return { ok: true, text, words, msg: 'Ready. Press start to type it.' };
  }

  /** Words per minute from correct characters and elapsed milliseconds. */
  function calcWpm(correctChars, elapsedMs) {
    const minutes = elapsedMs / 60000;
    if (minutes <= 0) return 0;
    return Math.round((correctChars / CHARS_PER_WORD) / minutes);
  }

  /** Accuracy in whole percent. */
  function calcAccuracy(correctKeys, totalKeys) {
    if (totalKeys === 0) return 100;
    return Math.round((correctKeys / totalKeys) * 100);
  }

  /** How many positions of the typed text match the text. */
  function countCorrect(typed, text) {
    let count = 0;
    const limit = Math.min(typed.length, text.length);
    for (let i = 0; i < limit; i++) {
      if (typed[i] === text[i]) count++;
    }
    return count;
  }

  function formatSeconds(ms) {
    return (ms / 1000).toFixed(1) + 's';
  }

  function verdictFor(wpm) {
    if (wpm < 30) return 'Keep practicing. Every round gets easier.';
    if (wpm < 50) return 'Getting there. Your fingers are warming up.';
    if (wpm < 70) return 'Solid speed. You are typing like a pro.';
    return 'Fast fingers! Try a new text and beat this one.';
  }

  function pickPassage() {
    const n = PASSAGES.length;
    // Always a different passage from the last one, and no endless loop.
    let index = Math.floor(Math.random() * (n - 1));
    if (state.lastPick >= 0 && index >= state.lastPick) index++;
    if (n === 1) index = 0;
    state.lastPick = index;
    return PASSAGES[index];
  }

  /** The next piece of text for a timed test: a new random passage, or the own paragraph again. */
  function nextChunk() {
    return state.mode === 'own' ? state.ownText : pickPassage();
  }

  /** Keeps a timed test supplied with text. Returns the old length if text was added, else -1. */
  function growTarget(typedLength) {
    if (!state.limitMs) return -1;
    const before = state.target.length;
    while (state.target.length - typedLength < AHEAD_CHARS) {
      state.target += (state.target ? ' ' : '') + nextChunk();
    }
    return state.target.length === before ? -1 : before;
  }

  // ---------- Rendering the text ----------

  function appendChars(from) {
    const frag = document.createDocumentFragment();
    for (let i = from; i < state.target.length; i++) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = state.target[i];
      frag.appendChild(span);
    }
    els.passage.appendChild(frag);
  }

  function paintPassage() {
    const typed = els.input.value;
    const chars = els.passage.children;
    let next = null;
    for (let i = 0; i < chars.length; i++) {
      let cls = 'char';
      if (i < typed.length) {
        cls += typed[i] === state.target[i] ? ' char--ok' : ' char--bad';
      } else if (i === typed.length) {
        cls += ' char--next';
        next = chars[i];
      }
      if (chars[i].className !== cls) chars[i].className = cls;
    }
    keepVisible(next);
  }

  /** Scrolls only the text box, so the page itself does not jump on a phone. */
  function keepVisible(node) {
    if (!node) return;
    const box = els.box;
    const top = node.offsetTop;
    const bottom = top + node.offsetHeight;
    if (top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) {
      box.scrollTop = Math.max(0, top - box.clientHeight / 3);
    }
  }

  function showPlaceholder(text) {
    els.passage.className = 'passage passage--hint';
    els.passage.textContent = text;
  }

  // ---------- Live stats ----------

  function elapsedMs() {
    if (!state.startTime) return 0;
    const ms = performance.now() - state.startTime;
    return state.limitMs ? Math.min(ms, state.limitMs) : ms;
  }

  function updateStats() {
    const typed = els.input.value;
    const ms = elapsedMs();
    els.wpm.textContent = calcWpm(countCorrect(typed, state.target), ms);
    els.accuracy.textContent = calcAccuracy(state.keysCorrect, state.keysPressed) + '%';
    if (state.limitMs) {
      els.timeLabel.textContent = 'Time left';
      els.time.textContent = formatSeconds(Math.max(0, state.limitMs - ms));
      els.progress.style.width = Math.min(100, (ms / state.limitMs) * 100) + '%';
    } else {
      els.timeLabel.textContent = 'Time';
      els.time.textContent = formatSeconds(ms);
      const share = state.target.length ? typed.length / state.target.length : 0;
      els.progress.style.width = Math.min(100, share * 100) + '%';
    }
  }

  function stopTimer() {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  function tick() {
    if (state.limitMs && elapsedMs() >= state.limitMs) {
      finishTest();
      return;
    }
    updateStats();
  }

  // ---------- Finishing and results ----------

  function bestMessage(outcome, wpm) {
    if (!outcome.hadBest) return 'First saved run. Your personal best is ' + wpm + ' WPM for now.';
    if (outcome.beat) return 'New personal best! ' + wpm + ' WPM beats ' + outcome.previousBest.wpm + ' WPM.';
    return 'Personal best: ' + best.wpm + ' WPM.';
  }

  function finishTest() {
    if (state.finished) return;
    state.finished = true;
    stopTimer();
    els.input.disabled = true;

    const typed = els.input.value;
    const ms = elapsedMs();
    const wpm = calcWpm(countCorrect(typed, state.target), ms);
    const acc = calcAccuracy(state.keysCorrect, state.keysPressed);
    updateStats();

    const outcome = saveRun({
      at: Date.now(),
      wpm,
      acc,
      mode: state.mode,
      length: state.length,
      secs: Math.round(ms / 100) / 10,
      words: countWords(typed)
    });

    els.resultTitle.textContent = state.limitMs ? "Time's up!" : 'Finished!';
    els.finalWpm.textContent = wpm;
    els.finalAcc.textContent = acc + '%';
    els.finalTime.textContent = formatSeconds(ms);
    els.verdict.textContent = verdictFor(wpm);
    els.bestMsg.textContent = bestMessage(outcome, wpm);
    els.result.hidden = false;
    renderHistory();
    els.result.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  }

  // ---------- Input ----------

  function onInput(event) {
    if (state.finished) return;
    const typed = els.input.value;

    // Count the characters this event added. Deleting adds nothing.
    const isDelete = (event.inputType || '').startsWith('delete');
    if (!isDelete) {
      for (let i = state.previousLength; i < typed.length; i++) {
        state.keysPressed++;
        if (typed[i] === state.target[i]) state.keysCorrect++;
      }
    }
    state.previousLength = typed.length;

    if (!state.startTime && typed.length > 0) {
      state.startTime = performance.now();
      state.timerId = setInterval(tick, TICK_MS);
    }

    const before = growTarget(typed.length);
    if (before >= 0) {
      appendChars(before);
      els.input.maxLength = state.target.length;
    }

    paintPassage();
    updateStats();

    if (!state.limitMs && typed.length === state.target.length) finishTest();
  }

  // ---------- Starting, restarting, switching ----------

  /** Resets the run. Uses state.baseTarget, so restart keeps the same text. */
  function begin(focusBox) {
    stopTimer();
    state.target = state.baseTarget;
    state.limitMs = state.length === 'passage' ? 0 : Number(state.length) * 1000;
    state.startTime = 0;
    state.finished = false;
    state.previousLength = 0;
    state.keysPressed = 0;
    state.keysCorrect = 0;

    growTarget(0);

    els.result.hidden = true;
    els.passage.className = 'passage';
    els.passage.textContent = '';
    appendChars(0);
    els.input.value = '';
    els.input.disabled = false;
    els.input.maxLength = state.target.length;
    els.restart.disabled = false;
    els.box.scrollTop = 0;
    paintPassage();
    updateStats();

    if (focusBox) {
      els.input.focus({ preventScroll: true });
      window.setTimeout(() => {
        els.input.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
      }, 300);
    }
  }

  /** Chooses a new text for the round (random passage, or the own paragraph) and starts it. */
  function prepare(focusBox) {
    if (state.mode === 'own') {
      const check = ownCheck(els.ownText.value);
      if (!check.ok) {
        showInvalid(check);
        return;
      }
      state.ownText = check.text;
      state.baseTarget = check.text;
      try {
        window.localStorage.setItem(KEY_OWN, JSON.stringify(els.ownText.value.slice(0, 3000)));
      } catch (e) {
        storageOk = false;
      }
    } else {
      state.baseTarget = pickPassage();
    }
    begin(focusBox);
  }

  function showInvalid(check) {
    stopTimer();
    state.baseTarget = '';
    state.target = '';
    state.limitMs = state.length === 'passage' ? 0 : Number(state.length) * 1000;
    state.startTime = 0;
    state.finished = true;
    els.result.hidden = true;
    els.input.value = '';
    els.input.disabled = true;
    els.restart.disabled = true;
    els.progress.style.width = '0%';
    els.wpm.textContent = '0';
    els.accuracy.textContent = '100%';
    els.timeLabel.textContent = state.limitMs ? 'Time left' : 'Time';
    els.time.textContent = formatSeconds(state.limitMs);
    showPlaceholder('Paste or type your paragraph in the box above (' + MIN_WORDS + ' to ' + MAX_WORDS + ' words), then press start.');
    els.ownMsg.textContent = check.msg;
  }

  function restart() {
    if (!state.baseTarget) return;
    begin(true);
  }

  function setMode(mode) {
    state.mode = mode;
    els.sources.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.source === mode));
    });
    els.ownBox.hidden = mode !== 'own';
    refreshSetup();
    prepare(false);
  }

  function setLength(length) {
    state.length = length;
    els.lengths.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.length === length));
    });
    prepare(false);
  }

  /** Updates the own-text counter, its message and the start button. */
  function updateOwnCount() {
    const check = ownCheck(els.ownText.value);
    els.ownCount.textContent = plural(check.words, 'word');
    els.ownMsg.textContent = check.msg;
    els.ownMsg.classList.toggle('own__msg--ok', check.ok);
    els.start.disabled = state.mode === 'own' && !check.ok;
  }

  function refreshSetup() {
    if (state.mode === 'own') {
      els.start.textContent = 'Start with my text';
      updateOwnCount();
    } else {
      els.start.textContent = 'New passage';
      els.start.disabled = false;
    }
  }

  // ---------- Run history ----------

  function formatDate(at) {
    try {
      return new Date(at).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } catch (e) {
      return new Date(at).toISOString().slice(0, 16).replace('T', ' ');
    }
  }

  function describeRun(run) {
    const source = run.mode === 'own' ? 'My own text' : 'Random text';
    const length = run.length === 'passage' ? 'full text' : run.length + ' s';
    return source + ' · ' + length + ' · ' + plural(run.words || 0, 'word');
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderHistory() {
    const has = runs.length > 0;
    els.empty.hidden = has;
    els.chart.hidden = !has;
    els.clear.disabled = !has && !best;
    els.best.textContent = best ? best.wpm + ' WPM' : 'none yet';
    els.note.textContent = storageOk
      ? 'Your last ' + MAX_RUNS + ' runs are saved in this browser.'
      : 'This browser is not saving runs, so they last until you reload the page.';

    els.chart.textContent = '';
    els.runs.textContent = '';
    if (!has) return;

    // Trend: oldest run on the left, newest on the right (orange).
    const top = Math.max(1, ...runs.map((r) => r.wpm));
    const ordered = runs.slice().reverse();
    ordered.forEach((run, i) => {
      const bar = el('div', 'chart__bar' + (i === ordered.length - 1 ? ' chart__bar--latest' : ''));
      bar.style.height = Math.max(8, Math.round((run.wpm / top) * 100)) + '%';
      bar.title = run.wpm + ' WPM, ' + formatDate(run.at);
      els.chart.appendChild(bar);
    });

    runs.forEach((run) => {
      const li = el('li', 'run');
      const wpm = el('span', 'run__wpm', String(run.wpm));
      wpm.appendChild(el('small', '', ' WPM'));
      const info = el('div', 'run__info');
      info.appendChild(el('span', 'run__date', formatDate(run.at)));
      info.appendChild(el('span', 'run__meta', describeRun(run)));
      const acc = el('span', 'run__acc', 'acc ' + run.acc + '%');
      li.append(wpm, info, acc);
      els.runs.appendChild(li);
    });
  }

  // ---------- Wiring ----------

  els.input.addEventListener('input', onInput);
  els.input.addEventListener('paste', (event) => event.preventDefault());
  els.input.addEventListener('focus', () => {
    window.setTimeout(() => {
      els.input.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
    }, 300);
  });

  els.ownText.addEventListener('input', updateOwnCount);
  els.start.addEventListener('click', () => prepare(true));
  els.again.addEventListener('click', () => prepare(true));
  els.restart.addEventListener('click', restart);
  els.clear.addEventListener('click', clearHistory);

  els.sources.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.source));
  });
  els.lengths.forEach((btn) => {
    btn.addEventListener('click', () => setLength(btn.dataset.length));
  });

  // Start-up: restore the saved own paragraph (if any), history, then a random text.
  const savedOwn = readStored(KEY_OWN, '');
  if (typeof savedOwn === 'string') els.ownText.value = savedOwn.slice(0, 3000);
  loadHistory();
  renderHistory();
  refreshSetup();
  prepare(false);

  // Exposed so the logic can be checked from the browser console.
  window.typingTest = { calcWpm, calcAccuracy, countCorrect, ownCheck, normalizeText, PASSAGES };
})();
