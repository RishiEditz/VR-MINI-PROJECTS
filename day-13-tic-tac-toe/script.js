/* Tic-Tac-Toe vs Computer (Mini Projects, Day 13). Plain JavaScript, no libraries. */
(function () {
  'use strict';

  var LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  var KEY = 'mini13-tictactoe';
  var HUMAN = 'X', CPU = 'O';

  var boardEl = document.getElementById('board');
  var statusEl = document.getElementById('status');
  var lineEl = document.getElementById('winline-l');
  var winSvg = document.getElementById('winline');
  var themeBtn = document.getElementById('theme');

  var state = { board: Array(9).fill(''), over: false, locked: false, turn: HUMAN };
  var saved = { diff: 'hard', first: 'you', you: 0, draw: 0, cpu: 0, theme: 'dark' };
  var timer = null;

  /* ---------- storage (never breaks if blocked) ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          if (o.diff === 'easy' || o.diff === 'hard') saved.diff = o.diff;
          if (o.first === 'you' || o.first === 'cpu') saved.first = o.first;
          if (o.theme === 'light' || o.theme === 'dark') saved.theme = o.theme;
          ['you', 'draw', 'cpu'].forEach(function (k) {
            var n = parseInt(o[k], 10);
            saved[k] = isFinite(n) && n >= 0 ? Math.min(n, 99999) : 0;
          });
        }
      }
    } catch (e) { /* ignore */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* ignore */ }
  }

  /* ---------- game rules ---------- */
  function winnerOf(b) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { who: b[l[0]], line: l };
    }
    return null;
  }
  function emptyCells(b) {
    var r = [];
    for (var i = 0; i < 9; i++) if (!b[i]) r.push(i);
    return r;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* Minimax: the computer (O) maximizes, you (X) minimize. Faster wins and slower losses score better. */
  function minimax(b, player, depth) {
    var w = winnerOf(b);
    if (w) return w.who === CPU ? 10 - depth : depth - 10;
    var free = emptyCells(b);
    if (!free.length) return 0;
    var best = player === CPU ? -Infinity : Infinity;
    for (var i = 0; i < free.length; i++) {
      b[free[i]] = player;
      var s = minimax(b, player === CPU ? HUMAN : CPU, depth + 1);
      b[free[i]] = '';
      if (player === CPU) { if (s > best) best = s; } else if (s < best) best = s;
    }
    return best;
  }

  function bestMove(b) {
    var free = emptyCells(b);
    if (free.length === 9) return pick([0, 2, 4, 6, 8]); // any corner or the centre is perfect
    var bestScore = -Infinity, moves = [];
    free.forEach(function (c) {
      b[c] = CPU;
      var s = minimax(b, HUMAN, 1);
      b[c] = '';
      if (s > bestScore) { bestScore = s; moves = [c]; } else if (s === bestScore) moves.push(c);
    });
    return pick(moves);
  }

  /* Easy: takes a win when it sees one, otherwise plays at random (it never blocks on purpose). */
  function easyMove(b) {
    var free = emptyCells(b);
    for (var i = 0; i < free.length; i++) {
      b[free[i]] = CPU;
      var w = winnerOf(b);
      b[free[i]] = '';
      if (w) return free[i];
    }
    return pick(free);
  }

  function cpuMove() {
    return saved.diff === 'easy' ? easyMove(state.board.slice()) : bestMove(state.board.slice());
  }

  /* ---------- drawing ---------- */
  var cells = [];
  function buildBoard() {
    boardEl.innerHTML = '';
    for (var i = 0; i < 9; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cell';
      b.setAttribute('role', 'gridcell');
      b.dataset.i = String(i);
      b.addEventListener('click', onCell);
      boardEl.appendChild(b);
      cells.push(b);
    }
  }
  function cellLabel(i) {
    var row = Math.floor(i / 3) + 1, col = (i % 3) + 1, v = state.board[i];
    return 'Square ' + (i + 1) + ', row ' + row + ' column ' + col + ', ' + (v ? v : 'empty');
  }
  function render() {
    for (var i = 0; i < 9; i++) {
      var v = state.board[i], c = cells[i];
      c.className = 'cell' + (v ? ' cell--' + v.toLowerCase() : '');
      c.textContent = '';
      if (v) {
        var s = document.createElement('span');
        s.className = 'mark';
        s.innerHTML = v === 'X'
          ? '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M24 24 76 76M76 24 24 76"/></svg>'
          : '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="28"/></svg>';
        c.appendChild(s);
      }
      c.setAttribute('aria-label', cellLabel(i));
      c.disabled = !!v || state.over || state.locked;
    }
    document.getElementById('s-you').textContent = saved.you;
    document.getElementById('s-draw').textContent = saved.draw;
    document.getElementById('s-cpu').textContent = saved.cpu;
    ['easy', 'hard'].forEach(function (d) {
      var btn = document.querySelector('[data-diff="' + d + '"]');
      btn.setAttribute('aria-checked', String(saved.diff === d));
    });
    ['you', 'cpu'].forEach(function (f) {
      var btn = document.querySelector('[data-first="' + f + '"]');
      btn.setAttribute('aria-checked', String(saved.first === f));
    });
  }
  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (kind ? ' status--' + kind : '');
  }

  function drawWinLine(line) {
    function centre(i) { return [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50]; }
    var a = centre(line[0]), b = centre(line[2]);
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len * 28, uy = dy / len * 28; // extend past the end squares
    lineEl.setAttribute('x1', a[0] - ux); lineEl.setAttribute('y1', a[1] - uy);
    lineEl.setAttribute('x2', b[0] + ux); lineEl.setAttribute('y2', b[1] + uy);
    var total = Math.sqrt(Math.pow(b[0] - a[0] + 2 * ux, 2) + Math.pow(b[1] - a[1] + 2 * uy, 2));
    lineEl.style.strokeDasharray = String(total);
    lineEl.style.strokeDashoffset = String(total);
    winSvg.classList.remove('winline--on');
    void winSvg.getBoundingClientRect();
    winSvg.classList.add('winline--on');
    winSvg.dataset.who = state.board[line[0]];
  }
  function clearWinLine() { winSvg.classList.remove('winline--on'); winSvg.dataset.who = ''; }

  /* ---------- flow ---------- */
  function finish() {
    var w = winnerOf(state.board);
    if (w) {
      state.over = true;
      drawWinLine(w.line);
      w.line.forEach(function (i) { cells[i].classList.add('cell--win'); });
      if (w.who === HUMAN) { saved.you++; setStatus('You win! Nice one.', 'win'); }
      else { saved.cpu++; setStatus('Computer wins. Try again?', 'lose'); }
      save(); render();
      w.line.forEach(function (i) { cells[i].classList.add('cell--win'); });
      return true;
    }
    if (!emptyCells(state.board).length) {
      state.over = true;
      saved.draw++; save();
      setStatus("It's a draw.", 'draw');
      render();
      return true;
    }
    return false;
  }

  function place(i, who) {
    state.board[i] = who;
    cells[i].classList.add('cell--pop');
  }

  function cpuTurn() {
    state.locked = true; state.turn = CPU;
    setStatus('Computer is thinking...', 'think');
    render();
    clearTimeout(timer);
    timer = setTimeout(function () {
      var m = cpuMove();
      place(m, CPU);
      state.locked = false; state.turn = HUMAN;
      render();
      cells[m].classList.add('cell--pop');
      if (!finish()) setStatus('Your turn. You are X.');
    }, 520);
  }

  function onCell(e) {
    var i = parseInt(e.currentTarget.dataset.i, 10);
    humanMove(i);
  }
  function humanMove(i) {
    if (state.over || state.locked || state.board[i]) return;
    place(i, HUMAN);
    render();
    cells[i].classList.add('cell--pop');
    if (finish()) return;
    cpuTurn();
  }

  function newGame() {
    clearTimeout(timer);
    state = { board: Array(9).fill(''), over: false, locked: false, turn: HUMAN };
    clearWinLine();
    render();
    if (saved.first === 'cpu') cpuTurn();
    else setStatus('Your turn. You are X.');
  }

  /* ---------- controls ---------- */
  document.getElementById('seg-diff').addEventListener('click', function (e) {
    var b = e.target.closest('[data-diff]');
    if (!b) return;
    saved.diff = b.dataset.diff; save(); newGame();
  });
  document.getElementById('seg-first').addEventListener('click', function (e) {
    var b = e.target.closest('[data-first]');
    if (!b) return;
    saved.first = b.dataset.first; save(); newGame();
  });
  function arrowKeys(group, attr) {
    document.getElementById(group).addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var btns = Array.prototype.slice.call(this.querySelectorAll('button'));
      var idx = btns.indexOf(document.activeElement);
      if (idx < 0) return;
      var next = btns[(idx + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
      next.focus(); next.click(); e.preventDefault();
    });
  }
  arrowKeys('seg-diff'); arrowKeys('seg-first');

  document.getElementById('new').addEventListener('click', newGame);
  document.getElementById('reset').addEventListener('click', function () {
    saved.you = saved.draw = saved.cpu = 0; save(); newGame();
  });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (/^[1-9]$/.test(e.key)) { humanMove(parseInt(e.key, 10) - 1); }
    else if (e.key === 'n' || e.key === 'N') { newGame(); }
  });

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', saved.theme);
    var light = saved.theme === 'light';
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    document.getElementById('theme-icon').setAttribute('d', light
      ? 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z'
      : 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z');
  }
  themeBtn.addEventListener('click', function () {
    saved.theme = saved.theme === 'light' ? 'dark' : 'light';
    save(); applyTheme();
  });

  /* ---------- start ---------- */
  load();
  buildBoard();
  applyTheme();
  newGame();

  // tiny hook for automated checks
  window.__ttt = { winnerOf: winnerOf, bestMove: bestMove, easyMove: easyMove, state: function () { return state; } };
})();
