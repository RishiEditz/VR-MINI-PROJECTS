(function () {
  'use strict';

  var GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  var FC_URL = 'https://api.open-meteo.com/v1/forecast';
  var KEY_RECENT = 'weather.recent';
  var KEY_UNIT = 'weather.unit';
  var KEY_LAST = 'weather.last';
  var MAX_RECENT = 5;
  var DEG = '°';

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    form: $('search-form'), city: $('city'), locate: $('locate'),
    notice: $('notice'), recent: $('recent'), chips: $('chips'),
    now: $('now'), place: $('place'), placeMeta: $('place-meta'),
    icon: $('now-icon'), temp: $('temp'), deg: $('deg'), cond: $('cond'),
    hilo: $('hilo'), feels: $('feels'), humid: $('humid'), wind: $('wind'),
    updated: $('updated'), hourly: $('hourly'), daily: $('daily'),
    sky: $('sky'), unitBtns: document.querySelectorAll('.unit button')
  };

  var state = { unit: 'C', label: '', data: null, reqId: 0 };

  /* ---------- safe storage ---------- */
  function load(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode or full */ }
  }

  /* ---------- weather code -> look ---------- */
  function condFromCode(code) {
    if (code === 0 || code === 1) return 'sunny';
    if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'cloudy';
  }
  var LABELS = {
    sunny: 'Clear and sunny', cloudy: 'Cloudy', rain: 'Rain', snow: 'Snow',
    storm: 'Thunderstorm', night: 'Clear night'
  };
  function labelFor(code, isDay) {
    var c = condFromCode(code);
    if (c === 'sunny' && !isDay) return 'Clear night';
    if (c === 'cloudy' && !isDay && code <= 3) return 'Cloudy night';
    if (code === 1) return 'Mostly clear';
    if (code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 57) return 'Drizzle';
    if (code === 61 || code === 63 || code === 65) return 'Rain';
    if (code === 66 || code === 67) return 'Freezing rain';
    if (code === 80 || code === 81 || code === 82) return 'Rain showers';
    if (code === 71 || code === 73 || code === 75 || code === 77) return 'Snow';
    if (code === 85 || code === 86) return 'Snow showers';
    if (code === 95) return 'Thunderstorm';
    if (code === 96 || code === 99) return 'Thunderstorm with hail';
    return LABELS[condFromCode(code)];
  }
  function skyFor(code, isDay) {
    var c = condFromCode(code);
    if (!isDay && (c === 'sunny' || c === 'cloudy')) return 'night';
    return c;
  }

  /* ---------- icons (simple inline SVG) ---------- */
  var CLOUD = 'M18 46h28a10 10 0 0 0 1-20 14 14 0 0 0-27 4 9 9 0 0 0-2 16z';
  var ICONS = {
    sunny: '<circle cx="32" cy="32" r="12" fill="#ffd27a"/><g stroke="#ffd27a" stroke-width="4" stroke-linecap="round"><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13 13l6 6M45 45l6 6M13 51l6-6M45 19l6-6"/></g>',
    night: '<path d="M40 8a24 24 0 1 0 16 36A20 20 0 0 1 40 8z" fill="#dfe7ff"/>',
    cloudy: '<path d="' + CLOUD + '" fill="#cfe3f5"/>',
    rain: '<path d="' + CLOUD + '" fill="#cfe3f5"/><g stroke="#7fd3ff" stroke-width="4" stroke-linecap="round"><path d="M22 52l-3 8M34 52l-3 8M46 52l-3 8"/></g>',
    snow: '<path d="' + CLOUD + '" fill="#e8f3ff"/><g fill="#ffffff"><circle cx="22" cy="56" r="3"/><circle cx="34" cy="58" r="3"/><circle cx="46" cy="56" r="3"/></g>',
    storm: '<path d="' + CLOUD + '" fill="#b7a8e6"/><path d="M34 44l-8 12h8l-4 10 12-14h-8l4-8z" fill="#ffd27a"/>'
  };
  function iconSvg(key) {
    var inner = ICONS[key] || ICONS.cloudy;
    return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  /* ---------- units ---------- */
  function toUnit(c) { return state.unit === 'F' ? c * 9 / 5 + 32 : c; }
  function fmtTemp(c) { return Math.round(toUnit(c)) + DEG; }
  function fmtWind(kmh) {
    if (state.unit === 'F') return Math.round(kmh * 0.621371) + ' mph';
    return Math.round(kmh) + ' km/h';
  }
  function setUnit(u) {
    state.unit = u === 'F' ? 'F' : 'C';
    save(KEY_UNIT, state.unit);
    document.body.setAttribute('data-unit', state.unit);
    els.unitBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-unit') === state.unit));
    });
    els.deg.textContent = DEG + state.unit;
    if (state.data) render(state.data, state.label, false);
  }

  /* ---------- notices ---------- */
  var noticeTimer = null;
  function notice(msg, kind) {
    els.notice.textContent = msg;
    els.notice.className = 'notice' + (kind === 'error' ? ' error' : '');
    els.notice.hidden = !msg;
    clearTimeout(noticeTimer);
    if (msg && kind !== 'error') noticeTimer = setTimeout(function () { els.notice.hidden = true; }, 6000);
  }

  /* ---------- network ---------- */
  function getJSON(url) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  function forecastUrl(lat, lon) {
    var p = [
      'latitude=' + lat.toFixed(4),
      'longitude=' + lon.toFixed(4),
      'current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
      'hourly=temperature_2m,weather_code,precipitation_probability,is_day',
      'daily=weather_code,temperature_2m_max,temperature_2m_min',
      'timezone=auto',
      'forecast_days=7',
      'wind_speed_unit=kmh'
    ];
    return FC_URL + '?' + p.join('&');
  }

  function searchCity(name) {
    var q = (name || '').trim();
    if (!q) { notice('Type a city name first.', 'error'); return; }
    notice('Looking up ' + q + '...');
    var url = GEO_URL + '?count=1&language=en&format=json&name=' + encodeURIComponent(q);
    getJSON(url).then(function (geo) {
      if (!geo || !geo.results || !geo.results.length) {
        notice('No city called "' + q + '". Try another spelling.', 'error');
        return;
      }
      var hit = geo.results[0];
      var label = hit.name + (hit.country ? ', ' + hit.country : '');
      addRecent(hit.name);
      fetchWeather(hit.latitude, hit.longitude, label);
    }).catch(function () {
      offlineFallback('Could not reach the weather service.');
    });
  }

  function fetchWeather(lat, lon, label) {
    var id = ++state.reqId;
    notice('Loading the forecast...');
    getJSON(forecastUrl(lat, lon)).then(function (data) {
      if (id !== state.reqId) return;
      if (!data || !data.current || !data.daily) throw new Error('bad data');
      state.label = label;
      state.data = data;
      save(KEY_LAST, { label: label, data: data, savedAt: Date.now() });
      notice('');
      render(data, label, true);
    }).catch(function () {
      if (id !== state.reqId) return;
      offlineFallback('Could not load the forecast right now.');
    });
  }

  function offlineFallback(msg) {
    var last = load(KEY_LAST, null);
    if (last && last.data) {
      state.label = last.label;
      state.data = last.data;
      var when = new Date(last.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
      render(last.data, last.label, false);
      notice(msg + ' Showing your saved forecast from ' + when + '.', 'error');
    } else {
      notice(msg + ' Check your connection and try again.', 'error');
    }
  }

  /* ---------- location ---------- */
  function useLocation() {
    if (!navigator.geolocation) { notice('Location is not available in this browser. Search a city instead.', 'error'); return; }
    notice('Finding you...');
    navigator.geolocation.getCurrentPosition(function (pos) {
      fetchWeather(pos.coords.latitude, pos.coords.longitude, 'My location');
    }, function () {
      notice('Location was blocked. Search a city instead.', 'error');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  }

  /* ---------- recent cities ---------- */
  function addRecent(name) {
    var list = load(KEY_RECENT, []).filter(function (n) { return typeof n === 'string' && n.toLowerCase() !== name.toLowerCase(); });
    list.unshift(name);
    save(KEY_RECENT, list.slice(0, MAX_RECENT));
    renderRecent();
  }
  function renderRecent() {
    var list = load(KEY_RECENT, []);
    els.chips.textContent = '';
    if (!list.length) { els.recent.hidden = true; return; }
    els.recent.hidden = false;
    list.forEach(function (name) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = name;
      b.addEventListener('click', function () { els.city.value = name; searchCity(name); });
      els.chips.appendChild(b);
    });
  }

  /* ---------- render ---------- */
  function render(data, label, fresh) {
    var cur = data.current;
    var isDay = cur.is_day === 1;
    var key = skyFor(cur.weather_code, isDay);
    els.sky.setAttribute('data-cond', key);
    els.now.classList.remove('is-loading');

    els.place.textContent = label;
    els.placeMeta.textContent = data.timezone ? 'Timezone ' + data.timezone.replace(/_/g, ' ') : '';
    els.icon.innerHTML = iconSvg(key);
    els.temp.textContent = Math.round(toUnit(cur.temperature_2m));
    els.deg.textContent = DEG + state.unit;
    els.cond.textContent = labelFor(cur.weather_code, isDay);

    var d0 = data.daily;
    els.hilo.textContent = 'High ' + fmtTemp(d0.temperature_2m_max[0]) + '  ·  Low ' + fmtTemp(d0.temperature_2m_min[0]);
    els.feels.textContent = fmtTemp(cur.apparent_temperature);
    els.humid.textContent = Math.round(cur.relative_humidity_2m) + '%';
    els.wind.textContent = fmtWind(cur.wind_speed_10m);
    els.updated.textContent = 'Updated ' + (cur.time || '').replace('T', ' ');

    renderHourly(data, cur.time);
    renderDaily(data);
  }

  function renderHourly(data, nowIso) {
    var h = data.hourly;
    var start = 0;
    for (var i = 0; i < h.time.length; i++) {
      if (h.time[i] >= nowIso) { start = i; break; }
    }
    els.hourly.textContent = '';
    for (var j = start; j < Math.min(start + 24, h.time.length); j++) {
      var li = document.createElement('li');
      var t = document.createElement('div'); t.className = 't';
      t.textContent = j === start ? 'Now' : h.time[j].slice(11, 16);
      var ic = document.createElement('div'); ic.className = 'ic';
      ic.innerHTML = iconSvg(skyFor(h.weather_code[j], h.is_day[j] === 1));
      var v = document.createElement('div'); v.className = 'v';
      v.textContent = fmtTemp(h.temperature_2m[j]);
      var p = document.createElement('div'); p.className = 'p';
      p.textContent = (h.precipitation_probability && h.precipitation_probability[j] != null ? h.precipitation_probability[j] : 0) + '%';
      li.appendChild(t); li.appendChild(ic); li.appendChild(v); li.appendChild(p);
      els.hourly.appendChild(li);
    }
  }

  function renderDaily(data) {
    var d = data.daily;
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < d.time.length; i++) {
      lo = Math.min(lo, d.temperature_2m_min[i]);
      hi = Math.max(hi, d.temperature_2m_max[i]);
    }
    var span = Math.max(hi - lo, 1);
    els.daily.textContent = '';
    for (var k = 0; k < d.time.length; k++) {
      var li = document.createElement('li');
      var dn = document.createElement('div'); dn.className = 'dn';
      var dt = new Date(d.time[k] + 'T12:00:00');
      dn.textContent = k === 0 ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' });
      var ic = document.createElement('div'); ic.className = 'ic';
      ic.innerHTML = iconSvg(skyFor(d.weather_code[k], true));
      var bar = document.createElement('div'); bar.className = 'bar';
      var seg = document.createElement('i');
      seg.style.left = ((d.temperature_2m_min[k] - lo) / span * 100).toFixed(1) + '%';
      seg.style.width = (Math.max(d.temperature_2m_max[k] - d.temperature_2m_min[k], 0.5) / span * 100).toFixed(1) + '%';
      bar.appendChild(seg);
      var hl = document.createElement('div'); hl.className = 'hl';
      hl.textContent = fmtTemp(d.temperature_2m_max[k]) + ' / ' + fmtTemp(d.temperature_2m_min[k]);
      li.appendChild(dn); li.appendChild(ic); li.appendChild(bar); li.appendChild(hl);
      els.daily.appendChild(li);
    }
  }

  /* ---------- events ---------- */
  els.form.addEventListener('submit', function (e) {
    e.preventDefault();
    searchCity(els.city.value);
  });
  els.locate.addEventListener('click', useLocation);
  els.unitBtns.forEach(function (b) {
    b.addEventListener('click', function () { setUnit(b.getAttribute('data-unit')); });
  });

  /* ---------- start ---------- */
  setUnit(load(KEY_UNIT, 'C'));
  renderRecent();
  var last = load(KEY_LAST, null);
  if (last && last.data) {
    state.label = last.label;
    state.data = last.data;
    render(last.data, last.label, false);
    notice('Showing your last forecast. Search to refresh it.');
  }
})();
