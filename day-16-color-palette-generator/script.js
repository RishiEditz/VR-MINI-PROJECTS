/* Color Palette Generator (Mini Projects, Day 16). Plain JavaScript, no libraries. */
(function () {
  'use strict';

  var MIN = 3, MAX = 7;
  var KEY = 'vrmp16-state-v1';
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    palette: $('palette'), harmony: $('harmony'), fmt: $('fmt'), gen: $('gen'), undo: $('undo'), redo: $('redo'),
    less: $('less'), more: $('more'), count: $('count'), save: $('save'), css: $('css'), json: $('json'), png: $('png'),
    link: $('link'), code: $('code'), saved: $('saved'), empty: $('empty'), clear: $('clear'), toast: $('toast'),
    mock: $('mock'), ratio: $('ratio'), theme: $('theme')
  };

  var state = { colors: [], harmony: 'random', fmt: 'hex', count: 5, saved: [], theme: 'dark' };
  var past = [], future = [];

  /* ---------- colour maths ---------- */
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }
  function toHex(rgb) { return '#' + rgb.map(function (v) { return ('0' + clamp(v, 0, 255).toString(16)).slice(-2); }).join(''); }
  function fromHex(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lum(rgb) {
    var a = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function ratio(a, b) {
    var la = lum(a), lb = lum(b), hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }
  var WHITE = [255, 255, 255], DARK = [17, 17, 17];
  function inkFor(rgb) { return ratio(rgb, WHITE) >= ratio(rgb, DARK) ? WHITE : DARK; }
  function grade(r) { return r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : 'Low'; }

  /* ---------- generating ---------- */
  var OFFSETS = {
    analogous: function (n) { var step = rnd(16, 30), a = []; for (var i = 0; i < n; i++) a.push((i - (n - 1) / 2) * step); return a; },
    complementary: function (n) { var a = []; for (var i = 0; i < n; i++) a.push(i % 2 ? 180 + rnd(-12, 12) : rnd(-14, 14)); return a; },
    triadic: function (n) { var a = []; for (var i = 0; i < n; i++) a.push((i % 3) * 120 + rnd(-8, 8)); return a; },
    split: function (n) { var base = [0, 150, 210, 0, 150, 210, 0], a = []; for (var i = 0; i < n; i++) a.push(base[i] + rnd(-8, 8)); return a; },
    mono: function (n) { var a = []; for (var i = 0; i < n; i++) a.push(rnd(-5, 5)); return a; },
    random: function (n) { var a = [], g = rnd(0, 360); for (var i = 0; i < n; i++) a.push(g + i * 137.5 + rnd(-20, 20)); return a; }
  };
  function makeSet(kind, n, baseHue) {
    var offs = OFFSETS[kind](n), out = [];
    for (var i = 0; i < n; i++) {
      var h = baseHue + offs[i], s, l;
      if (kind === 'mono') { l = 16 + (76 * i) / (n - 1) + rnd(-3, 3); s = rnd(35, 80) - Math.abs(l - 50) * 0.3; }
      else { s = rnd(45, 88); l = rnd(32, 78); }
      out.push(toHex(hslToRgb(h, s, l)));
    }
    if (kind !== 'mono') out.sort(function (a, b) { return lum(fromHex(a)) - lum(fromHex(b)); });
    return out;
  }
  function generate() {
    snapshot();
    var n = state.count, locked = state.colors.filter(function (c) { return c.locked; });
    var baseHue = rnd(0, 360);
    if (locked.length) { var rgb = fromHex(locked[0].hex); baseHue = rgbToHsl(rgb[0], rgb[1], rgb[2])[0]; }
    var fresh = makeSet(state.harmony, n, baseHue), next = [];
    for (var i = 0; i < n; i++) {
      var old = state.colors[i];
      next.push(old && old.locked ? { hex: old.hex, locked: true } : { hex: fresh[i], locked: false });
    }
    state.colors = next;
    render(true); persist();
  }

  /* ---------- history ---------- */
  function copyColors() { return state.colors.map(function (c) { return { hex: c.hex, locked: c.locked }; }); }
  function snapshot() { past.push(copyColors()); if (past.length > 60) past.shift(); future = []; }
  function undo() { if (!past.length) return; future.push(copyColors()); state.colors = past.pop(); state.count = state.colors.length; render(true); persist(); }
  function redo() { if (!future.length) return; past.push(copyColors()); state.colors = future.pop(); state.count = state.colors.length; render(true); persist(); }

  /* ---------- formatting and clipboard ---------- */
  function fmtColor(hex, f) {
    var rgb = fromHex(hex);
    if (f === 'rgb') return 'rgb(' + rgb.join(', ') + ')';
    if (f === 'hsl') { var h = rgbToHsl(rgb[0], rgb[1], rgb[2]); return 'hsl(' + h[0] + ', ' + h[1] + '%, ' + h[2] + '%)'; }
    return hex.toUpperCase();
  }
  function toast(msg) {
    el.toast.textContent = msg; el.toast.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.toast.classList.remove('show'); }, 1800);
  }
  function copy(text, msg) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta); toast(ok ? msg : 'Copy not allowed here');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(msg); }, fallback);
    else fallback();
  }

  /* ---------- rendering ---------- */
  var ICON_LOCK = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_OPEN = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_EDIT = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

  function render(animate) {
    el.count.textContent = state.count;
    el.less.disabled = state.count <= MIN; el.more.disabled = state.count >= MAX;
    el.undo.disabled = !past.length; el.redo.disabled = !future.length;
    var html = '';
    state.colors.forEach(function (c, i) {
      var rgb = fromHex(c.hex), ink = inkFor(rgb), inkCss = ink === WHITE ? '#fff' : '#111';
      var r = ratio(rgb, ink), label = 'Colour ' + (i + 1) + ' ' + c.hex.toUpperCase();
      html += '<div class="sw" data-i="' + i + '" style="--sw:' + c.hex + ';--sw-ink:' + inkCss + (animate ? ';animation-delay:' + (i * 45) + 'ms' : ';animation:none') + '">' +
        '<button type="button" class="sw__main" data-act="copy" aria-label="Copy ' + label + '"><span class="sw__val">' + fmtColor(c.hex, state.fmt) + '</span>' +
        '<span class="sw__meta">' + r.toFixed(1) + ':1<span class="sw__badge">' + grade(r) + '</span></span></button>' +
        '<div class="sw__tools"><button type="button" class="sw__btn" data-act="lock" aria-pressed="' + c.locked + '" aria-label="' + (c.locked ? 'Unlock ' : 'Lock ') + label + '">' + (c.locked ? ICON_LOCK : ICON_OPEN) + '</button>' +
        '<label class="sw__btn" title="Edit colour" aria-label="Edit ' + label + '">' + ICON_EDIT + '<input type="color" data-act="edit" value="' + c.hex + '"></label></div></div>';
    });
    el.palette.innerHTML = html;
    el.palette.style.setProperty('--n', state.colors.length);
    Array.prototype.forEach.call(el.harmony.children, function (b) { b.setAttribute('aria-checked', b.dataset.h === state.harmony); });
    Array.prototype.forEach.call(el.fmt.children, function (b) { b.setAttribute('aria-checked', b.dataset.f === state.fmt); });
    renderPreview(); renderCode(); updateHash();
  }

  function roles() {
    var list = state.colors.map(function (c) { var rgb = fromHex(c.hex); return { hex: c.hex, rgb: rgb, l: lum(rgb), s: rgbToHsl(rgb[0], rgb[1], rgb[2])[1] }; });
    var byL = list.slice().sort(function (a, b) { return a.l - b.l; });
    var ink = byL[0], bg = byL[byL.length - 1];
    var rest = list.filter(function (c) { return c !== ink && c !== bg; }).sort(function (a, b) { return b.s - a.s; });
    var acc = rest[0] || ink, acc2 = rest[1] || bg;
    return { bg: bg, ink: ink, acc: acc, acc2: acc2 };
  }
  function css(c) { return c.hex; }
  function renderPreview() {
    var r = roles(), m = el.mock.style;
    function inkOn(c) { return inkFor(c.rgb) === WHITE ? '#fff' : '#111'; }
    m.setProperty('--m-bg', css(r.bg)); m.setProperty('--m-ink', css(r.ink));
    m.setProperty('--m-accent', css(r.acc)); m.setProperty('--m-accent-ink', inkOn(r.acc));
    m.setProperty('--m-accent2', css(r.acc2)); m.setProperty('--m-accent2-ink', inkOn(r.acc2));
    var t = ratio(r.ink.rgb, r.bg.rgb);
    el.ratio.textContent = 'Text on page: ' + t.toFixed(1) + ':1 (' + grade(t) + ')';
  }
  function cssText() {
    return ':root {\n' + state.colors.map(function (c, i) { return '  --color-' + (i + 1) + ': ' + c.hex + ';'; }).join('\n') + '\n}';
  }
  function renderCode() { el.code.textContent = cssText(); }

  /* ---------- share link and storage ---------- */
  function hashOf(colors) { return colors.map(function (c) { return c.hex.slice(1); }).join('-'); }
  function updateHash() {
    try { history.replaceState(null, '', '#' + hashOf(state.colors)); } catch (e) { /* ignore */ }
  }
  function parseHash(h) {
    var parts = String(h).replace(/^#/, '').split('-');
    if (parts.length < MIN || parts.length > MAX) return null;
    var out = [];
    for (var i = 0; i < parts.length; i++) { if (!/^[0-9a-f]{6}$/i.test(parts[i])) return null; out.push({ hex: '#' + parts[i].toLowerCase(), locked: false }); }
    return out;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ colors: state.colors, harmony: state.harmony, fmt: state.fmt, count: state.count, saved: state.saved, theme: state.theme })); } catch (e) { /* storage blocked */ }
  }
  function restore() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d) {
        if (Array.isArray(d.saved)) state.saved = d.saved.filter(function (p) { return Array.isArray(p) && p.every(function (h) { return fromHex(h); }); }).slice(0, 30);
        if (OFFSETS[d.harmony]) state.harmony = d.harmony;
        if (d.fmt === 'rgb' || d.fmt === 'hsl' || d.fmt === 'hex') state.fmt = d.fmt;
        if (d.theme === 'light' || d.theme === 'dark') state.theme = d.theme;
        if (Array.isArray(d.colors) && d.colors.length >= MIN && d.colors.length <= MAX && d.colors.every(function (c) { return c && fromHex(c.hex); })) {
          state.colors = d.colors.map(function (c) { return { hex: c.hex.toLowerCase(), locked: !!c.locked }; });
          state.count = state.colors.length;
        }
      }
    } catch (e) { /* ignore broken data */ }
    var fromLink = parseHash(location.hash);
    if (fromLink) { state.colors = fromLink; state.count = fromLink.length; }
  }

  /* ---------- saved palettes ---------- */
  function renderSaved() {
    el.empty.hidden = state.saved.length > 0; el.clear.hidden = !state.saved.length;
    el.saved.innerHTML = state.saved.map(function (p, i) {
      return '<li><button type="button" class="saved__item" data-load="' + i + '" aria-label="Load palette ' + (i + 1) + ': ' + p.join(', ') + '">' +
        p.map(function (h) { return '<span style="background:' + h + '"></span>'; }).join('') + '</button>' +
        '<button type="button" class="saved__del" data-del="' + i + '" aria-label="Delete palette ' + (i + 1) + '">&times;</button></li>';
    }).join('');
  }
  function savePalette() {
    var hexes = state.colors.map(function (c) { return c.hex; }), key = hexes.join();
    if (state.saved.some(function (p) { return p.join() === key; })) { toast('Already saved'); return; }
    state.saved.unshift(hexes); state.saved = state.saved.slice(0, 30);
    renderSaved(); persist(); toast('Palette saved');
  }

  /* ---------- PNG export ---------- */
  function downloadPng() {
    var n = state.colors.length, w = 1400, h = 560, cv = document.createElement('canvas');
    cv.width = w; cv.height = h; var ctx = cv.getContext('2d');
    state.colors.forEach(function (c, i) {
      var x0 = Math.round(i * w / n), x1 = Math.round((i + 1) * w / n);
      ctx.fillStyle = c.hex; ctx.fillRect(x0, 0, x1 - x0, h);
      ctx.fillStyle = inkFor(fromHex(c.hex)) === WHITE ? '#fff' : '#111';
      ctx.font = '700 34px system-ui, Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(c.hex.toUpperCase(), (x0 + x1) / 2, h - 48);
    });
    cv.toBlob(function (blob) {
      if (!blob) { toast('Could not make the image'); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'palette-' + hashOf(state.colors).slice(0, 20) + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); toast('PNG downloaded');
    }, 'image/png');
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    el.theme.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', state.theme === 'dark' ? '#0b0630' : '#eef1ff');
  }

  /* ---------- events ---------- */
  el.gen.addEventListener('click', generate);
  el.undo.addEventListener('click', undo);
  el.redo.addEventListener('click', redo);
  el.harmony.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    state.harmony = b.dataset.h; generate();
  });
  el.fmt.addEventListener('click', function (e) {
    var b = e.target.closest('.seg__b'); if (!b) return;
    state.fmt = b.dataset.f; render(false); persist();
  });
  function setCount(n) {
    n = clamp(n, MIN, MAX); if (n === state.count) return;
    snapshot();
    var baseHue = rnd(0, 360), cur = state.colors.slice();
    if (n < cur.length) {
      while (cur.length > n) { var k = -1; for (var j = cur.length - 1; j >= 0; j--) if (!cur[j].locked) { k = j; break; } cur.splice(k < 0 ? cur.length - 1 : k, 1); }
    } else {
      var first = fromHex(cur[0].hex); baseHue = rgbToHsl(first[0], first[1], first[2])[0];
      var fresh = makeSet(state.harmony, n, baseHue);
      for (var i = cur.length; i < n; i++) cur.push({ hex: fresh[i], locked: false });
    }
    state.colors = cur; state.count = n; render(true); persist();
  }
  el.less.addEventListener('click', function () { setCount(state.count - 1); });
  el.more.addEventListener('click', function () { setCount(state.count + 1); });
  el.palette.addEventListener('click', function (e) {
    var sw = e.target.closest('.sw'); if (!sw) return;
    var i = +sw.dataset.i, btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'copy') copy(fmtColor(state.colors[i].hex, state.fmt), 'Copied ' + fmtColor(state.colors[i].hex, state.fmt));
    if (btn.dataset.act === 'lock') { state.colors[i].locked = !state.colors[i].locked; render(false); persist(); toast(state.colors[i].locked ? 'Locked' : 'Unlocked'); }
  });
  el.palette.addEventListener('change', function (e) {
    var inp = e.target; if (!inp.matches || !inp.matches('input[type="color"]')) return;
    var i = +inp.closest('.sw').dataset.i; snapshot();
    state.colors[i] = { hex: inp.value.toLowerCase(), locked: true }; render(false); persist();
  });
  el.save.addEventListener('click', savePalette);
  el.css.addEventListener('click', function () { copy(cssText(), 'CSS copied'); });
  el.json.addEventListener('click', function () { copy(JSON.stringify(state.colors.map(function (c) { return c.hex; })), 'JSON copied'); });
  el.png.addEventListener('click', downloadPng);
  el.link.addEventListener('click', function () { updateHash(); copy(location.href, 'Link copied'); });
  el.saved.addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'), l = e.target.closest('[data-load]');
    if (d) { state.saved.splice(+d.dataset.del, 1); renderSaved(); persist(); return; }
    if (l) { snapshot(); state.colors = state.saved[+l.dataset.load].map(function (h) { return { hex: h, locked: false }; }); state.count = state.colors.length; render(true); persist(); toast('Palette loaded'); }
  });
  el.clear.addEventListener('click', function () { state.saved = []; renderSaved(); persist(); });
  el.theme.addEventListener('click', function () { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); persist(); });
  document.addEventListener('keydown', function (e) {
    var t = e.target, tag = t && t.tagName;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'Space') { if (tag === 'BUTTON') return; e.preventDefault(); generate(); }
    else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (/^[1-7]$/.test(e.key) && +e.key <= state.colors.length) { var i = +e.key - 1; state.colors[i].locked = !state.colors[i].locked; render(false); persist(); }
  });
  window.addEventListener('hashchange', function () {
    var c = parseHash(location.hash);
    if (c && hashOf(c) !== hashOf(state.colors)) { snapshot(); state.colors = c; state.count = c.length; render(true); persist(); }
  });

  /* ---------- start ---------- */
  restore(); applyTheme();
  if (!state.colors.length) { state.colors = makeSet(state.harmony, state.count, rnd(0, 360)).map(function (h) { return { hex: h, locked: false }; }); }
  renderSaved(); render(true); persist();

  /* small hook so the app can be tested and filmed with fixed colours */
  window.__palette = {
    state: state,
    set: function (hexes, locked) { state.colors = hexes.map(function (h, i) { return { hex: h, locked: !!(locked && locked.indexOf(i) > -1) }; }); state.count = hexes.length; past = []; future = []; render(false); },
    generate: generate, undo: undo, redo: redo,
    setHarmony: function (h) { state.harmony = h; render(false); },
    theme: function (t) { state.theme = t; applyTheme(); },
    seedSaved: function (list) { state.saved = list; renderSaved(); }
  };
})();
