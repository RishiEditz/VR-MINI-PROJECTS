// Quiz App (Exploring Mini Projects, Day 4)
// Plain JavaScript, no libraries and no server.
// Play built-in quizzes, make your own, and share it with a link: the whole
// quiz is packed into the link itself (after the # sign), so friends can open
// it anywhere. Everything you save stays in this browser (localStorage).

(function (root) {
  'use strict';

  // ---------- Settings ----------

  const POINTS_PER_CORRECT = 10;
  const STORAGE_KEYS = {
    best: 'quiz-app-best-v1',
    mine: 'quiz-app-mine-v1',
    scores: 'quiz-app-scores-v1',
    prefs: 'quiz-app-prefs-v1',
    draft: 'quiz-app-draft-v1',
  };
  const COLORS = ['#ffd27a', '#ff5c8a', '#3ee6a0', '#8a5cff', '#ffb23f', '#fff7f2'];

  const LIMITS = {
    title: 60,
    question: 200,
    option: 80,
    questions: 20,
    shareWarn: 2000, // links longer than this may be cut by some apps
    shareMax: 8000, // links longer than this are not offered
    hashMax: 20000, // never try to read anything longer than this
    decodedMax: 200000,
  };

  const TIME_CHOICES = [10, 15, 20, 30, 45, 60];
  const DEFAULT_CUSTOM_TIME = 20;

  const MODES = [
    { id: 'relaxed', label: 'Relaxed', sub: 'no timer', secs: 0 },
    { id: 'classic', label: 'Classic', sub: '15 s', secs: 15 },
    { id: 'blitz', label: 'Blitz', sub: '8 s', secs: 8 },
  ];
  const LENGTHS = [5, 8];

  // Built-in topics. Each question: [text, [options], index of the right one]
  const TOPICS = [
    {
      id: 'coding', name: 'Coding basics', icon: '</>',
      questions: [
        ['What does HTML stand for?', ['High Tech Modern Language', 'HyperText Markup Language', 'Home Tool Markup Language', 'Hyperlink and Text Markup Language'], 1],
        ['Which keyword declares a constant in modern JavaScript?', ['var', 'let', 'const', 'static'], 2],
        ['Which CSS property changes the text colour?', ['font-style', 'color', 'text-decoration', 'background-size'], 1],
        ['What does CSS stand for?', ['Cascading Style Sheets', 'Computer Style Sheets', 'Creative Style System', 'Colourful Sheet Styles'], 0],
        ['Which array method adds an item to the end?', ['pop()', 'push()', 'shift()', 'reverse()'], 1],
        ['Which symbol starts a one-line comment in JavaScript?', ['//', '#', '<!--', '**'], 0],
        ['What does the === operator check in JavaScript?', ['Only the value', 'The value and the type', 'Only the type', 'Nothing, it assigns'], 1],
        ['Which HTML tag creates a link?', ['<link>', '<a>', '<href>', '<url>'], 1],
      ],
    },
    {
      id: 'space', name: 'Space', icon: '*',
      questions: [
        ['Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Saturn', 'Mercury'], 1],
        ['What is the largest planet in our solar system?', ['Saturn', 'Neptune', 'Jupiter', 'Uranus'], 2],
        ['How many planets are in our solar system?', ['Six', 'Seven', 'Eight', 'Nine'], 2],
        ['What is the closest star to Earth?', ['Sirius', 'The Sun', 'Proxima Centauri', 'Polaris'], 1],
        ['Which galaxy contains our solar system?', ['Andromeda', 'Whirlpool', 'Milky Way', 'Sombrero'], 2],
        ['What force keeps the planets moving around the Sun?', ['Magnetism', 'Friction', 'Gravity', 'Wind'], 2],
        ['Which planet is famous for its bright rings?', ['Saturn', 'Mars', 'Earth', 'Mercury'], 0],
        ['Who was the first person to walk on the Moon?', ['Yuri Gagarin', 'Neil Armstrong', 'Buzz Aldrin', 'Rakesh Sharma'], 1],
      ],
    },
    {
      id: 'geo', name: 'Geography', icon: '()',
      questions: [
        ['What is the capital of Australia?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2],
        ['Which is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3],
        ['Which continent is the Sahara Desert in?', ['Asia', 'Africa', 'South America', 'Australia'], 1],
        ['Mount Everest is in which mountain range?', ['Alps', 'Andes', 'Himalayas', 'Rockies'], 2],
        ['What is the smallest country in the world?', ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], 1],
        ['Which river flows through Cairo?', ['The Nile', 'The Amazon', 'The Ganges', 'The Danube'], 0],
        ['What is the capital of Japan?', ['Osaka', 'Kyoto', 'Tokyo', 'Nagoya'], 2],
        ['Which country is shaped like a boot?', ['Spain', 'Italy', 'Greece', 'Portugal'], 1],
      ],
    },
    {
      id: 'science', name: 'Science', icon: '~',
      questions: [
        ['Which gas do plants take in for photosynthesis?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 2],
        ['What is the chemical symbol for gold?', ['Go', 'Gd', 'Au', 'Ag'], 2],
        ['How many bones does an adult human have?', ['106', '206', '306', '156'], 1],
        ['Roughly how fast does light travel?', ['300 km per second', '3,000 km per second', '300,000 km per second', '3 million km per second'], 2],
        ['What is H2O more commonly called?', ['Salt', 'Water', 'Hydrogen', 'Oxygen'], 1],
        ['What is the hardest natural material?', ['Gold', 'Iron', 'Diamond', 'Quartz'], 2],
        ['Which part of the blood carries oxygen?', ['White cells', 'Red cells', 'Plasma', 'Platelets'], 1],
        ['At sea level, water boils at what temperature?', ['50 C', '90 C', '100 C', '120 C'], 2],
      ],
    },
  ];
  const MIXED = { id: 'mixed', name: 'Mixed bag', icon: '?' };

  // ---------- Small helpers ----------

  function toQuestion(row) {
    return { q: row[0], o: row[1].slice(), a: row[2] };
  }

  function builtinPool(id) {
    if (id === MIXED.id) {
      return TOPICS.flatMap((t) => t.questions.map(toQuestion));
    }
    const topic = TOPICS.find((t) => t.id === id);
    return topic ? topic.questions.map(toQuestion) : null;
  }

  function builtinName(id) {
    if (id === MIXED.id) return MIXED.name;
    const topic = TOPICS.find((t) => t.id === id);
    return topic ? topic.name : null;
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function shuffleOptions(q) {
    const order = shuffle(q.o.map((_, i) => i));
    return { q: q.q, o: order.map((i) => q.o[i]), a: order.indexOf(q.a) };
  }

  function clampText(value, max) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function newId() {
    return `u${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  }

  function hashText(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  // ---------- Packing a quiz into a link ----------
  // Step 1: compact JSON  [1, title, default seconds, [[question, [answers], right index, seconds?], ...]]
  // Step 2: LZW compression over the UTF-8 bytes (variable width codes)
  // Step 3: base64url so it is safe inside a link. A leading 0 or 1 says raw or compressed.

  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  function bytesToB64(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
      if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
      if (i + 2 < bytes.length) out += B64[n & 63];
    }
    return out;
  }

  function b64ToBytes(text) {
    if (/[^A-Za-z0-9\-_]/.test(text) || text.length % 4 === 1) throw new Error('bad text');
    const out = [];
    let buffer = 0;
    let bits = 0;
    for (let i = 0; i < text.length; i += 1) {
      buffer = (buffer << 6) | B64.indexOf(text[i]);
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push((buffer >> bits) & 255);
        buffer &= (1 << bits) - 1;
      }
    }
    return Uint8Array.from(out);
  }

  function bitLength(n) {
    let len = 0;
    while (n > 0) { len += 1; n = Math.floor(n / 2); }
    return len;
  }

  function codeWidth(index) {
    return Math.max(9, bitLength(Math.min(256 + index, 65536) - 1));
  }

  function lzwEncode(bytes) {
    const dict = new Map();
    const codes = [];
    let next = 256;
    let w = -1;
    for (let i = 0; i < bytes.length; i += 1) {
      const b = bytes[i];
      if (w === -1) { w = b; continue; }
      const key = w * 256 + b;
      const hit = dict.get(key);
      if (hit !== undefined) {
        w = hit;
      } else {
        codes.push(w);
        if (next < 65536) { dict.set(key, next); next += 1; }
        w = b;
      }
    }
    if (w !== -1) codes.push(w);

    const out = [];
    let buffer = 0;
    let bits = 0;
    codes.forEach((code, index) => {
      const width = codeWidth(index);
      buffer = buffer * Math.pow(2, width) + code;
      bits += width;
      while (bits >= 8) {
        bits -= 8;
        const unit = Math.pow(2, bits);
        const byte = Math.floor(buffer / unit);
        out.push(byte & 255);
        buffer -= byte * unit;
      }
    });
    if (bits > 0) out.push((buffer * Math.pow(2, 8 - bits)) & 255);
    return Uint8Array.from(out);
  }

  function lzwDecode(bytes) {
    const dict = [];
    const out = [];
    let prev = null;
    let bitPos = 0;
    const totalBits = bytes.length * 8;
    for (let index = 0; ; index += 1) {
      const width = codeWidth(index);
      if (totalBits - bitPos < width) break;
      let code = 0;
      for (let k = 0; k < width; k += 1) {
        const pos = bitPos + k;
        code = code * 2 + ((bytes[pos >> 3] >> (7 - (pos & 7))) & 1);
      }
      bitPos += width;
      let entry;
      if (code < 256) entry = [code];
      else if (code - 256 < dict.length) entry = dict[code - 256];
      else if (code - 256 === dict.length && prev) entry = prev.concat(prev[0]);
      else throw new Error('bad code');
      for (let k = 0; k < entry.length; k += 1) out.push(entry[k]);
      if (out.length > LIMITS.decodedMax) throw new Error('too big');
      if (prev && 256 + dict.length < 65536) dict.push(prev.concat(entry[0]));
      prev = entry;
    }
    return Uint8Array.from(out);
  }

  function packText(text) {
    const raw = new TextEncoder().encode(text);
    const rawOut = `0${bytesToB64(raw)}`;
    const packedOut = `1${bytesToB64(lzwEncode(raw))}`;
    return packedOut.length < rawOut.length ? packedOut : rawOut;
  }

  function unpackText(payload) {
    if (!payload || payload.length > LIMITS.hashMax) throw new Error('bad length');
    const flag = payload[0];
    const body = b64ToBytes(payload.slice(1));
    const bytes = flag === '1' ? lzwDecode(body) : flag === '0' ? body : null;
    if (!bytes) throw new Error('bad flag');
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  function compactQuiz(quiz) {
    return [1, quiz.title, quiz.time, quiz.qs.map((q) => {
      const row = [q.q, q.o, q.a];
      if (q.t !== undefined && q.t !== null) row.push(q.t);
      return row;
    })];
  }

  function encodeQuiz(quiz) {
    return packText(JSON.stringify(compactQuiz(quiz)));
  }

  // Checks anything that came from a link or from storage, and rebuilds a clean quiz.
  function cleanQuiz(raw) {
    if (!Array.isArray(raw) || raw[0] !== 1) return null;
    const title = clampText(raw[1], LIMITS.title);
    if (title.length < 1) return null;
    let time = Number(raw[2]);
    if (!Number.isInteger(time) || time < 0 || time > 300) time = DEFAULT_CUSTOM_TIME;
    const rows = raw[3];
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > LIMITS.questions + 10) return null;
    const qs = [];
    for (const row of rows) {
      if (!Array.isArray(row)) return null;
      const text = clampText(row[0], LIMITS.question + 100);
      const opts = Array.isArray(row[1]) ? row[1].map((o) => clampText(o, LIMITS.option + 40)) : null;
      if (!text || !opts || opts.length < 2 || opts.length > 4 || opts.some((o) => !o)) return null;
      const a = row[2];
      if (!Number.isInteger(a) || a < 0 || a >= opts.length) return null;
      const q = { q: text, o: opts, a };
      if (row[3] !== undefined && row[3] !== null) {
        const t = Number(row[3]);
        if (Number.isInteger(t) && t >= 0 && t <= 300) q.t = t;
      }
      qs.push(q);
    }
    return { title, time, qs };
  }

  function decodeQuiz(payload) {
    try {
      return cleanQuiz(JSON.parse(unpackText(payload)));
    } catch (err) {
      return null;
    }
  }

  // Returns the first part of the page address, without any # part.
  function baseUrl() {
    return String(root.location && root.location.href ? root.location.href : '').split('#')[0];
  }

  function quizLink(quiz) {
    const payload = encodeQuiz(quiz);
    const url = `${baseUrl()}#q=${payload}`;
    return { url, length: url.length, payloadLength: payload.length };
  }

  function topicLink(id) {
    return `${baseUrl()}#b=${id}`;
  }

  // Works with a whole link, a "#q=..." part, or just the code.
  function parseShared(text) {
    const value = String(text || '').trim();
    if (!value) return { error: 'empty' };
    const match = value.match(/[#&?]?([qb])=([A-Za-z0-9\-_]+)\s*$/);
    if (!match) return { error: 'format' };
    if (match[1] === 'b') {
      const name = builtinName(match[2]);
      return name ? { builtin: match[2], name } : { error: 'unknown' };
    }
    const quiz = decodeQuiz(match[2]);
    return quiz ? { quiz } : { error: 'broken' };
  }

  // Node (tests) can load the packing code without a page.
  const api = { lzwEncode, lzwDecode, packText, unpackText, encodeQuiz, decodeQuiz, cleanQuiz, compactQuiz, parseShared };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  // ---------- Page ----------

  const $ = (id) => document.getElementById(id);
  const els = {
    app: document.querySelector('.app'),
    best: $('best'),
    topics: $('topics'),
    modeGroup: $('mode-group'),
    lenGroup: $('len-group'),
    startLead: $('start-lead'),
    quizTitle: $('quiz-title'),
    quit: $('quit'),
    ready: $('ready'),
    readyLabel: $('ready-label'),
    readyNum: $('ready-num'),
    quizBody: $('quiz-body'),
    count: $('count'),
    streakPill: $('streak-pill'),
    streak: $('streak'),
    score: $('score'),
    progress: $('progress'),
    progressFill: $('progress-fill'),
    timer: document.querySelector('.timer'),
    timerFill: $('timer-fill'),
    timerText: $('timer-text'),
    qcard: $('qcard'),
    question: $('question'),
    options: $('options'),
    feedback: $('feedback'),
    feedbackTitle: $('feedback-title'),
    feedbackText: $('feedback-text'),
    next: $('next'),
    resultLabel: $('result-label'),
    resultTitle: $('result-title'),
    resultScore: $('result-score'),
    resultMsg: $('result-msg'),
    resultBest: $('result-best'),
    resultStats: $('result-stats'),
    resultActions: $('result-actions'),
    review: $('review'),
    burst: $('burst'),
    status: $('status'),
    toast: $('toast'),
    mineCount: $('mine-count'),
    mineList: $('mine-list'),
    pasteForm: $('paste-form'),
    pasteInput: $('paste-input'),
    pasteErr: $('paste-err'),
    playerName: $('player-name'),
    board: $('board'),
    clearScores: $('clear-scores'),
    btnSound: $('btn-sound'),
    btnTheme: $('btn-theme'),
    nav: $('nav'),
    // builder
    form: $('builder-form'),
    errors: $('errors'),
    bTitle: $('b-title'),
    bTitleErr: $('b-title-err'),
    bTitleCount: $('b-title-count'),
    bTime: $('b-time'),
    bQuestions: $('b-questions'),
    bAdd: $('b-add'),
    linkmeter: $('linkmeter'),
    bSave: $('b-save'),
    bSaveShare: $('b-save-share'),
    bPlay: $('b-play'),
    bCancel: $('b-cancel'),
    bReset: $('b-reset'),
    previewChips: $('preview-chips'),
    preview: $('preview'),
    // share dialog
    share: $('share'),
    shareTitle: $('share-title'),
    shareClose: $('share-close'),
    shareMsg: $('share-msg'),
    shareLink: $('share-link'),
    shareInfo: $('share-info'),
    shareCopy: $('share-copy'),
    shareWa: $('share-wa'),
    shareNative: $('share-native'),
    shareTg: $('share-tg'),
    shareX: $('share-x'),
    shareMail: $('share-mail'),
    shareStatus: $('share-status'),
  };

  const screens = {};
  ['start', 'quiz', 'result', 'create', 'mine', 'scores'].forEach((name) => {
    screens[name] = $(`screen-${name}`);
  });

  const reduceMotion = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- Saved data (safe when storage is blocked) ----------

  const memoryStore = {};

  function readStore(key, fallback) {
    try {
      const raw = root.localStorage.getItem(key);
      if (raw === null) return key in memoryStore ? memoryStore[key] : fallback;
      const data = JSON.parse(raw);
      return data === null || data === undefined ? fallback : data;
    } catch (err) {
      return key in memoryStore ? memoryStore[key] : fallback;
    }
  }

  function writeStore(key, value) {
    memoryStore[key] = value;
    try {
      root.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* storage blocked: it still works until the page closes */
    }
  }

  function readBest() {
    const data = readStore(STORAGE_KEYS.best, {});
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  }

  function bestFor(key) {
    const value = readBest()[key];
    return typeof value === 'number' ? value : null;
  }

  function overallBest() {
    const values = Object.values(readBest()).filter((v) => typeof v === 'number');
    return values.length ? Math.max(...values) : null;
  }

  function renderHeaderBest() {
    const top = overallBest();
    els.best.textContent = top === null ? 'Best: none yet' : `Best: ${top} pts`;
  }

  function readMine() {
    const list = readStore(STORAGE_KEYS.mine, []);
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => {
        const quiz = item && item.quiz ? cleanQuiz(compactFrom(item.quiz)) : null;
        if (!quiz || typeof item.id !== 'string') return null;
        return { id: item.id, updated: Number(item.updated) || 0, ...quiz };
      })
      .filter(Boolean);
  }

  function compactFrom(quiz) {
    return compactQuiz({ title: quiz.title, time: quiz.time, qs: Array.isArray(quiz.qs) ? quiz.qs : [] });
  }

  function writeMine(list) {
    writeStore(STORAGE_KEYS.mine, list.map((item) => ({
      id: item.id,
      updated: item.updated,
      quiz: { title: item.title, time: item.time, qs: item.qs },
    })));
    renderMineCount();
  }

  function readScores() {
    const list = readStore(STORAGE_KEYS.scores, []);
    return Array.isArray(list)
      ? list.filter((s) => s && typeof s.pts === 'number' && typeof s.title === 'string')
      : [];
  }

  const prefs = Object.assign(
    { sound: false, theme: 'dark', mode: 'classic', len: 5, name: '' },
    (() => { const p = readStore(STORAGE_KEYS.prefs, {}); return p && typeof p === 'object' ? p : {}; })(),
  );
  if (!MODES.some((m) => m.id === prefs.mode)) prefs.mode = 'classic';
  if (!LENGTHS.includes(prefs.len)) prefs.len = 5;
  if (prefs.theme !== 'light') prefs.theme = 'dark';

  function savePrefs() { writeStore(STORAGE_KEYS.prefs, prefs); }

  // ---------- Element builder ----------

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === false || value === null || value === undefined) return;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else el.setAttribute(key, value === true ? '' : String(value));
    });
    kids.flat().forEach((kid) => {
      if (kid === null || kid === undefined || kid === false) return;
      el.append(kid);
    });
    return el;
  }

  function svgIcon(path, size) {
    const wrap = document.createElement('span');
    wrap.style.display = 'contents';
    wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    return wrap.firstChild;
  }

  const ICONS = {
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };

  function say(message) {
    els.status.textContent = '';
    window.setTimeout(() => { els.status.textContent = message; }, 30);
  }

  // Two-step buttons: the first tap asks, the second tap does it.
  const armed = new WeakMap();
  function confirmTap(btn, askLabel) {
    const entry = armed.get(btn);
    if (entry) {
      window.clearTimeout(entry.timer);
      btn.textContent = entry.label;
      btn.classList.remove('is-danger');
      armed.delete(btn);
      return true;
    }
    const label = btn.textContent;
    btn.textContent = askLabel;
    btn.classList.add('is-danger');
    const timer = window.setTimeout(() => {
      btn.textContent = label;
      btn.classList.remove('is-danger');
      armed.delete(btn);
    }, 3200);
    armed.set(btn, { label, timer });
    return false;
  }

  // ---------- Toast ----------

  let toastTimer = null;
  function toast(message) {
    const el = els.toast;
    el.textContent = message;
    el.classList.add('is-on');
    try {
      if (el.showPopover && !el.matches(':popover-open')) el.showPopover();
    } catch (err) { /* older browsers just show it normally */ }
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      try {
        if (el.hidePopover && el.matches(':popover-open')) el.hidePopover();
      } catch (err) { /* ignore */ }
      el.classList.remove('is-on');
    }, 2400);
  }

  // ---------- Sound (off until you turn it on) ----------

  let audio = null;
  function beep(freq, dur, type, vol, delay) {
    if (!prefs.sound) return;
    try {
      const Ctx = root.AudioContext || root.webkitAudioContext;
      if (!Ctx) return;
      audio = audio || new Ctx();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime + (delay || 0);
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol || 0.07, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch (err) { /* sound is optional */ }
  }

  const sounds = {
    right: () => { beep(660, 0.12, 'sine', 0.08); beep(880, 0.18, 'sine', 0.08, 0.1); },
    wrong: () => { beep(180, 0.28, 'sawtooth', 0.05); },
    tick: () => { beep(520, 0.06, 'square', 0.03); },
    done: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.16, 'triangle', 0.07, i * 0.12)); },
    on: () => { beep(740, 0.1, 'sine', 0.07); },
  };

  function renderSound() {
    els.btnSound.setAttribute('aria-pressed', String(prefs.sound));
    els.btnSound.setAttribute('aria-label', prefs.sound ? 'Sound is on. Turn sound off' : 'Sound is off. Turn sound on');
    els.btnSound.title = prefs.sound ? 'Sound on' : 'Sound off';
  }

  function renderTheme() {
    document.documentElement.setAttribute('data-theme', prefs.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', prefs.theme === 'light' ? '#ff9d6c' : '#ff5c8a');
    els.btnTheme.setAttribute('aria-label', prefs.theme === 'light' ? 'Switch to the dark theme' : 'Switch to the light theme');
    els.btnTheme.title = prefs.theme === 'light' ? 'Light theme' : 'Dark theme';
  }

  // ---------- Confetti ----------

  function burst(count) {
    if (reduceMotion) return;
    const layer = els.burst;
    const total = count || 70;
    for (let i = 0; i < total; i += 1) {
      const bit = document.createElement('span');
      bit.className = 'burst';
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * Math.min(420, window.innerWidth * 0.5);
      bit.style.left = '50%';
      bit.style.top = '38%';
      bit.style.background = COLORS[i % COLORS.length];
      bit.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      bit.style.setProperty('--dy', `${Math.sin(angle) * dist * 0.8 + 160}px`);
      bit.style.setProperty('--rot', `${Math.floor(Math.random() * 900 - 450)}deg`);
      bit.style.setProperty('--dur', `${(0.9 + Math.random() * 0.8).toFixed(2)}s`);
      layer.appendChild(bit);
      window.setTimeout(() => bit.remove(), 2000);
    }
  }

  // ---------- Screens ----------

  let currentScreen = 'start';

  function clearHash() {
    if (root.location.hash && root.history && root.history.replaceState) {
      root.history.replaceState(null, '', root.location.pathname + root.location.search);
    }
  }

  function showScreen(name, opts) {
    const options = opts || {};
    if (currentScreen === 'quiz' && name !== 'quiz') stopQuiz();
    currentScreen = name;
    Object.entries(screens).forEach(([key, node]) => {
      const active = key === name;
      node.classList.toggle('is-active', active);
      node.hidden = !active;
    });
    els.app.classList.toggle('is-wide', name === 'create');
    els.nav.querySelectorAll('.nav__btn').forEach((btn) => {
      if (btn.dataset.go === name) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    if (name !== 'quiz' && name !== 'result' && !options.keepHash) clearHash();
    if (options.focus !== false) {
      const heading = screens[name].querySelector('h2');
      if (heading) heading.focus({ preventScroll: true });
    }
    if (!options.keepScroll) window.scrollTo(0, 0);
  }

  // ---------- Start screen ----------

  function renderModeButtons() {
    els.modeGroup.textContent = '';
    MODES.forEach((mode) => {
      const btn = h('button', {
        type: 'button', class: 'seg__btn', role: 'radio', 'data-id': mode.id,
        'aria-checked': String(prefs.mode === mode.id),
      }, mode.label, ' ', h('small', { text: `(${mode.sub})` }));
      els.modeGroup.appendChild(btn);
    });
    els.lenGroup.textContent = '';
    LENGTHS.forEach((len) => {
      els.lenGroup.appendChild(h('button', {
        type: 'button', class: 'seg__btn', role: 'radio', 'data-len': len,
        'aria-checked': String(prefs.len === len),
      }, `${len} questions`));
    });
  }

  function wireSegment(group, onPick) {
    group.addEventListener('click', (event) => {
      const btn = event.target.closest('.seg__btn');
      if (btn) onPick(btn);
    });
    group.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const buttons = Array.from(group.querySelectorAll('.seg__btn'));
      const at = buttons.indexOf(document.activeElement);
      if (at < 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      const target = buttons[(at + step + buttons.length) % buttons.length];
      target.focus();
      onPick(target);
    });
  }

  function renderTopics() {
    const all = [...TOPICS, { ...MIXED, questions: TOPICS.flatMap((t) => t.questions) }];
    els.topics.textContent = '';
    all.forEach((topic) => {
      const best = bestFor(bestKey({ builtin: true, id: topic.id }, prefs.mode));
      const meta = `${topic.questions.length} questions${best === null ? '' : `, best ${best} pts`}`;
      const btn = h('button', { type: 'button', class: 'topic', 'data-topic': topic.id },
        h('span', { class: 'topic__icon', 'aria-hidden': 'true', text: topic.icon }),
        h('span', { class: 'topic__name', text: topic.name }),
        h('span', { class: 'topic__meta', text: meta }));
      els.topics.appendChild(btn);
    });
  }

  // ---------- Playing a quiz ----------

  const state = {
    quiz: null,
    qs: [],
    index: 0,
    score: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    answers: [],
    locked: true,
    timer: null,
    countdown: null,
    leaveTimer: null,
    deadline: 0,
    secs: 0,
    left: 0,
    lastTick: -1,
    replay: null,
    from: 'start',
  };

  function bestKey(quiz, modeId) {
    if (quiz.builtin) return modeId === 'classic' ? quiz.id : `${quiz.id}:${modeId}`;
    return quiz.id;
  }

  function stopTimer() {
    window.clearInterval(state.timer);
    state.timer = null;
  }

  function stopQuiz() {
    stopTimer();
    window.clearInterval(state.countdown);
    window.clearTimeout(state.leaveTimer);
    state.countdown = null;
    state.leaveTimer = null;
    state.locked = true;
  }

  function secsFor(question) {
    const quiz = state.quiz;
    if (quiz.builtin) return (MODES.find((m) => m.id === quiz.mode) || MODES[1]).secs;
    return question.t !== undefined && question.t !== null ? question.t : quiz.time;
  }

  function playBuiltin(id, from) {
    const pool = builtinPool(id);
    if (!pool) return;
    const len = Math.min(prefs.len, pool.length);
    const qs = shuffle(pool).slice(0, len).map(shuffleOptions);
    startQuiz({
      id, builtin: true, title: builtinName(id), mode: prefs.mode, qs,
      share: () => ({ url: topicLink(id), length: 0 }),
    }, { from: from || 'start', replay: () => playBuiltin(id, from) });
  }

  function playCustom(quiz, opts) {
    const options = opts || {};
    startQuiz({
      id: options.id || quiz.id, builtin: false, title: quiz.title, time: quiz.time,
      qs: quiz.qs.map((q) => ({ q: q.q, o: q.o.slice(), a: q.a, t: q.t })),
      practice: !!options.practice,
      shared: !!options.shared,
      share: () => quizLink(quiz),
      source: quiz,
    }, {
      from: options.from || 'start',
      countdown: !!options.countdown,
      replay: () => playCustom(quiz, { ...options, countdown: false }),
    });
  }

  function startQuiz(quiz, opts) {
    const options = opts || {};
    stopQuiz();
    state.quiz = quiz;
    state.qs = quiz.qs;
    state.index = 0;
    state.score = 0;
    state.correct = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.answers = [];
    state.replay = options.replay || null;
    state.from = options.from || 'start';
    els.quizTitle.textContent = quiz.title;
    els.score.textContent = '0';
    els.streak.textContent = '0';
    els.streakPill.classList.remove('is-hot');
    showScreen('quiz', { focus: false, keepHash: true });
    if (options.countdown) runCountdown();
    else beginQuiz();
  }

  function runCountdown() {
    els.ready.hidden = false;
    els.quizBody.hidden = true;
    els.readyLabel.textContent = `${state.quiz.title}. ${state.qs.length} questions`;
    let n = 3;
    const show = () => {
      els.readyNum.textContent = String(n);
      els.readyNum.classList.remove('tick');
      void els.readyNum.offsetWidth;
      els.readyNum.classList.add('tick');
      sounds.tick();
    };
    show();
    state.countdown = window.setInterval(() => {
      n -= 1;
      if (n <= 0) beginQuiz();
      else show();
    }, 800);
  }

  function beginQuiz() {
    window.clearInterval(state.countdown);
    state.countdown = null;
    els.ready.hidden = true;
    els.quizBody.hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.qs[state.index];
    const total = state.qs.length;
    state.locked = false;
    els.count.textContent = `Question ${state.index + 1} of ${total}`;
    setProgress(state.index / total);
    els.question.textContent = q.q;
    els.options.textContent = '';
    q.o.forEach((text, i) => {
      const btn = h('button', { type: 'button', class: 'option', 'data-i': i },
        h('span', { class: 'option__key', 'aria-hidden': 'true', text: String(i + 1) }),
        h('span', { class: 'option__text', text }),
        h('span', { class: 'option__mark', 'aria-hidden': 'true' }));
      els.options.appendChild(btn);
    });
    els.feedback.hidden = true;
    els.feedback.className = 'feedback';
    els.next.disabled = true;
    els.next.textContent = state.index === total - 1 ? 'See results' : 'Next';
    els.qcard.classList.remove('is-leaving');
    els.qcard.classList.remove('is-entering');
    void els.qcard.offsetWidth;
    els.qcard.classList.add('is-entering');
    els.question.focus({ preventScroll: true });
    const secs = secsFor(q);
    state.secs = secs;
    els.timer.hidden = secs === 0;
    if (secs > 0) startTimer(secs);
    say(`Question ${state.index + 1} of ${total}`);
  }

  function setProgress(fraction) {
    const pct = Math.round(fraction * 100);
    els.progressFill.style.width = `${pct}%`;
    els.progress.setAttribute('aria-valuenow', String(pct));
  }

  function startTimer(secs) {
    stopTimer();
    state.deadline = performance.now() + secs * 1000;
    state.lastTick = -1;
    els.timerFill.style.width = '100%';
    tick();
    state.timer = window.setInterval(tick, 100);
  }

  function tick() {
    const total = state.secs * 1000;
    const left = Math.max(0, state.deadline - performance.now());
    const whole = Math.ceil(left / 1000);
    state.left = whole;
    els.timerFill.style.width = `${(left / total) * 100}%`;
    els.timerText.textContent = String(whole);
    const low = whole <= Math.min(5, Math.ceil(state.secs * 0.3));
    els.timerFill.classList.toggle('is-low', low);
    els.timerText.classList.toggle('is-low', low);
    if (low && whole > 0 && whole !== state.lastTick) sounds.tick();
    state.lastTick = whole;
    if (left <= 0) answer(-1);
  }

  function ripple(btn, event) {
    if (reduceMotion) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = event && event.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event && event.clientY ? event.clientY - rect.top : rect.height / 2;
    const dot = h('span', { class: 'ripple' });
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.left = `${x - size / 2}px`;
    dot.style.top = `${y - size / 2}px`;
    btn.appendChild(dot);
    window.setTimeout(() => dot.remove(), 650);
  }

  function answer(choice, event) {
    if (state.locked) return;
    state.locked = true;
    stopTimer();
    const q = state.qs[state.index];
    const total = state.qs.length;
    const timedOut = choice < 0;
    const ok = choice === q.a;
    const timed = state.secs > 0;
    const earned = ok ? POINTS_PER_CORRECT + (timed ? state.left : 0) : 0;

    state.score += earned;
    if (ok) {
      state.correct += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
    } else {
      state.streak = 0;
    }
    state.answers.push({ q: q.q, options: q.o, chosen: choice, correct: q.a, ok, timedOut });

    const buttons = Array.from(els.options.children);
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.a) {
        btn.classList.add('is-correct');
        btn.querySelector('.option__mark').textContent = 'Correct';
      } else if (i === choice) {
        btn.classList.add('is-wrong');
        btn.querySelector('.option__mark').textContent = 'Wrong';
      }
    });
    if (choice >= 0) ripple(buttons[choice], event);

    els.feedback.hidden = false;
    els.feedback.className = `feedback ${ok ? 'is-good' : 'is-bad'}`;
    if (ok) {
      els.feedbackTitle.textContent = `Correct! +${earned} pts`;
      els.feedbackText.textContent = state.streak >= 2 ? `${state.streak} right answers in a row.` : 'Nice one.';
    } else {
      els.feedbackTitle.textContent = timedOut ? 'Time is up' : 'Not quite';
      els.feedbackText.textContent = `The right answer is: ${q.o[q.a]}`;
    }

    els.score.textContent = String(state.score);
    els.streak.textContent = String(state.streak);
    els.streakPill.classList.toggle('is-hot', state.streak >= 2);
    if (ok) {
      [els.score.parentElement, els.streakPill].forEach((node) => {
        node.classList.remove('pop');
        void node.offsetWidth;
        node.classList.add('pop');
      });
      sounds.right();
    } else {
      sounds.wrong();
    }

    setProgress((state.index + 1) / total);
    els.next.disabled = false;
    els.next.focus({ preventScroll: false });
  }

  function next() {
    if (state.locked === false || els.next.disabled) return;
    if (state.index >= state.qs.length - 1) {
      finish();
      return;
    }
    els.next.disabled = true;
    els.qcard.classList.remove('is-entering');
    els.qcard.classList.add('is-leaving');
    window.clearTimeout(state.leaveTimer);
    state.leaveTimer = window.setTimeout(() => {
      state.index += 1;
      renderQuestion();
    }, reduceMotion ? 0 : 220);
  }

  function finish() {
    stopQuiz();
    const quiz = state.quiz;
    const total = state.qs.length;
    const ratio = state.correct / total;
    let message = 'Good effort. Try again and beat it.';
    if (ratio === 1) message = 'Perfect score. Flawless!';
    else if (ratio >= 0.6) message = 'Nice work. So close to perfect.';

    const key = bestKey(quiz, quiz.mode);
    const previous = quiz.practice ? null : bestFor(key);
    const isBest = !quiz.practice && state.score > 0 && (previous === null || state.score > previous);
    if (isBest) {
      const data = readBest();
      data[key] = state.score;
      writeStore(STORAGE_KEYS.best, data);
    }
    if (!quiz.practice) addScore(quiz, total);
    renderHeaderBest();
    renderTopics();
    renderMine();

    els.resultLabel.textContent = quiz.title;
    els.resultTitle.textContent = `Your result on ${quiz.title}`;
    els.resultScore.textContent = `${state.correct}/${total}`;
    els.resultMsg.textContent = `${state.score} points. ${message}`;
    if (quiz.practice) els.resultBest.textContent = 'Practice run: not saved to your scores.';
    else if (isBest) els.resultBest.textContent = previous === null ? 'First score on this quiz. That is your best so far.' : `New best! The old one was ${previous} pts.`;
    else els.resultBest.textContent = `Best on this quiz: ${previous === null ? state.score : previous} pts.`;

    els.resultStats.textContent = '';
    const stats = [
      ['Correct', `${state.correct} of ${total}`],
      ['Best streak', String(state.bestStreak)],
    ];
    if (quiz.builtin) stats.push(['Mode', (MODES.find((m) => m.id === quiz.mode) || MODES[1]).label]);
    stats.forEach(([label, value]) => {
      els.resultStats.appendChild(h('li', {}, `${label}: `, h('b', { text: value })));
    });

    renderReview();
    renderResultActions();
    showScreen('result', { keepHash: true });
    sounds.done();
    if (ratio >= 0.8 || isBest) burst(ratio === 1 ? 110 : 70);
  }

  function renderReview() {
    els.review.textContent = '';
    state.answers.forEach((a, i) => {
      const verdict = a.ok ? 'Right' : a.timedOut ? 'Timed out' : 'Wrong';
      const yours = a.timedOut ? 'No answer' : a.options[a.chosen];
      const detail = a.ok ? `Your answer: ${yours}` : `Your answer: ${yours}. Right answer: ${a.options[a.correct]}`;
      els.review.appendChild(h('li', { class: a.ok ? 'is-right' : 'is-wrong', style: `animation-delay:${Math.min(i, 12) * 40}ms` },
        h('p', { class: 'review__q', text: `${i + 1}. ${a.q}` }),
        h('p', { class: 'review__a', text: `${verdict}. ${detail}` })));
    });
  }

  function renderResultActions() {
    const quiz = state.quiz;
    const box = els.resultActions;
    box.textContent = '';
    const total = state.qs.length;
    box.appendChild(h('button', { type: 'button', class: 'btn btn--primary', 'data-act': 'share-score' }, 'Share my score'));
    box.appendChild(h('button', { type: 'button', class: 'btn btn--ghost', 'data-act': 'again' }, 'Play again'));
    if (quiz.shared) box.appendChild(h('button', { type: 'button', class: 'btn btn--ghost', 'data-act': 'save-copy' }, 'Save to my quizzes'));
    box.appendChild(h('button', { type: 'button', class: 'btn btn--accent', 'data-act': 'create' }, quiz.shared ? 'Make my own quiz' : 'Create a quiz'));
    const backLabel = state.from === 'create' ? 'Back to editing' : state.from === 'mine' ? 'My quizzes' : 'More quizzes';
    box.appendChild(h('button', { type: 'button', class: 'btn btn--ghost', 'data-act': 'back' }, backLabel));
    box.dataset.total = String(total);
  }

  // ---------- Scores ----------

  function playerName() {
    return clampText(prefs.name, 20) || 'Player';
  }

  function addScore(quiz, total) {
    const list = readScores();
    list.push({
      name: playerName(), title: quiz.title, pts: state.score,
      correct: state.correct, total, at: Date.now(),
    });
    list.sort((a, b) => b.pts - a.pts || a.at - b.at);
    writeStore(STORAGE_KEYS.scores, list.slice(0, 50));
  }

  function renderBoard() {
    const list = readScores().slice(0, 10);
    els.board.textContent = '';
    if (!list.length) {
      els.board.appendChild(h('li', { class: 'empty' }, h('p', { text: 'No scores yet. Finish a quiz to get on the board.' })));
      els.clearScores.hidden = true;
      return;
    }
    els.clearScores.hidden = false;
    list.forEach((s, i) => {
      const when = new Date(s.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      els.board.appendChild(h('li', { style: `animation-delay:${i * 40}ms` },
        h('span', { class: 'board__rank', text: String(i + 1) }),
        h('div', { class: 'board__who' },
          h('p', { class: 'board__title', text: s.title }),
          h('p', { class: 'board__meta', text: `${s.name}, ${s.correct}/${s.total} right, ${when}` })),
        h('span', { class: 'board__pts', text: `${s.pts} pts` })));
    });
  }

  // ---------- Share window ----------

  function openShare(opts) {
    const link = opts.url;
    const blocked = !!opts.blocked;
    const message = `${opts.text} ${link}`;
    els.shareTitle.textContent = opts.heading;
    els.shareMsg.textContent = opts.msg;
    els.shareLink.value = blocked ? '' : link;
    els.shareStatus.textContent = '';
    els.shareStatus.classList.remove('is-warn');
    els.shareInfo.className = 'linkinfo';
    els.shareInfo.textContent = '';
    if (opts.length) {
      if (blocked) {
        els.shareInfo.classList.add('is-bad');
        els.shareInfo.textContent = `This link would be ${opts.length} characters, which is too long to share. Remove a few questions or shorten them.`;
      } else if (opts.length > LIMITS.shareWarn) {
        els.shareInfo.classList.add('is-warn');
        els.shareInfo.textContent = `Long link: ${opts.length} characters. Some apps may cut it off, so open it once to check before you send it.`;
      } else {
        els.shareInfo.textContent = `Link length: ${opts.length} characters. Fine for any app.`;
      }
    }
    const enc = encodeURIComponent;
    const links = {
      wa: `https://wa.me/?text=${enc(message)}`,
      tg: `https://t.me/share/url?url=${enc(link)}&text=${enc(opts.text)}`,
      x: `https://x.com/intent/post?text=${enc(opts.text)}&url=${enc(link)}`,
      mail: `mailto:?subject=${enc(opts.subject)}&body=${enc(message)}`,
    };
    [[els.shareWa, links.wa], [els.shareTg, links.tg], [els.shareX, links.x], [els.shareMail, links.mail]].forEach(([node, href]) => {
      if (blocked) {
        node.removeAttribute('href');
        node.setAttribute('aria-disabled', 'true');
      } else {
        node.setAttribute('href', href);
        node.removeAttribute('aria-disabled');
      }
    });
    els.shareCopy.disabled = blocked;
    els.shareCopy.textContent = 'Copy link';
    els.shareNative.hidden = !(typeof navigator.share === 'function') || blocked;
    shareData = { title: opts.subject, text: opts.text, url: link };
    if (!els.share.open) {
      if (els.share.showModal) els.share.showModal();
      else els.share.setAttribute('open', '');
    }
  }

  let shareData = null;
  let copyTimer = null;

  async function copyLink() {
    const link = els.shareLink.value;
    if (!link) return;
    let done = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
        done = true;
      }
    } catch (err) { /* try the older way next */ }
    if (!done) {
      try {
        els.shareLink.focus();
        els.shareLink.select();
        els.shareLink.setSelectionRange(0, link.length);
        done = document.execCommand('copy');
      } catch (err) { done = false; }
    }
    window.clearTimeout(copyTimer);
    if (done) {
      toast('Link copied');
      els.shareStatus.classList.remove('is-warn');
      els.shareStatus.textContent = 'Copied';
      els.shareCopy.textContent = 'Copied';
      copyTimer = window.setTimeout(() => { els.shareCopy.textContent = 'Copy link'; }, 2000);
    } else {
      els.shareLink.focus();
      els.shareLink.select();
      els.shareLink.setSelectionRange(0, link.length);
      els.shareStatus.classList.add('is-warn');
      els.shareStatus.textContent = 'Could not copy by itself. The link is selected: press Ctrl+C, or press and hold and choose Copy.';
      toast('Select the link and copy it');
    }
  }

  async function nativeShare() {
    if (!shareData || typeof navigator.share !== 'function') return;
    try {
      await navigator.share(shareData);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      els.shareStatus.classList.add('is-warn');
      els.shareStatus.textContent = 'The share sheet did not open. Use Copy link instead.';
    }
  }

  function shareQuiz(quiz) {
    const info = quizLink(quiz);
    const count = quiz.qs.length;
    openShare({
      heading: 'Share your quiz',
      msg: `${quiz.title}, ${count} ${count === 1 ? 'question' : 'questions'}. Anyone with the link can play it. Nothing is uploaded.`,
      text: `Can you beat my quiz "${quiz.title}"? Try it:`,
      subject: `Quiz: ${quiz.title}`,
      url: info.url,
      length: info.length,
      blocked: info.length > LIMITS.shareMax,
    });
  }

  function shareScore() {
    const quiz = state.quiz;
    const total = state.qs.length;
    let link = quiz.share();
    let note = '';
    if (!quiz.builtin && link.length > LIMITS.shareMax) {
      link = { url: baseUrl(), length: 0 };
      note = ' The quiz itself is too long for a link, so this one opens the app.';
    }
    openShare({
      heading: 'Share your score',
      msg: `I scored ${state.correct}/${total} on ${quiz.title}.${note}`,
      text: `I scored ${state.correct}/${total} on ${quiz.title}! Try it:`,
      subject: `I scored ${state.correct}/${total} on ${quiz.title}`,
      url: link.url,
      length: quiz.builtin ? 0 : link.length,
      blocked: false,
    });
  }

  // ---------- My quizzes ----------

  function renderMineCount() {
    const n = readMine().length;
    els.mineCount.hidden = n === 0;
    els.mineCount.textContent = String(n);
  }

  function renderMine() {
    const list = readMine().sort((a, b) => b.updated - a.updated);
    els.mineList.textContent = '';
    if (!list.length) {
      els.mineList.appendChild(h('div', { class: 'empty' },
        h('p', { text: 'You have not made a quiz yet.' }),
        h('button', { type: 'button', class: 'btn btn--primary', 'data-go': 'create' }, 'Create your first quiz')));
      return;
    }
    list.forEach((item, i) => {
      const best = bestFor(item.id);
      const secs = item.time === 0 ? 'no timer' : `${item.time} s per question`;
      const when = new Date(item.updated).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      const meta = `${item.qs.length} ${item.qs.length === 1 ? 'question' : 'questions'}, ${secs}, saved ${when}${best === null ? '' : `, best ${best} pts`}`;
      const act = (name, label, cls) => h('button', { type: 'button', class: `btn btn--small ${cls}`, 'data-act': name, 'data-id': item.id }, label);
      els.mineList.appendChild(h('article', { class: 'qitem', style: `animation-delay:${i * 40}ms` },
        h('h3', { class: 'qitem__title', text: item.title }),
        h('p', { class: 'qitem__meta', text: meta }),
        h('div', { class: 'qitem__actions' },
          act('play', 'Play', 'btn--primary'),
          act('share', 'Share', 'btn--accent'),
          act('edit', 'Edit', 'btn--ghost'),
          act('dup', 'Duplicate', 'btn--ghost'),
          act('del', 'Delete', 'btn--ghost'))));
    });
  }

  function findMine(id) {
    return readMine().find((q) => q.id === id) || null;
  }

  function upsertMine(entry) {
    const list = readMine();
    const at = list.findIndex((q) => q.id === entry.id);
    if (at >= 0) list[at] = entry;
    else list.push(entry);
    writeMine(list);
  }

  // ---------- Builder ----------

  const builder = {
    draft: null,
    editingId: null,
    preview: 0,
    submitted: false,
    saveTimer: null,
  };

  function blankQuestion() {
    return { q: '', o: ['', '', '', ''], a: -1, t: null };
  }

  function blankDraft() {
    return { title: '', time: DEFAULT_CUSTOM_TIME, qs: [blankQuestion()] };
  }

  function loadDraftFromStore() {
    const raw = readStore(STORAGE_KEYS.draft, null);
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.qs) || !raw.qs.length) return null;
    const qs = raw.qs.slice(0, LIMITS.questions).map((q) => {
      const o = Array.isArray(q.o) ? q.o.slice(0, 4).map((x) => String(x == null ? '' : x).slice(0, LIMITS.option)) : [];
      while (o.length < 2) o.push('');
      const a = Number.isInteger(q.a) && q.a >= 0 && q.a < o.length ? q.a : -1;
      const t = Number.isInteger(q.t) && q.t >= 0 && q.t <= 300 ? q.t : null;
      return { q: String(q.q == null ? '' : q.q).slice(0, LIMITS.question), o, a, t };
    });
    const time = Number.isInteger(raw.time) && raw.time >= 0 && raw.time <= 300 ? raw.time : DEFAULT_CUSTOM_TIME;
    return { title: String(raw.title == null ? '' : raw.title).slice(0, LIMITS.title), time, qs };
  }

  function draftIsEmpty(d) {
    return !d.title.trim() && d.qs.every((q) => !q.q.trim() && q.o.every((o) => !o.trim()));
  }

  function persistDraftSoon() {
    if (builder.editingId) return;
    window.clearTimeout(builder.saveTimer);
    builder.saveTimer = window.setTimeout(() => {
      if (draftIsEmpty(builder.draft)) writeStore(STORAGE_KEYS.draft, null);
      else writeStore(STORAGE_KEYS.draft, builder.draft);
    }, 300);
  }

  function enterCreate(quiz) {
    builder.submitted = false;
    builder.preview = 0;
    if (quiz) {
      builder.editingId = quiz.id;
      builder.draft = {
        title: quiz.title,
        time: quiz.time,
        qs: quiz.qs.map((q) => ({ q: q.q, o: q.o.slice(), a: q.a, t: q.t === undefined ? null : q.t })),
      };
    } else {
      builder.editingId = null;
      builder.draft = loadDraftFromStore() || blankDraft();
    }
    document.getElementById('create-title').textContent = quiz ? 'Edit your quiz' : 'Create your own quiz';
    els.bTitle.value = builder.draft.title;
    els.bTime.value = String(builder.draft.time);
    els.errors.hidden = true;
    renderBuilder();
    showScreen('create');
  }

  function renderTimeSelect() {
    els.bTime.textContent = '';
    TIME_CHOICES.forEach((s) => els.bTime.appendChild(h('option', { value: s, text: `${s} seconds` })));
    els.bTime.appendChild(h('option', { value: 0, text: 'No timer' }));
  }

  function questionTimeSelect(i, value) {
    const select = h('select', { id: `bq${i}-t`, 'data-f': 't' });
    select.appendChild(h('option', { value: '', text: 'Same as the quiz' }));
    TIME_CHOICES.forEach((s) => select.appendChild(h('option', { value: s, text: `${s} seconds` })));
    select.appendChild(h('option', { value: 0, text: 'No timer' }));
    select.value = value === null || value === undefined ? '' : String(value);
    return select;
  }

  function buildCard(q, i) {
    const total = builder.draft.qs.length;
    const card = h('section', { class: 'bq', 'data-i': i, 'aria-label': `Question ${i + 1}` });
    const tools = h('div', { class: 'bq__tools' });
    const toolBtn = (act, label, icon, disabled) => {
      const btn = h('button', { type: 'button', class: 'icon-btn icon-btn--small', 'data-act': act, 'aria-label': label, title: label, disabled });
      btn.appendChild(svgIcon(ICONS[icon], 18));
      return btn;
    };
    tools.append(
      toolBtn('up', `Move question ${i + 1} up`, 'up', i === 0),
      toolBtn('down', `Move question ${i + 1} down`, 'down', i === total - 1),
      toolBtn('remove', `Remove question ${i + 1}`, 'close', total === 1),
    );
    card.appendChild(h('div', { class: 'bq__head' }, h('h3', { class: 'bq__num', text: `Question ${i + 1}` }), tools));

    const ta = h('textarea', { id: `bq${i}-q`, 'data-f': 'q', rows: 2, maxlength: LIMITS.question, placeholder: 'Type your question' });
    ta.value = q.q;
    card.appendChild(h('div', { class: 'field' }, h('label', { for: `bq${i}-q`, text: 'Question' }), ta));

    const fieldset = h('fieldset', {}, h('legend', { text: 'Answers. Tick the circle next to the right one.' }));
    q.o.forEach((text, j) => {
      const radio = h('input', { type: 'radio', name: `bq${i}-a`, value: j, 'data-f': 'a', 'aria-label': `Mark answer ${j + 1} as the right answer` });
      radio.checked = q.a === j;
      const input = h('input', { type: 'text', id: `bq${i}-o${j}`, 'data-f': 'o', 'data-j': j, maxlength: LIMITS.option, placeholder: `Answer ${j + 1}`, 'aria-label': `Answer ${j + 1}` });
      input.value = text;
      const row = h('div', { class: 'bopt' },
        h('label', { class: 'bopt__radio' }, radio, h('span', { class: 'bopt__dot', 'aria-hidden': 'true' })),
        input);
      if (q.o.length > 2) {
        const rm = h('button', { type: 'button', class: 'icon-btn icon-btn--small', 'data-act': 'rmopt', 'data-j': j, 'aria-label': `Remove answer ${j + 1}`, title: 'Remove answer' });
        rm.appendChild(svgIcon(ICONS.close, 16));
        row.appendChild(rm);
      }
      fieldset.appendChild(row);
    });
    if (q.o.length < 4) fieldset.appendChild(h('button', { type: 'button', class: 'link-btn add-opt', 'data-act': 'addopt' }, 'Add another answer'));
    card.appendChild(fieldset);

    card.appendChild(h('div', { class: 'field' }, h('label', { for: `bq${i}-t`, text: 'Time for this question' }), questionTimeSelect(i, q.t)));
    card.appendChild(h('p', { class: 'bq__err', id: `bq${i}-err`, 'data-err': i }));
    return card;
  }

  function renderBuilder() {
    els.bQuestions.textContent = '';
    builder.draft.qs.forEach((q, i) => els.bQuestions.appendChild(buildCard(q, i)));
    els.bAdd.disabled = builder.draft.qs.length >= LIMITS.questions;
    els.bAdd.textContent = builder.draft.qs.length >= LIMITS.questions ? `Limit reached: ${LIMITS.questions} questions` : 'Add a question';
    if (builder.preview >= builder.draft.qs.length) builder.preview = builder.draft.qs.length - 1;
    els.bTitleCount.textContent = `${els.bTitle.value.length}/${LIMITS.title}`;
    refreshBuilder();
  }

  // Marks the card with the previewed question
  function markActiveCard() {
    els.bQuestions.querySelectorAll('.bq').forEach((card) => {
      card.classList.toggle('is-active', Number(card.dataset.i) === builder.preview);
    });
  }

  function validateDraft() {
    const d = builder.draft;
    const errors = [];
    const perQuestion = {};
    const title = d.title.trim();
    if (title.length < 2) errors.push({ field: 'b-title', msg: 'Give your quiz a title (at least 2 letters).' });
    const qs = [];
    d.qs.forEach((q, i) => {
      const own = [];
      const text = q.q.trim();
      if (!text) own.push({ field: `bq${i}-q`, msg: 'Write the question.' });
      const kept = [];
      let ticked = -1;
      q.o.forEach((raw, j) => {
        const t = raw.trim();
        if (t) {
          if (q.a === j) ticked = kept.length;
          kept.push(t);
        }
      });
      if (kept.length < 2) {
        const firstBlank = q.o.findIndex((o) => !o.trim());
        own.push({ field: `bq${i}-o${firstBlank < 0 ? 0 : firstBlank}`, msg: 'Fill in at least 2 answers.' });
      } else {
        const lower = kept.map((k) => k.toLowerCase());
        if (new Set(lower).size !== lower.length) own.push({ field: `bq${i}-o0`, msg: 'Two answers are the same. Make each one different.' });
        if (q.a < 0) own.push({ field: `bq${i}-o0`, msg: 'Tick the circle next to the right answer.' });
        else if (ticked < 0) own.push({ field: `bq${i}-o${q.a}`, msg: 'The ticked answer is empty. Type it or tick another one.' });
      }
      if (own.length) {
        perQuestion[i] = own;
        own.forEach((e) => errors.push({ ...e, msg: `Question ${i + 1}: ${e.msg}` }));
      } else {
        const out = { q: text, o: kept, a: ticked };
        if (q.t !== null && q.t !== undefined) out.t = q.t;
        qs.push(out);
      }
    });
    const quiz = errors.length ? null : { title, time: d.time, qs };
    return { errors, perQuestion, quiz };
  }

  // A forgiving version for the live link size and preview
  function lenientQuiz() {
    const d = builder.draft;
    const qs = [];
    d.qs.forEach((q) => {
      const text = q.q.trim();
      const kept = [];
      let ticked = -1;
      q.o.forEach((raw, j) => {
        const t = raw.trim();
        if (t) { if (q.a === j) ticked = kept.length; kept.push(t); }
      });
      if (text && kept.length >= 2 && ticked >= 0) {
        const out = { q: text, o: kept, a: ticked };
        if (q.t !== null && q.t !== undefined) out.t = q.t;
        qs.push(out);
      }
    });
    return qs.length ? { title: d.title.trim() || 'Untitled', time: d.time, qs } : null;
  }

  function renderLinkMeter() {
    const quiz = lenientQuiz();
    const box = els.linkmeter;
    box.className = 'linkmeter';
    box.textContent = '';
    if (!quiz) {
      box.textContent = 'Finish a question to see how long your share link will be.';
      return;
    }
    const info = quizLink(quiz);
    let tail = 'Good size for any app.';
    if (info.length > LIMITS.shareMax) { box.classList.add('is-bad'); tail = 'Too long to share. Remove some questions or shorten them.'; }
    else if (info.length > LIMITS.shareWarn) { box.classList.add('is-warn'); tail = 'Long link. Some apps may cut it off.'; }
    const bar = h('span', { class: 'meter', 'aria-hidden': 'true' }, h('i'));
    bar.firstChild.style.width = `${Math.min(100, (info.length / LIMITS.shareMax) * 100)}%`;
    box.append(`Share link size: `, h('b', { text: `${info.length} characters` }), `. ${tail}`, bar);
  }

  function renderPreview() {
    const d = builder.draft;
    const idx = Math.min(builder.preview, d.qs.length - 1);
    els.previewChips.textContent = '';
    d.qs.forEach((_, i) => {
      els.previewChips.appendChild(h('button', {
        type: 'button', class: 'chip', 'data-i': i, 'aria-pressed': String(i === idx), 'aria-label': `Preview question ${i + 1}`,
      }, String(i + 1)));
    });
    const q = d.qs[idx];
    const secs = q.t !== null && q.t !== undefined ? q.t : d.time;
    const box = els.preview;
    box.textContent = '';
    box.appendChild(h('p', { class: 'preview__meta' },
      h('span', { text: `Question ${idx + 1} of ${d.qs.length}` }),
      h('span', { text: secs === 0 ? 'No timer' : `${secs} s` })));
    box.appendChild(h('p', { class: `question${q.q.trim() ? '' : ' is-empty'}`, text: q.q.trim() || 'Your question shows up here' }));
    const wrap = h('div', { class: 'options' });
    q.o.forEach((text, j) => {
      const blank = !text.trim();
      const isKey = q.a === j && !blank;
      wrap.appendChild(h('div', { class: `option${isKey ? ' is-key' : ''}${blank ? ' is-blank' : ''}` },
        h('span', { class: 'option__key', 'aria-hidden': 'true', text: String(j + 1) }),
        h('span', { class: 'option__text', text: blank ? `Answer ${j + 1}` : text.trim() }),
        h('span', { class: 'option__mark', text: isKey ? 'Right answer' : '' })));
    });
    box.appendChild(wrap);
  }

  function showBuilderErrors(result) {
    // inline errors
    els.bQuestions.querySelectorAll('.bq__err').forEach((p) => {
      const list = result.perQuestion[p.dataset.err];
      p.textContent = list ? list.map((e) => e.msg).join(' ') : '';
    });
    els.bQuestions.querySelectorAll('.bq').forEach((card) => {
      card.classList.toggle('is-invalid', !!result.perQuestion[card.dataset.i]);
    });
    const titleBad = result.errors.some((e) => e.field === 'b-title');
    els.bTitleErr.textContent = titleBad ? 'Give your quiz a title (at least 2 letters).' : '';
    els.bTitle.parentElement.classList.toggle('is-invalid', titleBad);
    els.bTitle.setAttribute('aria-invalid', String(titleBad));
    // summary
    if (!result.errors.length) { els.errors.hidden = true; els.errors.textContent = ''; return; }
    els.errors.hidden = false;
    els.errors.textContent = '';
    els.errors.appendChild(h('strong', { text: `Fix ${result.errors.length === 1 ? 'this' : 'these'} to save your quiz` }));
    const ul = h('ul');
    result.errors.slice(0, 8).forEach((e) => {
      ul.appendChild(h('li', {}, h('button', { type: 'button', class: 'link-btn', 'data-focus': e.field, text: e.msg })));
    });
    if (result.errors.length > 8) ul.appendChild(h('li', { text: `And ${result.errors.length - 8} more.` }));
    els.errors.appendChild(ul);
  }

  function refreshBuilder() {
    renderPreview();
    markActiveCard();
    renderLinkMeter();
    if (builder.submitted) showBuilderErrors(validateDraft());
    persistDraftSoon();
  }

  function focusField(id) {
    const node = document.getElementById(id);
    if (node) {
      node.focus();
      node.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  function trySave() {
    builder.submitted = true;
    const result = validateDraft();
    showBuilderErrors(result);
    if (!result.quiz) {
      say(`${result.errors.length} ${result.errors.length === 1 ? 'thing needs' : 'things need'} fixing`);
      els.errors.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      return null;
    }
    return result.quiz;
  }

  function persistQuiz(quiz) {
    const id = builder.editingId || newId();
    const entry = { id, updated: Date.now(), ...quiz };
    upsertMine(entry);
    builder.editingId = null;
    writeStore(STORAGE_KEYS.draft, null);
    window.clearTimeout(builder.saveTimer);
    builder.draft = blankDraft();
    builder.submitted = false;
    return entry;
  }

  function onBuilderInput(event) {
    const t = event.target;
    const card = t.closest('.bq');
    if (!card) return;
    const q = builder.draft.qs[Number(card.dataset.i)];
    if (!q) return;
    builder.preview = Number(card.dataset.i);
    if (t.dataset.f === 'q') q.q = t.value;
    else if (t.dataset.f === 'o') q.o[Number(t.dataset.j)] = t.value;
    refreshBuilder();
  }

  function onBuilderChange(event) {
    const t = event.target;
    const card = t.closest('.bq');
    if (!card) return;
    const q = builder.draft.qs[Number(card.dataset.i)];
    builder.preview = Number(card.dataset.i);
    if (t.dataset.f === 'a') q.a = Number(t.value);
    else if (t.dataset.f === 't') q.t = t.value === '' ? null : Number(t.value);
    refreshBuilder();
  }

  function onBuilderClick(event) {
    const focusBtn = event.target.closest('[data-focus]');
    if (focusBtn) { focusField(focusBtn.dataset.focus); return; }
    const btn = event.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.bq');
    const i = Number(card.dataset.i);
    const qs = builder.draft.qs;
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      const to = act === 'up' ? i - 1 : i + 1;
      if (to < 0 || to >= qs.length) return;
      [qs[i], qs[to]] = [qs[to], qs[i]];
      builder.preview = to;
      renderBuilder();
      const moved = els.bQuestions.children[to].querySelector(`[data-act="${act}"]:not(:disabled)`) || els.bQuestions.children[to].querySelector('[data-act]:not(:disabled)');
      if (moved) moved.focus();
      say(`Question moved to position ${to + 1}`);
    } else if (act === 'remove') {
      if (qs.length <= 1) return;
      const filled = qs[i].q.trim() || qs[i].o.some((o) => o.trim());
      if (filled && !confirmTap(btn, 'Sure?')) { btn.setAttribute('aria-label', 'Tap again to remove this question'); return; }
      qs.splice(i, 1);
      builder.preview = Math.max(0, Math.min(builder.preview, qs.length - 1));
      renderBuilder();
      const focusCard = els.bQuestions.children[Math.min(i, qs.length - 1)];
      if (focusCard) focusCard.querySelector('textarea').focus();
      say('Question removed');
    } else if (act === 'addopt') {
      if (qs[i].o.length < 4) {
        qs[i].o.push('');
        renderBuilder();
        document.getElementById(`bq${i}-o${qs[i].o.length - 1}`).focus();
      }
    } else if (act === 'rmopt') {
      const j = Number(btn.dataset.j);
      if (qs[i].o.length <= 2) return;
      qs[i].o.splice(j, 1);
      if (qs[i].a === j) qs[i].a = -1;
      else if (qs[i].a > j) qs[i].a -= 1;
      renderBuilder();
      document.getElementById(`bq${i}-o${Math.min(j, qs[i].o.length - 1)}`).focus();
    }
  }

  function addQuestion() {
    if (builder.draft.qs.length >= LIMITS.questions) return;
    builder.draft.qs.push(blankQuestion());
    builder.preview = builder.draft.qs.length - 1;
    renderBuilder();
    focusField(`bq${builder.preview}-q`);
    say(`Question ${builder.draft.qs.length} added`);
  }

  // ---------- Opening links ----------

  function openFromHash(hash, source) {
    const m = String(hash || '').match(/^#?([qb])=([A-Za-z0-9\-_]+)$/);
    if (!m) return false;
    const res = parseShared(`#${m[1]}=${m[2]}`);
    if (res.builtin) {
      playBuiltin(res.builtin, 'start');
      return true;
    }
    if (res.quiz) {
      playCustom(res.quiz, { id: `x${hashText(m[2])}`, shared: true, countdown: true, from: 'start' });
      return true;
    }
    showScreen('start');
    toast('That quiz link is damaged or incomplete');
    els.startLead.textContent = 'That quiz link did not work. Ask your friend to send it again, or pick a topic below.';
    return source === 'load';
  }

  // ---------- Events ----------

  function wire() {
    document.addEventListener('click', (event) => {
      const go = event.target.closest('[data-go]');
      if (go) {
        const name = go.dataset.go;
        if (name === 'create') enterCreate(null);
        else {
          if (name === 'mine') renderMine();
          if (name === 'scores') { els.playerName.value = prefs.name; renderBoard(); }
          if (name === 'start') { els.startLead.textContent = 'Choose a topic, a mode and a length. Then go.'; renderTopics(); }
          showScreen(name);
        }
      }
    });

    wireSegment(els.modeGroup, (btn) => {
      prefs.mode = btn.dataset.id;
      savePrefs();
      renderModeButtons();
      const again = els.modeGroup.querySelector(`[data-id="${prefs.mode}"]`);
      if (again && document.activeElement === document.body) again.focus();
      renderTopics();
    });
    wireSegment(els.lenGroup, (btn) => {
      prefs.len = Number(btn.dataset.len);
      savePrefs();
      renderModeButtons();
      const again = els.lenGroup.querySelector(`[data-len="${prefs.len}"]`);
      if (again) again.focus();
    });
    // keep focus on the chosen button after the re-render
    els.modeGroup.addEventListener('keyup', () => {});

    els.topics.addEventListener('click', (event) => {
      const btn = event.target.closest('.topic');
      if (btn) playBuiltin(btn.dataset.topic, 'start');
    });

    els.options.addEventListener('click', (event) => {
      const btn = event.target.closest('.option');
      if (btn && !btn.disabled) answer(Number(btn.dataset.i), event);
    });
    els.next.addEventListener('click', next);
    els.quit.addEventListener('click', () => {
      const from = state.from;
      showScreen(from === 'create' || from === 'mine' ? from : 'start');
      if (from === 'mine') renderMine();
      if (from === 'start') renderTopics();
    });
    els.ready.addEventListener('click', beginQuiz);

    els.resultActions.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'share-score') shareScore();
      else if (act === 'again' && state.replay) state.replay();
      else if (act === 'create') enterCreate(null);
      else if (act === 'save-copy') {
        const src = state.quiz.source;
        const list = readMine();
        const dup = list.find((q) => q.title === src.title && JSON.stringify(q.qs) === JSON.stringify(src.qs));
        if (dup) toast('Already in My quizzes');
        else {
          upsertMine({ id: newId(), updated: Date.now(), title: src.title, time: src.time, qs: src.qs });
          renderMine();
          toast('Saved to My quizzes');
        }
      } else if (act === 'back') {
        const from = state.from;
        if (from === 'create') showScreen('create');
        else if (from === 'mine') { renderMine(); showScreen('mine'); }
        else { renderTopics(); showScreen('start'); }
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (els.share.open) return;
      if (currentScreen !== 'quiz') return;
      const tag = (event.target && event.target.tagName) || '';
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag);
      if (typing) return;
      if (!els.ready.hidden) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); beginQuiz(); }
        return;
      }
      if (/^[1-4]$/.test(event.key)) {
        const btn = els.options.children[Number(event.key) - 1];
        if (btn && !btn.disabled) { event.preventDefault(); answer(Number(event.key) - 1); }
      } else if (event.key === 'Enter' && tag !== 'BUTTON' && !els.next.disabled) {
        event.preventDefault();
        next();
      }
    });

    els.btnSound.addEventListener('click', () => {
      prefs.sound = !prefs.sound;
      savePrefs();
      renderSound();
      if (prefs.sound) sounds.on();
      toast(prefs.sound ? 'Sound on' : 'Sound off');
    });
    els.btnTheme.addEventListener('click', () => {
      prefs.theme = prefs.theme === 'light' ? 'dark' : 'light';
      savePrefs();
      renderTheme();
    });

    // builder
    els.bTitle.addEventListener('input', () => {
      builder.draft.title = els.bTitle.value;
      els.bTitleCount.textContent = `${els.bTitle.value.length}/${LIMITS.title}`;
      refreshBuilder();
    });
    els.bTime.addEventListener('change', () => {
      builder.draft.time = Number(els.bTime.value);
      refreshBuilder();
    });
    els.bQuestions.addEventListener('input', onBuilderInput);
    els.bQuestions.addEventListener('change', onBuilderChange);
    els.bQuestions.addEventListener('click', onBuilderClick);
    els.bQuestions.addEventListener('focusin', (event) => {
      const card = event.target.closest('.bq');
      if (card && Number(card.dataset.i) !== builder.preview) {
        builder.preview = Number(card.dataset.i);
        renderPreview();
        markActiveCard();
      }
    });
    els.errors.addEventListener('click', onBuilderClick);
    els.form.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') event.preventDefault();
    });
    els.bAdd.addEventListener('click', addQuestion);
    els.previewChips.addEventListener('click', (event) => {
      const chip = event.target.closest('.chip');
      if (!chip) return;
      builder.preview = Number(chip.dataset.i);
      renderPreview();
      markActiveCard();
    });
    els.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const quiz = trySave();
      if (!quiz) return;
      const wasEditing = !!builder.editingId;
      persistQuiz(quiz);
      renderMine();
      showScreen('mine');
      toast(wasEditing ? 'Changes saved' : 'Quiz saved to My quizzes');
    });
    els.bSaveShare.addEventListener('click', () => {
      const quiz = trySave();
      if (!quiz) return;
      const entry = persistQuiz(quiz);
      renderMine();
      showScreen('mine');
      shareQuiz(entry);
    });
    els.bPlay.addEventListener('click', () => {
      const quiz = trySave();
      if (!quiz) return;
      playCustom(quiz, { id: 'draft', practice: true, from: 'create' });
    });
    els.bCancel.addEventListener('click', () => {
      if (builder.editingId) { renderMine(); showScreen('mine'); } else { renderTopics(); showScreen('start'); }
    });
    els.bReset.addEventListener('click', () => {
      if (!confirmTap(els.bReset, 'Tap again to start over')) return;
      if (builder.editingId) {
        const original = findMine(builder.editingId);
        enterCreate(original);
      } else {
        writeStore(STORAGE_KEYS.draft, null);
        builder.draft = blankDraft();
        builder.preview = 0;
        builder.submitted = false;
        els.bTitle.value = '';
        els.bTime.value = String(DEFAULT_CUSTOM_TIME);
        els.errors.hidden = true;
        els.bTitleErr.textContent = '';
        els.bTitle.parentElement.classList.remove('is-invalid');
        renderBuilder();
        els.bTitle.focus();
      }
    });

    // my quizzes
    els.mineList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-act]');
      if (!btn) return;
      const item = findMine(btn.dataset.id);
      if (!item) return;
      const act = btn.dataset.act;
      if (act === 'play') playCustom(item, { id: item.id, from: 'mine' });
      else if (act === 'share') shareQuiz(item);
      else if (act === 'edit') enterCreate(item);
      else if (act === 'dup') {
        upsertMine({ ...item, id: newId(), title: clampText(`${item.title} (copy)`, LIMITS.title), updated: Date.now() });
        renderMine();
        toast('Copy added to the top of the list');
      } else if (act === 'del') {
        if (!confirmTap(btn, 'Tap again to delete')) return;
        writeMine(readMine().filter((q) => q.id !== item.id));
        renderMine();
        toast('Quiz deleted');
      }
    });
    els.pasteForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const res = parseShared(els.pasteInput.value);
      if (res.error) {
        els.pasteErr.textContent = res.error === 'empty'
          ? 'Paste a quiz link first.'
          : 'That does not look like a quiz link. Copy the whole link your friend sent.';
        els.pasteInput.setAttribute('aria-invalid', 'true');
        return;
      }
      els.pasteErr.textContent = '';
      els.pasteInput.removeAttribute('aria-invalid');
      const match = els.pasteInput.value.trim().match(/([qb])=([A-Za-z0-9\-_]+)\s*$/);
      els.pasteInput.value = '';
      openFromHash(`#${match[1]}=${match[2]}`, 'paste');
    });
    els.pasteInput.addEventListener('input', () => { els.pasteErr.textContent = ''; });

    // scores
    els.playerName.addEventListener('input', () => {
      prefs.name = clampText(els.playerName.value, 20);
      savePrefs();
    });
    els.clearScores.addEventListener('click', () => {
      if (!confirmTap(els.clearScores, 'Tap again to clear')) return;
      writeStore(STORAGE_KEYS.scores, []);
      renderBoard();
      toast('Scores cleared');
    });

    // share window
    els.shareClose.addEventListener('click', () => els.share.close());
    els.share.addEventListener('click', (event) => { if (event.target === els.share) els.share.close(); });
    els.shareCopy.addEventListener('click', copyLink);
    els.shareNative.addEventListener('click', nativeShare);
    els.share.addEventListener('click', (event) => {
      const a = event.target.closest('a.btn');
      if (a && a.getAttribute('aria-disabled') === 'true') event.preventDefault();
    });
    els.shareLink.addEventListener('focus', () => els.shareLink.select());

    root.addEventListener('hashchange', () => { openFromHash(root.location.hash, 'change'); });
  }

  // ---------- Start up ----------

  function init() {
    renderTheme();
    renderSound();
    renderTimeSelect();
    renderModeButtons();
    renderTopics();
    renderHeaderBest();
    renderMineCount();
    wire();
    if (root.location.hash && openFromHash(root.location.hash, 'load')) return;
    showScreen('start', { focus: false });
  }

  init();
})(typeof window !== 'undefined' ? window : globalThis);
