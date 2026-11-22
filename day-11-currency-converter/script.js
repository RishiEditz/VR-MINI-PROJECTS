/* Currency Converter (Mini Projects, Day 11).
   Live rates from the free Frankfurter API (no key), cached on the device,
   with built-in sample rates so it still works offline. */
(function () {
  'use strict';

  var API = 'https://api.frankfurter.dev/v1';

  var NAMES = {
    AUD: 'Australian Dollar', BRL: 'Brazilian Real', CAD: 'Canadian Dollar', CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan', CZK: 'Czech Koruna', DKK: 'Danish Krone', EUR: 'Euro',
    GBP: 'British Pound', HKD: 'Hong Kong Dollar', HUF: 'Hungarian Forint', IDR: 'Indonesian Rupiah',
    ILS: 'Israeli Shekel', INR: 'Indian Rupee', ISK: 'Icelandic Krona', JPY: 'Japanese Yen',
    KRW: 'South Korean Won', MXN: 'Mexican Peso', MYR: 'Malaysian Ringgit', NOK: 'Norwegian Krone',
    NZD: 'New Zealand Dollar', PHP: 'Philippine Peso', PLN: 'Polish Zloty', RON: 'Romanian Leu',
    SEK: 'Swedish Krona', SGD: 'Singapore Dollar', THB: 'Thai Baht', TRY: 'Turkish Lira',
    USD: 'US Dollar', ZAR: 'South African Rand'
  };

  var SYMBOLS = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CNY: '¥', KRW: '₩',
    AUD: '$', CAD: '$', NZD: '$', HKD: '$', SGD: '$', MXN: '$', BRL: 'R$', CHF: 'Fr', TRY: '₺',
    ILS: '₪', PHP: '₱', THB: '฿', PLN: 'zł', ZAR: 'R', SEK: 'kr', NOK: 'kr', DKK: 'kr',
    ISK: 'kr', CZK: 'Kč', HUF: 'Ft', RON: 'lei', MYR: 'RM', IDR: 'Rp'
  };

  /* Sample rates (USD base), used until live rates arrive or when fully offline. */
  var FALLBACK = {
    date: '2026-11-20', base: 'USD',
    rates: {
      USD: 1, AUD: 1.5002, BRL: 5.938, CAD: 1.4307, CHF: 0.83922, CNY: 6.6777, CZK: 22.265, DKK: 6.8013,
      EUR: 0.90992, GBP: 0.76192, HKD: 7.8389, HUF: 339.9, IDR: 18263, ILS: 3.3428, INR: 92.68,
      ISK: 124.84, JPY: 158.64, KRW: 1339.44, MXN: 19.0673, MYR: 4.1125, NOK: 9.7525, NZD: 1.8169,
      PHP: 63.777, PLN: 4.0567, RON: 4.8674, SEK: 10.2025, SGD: 1.2884, THB: 33.905, TRY: 50.572, ZAR: 17.4692
    }
  };

  var KEYS = { rates: 'cc.rates.v1', history: 'cc.history.v1', pair: 'cc.pair.v1', theme: 'cc.theme.v1' };
  var QUICK = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD'];
  var HISTORY_MAX = 6;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    amount: $('amount'), err: $('amount-err'), from: $('from'), to: $('to'),
    fromBadge: $('from-badge'), toBadge: $('to-badge'), swap: $('swap'),
    resFrom: $('res-from'), resValue: $('res-value'), resRate: $('res-rate'),
    status: $('status'), statusText: $('status-text'), copy: $('copy'),
    trend: $('trend'), trendChange: $('trend-change'), trendSvg: $('trend-svg'),
    trendArea: $('trend-area'), trendLine: $('trend-line'), trendDot: $('trend-dot'), trendTip: $('trend-tip'),
    trendLow: $('trend-low'), trendNote: $('trend-note'), trendHigh: $('trend-high'),
    quick: $('quick'), history: $('history'), clearHistory: $('clear-history'), historyEmpty: $('history-empty'),
    refresh: $('refresh'), theme: $('theme'), themeIcon: $('theme-icon'), toast: $('toast')
  };

  var state = { rates: FALLBACK.rates, date: FALLBACK.date, source: 'sample', amount: 100, from: 'USD', to: 'INR' };
  var series = null;          /* { dates: [], values: [] } for the current pair */
  var seriesToken = 0;
  var historyTimer = 0;
  var toastTimer = 0;

  /* ---------- storage helpers (never throw) ---------- */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ }
  }

  /* ---------- formatting ---------- */
  function fmt(n, max) {
    var abs = Math.abs(n);
    var digits = max != null ? max : (abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6);
    try {
      return new Intl.NumberFormat(undefined, { minimumFractionDigits: Math.min(2, digits), maximumFractionDigits: digits }).format(n);
    } catch (e) { return n.toFixed(digits); }
  }
  function fmtAmount(n) {
    try { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(n); } catch (e) { return String(n); }
  }
  function niceDate(iso) {
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    try { return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }); } catch (e) { return iso; }
  }

  /* Accepts "1,234.50", "1234.5", " 12 " ... returns a number or NaN. */
  function parseAmount(text) {
    var t = String(text).trim().replace(/[\s,_]/g, '');
    if (t === '' || !/^\d*\.?\d+$|^\d+\.$/.test(t)) return NaN;
    var n = parseFloat(t);
    return isFinite(n) && n >= 0 && n < 1e15 ? n : NaN;
  }

  /* ---------- conversion ---------- */
  function rateOf(from, to) {
    var rf = state.rates[from], rt = state.rates[to];
    if (!rf || !rt) return NaN;
    return rt / rf;
  }
  function convert(amount, from, to) { return amount * rateOf(from, to); }

  /* ---------- UI: selects ---------- */
  function fillSelects() {
    var codes = Object.keys(NAMES).sort();
    var html = codes.map(function (c) { return '<option value="' + c + '">' + c + ' – ' + NAMES[c] + '</option>'; }).join('');
    el.from.innerHTML = html;
    el.to.innerHTML = html;
  }

  function setBadges() {
    el.fromBadge.textContent = SYMBOLS[state.from] || state.from[0];
    el.toBadge.textContent = SYMBOLS[state.to] || state.to[0];
  }

  /* ---------- UI: result ---------- */
  function render(animate) {
    var n = parseAmount(el.amount.value);
    var bad = isNaN(n);
    el.err.hidden = !bad;
    el.amount.setAttribute('aria-invalid', bad ? 'true' : 'false');
    setBadges();

    var rate = rateOf(state.from, state.to);
    var fromName = NAMES[state.from], toName = NAMES[state.to];

    if (bad) {
      el.resFrom.textContent = 'Type an amount to convert';
      el.resValue.textContent = '--';
    } else {
      state.amount = n;
      el.resFrom.textContent = fmtAmount(n) + ' ' + fromName + ' =';
      el.resValue.textContent = fmt(convert(n, state.from, state.to)) + ' ' + toName;
    }
    el.resRate.textContent = '1 ' + state.from + ' = ' + fmt(rate, rate >= 100 ? 2 : 4) + ' ' + state.to;

    if (animate) {
      el.resValue.classList.remove('bump');
      void el.resValue.offsetWidth;
      el.resValue.classList.add('bump');
    }
    renderQuick(bad ? 1 : n);
    save(KEYS.pair, { from: state.from, to: state.to, amount: el.amount.value });
  }

  function renderQuick(n) {
    var frag = document.createDocumentFragment();
    QUICK.filter(function (c) { return c !== state.from; }).slice(0, 8).forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'q' + (c === state.to ? ' on' : '');
      b.setAttribute('data-code', c);
      b.setAttribute('aria-label', fmtAmount(n) + ' ' + state.from + ' in ' + NAMES[c]);
      var code = document.createElement('b'); code.textContent = c;
      var val = document.createElement('span'); val.textContent = fmt(convert(n, state.from, c));
      b.appendChild(code); b.appendChild(val);
      frag.appendChild(b);
    });
    el.quick.innerHTML = '';
    el.quick.appendChild(frag);
  }

  function setStatus(kind, text) {
    el.status.setAttribute('data-state', kind);
    el.statusText.textContent = text;
  }
  function describeStatus() {
    if (state.source === 'live') setStatus('live', 'Live rates · ' + niceDate(state.date));
    else if (state.source === 'saved') setStatus('saved', 'Saved rates · ' + niceDate(state.date));
    else setStatus('sample', 'Offline sample rates');
  }

  /* ---------- history ---------- */
  function readHistory() { var h = load(KEYS.history, []); return Array.isArray(h) ? h : []; }
  function renderHistory() {
    var list = readHistory();
    el.history.innerHTML = '';
    el.historyEmpty.hidden = list.length > 0;
    el.clearHistory.hidden = list.length === 0;
    list.forEach(function (h, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-i', i);
      var l = document.createElement('span'); l.className = 'h-left'; l.textContent = fmtAmount(h.amount) + ' ' + h.from + ' → ' + h.to;
      var r = document.createElement('span'); r.className = 'h-right'; r.textContent = fmt(convert(h.amount, h.from, h.to));
      b.appendChild(l); b.appendChild(r);
      li.appendChild(b);
      el.history.appendChild(li);
    });
  }
  function pushHistory() {
    var n = parseAmount(el.amount.value);
    if (isNaN(n) || n === 0) return;
    var list = readHistory().filter(function (h) { return !(h.from === state.from && h.to === state.to && h.amount === n); });
    list.unshift({ amount: n, from: state.from, to: state.to });
    save(KEYS.history, list.slice(0, HISTORY_MAX));
    renderHistory();
  }
  function scheduleHistory() {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(pushHistory, 1200);
  }

  /* ---------- trend chart ---------- */
  function iso(d) { return d.toISOString().slice(0, 10); }

  function loadSeries() {
    var token = ++seriesToken;
    var from = state.from, to = state.to;
    series = null;
    el.trend.classList.add('empty');
    el.trendChange.textContent = '--';
    el.trendChange.className = 'chip';
    el.trendLow.textContent = 'Low --'; el.trendHigh.textContent = 'High --';
    el.trendNote.textContent = 'Loading chart...';
    el.trendLine.setAttribute('d', ''); el.trendArea.setAttribute('d', '');
    el.trendDot.hidden = true; el.trendTip.hidden = true;

    if (from === to) { el.trendNote.textContent = 'Pick two different currencies'; return; }

    var end = new Date(), start = new Date(Date.now() - 30 * 86400000);
    var cacheKey = 'cc.series.' + from + to;
    var url = API + '/' + iso(start) + '..' + iso(end) + '?base=' + from + '&symbols=' + to;

    fetch(url).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); }).then(function (data) {
      if (token !== seriesToken) return;
      var dates = Object.keys(data.rates).sort();
      var values = dates.map(function (d) { return data.rates[d][to]; });
      if (values.length < 2) throw new Error('short');
      var pack = { dates: dates, values: values, at: Date.now() };
      save(cacheKey, pack);
      drawSeries(pack, false);
    }).catch(function () {
      if (token !== seriesToken) return;
      var cached = load(cacheKey, null);
      if (cached && cached.values && cached.values.length > 1) drawSeries(cached, true);
      else el.trendNote.textContent = 'Chart needs a connection';
    });
  }

  function drawSeries(pack, fromCache) {
    series = pack;
    var v = pack.values, W = 600, H = 180, padT = 16, padB = 14;
    var min = Math.min.apply(null, v), max = Math.max.apply(null, v);
    var span = max - min || max * 0.01 || 1;
    function x(i) { return (i / (v.length - 1)) * W; }
    function y(val) { return padT + (1 - (val - min) / span) * (H - padT - padB); }
    var line = v.map(function (val, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(val).toFixed(1); }).join(' ');
    el.trendLine.setAttribute('d', line);
    el.trendArea.setAttribute('d', line + ' L' + W + ' ' + H + ' L0 ' + H + ' Z');
    el.trend.classList.remove('empty');

    var first = v[0], last = v[v.length - 1];
    var pct = ((last - first) / first) * 100;
    el.trendChange.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    el.trendChange.className = 'chip ' + (pct >= 0 ? 'up' : 'down');
    var dec = last >= 100 ? 2 : 4;
    el.trendLow.textContent = 'Low ' + fmt(min, dec);
    el.trendHigh.textContent = 'High ' + fmt(max, dec);
    el.trendNote.textContent = fromCache ? 'Saved chart · touch it' : 'Touch the chart';
    el.trendSvg.setAttribute('aria-label', state.from + ' to ' + state.to + ' over the last 30 days, ' + (pct >= 0 ? 'up ' : 'down ') + Math.abs(pct).toFixed(2) + ' percent');
  }

  function scrub(e) {
    if (!series) return;
    var box = el.trendSvg.getBoundingClientRect();
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var t = Math.max(0, Math.min(1, (cx - box.left) / box.width));
    var i = Math.round(t * (series.values.length - 1));
    var v = series.values, min = Math.min.apply(null, v), max = Math.max.apply(null, v);
    var span = max - min || max * 0.01 || 1;
    var py = (16 + (1 - (v[i] - min) / span) * (180 - 16 - 14)) / 180;
    el.trendDot.style.left = (i / (v.length - 1)) * 100 + '%';
    el.trendDot.style.top = py * 100 + '%';
    el.trendDot.hidden = false;
    el.trendTip.textContent = niceDate(series.dates[i]) + ' · ' + fmt(v[i], v[i] >= 100 ? 2 : 4);
    el.trendTip.hidden = false;
  }
  function unscrub() { el.trendDot.hidden = true; el.trendTip.hidden = true; }

  /* ---------- rates ---------- */
  function applyRates(data, source) {
    var rates = Object.assign({ USD: 1 }, data.rates);
    state.rates = rates; state.date = data.date; state.source = source;
    describeStatus();
    render(false);
    renderHistory();
  }

  function fetchRates(manual) {
    el.refresh.classList.add('spin');
    return fetch(API + '/latest?base=USD').then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); }).then(function (data) {
      save(KEYS.rates, { date: data.date, rates: data.rates, at: Date.now() });
      applyRates(data, 'live');
      if (manual) toast('Rates updated');
    }).catch(function () {
      if (manual) toast('Could not reach the rates service');
    }).then(function () { el.refresh.classList.remove('spin'); });
  }

  /* ---------- toast + copy ---------- */
  function toast(msg) {
    el.toast.textContent = msg; el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 1800);
  }
  function copyResult() {
    var n = parseAmount(el.amount.value);
    if (isNaN(n)) { toast('Type an amount first'); return; }
    var text = fmtAmount(n) + ' ' + state.from + ' = ' + fmt(convert(n, state.from, state.to)) + ' ' + state.to;
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Copied'); } catch (e) { toast('Copy not available'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, fallbackCopy);
    } else fallbackCopy();
  }

  /* ---------- theme ---------- */
  var MOON = 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z';
  var SUN = 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1';
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var light = t === 'light';
    el.themeIcon.setAttribute('d', light ? SUN : MOON);
    el.themeIcon.setAttribute('fill', light ? 'none' : 'currentColor');
    el.themeIcon.setAttribute('stroke', light ? 'currentColor' : 'none');
    el.themeIcon.setAttribute('stroke-width', '2');
    el.themeIcon.setAttribute('stroke-linecap', 'round');
    el.theme.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#eaf4ff' : '#070c3a');
    save(KEYS.theme, t);
  }

  /* ---------- events ---------- */
  function changed(withTrend) {
    render(true);
    scheduleHistory();
    if (withTrend) loadSeries();
  }

  el.amount.addEventListener('input', function () { render(true); scheduleHistory(); });
  el.amount.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      var n = parseAmount(el.amount.value); if (isNaN(n)) n = 0;
      var step = e.shiftKey ? 100 : 1;
      n = Math.max(0, n + (e.key === 'ArrowUp' ? step : -step));
      el.amount.value = String(Math.round(n * 1e6) / 1e6);
      e.preventDefault(); render(true); scheduleHistory();
    }
  });
  el.from.addEventListener('change', function () { state.from = el.from.value; changed(true); });
  el.to.addEventListener('change', function () { state.to = el.to.value; changed(true); });
  el.swap.addEventListener('click', function () {
    var t = state.from; state.from = state.to; state.to = t;
    el.from.value = state.from; el.to.value = state.to;
    el.swap.classList.toggle('flip');
    changed(true);
  });
  el.quick.addEventListener('click', function (e) {
    var b = e.target.closest('.q'); if (!b) return;
    state.to = b.getAttribute('data-code'); el.to.value = state.to;
    changed(true);
  });
  el.history.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var h = readHistory()[+b.getAttribute('data-i')]; if (!h) return;
    state.from = h.from; state.to = h.to;
    el.from.value = h.from; el.to.value = h.to; el.amount.value = String(h.amount);
    render(true); loadSeries();
  });
  el.clearHistory.addEventListener('click', function () { save(KEYS.history, []); renderHistory(); toast('History cleared'); });
  el.copy.addEventListener('click', copyResult);
  el.refresh.addEventListener('click', function () { fetchRates(true); loadSeries(); });
  el.theme.addEventListener('click', function () {
    setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  });

  var plot = el.trendSvg.parentNode;
  plot.addEventListener('mousemove', scrub);
  plot.addEventListener('mouseleave', unscrub);
  plot.addEventListener('touchstart', scrub, { passive: true });
  plot.addEventListener('touchmove', scrub, { passive: true });
  plot.addEventListener('touchend', function () { setTimeout(unscrub, 1500); });

  window.addEventListener('online', function () { fetchRates(false); loadSeries(); });

  /* ---------- start ---------- */
  function init() {
    fillSelects();
    setTheme(load(KEYS.theme, 'dark') === 'light' ? 'light' : 'dark');

    var pair = load(KEYS.pair, null);
    if (pair && NAMES[pair.from] && NAMES[pair.to]) {
      state.from = pair.from; state.to = pair.to;
      if (!isNaN(parseAmount(pair.amount))) el.amount.value = String(pair.amount);
    }
    var saved = load(KEYS.rates, null);
    if (saved && saved.rates) applyRates(saved, 'saved'); else applyRates(FALLBACK, 'sample');
    el.from.value = state.from; el.to.value = state.to;
    render(false);
    renderHistory();
    loadSeries();
    fetchRates(false);
  }
  init();
})();
