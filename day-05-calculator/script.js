(() => {
  'use strict';

  const MAX_DIGITS = 16;
  const HISTORY_MAX = 20;
  const STORE_KEY = 'vr-calc-history-v1';
  const SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };

  const els = {
    expr: document.getElementById('expr'),
    preview: document.getElementById('preview'),
    value: document.getElementById('value'),
    status: document.getElementById('status'),
    keypad: document.getElementById('keypad'),
    histList: document.getElementById('hist-list'),
    histEmpty: document.getElementById('hist-empty'),
    histClear: document.getElementById('hist-clear'),
  };

  // Token kinds: n = number (string), o = operator, l = "(", r = ")"
  let tokens = [];
  let entry = '';            // the number being typed; may be '-' or '-5.'
  let justEvaluated = false; // true right after "=" until the next key
  let lastText = '';         // expression shown after "="
  let history = loadHistory();
  let statusTimer = null;

  // ---------- helpers ----------

  const isValue = (tok) => Boolean(tok) && (tok.t === 'n' || tok.t === 'r');
  const last = () => tokens[tokens.length - 1];

  function openDepth() {
    let depth = 0;
    for (const t of tokens) {
      if (t.t === 'l') depth++;
      else if (t.t === 'r') depth--;
    }
    return depth;
  }

  function formatEntry(s) {
    if (s === '') return '';
    const m = /^(-?)(\d*)(\.?)(\d*)$/.exec(s);
    if (!m) return s; // exponent form, shown as is
    const intPart = m[2] ? m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',') : (m[3] ? '0' : '');
    return m[1] + intPart + m[3] + m[4];
  }

  function formatNumber(n) {
    if (n === 0) return '0';
    const a = Math.abs(n);
    if (a >= 1e15 || a < 1e-6) {
      return n.toExponential(6).replace(/\.?0+e/, 'e');
    }
    return n.toLocaleString('en-US', { maximumFractionDigits: 10 });
  }

  function listToText(list) {
    const parts = list.map((t) => {
      if (t.t === 'n') return formatEntry(t.v);
      if (t.t === 'o') return SYMBOL[t.v];
      return t.t === 'l' ? '(' : ')';
    });
    return parts.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
  }

  // Tokens plus the number being typed (what the user sees on the line).
  function tokensWithEntry() {
    const list = tokens.slice();
    if (entry !== '') list.push({ t: 'n', v: entry });
    return list;
  }

  // What "=" will evaluate: pending number, no dangling operator or "(",
  // and any missing ")" added at the end.
  function buildList() {
    const list = tokens.slice();
    if (entry !== '' && entry !== '-') list.push({ t: 'n', v: entry });
    while (list.length && (list[list.length - 1].t === 'o' || list[list.length - 1].t === 'l')) {
      list.pop();
    }
    let depth = 0;
    for (const t of list) {
      if (t.t === 'l') depth++;
      else if (t.t === 'r') depth--;
    }
    while (depth-- > 0) list.push({ t: 'r' });
    return list;
  }

  // Shunting-yard evaluation. No eval, no Function: only + - * / and brackets.
  function evaluate(list) {
    const out = [];
    const ops = [];
    for (const t of list) {
      if (t.t === 'n') {
        out.push(t);
      } else if (t.t === 'o') {
        while (ops.length && ops[ops.length - 1].t === 'o' &&
               PREC[ops[ops.length - 1].v] >= PREC[t.v]) {
          out.push(ops.pop());
        }
        ops.push(t);
      } else if (t.t === 'l') {
        ops.push(t);
      } else {
        while (ops.length && ops[ops.length - 1].t !== 'l') out.push(ops.pop());
        if (!ops.length) throw new Error('Check the brackets');
        ops.pop();
      }
    }
    while (ops.length) {
      const t = ops.pop();
      if (t.t === 'l') throw new Error('Check the brackets');
      out.push(t);
    }

    const stack = [];
    for (const t of out) {
      if (t.t === 'n') {
        const x = Number(t.v);
        if (!Number.isFinite(x)) throw new Error('Number too large');
        stack.push(x);
        continue;
      }
      if (stack.length < 2) throw new Error('Check the numbers');
      const b = stack.pop();
      const a = stack.pop();
      let r;
      if (t.v === '+') r = a + b;
      else if (t.v === '-') r = a - b;
      else if (t.v === '*') r = a * b;
      else {
        if (b === 0) throw new Error('Cannot divide by zero');
        r = a / b;
      }
      stack.push(r);
    }
    if (stack.length !== 1) throw new Error('Check the expression');
    const result = stack[0];
    if (!Number.isFinite(result)) throw new Error('Number too large');
    // Round away floating point noise (0.1 + 0.2 shows 0.3).
    return Number(result.toPrecision(15));
  }

  function hasOperatorOrBracket(list) {
    return list.some((t) => t.t === 'o' || t.t === 'l' || t.t === 'r');
  }

  // ---------- state changes ----------

  function pushEntry() {
    if (entry !== '' && entry !== '-') tokens.push({ t: 'n', v: entry });
    entry = '';
  }

  // Pull the last number back into the entry so it can be edited (used by % and Backspace).
  function takeEntry() {
    if (entry === '' && last() && last().t === 'n') {
      entry = tokens.pop().v;
    }
  }

  function addDigit(d) {
    if (justEvaluated) {
      tokens = [];
      entry = '';
      justEvaluated = false;
    }
    if (/e/.test(entry)) return;
    if (entry.replace('-', '').replace('.', '').length >= MAX_DIGITS) {
      flash('Digit limit reached', true);
      return;
    }
    if (entry === '0' || entry === '-0') entry = entry.slice(0, -1) + d;
    else entry += d;
    clearStatus();
  }

  function addDecimal() {
    if (justEvaluated) {
      tokens = [];
      entry = '';
      justEvaluated = false;
    }
    if (entry.includes('.')) return;
    if (entry === '' || entry === '-') entry += '0.';
    else entry += '.';
  }

  function addOperator(op) {
    justEvaluated = false;
    if (entry === '-') return; // only a minus sign so far
    if (entry !== '') {
      pushEntry();
      tokens.push({ t: 'o', v: op });
      return;
    }
    const prev = last();
    if (!prev || prev.t === 'o' || prev.t === 'l') {
      if (op === '-') {
        entry = '-'; // negative number, e.g. 5 x -3
        return;
      }
      if (prev && prev.t === 'o') prev.v = op; // swap the operator
      return;
    }
    tokens.push({ t: 'o', v: op });
  }

  function openParen() {
    justEvaluated = false;
    if (entry === '-') return;
    pushEntry();
    if (isValue(last())) tokens.push({ t: 'o', v: '*' });
    tokens.push({ t: 'l' });
  }

  function closeParen() {
    justEvaluated = false;
    if (entry === '-') return;
    if (openDepth() <= 0) return;
    if (entry === '' && !isValue(last())) return;
    pushEntry();
    tokens.push({ t: 'r' });
  }

  function toggleBracket() {
    if (openDepth() > 0 && (entry !== '' || isValue(last()))) closeParen();
    else openParen();
  }

  function backspace() {
    justEvaluated = false;
    if (entry === '') {
      const prev = last();
      if (prev && prev.t === 'n') {
        tokens.pop();
        entry = prev.v;
      } else {
        tokens.pop(); // operator or bracket
        return;
      }
    }
    entry = entry.slice(0, -1);
    if (entry === '-') entry = '';
    clearStatus();
  }

  // "50 %" is 0.5. After + or -, "200 + 10 %" means 10 percent of 200 (220).
  function percent() {
    justEvaluated = false;
    if (entry === '-') return;
    takeEntry();
    if (entry === '') return;
    const n = Number(entry);
    const opTok = tokens[tokens.length - 1];
    const baseTok = tokens[tokens.length - 2];
    let p = n / 100;
    if (opTok && opTok.t === 'o' && (opTok.v === '+' || opTok.v === '-') &&
        baseTok && baseTok.t === 'n') {
      p = Number(baseTok.v) * n / 100;
    }
    entry = String(Number(p.toPrecision(15)));
  }

  function clearAll() {
    tokens = [];
    entry = '';
    justEvaluated = false;
    lastText = '';
    clearStatus();
  }

  function equals() {
    if (justEvaluated) return;
    const list = buildList();
    if (!list.length) return;
    let result;
    try {
      result = evaluate(list);
    } catch (err) {
      flash(err.message, true);
      return;
    }
    const text = listToText(list);
    const raw = String(result);
    addHistory(text, formatNumber(result), raw);
    lastText = text;
    tokens = [{ t: 'n', v: raw }];
    entry = '';
    justEvaluated = true;
    clearStatus();
  }

  function useAnswer(item) {
    const restart = justEvaluated || (entry === '' && isValue(last()));
    justEvaluated = false;
    if (restart) tokens = [];
    entry = item.raw;
    flash('Answer loaded', false);
  }

  // ---------- display ----------

  function currentDisplay() {
    if (entry !== '') return formatEntry(entry);
    const prev = last();
    if (prev && prev.t === 'n') {
      return justEvaluated ? formatNumber(Number(prev.v)) : formatEntry(prev.v);
    }
    return '0';
  }

  function previewText() {
    if (justEvaluated) return '';
    const list = buildList();
    if (!list.length || !hasOperatorOrBracket(list)) return '';
    try {
      return '= ' + formatNumber(evaluate(list));
    } catch (err) {
      return '';
    }
  }

  function render() {
    els.expr.textContent = justEvaluated ? lastText + ' =' : listToText(tokensWithEntry());
    els.value.textContent = currentDisplay();
    els.preview.textContent = previewText();
  }

  function flash(msg, isError) {
    els.status.textContent = msg;
    els.status.classList.toggle('is-error', Boolean(isError));
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      els.status.textContent = '';
      els.status.classList.remove('is-error');
    }, 2600);
  }

  function clearStatus() {
    clearTimeout(statusTimer);
    els.status.textContent = '';
    els.status.classList.remove('is-error');
  }

  // ---------- history ----------

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data)) return [];
      return data
        .filter((x) => x && typeof x.e === 'string' && typeof x.r === 'string' && typeof x.raw === 'string')
        .slice(0, HISTORY_MAX);
    } catch (err) {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(history));
    } catch (err) {
      // Storage blocked or full: history still works for this visit.
    }
  }

  function addHistory(expression, resultText, raw) {
    history.unshift({ e: expression, r: resultText, raw });
    history = history.slice(0, HISTORY_MAX);
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    els.histList.textContent = '';
    history.forEach((item, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hist-item';
      btn.dataset.index = String(i);
      btn.setAttribute('aria-label', 'Use answer ' + item.r + ' from ' + item.e);

      const ex = document.createElement('span');
      ex.className = 'hist-item__expr';
      ex.textContent = item.e + ' =';

      const res = document.createElement('span');
      res.className = 'hist-item__res';
      res.textContent = item.r;

      btn.append(ex, res);
      li.append(btn);
      els.histList.append(li);
    });
    els.histEmpty.hidden = history.length > 0;
    els.histClear.disabled = history.length === 0;
  }

  // ---------- input ----------

  function press(key) {
    switch (key) {
      case 'C': clearAll(); break;
      case 'BS': backspace(); break;
      case '%': percent(); break;
      case 'P': toggleBracket(); break;
      case '(': openParen(); break;
      case ')': closeParen(); break;
      case '=': equals(); break;
      case '.': addDecimal(); break;
      case '+':
      case '-':
      case '*':
      case '/': addOperator(key); break;
      default:
        if (/^[0-9]$/.test(key)) addDigit(key);
    }
    render();
  }

  function flashKey(key) {
    const btn = els.keypad.querySelector('[data-key="' + CSS.escape(key) + '"]');
    if (!btn) return;
    btn.classList.add('is-pressed');
    setTimeout(() => btn.classList.remove('is-pressed'), 120);
  }

  els.keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-key]');
    if (!btn) return;
    press(btn.dataset.key);
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    let key = null;

    if (/^[0-9]$/.test(k)) key = k;
    else if (k === '.') key = '.';
    else if (k === '+' || k === '-' || k === '*' || k === '/') key = k;
    else if (k === 'x' || k === 'X') key = '*';
    else if (k === '%') key = '%';
    else if (k === '(' || k === ')') key = k;
    else if (k === 'Enter' || k === '=') key = '=';
    else if (k === 'Backspace') key = 'BS';
    else if (k === 'Escape' || k === 'c' || k === 'C') key = 'C';

    if (key === null) return;
    // A focused key or history item already fires click on Enter.
    if (k === 'Enter' && e.target instanceof HTMLButtonElement) return;

    e.preventDefault();
    flashKey(key);
    press(key);
  });

  els.histList.addEventListener('click', (e) => {
    const btn = e.target.closest('button.hist-item');
    if (!btn) return;
    const item = history[Number(btn.dataset.index)];
    if (!item) return;
    useAnswer(item);
    render();
  });

  els.histClear.addEventListener('click', () => {
    history = [];
    saveHistory();
    renderHistory();
  });

  renderHistory();
  render();
})();
