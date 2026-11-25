/* Day 14 pictures. Every picture is drawn in code as an SVG scene: nothing is downloaded. */
(function () {
  'use strict';

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  const f1 = (n) => Math.round(n * 10) / 10;

  function lin(id, stops, vertical) {
    const dir = vertical === false ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"';
    return '<linearGradient id="' + id + '" ' + dir + '>' + stops.map(function (c, i) {
      return '<stop offset="' + f1(i / (stops.length - 1)) + '" stop-color="' + c + '"/>';
    }).join('') + '</linearGradient>';
  }
  function rad(id, c, a0, a1) {
    return '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + c + '" stop-opacity="' + a0 + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="' + (a1 || 0) + '"/></radialGradient>';
  }
  function stars(R, n, yMax, op) {
    let out = '';
    for (let i = 0; i < n; i++) {
      const r = 0.6 + R() * 1.5;
      out += '<circle cx="' + f1(R() * 400) + '" cy="' + f1(R() * yMax) + '" r="' + f1(r) + '" fill="#fff" opacity="' + f1((op || 0.9) * (0.35 + R() * 0.65)) + '"/>';
    }
    return out;
  }
  function ridge(R, base, amp, color, step) {
    const a = R() * 6, b = R() * 6, c = R() * 6;
    let d = 'M0 400 L0 ' + f1(base);
    for (let x = 0; x <= 400; x += step || 10) {
      const n = Math.sin(x / 55 + a) * 0.5 + Math.sin(x / 23 + b) * 0.3 + Math.sin(x / 11 + c) * 0.2;
      d += ' L' + x + ' ' + f1(base - amp * (0.5 + n * 0.5));
    }
    return '<path d="' + d + ' L400 400 Z" fill="' + color + '"/>';
  }
  function pine(x, y, h, color) {
    const w = h * 0.42;
    return '<path d="M' + f1(x) + ' ' + f1(y - h) + ' L' + f1(x + w * 0.55) + ' ' + f1(y - h * 0.5) + ' L' + f1(x + w * 0.28) + ' ' + f1(y - h * 0.5) +
      ' L' + f1(x + w * 0.8) + ' ' + f1(y - h * 0.12) + ' L' + f1(x + w * 0.12) + ' ' + f1(y - h * 0.12) + ' L' + f1(x + w * 0.12) + ' ' + f1(y) +
      ' L' + f1(x - w * 0.12) + ' ' + f1(y) + ' L' + f1(x - w * 0.12) + ' ' + f1(y - h * 0.12) + ' L' + f1(x - w * 0.8) + ' ' + f1(y - h * 0.12) +
      ' L' + f1(x - w * 0.28) + ' ' + f1(y - h * 0.5) + ' L' + f1(x - w * 0.55) + ' ' + f1(y - h * 0.5) + ' Z" fill="' + color + '"/>';
  }
  function towers(R, base, minH, maxH, minW, maxW, color, win, winOp) {
    let out = '', x = -10;
    while (x < 410) {
      const w = minW + R() * (maxW - minW);
      const h = minH + R() * (maxH - minH);
      out += '<rect x="' + f1(x) + '" y="' + f1(base - h) + '" width="' + f1(w) + '" height="' + f1(h + 400 - base) + '" fill="' + color + '"/>';
      if (win) {
        for (let wy = base - h + 8; wy < base - 6; wy += 11) {
          for (let wx = x + 5; wx < x + w - 6; wx += 9) {
            if (R() < 0.34) out += '<rect x="' + f1(wx) + '" y="' + f1(wy) + '" width="4" height="5" fill="' + win + '" opacity="' + f1(winOp * (0.5 + R() * 0.5)) + '"/>';
          }
        }
      }
      x += w + 1 + R() * 3;
    }
    return out;
  }

  const SCENES = {
    mountains: function (R, P, k) {
      const sy = 170 + R() * 30;
      return '<defs>' + lin(k + 's', [P[0], P[1], P[2]]) + rad(k + 'g', P[3], 0.55) + '</defs>' +
        '<rect width="400" height="400" fill="url(#' + k + 's)"/>' + stars(R, 26, 150, 0.7) +
        '<circle cx="' + f1(120 + R() * 160) + '" cy="' + f1(sy) + '" r="95" fill="url(#' + k + 'g)"/>' +
        '<circle cx="' + f1(150 + R() * 100) + '" cy="' + f1(sy) + '" r="34" fill="' + P[3] + '"/>' +
        ridge(R, 260, 150, P[4]) + ridge(R, 310, 120, P[5]) + ridge(R, 365, 90, P[6]);
    },
    lake: function (R, P, k) {
      const cx = 140 + R() * 120;
      let refl = '';
      for (let i = 0; i < 9; i++) {
        const w = 70 - i * 6;
        refl += '<rect x="' + f1(cx - w / 2 + (R() - 0.5) * 8) + '" y="' + (224 + i * 14) + '" width="' + w + '" height="3.5" rx="2" fill="' + P[3] + '" opacity="' + f1(0.7 - i * 0.06) + '"/>';
      }
      return '<defs>' + lin(k + 's', [P[0], P[1], P[2]]) + lin(k + 'w', [P[2], P[1], P[0]]) + rad(k + 'g', P[3], 0.5) + '</defs>' +
        '<rect width="400" height="400" fill="url(#' + k + 's)"/>' +
        '<circle cx="' + f1(cx) + '" cy="170" r="90" fill="url(#' + k + 'g)"/><circle cx="' + f1(cx) + '" cy="170" r="30" fill="' + P[3] + '"/>' +
        ridge(R, 205, 80, P[4]) + ridge(R, 215, 45, P[5]) +
        '<rect y="215" width="400" height="185" fill="url(#' + k + 'w)"/>' + refl;
    },
    forest: function (R, P, k) {
      let t = '';
      const rows = [[300, 120, P[4], 26], [340, 150, P[5], 30], [395, 190, P[6], 36]];
      rows.forEach(function (r) {
        for (let x = -10; x < 420; x += r[3] * (0.7 + R() * 0.6)) t += pine(x, r[0] + R() * 14, r[1] * (0.7 + R() * 0.5), r[2]);
      });
      return '<defs>' + lin(k + 's', [P[0], P[1], P[2]]) + rad(k + 'g', P[3], 0.6) + '</defs>' +
        '<rect width="400" height="400" fill="url(#' + k + 's)"/>' + stars(R, 22, 120, 0.6) +
        '<circle cx="' + f1(200 + (R() - 0.5) * 160) + '" cy="190" r="100" fill="url(#' + k + 'g)"/><circle cx="' + f1(200 + (R() - 0.5) * 100) + '" cy="190" r="28" fill="' + P[3] + '"/>' +
        ridge(R, 290, 70, P[4]) + t + '<rect y="372" width="400" height="28" fill="' + P[6] + '"/>';
    },
    dunes: function (R, P, k) {
      function dune(base, amp, col) {
        const a = R() * 6;
        let d = 'M0 400 L0 ' + base;
        for (let x = 0; x <= 400; x += 8) d += ' L' + x + ' ' + f1(base - amp * (0.5 + 0.5 * Math.sin(x / 70 + a) * 0.8 + 0.2 * Math.sin(x / 27 + a * 2)));
        return '<path d="' + d + ' L400 400Z" fill="' + col + '"/>';
      }
      return '<defs>' + lin(k + 's', [P[0], P[1], P[2]]) + rad(k + 'g', P[3], 0.6) + '</defs>' +
        '<rect width="400" height="400" fill="url(#' + k + 's)"/>' +
        '<circle cx="' + f1(170 + R() * 80) + '" cy="215" r="110" fill="url(#' + k + 'g)"/><circle cx="' + f1(200 + R() * 20) + '" cy="215" r="40" fill="' + P[3] + '"/>' +
        dune(265, 70, P[4]) + dune(315, 80, P[5]) + dune(372, 70, P[6]);
    },
    skyline: function (R, P, k) {
      const night = !!P[8];
      return '<defs>' + lin(k + 's', [P[0], P[1], P[2]]) + rad(k + 'g', P[3], 0.5) + '</defs>' +
        '<rect width="400" height="400" fill="url(#' + k + 's)"/>' + (night ? stars(R, 60, 190, 0.9) : stars(R, 14, 110, 0.5)) +
        '<circle cx="' + f1(100 + R() * 200) + '" cy="' + (night ? 110 : 215) + '" r="' + (night ? 70 : 100) + '" fill="url(#' + k + 'g)"/>' +
        '<circle cx="' + f1(150 + R() * 100) + '" cy="' + (night ? 105 : 215) + '" r="' + (night ? 22 : 44) + '" fill="' + P[3] + '"/>' +
        towers(R, 330, 60, 160, 22, 44, P[4], P[7], 0.5) + towers(R, 400, 90, 230, 28, 56, P[5], P[7], 0.95);
    },
    neon: function (R, P, k) {
      let b = '', neon = '', rain = '';
      let x = -6;
      const cols = [P[3], P[4], P[5]];
      while (x < 410) {
        const w = 30 + R() * 38, h = 120 + R() * 190, y = 400 - h;
        b += '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" fill="' + P[6] + '"/>';
        const c = cols[Math.floor(R() * 3)];
        neon += '<path d="M' + f1(x + 3) + ' ' + f1(y + h * 0.9) + ' L' + f1(x + 3) + ' ' + f1(y + 3) + ' L' + f1(x + w - 3) + ' ' + f1(y + 3) + '" fill="none" stroke="' + c + '" stroke-width="3.5" stroke-linecap="round"/>';
        if (R() < 0.7) neon += '<rect x="' + f1(x + w * 0.25) + '" y="' + f1(y + 22 + R() * 40) + '" width="' + f1(w * 0.5) + '" height="9" rx="4" fill="' + cols[Math.floor(R() * 3)] + '"/>';
        x += w + 4;
      }
      for (let i = 0; i < 70; i++) {
        const rx = R() * 420, ry = R() * 400;
        rain += '<line x1="' + f1(rx) + '" y1="' + f1(ry) + '" x2="' + f1(rx - 7) + '" y2="' + f1(ry + 22) + '" stroke="#cfe7ff" stroke-width="1.2" opacity="' + f1(0.14 + R() * 0.2) + '"/>';
      }
      return '<defs>' + lin(k + 's', [P[0], P[1], P[2]]) + '<filter id="' + k + 'b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter></defs>' +
        '<rect width="400" height="400" fill="url(#' + k + 's)"/>' + b +
        '<g filter="url(#' + k + 'b)" opacity="0.95">' + neon + '</g>' + neon + rain +
        '<rect y="372" width="400" height="28" fill="' + P[3] + '" opacity="0.18"/>';
    },
    planet: function (R, P, k) {
      return '<defs>' + lin(k + 's', [P[0], P[1]]) + lin(k + 'p', [P[2], P[3], P[4]]) + '<clipPath id="' + k + 'c"><circle cx="200" cy="205" r="104"/></clipPath>' +
        '<radialGradient id="' + k + 'sh" cx="0.3" cy="0.3" r="0.9"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.6" stop-color="#000" stop-opacity="0.15"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient></defs>' +
        '<rect width="400" height="400" fill="url(#' + k + 's)"/>' + stars(R, 90, 400, 0.9) +
        '<ellipse cx="200" cy="205" rx="190" ry="40" transform="rotate(-16 200 205)" fill="none" stroke="' + P[5] + '" stroke-width="16" opacity="0.5"/>' +
        '<g clip-path="url(#' + k + 'c)"><rect x="90" y="95" width="220" height="220" fill="url(#' + k + 'p)"/>' +
        [128, 158, 182, 214, 246, 276].map(function (y, i) { return '<rect x="90" y="' + y + '" width="220" height="' + (7 + (i % 3) * 5) + '" fill="' + P[i % 2 ? 2 : 4] + '" opacity="0.4"/>'; }).join('') +
        '<circle cx="200" cy="205" r="104" fill="url(#' + k + 'sh)"/></g>' +
        '<path d="M12 232 Q200 292 388 190" fill="none" stroke="' + P[5] + '" stroke-width="16" opacity="0.85" stroke-linecap="round" clip-path="inset(0)"/>';
    },
    nebula: function (R, P, k) {
      let g = '', blobs = '';
      for (let i = 0; i < 7; i++) {
        const c = P[1 + (i % 4)];
        g += rad(k + 'n' + i, c, 0.85);
        blobs += '<circle cx="' + f1(40 + R() * 320) + '" cy="' + f1(60 + R() * 280) + '" r="' + f1(90 + R() * 90) + '" fill="url(#' + k + 'n' + i + ')"/>';
      }
      return '<defs>' + g + '</defs><rect width="400" height="400" fill="' + P[0] + '"/>' + blobs + stars(R, 130, 400, 1);
    },
    moon: function (R, P, k) {
      let cr = '';
      [[170, 130, 18], [230, 170, 26], [150, 200, 12], [205, 110, 9], [255, 120, 11], [190, 235, 14]].forEach(function (c) {
        cr += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="#8e8aa0" opacity="0.3"/>';
      });
      return '<defs>' + lin(k + 's', [P[0], P[1], P[2]]) + rad(k + 'g', '#dfe6ff', 0.4) + '<clipPath id="' + k + 'c"><circle cx="200" cy="170" r="92"/></clipPath></defs>' +
        '<rect width="400" height="400" fill="url(#' + k + 's)"/>' + stars(R, 100, 300, 0.95) +
        '<circle cx="200" cy="170" r="170" fill="url(#' + k + 'g)"/>' +
        '<circle cx="200" cy="170" r="92" fill="' + P[3] + '"/><g clip-path="url(#' + k + 'c)">' + cr + '</g>' +
        ridge(R, 330, 70, P[4]) + ridge(R, 372, 50, P[5]);
    },
    galaxy: function (R, P, k) {
      let dots = '';
      for (let arm = 0; arm < 2; arm++) {
        for (let i = 0; i < 220; i++) {
          const t = i / 220, ang = t * 5.2 + arm * Math.PI, rr = 14 + t * 150;
          const jx = (R() - 0.5) * (14 + t * 46), jy = (R() - 0.5) * (14 + t * 46);
          const x = 200 + Math.cos(ang) * rr * 1.1 + jx, y = 200 + Math.sin(ang) * rr * 0.62 * 1.1 + jy;
          dots += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(0.8 + R() * 1.7) + '" fill="' + (R() < 0.5 ? P[2] : P[3]) + '" opacity="' + f1(0.35 + R() * 0.6) + '"/>';
        }
      }
      return '<defs>' + rad(k + 'c', P[1], 1) + '</defs><rect width="400" height="400" fill="' + P[0] + '"/>' + stars(R, 110, 400, 0.9) +
        '<g transform="rotate(-24 200 200)">' + dots + '<ellipse cx="200" cy="200" rx="70" ry="44" fill="url(#' + k + 'c)"/></g>';
    },
    waves: function (R, P, k) {
      let w = '';
      for (let i = 0; i < 6; i++) {
        const base = 120 + i * 48, amp = 22 + R() * 18, ph = R() * 6, fr = 0.018 + R() * 0.02;
        let d = 'M0 400 L0 ' + base;
        for (let x = 0; x <= 400; x += 8) d += ' L' + x + ' ' + f1(base + Math.sin(x * fr * 2 + ph) * amp);
        w += '<path d="' + d + ' L400 400Z" fill="' + P[2 + (i % (P.length - 2))] + '" opacity="0.92"/>';
      }
      return '<defs>' + lin(k + 's', [P[0], P[1]]) + '</defs><rect width="400" height="400" fill="url(#' + k + 's)"/>' + w;
    },
    circles: function (R, P, k) {
      let c = '';
      for (let i = 0; i < 11; i++) {
        c += '<circle cx="' + f1(30 + R() * 340) + '" cy="' + f1(30 + R() * 340) + '" r="' + f1(40 + R() * 90) + '" fill="' + P[2 + (i % (P.length - 2))] + '" opacity="0.6"/>';
      }
      return '<defs>' + lin(k + 's', [P[0], P[1]]) + '</defs><rect width="400" height="400" fill="url(#' + k + 's)"/>' + c;
    },
    blocks: function (R, P, k) {
      let out = '<rect width="400" height="400" fill="' + P[0] + '"/>';
      const cs = P.slice(1);
      for (let r = 0; r < 4; r++) {
        for (let q = 0; q < 4; q++) {
          const x = q * 100, y = r * 100, c = cs[Math.floor(R() * cs.length)], c2 = cs[Math.floor(R() * cs.length)], t = Math.floor(R() * 5);
          if (t === 0) out += '<rect x="' + x + '" y="' + y + '" width="100" height="100" fill="' + c + '"/><circle cx="' + (x + 50) + '" cy="' + (y + 50) + '" r="28" fill="' + c2 + '"/>';
          else if (t === 1) out += '<path d="M' + x + ' ' + (y + 100) + ' A100 100 0 0 1 ' + (x + 100) + ' ' + y + ' L' + (x + 100) + ' ' + (y + 100) + 'Z" fill="' + c + '"/>';
          else if (t === 2) out += '<path d="M' + x + ' ' + y + ' L' + (x + 100) + ' ' + y + ' L' + x + ' ' + (y + 100) + 'Z" fill="' + c + '"/><path d="M' + (x + 100) + ' ' + y + ' L' + (x + 100) + ' ' + (y + 100) + ' L' + x + ' ' + (y + 100) + 'Z" fill="' + c2 + '"/>';
          else if (t === 3) out += '<circle cx="' + (x + 50) + '" cy="' + (y + 50) + '" r="46" fill="' + c + '"/><circle cx="' + (x + 50) + '" cy="' + (y + 50) + '" r="22" fill="' + P[0] + '"/>';
          else out += '<rect x="' + (x + 8) + '" y="' + (y + 8) + '" width="84" height="84" rx="10" fill="' + c + '"/>';
        }
      }
      return out;
    },
    rays: function (R, P, k) {
      let r = '';
      const n = 18;
      for (let i = 0; i < n; i += 2) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, L = 520;
        r += '<path d="M200 220 L' + f1(200 + Math.cos(a0) * L) + ' ' + f1(220 + Math.sin(a0) * L) + ' L' + f1(200 + Math.cos(a1) * L) + ' ' + f1(220 + Math.sin(a1) * L) + 'Z" fill="' + P[1] + '"/>';
      }
      return '<defs>' + rad(k + 'g', P[3], 0.9) + '</defs><rect width="400" height="400" fill="' + P[0] + '"/>' + r +
        '<circle cx="200" cy="220" r="150" fill="url(#' + k + 'g)"/><circle cx="200" cy="220" r="62" fill="' + P[2] + '"/><circle cx="200" cy="220" r="40" fill="' + P[3] + '"/>';
    }
  };

  const ITEMS = [
    { id: 'golden-peaks', title: 'Golden Peaks', cat: 'Nature', size: 'tall', tags: ['mountain', 'sunset', 'peaks', 'warm'], type: 'mountains', seed: 11, pal: ['#2b1055', '#d4506b', '#ffb36b', '#fff0b8', '#7a2f66', '#47195a', '#24103a'] },
    { id: 'mirror-lake', title: 'Mirror Lake', cat: 'Nature', size: 'wide', tags: ['lake', 'water', 'reflection', 'calm'], type: 'lake', seed: 23, pal: ['#0f2a4a', '#3f7fb0', '#f2c6a0', '#fff2d0', '#2f5a74', '#1e3f58'] },
    { id: 'pine-hollow', title: 'Pine Hollow', cat: 'Nature', size: 'square', tags: ['forest', 'trees', 'pine', 'green'], type: 'forest', seed: 37, pal: ['#0b2a2a', '#2a7a5e', '#bfe8a8', '#f6ffd0', '#1d6b50', '#0f4a3a', '#072620'] },
    { id: 'dune-sea', title: 'Dune Sea', cat: 'Nature', size: 'tall', tags: ['desert', 'sand', 'sunset', 'warm'], type: 'dunes', seed: 41, pal: ['#5a1a3a', '#f0764a', '#ffd08a', '#fff3c4', '#c0522f', '#8f3a2a', '#5d2428'] },
    { id: 'dusk-skyline', title: 'Dusk Skyline', cat: 'City', size: 'square', tags: ['city', 'skyline', 'dusk', 'buildings'], type: 'skyline', seed: 53, pal: ['#2a1b5e', '#b8467a', '#ffa86b', '#ffe1b0', '#6b2f78', '#231240', '', '#ffd37a'] },
    { id: 'midnight-towers', title: 'Midnight Towers', cat: 'City', size: 'tall', tags: ['city', 'night', 'moon', 'towers'], type: 'skyline', seed: 67, pal: ['#050b24', '#14245e', '#2f4a9a', '#f5f1d8', '#1b2a66', '#0a1030', '', '#ffe08a', 'night'] },
    { id: 'neon-rain', title: 'Neon Rain', cat: 'City', size: 'wide', tags: ['neon', 'rain', 'night', 'cyberpunk'], type: 'neon', seed: 71, pal: ['#0a0414', '#1a0838', '#2c0f55', '#ff3d9a', '#3de8ff', '#ffe14d', '#0b0620'] },
    { id: 'golden-hour', title: 'Golden Hour Rooftops', cat: 'City', size: 'square', tags: ['rooftops', 'sun', 'sunset', 'warm'], type: 'skyline', seed: 79, pal: ['#ff7a45', '#ffb25e', '#ffe3a0', '#fff6d6', '#b04050', '#4a1738', '', ''] },
    { id: 'ringed-giant', title: 'Ringed Giant', cat: 'Space', size: 'square', tags: ['planet', 'rings', 'stars', 'gas giant'], type: 'planet', seed: 83, pal: ['#05030f', '#1a0b3a', '#ffb86b', '#d9566e', '#6b2a63', '#ffe2b0'] },
    { id: 'rose-nebula', title: 'Rose Nebula', cat: 'Space', size: 'wide', tags: ['nebula', 'clouds', 'stars', 'pink'], type: 'nebula', seed: 89, pal: ['#07030f', '#ff4d94', '#ff9a4d', '#7a3cff', '#2fd0ff'] },
    { id: 'silent-moon', title: 'Silent Moon', cat: 'Space', size: 'tall', tags: ['moon', 'night', 'craters', 'stars'], type: 'moon', seed: 97, pal: ['#04040e', '#101a3e', '#2b3a73', '#e9e6dc', '#0b1128', '#05081a'] },
    { id: 'spiral-arm', title: 'Spiral Arm', cat: 'Space', size: 'square', tags: ['galaxy', 'spiral', 'stars', 'cosmos'], type: 'galaxy', seed: 101, pal: ['#05030f', '#fff1c4', '#ff7ab0', '#7aa8ff'] },
    { id: 'tide-lines', title: 'Tide Lines', cat: 'Abstract', size: 'wide', tags: ['waves', 'lines', 'warm', 'flow'], type: 'waves', seed: 103, pal: ['#2a0a3a', '#7a1f5e', '#ff6a5c', '#ff9a4d', '#ffd04d', '#ff4f93', '#b23cff'] },
    { id: 'soft-orbits', title: 'Soft Orbits', cat: 'Abstract', size: 'square', tags: ['circles', 'glow', 'purple', 'bubbles'], type: 'circles', seed: 107, pal: ['#1a0b3a', '#4a1d7a', '#ff6aa8', '#ffa64d', '#4de3cf', '#ffe14d'] },
    { id: 'block-party', title: 'Block Party', cat: 'Abstract', size: 'tall', tags: ['geometry', 'bauhaus', 'shapes', 'colour'], type: 'blocks', seed: 109, pal: ['#f6e7d4', '#e63946', '#f4a300', '#1d3557', '#2a9d8f', '#1b1b2f'] },
    { id: 'sunburst', title: 'Sunburst', cat: 'Abstract', size: 'square', tags: ['sun', 'rays', 'burst', 'retro'], type: 'rays', seed: 113, pal: ['#ff5e7e', '#ff8a4d', '#fff1c4', '#ffd45e'] }
  ];

  function render(item, ctx) {
    const R = rng(item.seed);
    const key = 'g' + item.id.replace(/[^a-z]/g, '') + ctx;
    return '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + item.title + ', ' + item.cat.toLowerCase() + ' picture">' + SCENES[item.type](R, item.pal, key) + '</svg>';
  }

  window.GALLERY = { items: ITEMS, render: render, categories: ['Nature', 'City', 'Space', 'Abstract'] };
})();
