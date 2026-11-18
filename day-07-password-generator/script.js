(() => {
  'use strict';

  /* ---------- Secure random ---------- */
  const rng = window.crypto || window.msCrypto;
  const SECURE = !!(rng && typeof rng.getRandomValues === 'function');

  // Unbiased integer in [0, max). Values that would skew the result are thrown away.
  function randomInt(max) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max;
    do {
      rng.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % max;
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  /* ---------- Character sets ---------- */
  const SETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.?'
  };
  const LOOKALIKES = 'il1Lo0O';
  const SCRAMBLE = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*?';

  function activeSets(s) {
    return ['lower', 'upper', 'digits', 'symbols']
      .filter((k) => s[k])
      .map((k) => (s.avoid ? [...SETS[k]].filter((c) => !LOOKALIKES.includes(c)).join('') : SETS[k]));
  }

  function makePassword(s) {
    const sets = activeSets(s);
    const pool = sets.join('');
    const out = sets.map((set) => set[randomInt(set.length)]); // one from every chosen set
    while (out.length < s.length) out.push(pool[randomInt(pool.length)]);
    return { text: shuffle(out).join(''), bits: s.length * Math.log2(pool.length) };
  }

  function makePassphrase(s) {
    const words = [];
    for (let i = 0; i < s.words; i++) {
      let w = window.WORDS[randomInt(window.WORDS.length)];
      if (s.cap) w = w[0].toUpperCase() + w.slice(1);
      words.push(w);
    }
    let text = words.join(s.sep);
    let bits = s.words * Math.log2(window.WORDS.length);
    if (s.num) {
      text += s.sep + String(randomInt(100));
      bits += Math.log2(100);
    }
    return { text, bits };
  }

  /* ---------- Strength ---------- */
  const GUESSES_PER_SECOND = 1e10; // a fast offline attack on a leaked fast hash
  const LEVELS = [
    { max: 36, label: 'Weak' },
    { max: 60, label: 'Fair' },
    { max: 80, label: 'Good' },
    { max: 110, label: 'Strong' },
    { max: Infinity, label: 'Excellent' }
  ];

  function levelOf(bits) {
    const i = LEVELS.findIndex((l) => bits < l.max);
    return { n: i + 1, label: LEVELS[i].label };
  }

  function crackTime(bits) {
    const seconds = Math.pow(2, bits - 1) / GUESSES_PER_SECOND; // on average half the space
    if (seconds < 1) return 'less than a second';
    const units = [
      [60, 'second'], [60, 'minute'], [24, 'hour'], [365, 'day']
    ];
    let v = seconds;
    let name = 'second';
    for (let i = 0; i < units.length; i++) {
      const [step] = units[i];
      if (v < step) break;
      v /= step;
      name = ['minute', 'hour', 'day', 'year'][i];
    }
    if (name === 'year') {
      if (v >= 1e12) return 'more than a trillion years';
      if (v >= 1e9) return `about ${Math.round(v / 1e9)} billion years`;
      if (v >= 1e6) return `about ${Math.round(v / 1e6)} million years`;
      if (v >= 1e3) return `about ${Math.round(v / 1e3)} thousand years`;
    }
    const n = Math.max(1, Math.round(v));
    return `about ${n} ${name}${n === 1 ? '' : 's'}`;
  }

  /* ---------- State ---------- */
  const KEY = 'vr-mini-password-generator';
  const DEFAULTS = {
    mode: 'password', length: 16, lower: true, upper: true, digits: true, symbols: true, avoid: false,
    words: 5, sep: '-', cap: true, num: false
  };
  let state = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === typeof DEFAULTS[k]) state[k] = saved[k];
    }
  } catch (e) { /* private mode or blocked storage: carry on with defaults */ }
  state.length = clamp(state.length, 4, 64);
  state.words = clamp(state.words, 3, 10);
  if (![' ', '-', '.', '_'].includes(state.sep)) state.sep = '-';
  if (!(state.lower || state.upper || state.digits || state.symbols)) state.lower = true;

  function save() {
    // Only the settings are stored, never a generated password.
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function clamp(n, lo, hi) {
    n = Math.round(Number(n));
    if (!Number.isFinite(n)) return lo;
    return Math.min(hi, Math.max(lo, n));
  }

  /* ---------- Elements ---------- */
  const $ = (sel) => document.querySelector(sel);
  const el = {
    card: $('#gen'),
    tabs: [...document.querySelectorAll('.tab')],
    panels: { password: $('#panel-password'), passphrase: $('#panel-passphrase') },
    pw: $('#pw'),
    copy: $('#copy'),
    regen: $('#regen'),
    hide: $('#hide'),
    meter: $('#meter'),
    meterLabel: $('#meter-label'),
    meterBits: $('#meter-bits'),
    meterTime: $('#meter-time'),
    note: $('#note'),
    toast: $('#toast'),
    len: $('#len'),
    lenNum: $('#len-num'),
    words: $('#words'),
    wordsNum: $('#words-num'),
    sets: { lower: $('#set-lower'), upper: $('#set-upper'), digits: $('#set-digits'), symbols: $('#set-symbols') },
    avoid: $('#avoid'),
    cap: $('#cap'),
    num: $('#num'),
    seps: [...document.querySelectorAll('input[name="sep"]')]
  };

  let current = '';
  let hidden = false;
  let anim = 0;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Output ---------- */
  function charClass(c) {
    if (/[a-z]/.test(c)) return 'c-l';
    if (/[A-Z]/.test(c)) return 'c-u';
    if (/[0-9]/.test(c)) return 'c-d';
    return 'c-s';
  }

  function paint(text) {
    el.pw.textContent = '';
    const frag = document.createDocumentFragment();
    for (const c of text) {
      const span = document.createElement('span');
      span.className = charClass(c);
      span.textContent = c;
      frag.appendChild(span);
    }
    el.pw.appendChild(frag);
  }

  function show(text) {
    el.pw.classList.toggle('is-hidden', hidden);
    if (hidden) {
      el.pw.textContent = '•'.repeat([...text].length);
    } else {
      paint(text);
    }
    el.pw.setAttribute('aria-label', hidden ? 'Password hidden' : 'Generated password: ' + text);
  }

  // A short settle animation. It uses the same secure random numbers, never Math.random.
  function reveal(text) {
    cancelAnimationFrame(anim);
    const chars = [...text];
    if (hidden || (reduceMotion && reduceMotion.matches) || chars.length === 0) {
      show(text);
      return;
    }
    const start = performance.now();
    const total = 380;
    el.pw.classList.add('is-scrambling');
    const tick = (now) => {
      const p = Math.min(1, (now - start) / total);
      const fixed = Math.floor(p * chars.length);
      el.pw.textContent = '';
      const frag = document.createDocumentFragment();
      chars.forEach((c, i) => {
        const span = document.createElement('span');
        const done = i < fixed;
        const shown = done ? c : (c === ' ' ? ' ' : SCRAMBLE[randomInt(SCRAMBLE.length)]);
        span.className = done ? charClass(c) : 'c-x';
        span.textContent = shown;
        frag.appendChild(span);
      });
      el.pw.appendChild(frag);
      if (p < 1) {
        anim = requestAnimationFrame(tick);
      } else {
        el.pw.classList.remove('is-scrambling');
        show(text);
      }
    };
    anim = requestAnimationFrame(tick);
  }

  function renderMeter(bits) {
    const lv = levelOf(bits);
    el.meter.dataset.level = String(lv.n);
    el.meterLabel.textContent = lv.label;
    el.meterBits.textContent = `${Math.round(bits)} bits`;
    el.meterTime.textContent = `Guessing it would take ${crackTime(bits)} at 10 billion guesses a second.`;
    el.meter.setAttribute('aria-label', `Strength ${lv.label}, ${Math.round(bits)} bits`);
  }

  function generate(animate = true) {
    if (!SECURE) {
      el.pw.textContent = 'Secure random numbers are not available in this browser.';
      el.copy.disabled = el.regen.disabled = true;
      return;
    }
    cancelAnimationFrame(anim);
    el.pw.classList.remove('is-scrambling');
    const r = state.mode === 'password' ? makePassword(state) : makePassphrase(state);
    current = r.text;
    renderMeter(r.bits);
    if (animate) reveal(r.text); else show(r.text);
  }

  /* ---------- Copy and toast ---------- */
  let toastTimer = 0;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-show'), 1900);
  }

  let copyTimer = 0;
  async function copy() {
    if (!current) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(current);
      ok = true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = current;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-100px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
    }
    if (ok) {
      toast('Copied to the clipboard');
      el.copy.textContent = 'Copied';
      el.copy.classList.add('is-done');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { el.copy.textContent = 'Copy'; el.copy.classList.remove('is-done'); }, 1600);
    } else {
      toast('Could not copy. Select the text and copy it.');
    }
  }

  /* ---------- Controls ---------- */
  function setFill(input) {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--pct', pct + '%');
  }

  function syncControls() {
    el.len.value = el.lenNum.value = state.length;
    el.words.value = el.wordsNum.value = state.words;
    setFill(el.len);
    setFill(el.words);
    for (const k of Object.keys(el.sets)) el.sets[k].checked = state[k];
    el.avoid.checked = state.avoid;
    el.cap.checked = state.cap;
    el.num.checked = state.num;
    el.seps.forEach((r) => { r.checked = r.value === state.sep; });
    setMode(state.mode, false);
  }

  function setMode(mode, regen = true) {
    state.mode = mode;
    el.card.dataset.mode = mode;
    el.tabs.forEach((t) => {
      const on = t.dataset.mode === mode;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    el.panels.password.hidden = mode !== 'password';
    el.panels.passphrase.hidden = mode !== 'passphrase';
    el.note.textContent = mode === 'password'
      ? 'Made on your device with the secure random generator of your browser. Nothing is sent and no password is saved.'
      : 'Random words from a list of 512, each one adds 9 bits. Easy to type and to remember.';
    save();
    if (regen) generate();
  }

  function setLength(v) {
    state.length = clamp(v, 4, 64);
    el.len.value = el.lenNum.value = state.length;
    setFill(el.len);
    save();
    generate(false);
    bump(el.lenNum);
  }

  function setWords(v) {
    state.words = clamp(v, 3, 10);
    el.words.value = el.wordsNum.value = state.words;
    setFill(el.words);
    save();
    generate(false);
    bump(el.wordsNum);
  }

  function bump(node) {
    node.classList.remove('is-bump');
    void node.offsetWidth;
    node.classList.add('is-bump');
  }

  el.tabs.forEach((t, i) => {
    t.addEventListener('click', () => setMode(t.dataset.mode));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = el.tabs[(i + 1) % el.tabs.length];
        next.focus();
        setMode(next.dataset.mode);
      }
    });
  });

  el.len.addEventListener('input', () => setLength(el.len.value));
  el.lenNum.addEventListener('change', () => setLength(el.lenNum.value));
  $('#len-minus').addEventListener('click', () => setLength(state.length - 1));
  $('#len-plus').addEventListener('click', () => setLength(state.length + 1));
  el.words.addEventListener('input', () => setWords(el.words.value));
  el.wordsNum.addEventListener('change', () => setWords(el.wordsNum.value));
  $('#words-minus').addEventListener('click', () => setWords(state.words - 1));
  $('#words-plus').addEventListener('click', () => setWords(state.words + 1));

  for (const k of Object.keys(el.sets)) {
    el.sets[k].addEventListener('change', () => {
      state[k] = el.sets[k].checked;
      if (!(state.lower || state.upper || state.digits || state.symbols)) {
        state[k] = true;
        el.sets[k].checked = true;
        const chip = el.sets[k].closest('.chip');
        chip.classList.remove('is-shake');
        void chip.offsetWidth;
        chip.classList.add('is-shake');
        toast('Keep at least one set on');
        return;
      }
      save();
      generate();
    });
  }
  el.avoid.addEventListener('change', () => { state.avoid = el.avoid.checked; save(); generate(); });
  el.cap.addEventListener('change', () => { state.cap = el.cap.checked; save(); generate(); });
  el.num.addEventListener('change', () => { state.num = el.num.checked; save(); generate(); });
  el.seps.forEach((r) => r.addEventListener('change', () => { if (r.checked) { state.sep = r.value; save(); generate(); } }));

  el.copy.addEventListener('click', copy);
  el.regen.addEventListener('click', () => generate());
  el.hide.addEventListener('click', () => {
    hidden = !hidden;
    el.hide.setAttribute('aria-pressed', String(hidden));
    el.hide.textContent = hidden ? 'Show' : 'Hide';
    show(current);
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' && t.type === 'number')) return;
    const k = e.key.toLowerCase();
    if (k === 'g') { generate(); }
    else if (k === 'c') { copy(); }
    else if (k === 'h') { el.hide.click(); }
    else if (k === '1') { setMode('password'); }
    else if (k === '2') { setMode('passphrase'); }
  });

  syncControls();
  generate(false);
})();
