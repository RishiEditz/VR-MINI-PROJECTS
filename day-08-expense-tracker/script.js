(() => {
  'use strict';

  /* ---------- Config ---------- */
  const KEY = 'vrmp.expenses.v1';
  const SVGNS = 'http://www.w3.org/2000/svg';

  const CATS = [
    { id: 'food', name: 'Food', color: 'var(--c-food)', icon: 'M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 2-3 4-3 7h3v11' },
    { id: 'travel', name: 'Travel', color: 'var(--c-travel)', icon: 'M5 4h14a1 1 0 0 1 1 1v11H4V5a1 1 0 0 1 1-1zM4 11h16M7 20v-4M17 20v-4' },
    { id: 'shopping', name: 'Shopping', color: 'var(--c-shopping)', icon: 'M5 8h14l-1 12H6L5 8zM9 8a3 3 0 0 1 6 0' },
    { id: 'bills', name: 'Bills', color: 'var(--c-bills)', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
    { id: 'fun', name: 'Fun', color: 'var(--c-fun)', icon: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z' },
    { id: 'health', name: 'Health', color: 'var(--c-health)', icon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z' },
    { id: 'other', name: 'Other', color: 'var(--c-other)', icon: 'M4 12h2M11 12h2M18 12h2' },
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));

  /* ---------- Helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const money0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const money2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = (p) => (p % 100 === 0 ? money0 : money2).format(p / 100);
  const fmtRound = (p) => money0.format(Math.round(p / 100));
  const short = (p) => {
    const r = p / 100;
    const trim = (n) => String(Math.round(n * 10) / 10).replace(/\.0$/, '');
    if (r >= 10000000) return '₹' + trim(r / 10000000) + 'Cr';
    if (r >= 100000) return '₹' + trim(r / 100000) + 'L';
    if (r >= 1000) return '₹' + trim(r / 1000) + 'k';
    return '₹' + Math.round(r);
  };

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parseYmd(s)) === s;
  const monthKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1);
  const monthDate = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1); };
  const shiftMonth = (key, n) => { const d = monthDate(key); d.setMonth(d.getMonth() + n); return monthKey(d); };
  const daysIn = (key) => { const d = monthDate(key); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); };
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const today = () => ymd(new Date());

  function svgIcon(path, extraClass) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    if (extraClass) s.setAttribute('class', extraClass);
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', path);
    s.appendChild(p);
    return s;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function parseAmount(str) {
    const clean = String(str).replace(/[₹,\s]/g, '');
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(clean)) return null;
    return Math.round(parseFloat(clean) * 100);
  }

  /* ---------- Demo data (deterministic) ---------- */
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const POOL = [
    ['food', 'Swiggy dinner', 180, 520, 5], ['food', 'Chai and samosa', 40, 120, 4], ['food', 'Groceries', 600, 2400, 3],
    ['food', 'Lunch with the team', 250, 600, 3], ['food', 'Zomato order', 200, 650, 4], ['food', 'Biryani night', 300, 700, 2],
    ['food', 'Milk and curd', 90, 260, 3],
    ['travel', 'Metro card recharge', 300, 500, 2], ['travel', 'Auto to office', 60, 200, 4], ['travel', 'Cab ride', 150, 450, 3],
    ['travel', 'Petrol', 500, 1500, 3], ['travel', 'Train ticket', 200, 900, 1],
    ['shopping', 'T-shirt', 499, 1499, 2], ['shopping', 'Earphones', 799, 2499, 1], ['shopping', 'Book', 249, 699, 2],
    ['shopping', 'Phone cover', 199, 499, 1], ['shopping', 'Sneakers', 1299, 3499, 1],
    ['fun', 'Movie tickets', 300, 700, 2], ['fun', 'Game top-up', 99, 499, 2], ['fun', 'Concert pass', 800, 2000, 1],
    ['health', 'Pharmacy', 120, 900, 2], ['health', 'Doctor visit', 400, 800, 1],
    ['other', 'Gift for a friend', 300, 1500, 1], ['other', 'Haircut', 150, 400, 2], ['other', 'Donation', 100, 500, 1],
  ];
  const FIXED = [
    ['health', 'Gym membership', 1500, 2], ['fun', 'Streaming plan', 199, 5], ['bills', 'Broadband', 799, 3],
    ['bills', 'Mobile recharge', 299, 7], ['bills', 'Electricity bill', 0, 12], ['bills', 'Water bill', 320, 15],
  ];

  function makeDemo() {
    const rand = mulberry32(20261119);
    const now = new Date();
    const tdy = ymd(now);
    const nowKey = monthKey(now);
    const total = POOL.reduce((s, p) => s + p[4], 0);
    const items = [];
    let n = 0;
    const add = (cat, note, rupees, date) => {
      if (date > tdy) return;
      items.push({ id: 'd' + (++n), amount: rupees * 100, cat, date, note });
    };
    for (let back = 5; back >= 0; back--) {
      const key = shiftMonth(nowKey, -back);
      const dim = daysIn(key);
      for (const [cat, note, rupees, day] of FIXED) {
        const r = note === 'Electricity bill' ? 900 + Math.floor(rand() * 1300) : rupees;
        add(cat, note, r, key + '-' + pad(Math.min(day, dim)));
      }
      const count = 15 + Math.floor(rand() * 6);
      for (let i = 0; i < count; i++) {
        let pick = rand() * total;
        let row = POOL[0];
        for (const p of POOL) { pick -= p[4]; if (pick <= 0) { row = p; break; } }
        const rupees = Math.round((row[2] + rand() * (row[3] - row[2])) / (row[3] > 500 ? 10 : 5)) * (row[3] > 500 ? 10 : 5);
        add(row[0], row[1], rupees, key + '-' + pad(1 + Math.floor(rand() * dim)));
      }
    }
    return items;
  }

  /* ---------- State + storage ---------- */
  const state = { items: [], budget: 1500000, month: monthKey(new Date()), cat: 'all', q: '', sort: 'new', all: false };

  function validItem(x) {
    return x && typeof x.id === 'string' && Number.isInteger(x.amount) && x.amount > 0 && x.amount < 1e11 &&
      CAT[x.cat] && isYmd(x.date) && typeof x.note === 'string';
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.items)) {
          state.items = data.items.filter(validItem).map((x) => ({ id: x.id, amount: x.amount, cat: x.cat, date: x.date, note: x.note.slice(0, 60) }));
          state.budget = Number.isInteger(data.budget) && data.budget >= 0 ? data.budget : 0;
          return;
        }
      }
    } catch (e) { /* storage blocked or broken: fall through to demo */ }
    state.items = makeDemo();
    save();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, items: state.items, budget: state.budget })); } catch (e) { /* ignore */ }
  }

  /* ---------- Derived data ---------- */
  const inMonth = (it, key) => it.date.slice(0, 7) === key;
  const sum = (arr) => arr.reduce((s, x) => s + x.amount, 0);

  function monthItems(key) { return state.items.filter((it) => inMonth(it, key)); }

  function visibleItems() {
    const q = state.q.trim().toLowerCase();
    let list = state.all ? state.items.slice() : monthItems(state.month);
    if (state.cat !== 'all') list = list.filter((it) => it.cat === state.cat);
    if (q) {
      list = list.filter((it) =>
        it.note.toLowerCase().includes(q) || CAT[it.cat].name.toLowerCase().includes(q) ||
        String(it.amount / 100).includes(q.replace(/[,₹]/g, '')));
    }
    const cmp = {
      new: (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id, 'en', { numeric: true })),
      old: (a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : a.id.localeCompare(b.id, 'en', { numeric: true })),
      high: (a, b) => b.amount - a.amount,
      low: (a, b) => a.amount - b.amount,
    }[state.sort];
    return list.sort(cmp);
  }

  /* ---------- Rendering ---------- */
  let shownTotal = 0;
  let animFrame = 0;
  function animateTotal(to) {
    const node = $('st-total');
    cancelAnimationFrame(animFrame);
    if (reduced || shownTotal === to) { shownTotal = to; node.textContent = fmt(to); return; }
    const from = shownTotal;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - k, 3);
      node.textContent = fmt(Math.round((from + (to - from) * eased) / 100) * 100);
      if (k < 1) animFrame = requestAnimationFrame(step); else { shownTotal = to; node.textContent = fmt(to); }
    };
    animFrame = requestAnimationFrame(step);
  }

  function catTotals(items) {
    const m = {};
    for (const it of items) m[it.cat] = (m[it.cat] || 0) + it.amount;
    return CATS.map((c) => ({ cat: c, amount: m[c.id] || 0 })).filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount);
  }

  function renderHeader() {
    $('month-label').textContent = monthDate(state.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    $('next').disabled = state.month >= monthKey(new Date());
  }

  function renderStats(items, totals) {
    const total = sum(items);
    animateTotal(total);
    const isNow = state.month === monthKey(new Date());
    const days = isNow ? new Date().getDate() : daysIn(state.month);
    $('st-avg').textContent = fmtRound(items.length ? total / days : 0);
    $('st-avg-label').textContent = 'Daily average';
    $('st-count').textContent = String(items.length);
    if (totals.length) {
      $('st-top').textContent = totals[0].cat.name;
      $('st-top-sub').textContent = fmt(totals[0].amount) + ' · ' + Math.round((totals[0].amount / total) * 100) + '%';
    } else {
      $('st-top').textContent = 'None yet';
      $('st-top-sub').textContent = '';
    }
  }

  function renderBudget(total) {
    const box = $('budget');
    const b = state.budget;
    if (!b) {
      box.dataset.state = 'none';
      $('budget-main').textContent = 'No budget set';
      $('budget-side').textContent = 'Set one to track it';
      $('budget-fill').style.width = '0%';
      $('edit-budget').textContent = 'Set budget';
      return;
    }
    const pct = total / b;
    box.dataset.state = pct > 1 ? 'over' : pct >= 0.8 ? 'warn' : 'ok';
    $('budget-main').textContent = fmtRound(total) + ' of ' + fmtRound(b);
    $('budget-side').textContent = pct > 1 ? fmtRound(total - b) + ' over' : fmtRound(b - total) + ' left';
    $('budget-fill').style.width = Math.min(100, Math.round(pct * 100)) + '%';
    $('edit-budget').textContent = 'Edit budget';
  }

  /* Donut: build the circles once so they can animate */
  const R = 45;
  const CIRC = 2 * Math.PI * R;
  const segs = {};
  function buildDonut() {
    const svg = $('donut');
    const track = document.createElementNS(SVGNS, 'circle');
    track.setAttribute('class', 'donut__track');
    track.setAttribute('cx', '60'); track.setAttribute('cy', '60'); track.setAttribute('r', String(R));
    svg.appendChild(track);
    for (const c of CATS) {
      const k = document.createElementNS(SVGNS, 'circle');
      k.setAttribute('class', 'donut__seg');
      k.setAttribute('cx', '60'); k.setAttribute('cy', '60'); k.setAttribute('r', String(R));
      k.style.stroke = c.color;
      k.setAttribute('stroke-dasharray', '0 ' + CIRC);
      const t = document.createElementNS(SVGNS, 'title');
      k.appendChild(t);
      k.addEventListener('click', () => setCat(state.cat === c.id ? 'all' : c.id));
      svg.appendChild(k);
      segs[c.id] = k;
    }
  }

  function renderDonut(total, totals) {
    let start = 0;
    const gap = totals.length > 1 ? 1.4 : 0;
    const byId = Object.fromEntries(totals.map((t) => [t.cat.id, t.amount]));
    for (const c of CATS) {
      const k = segs[c.id];
      const amt = byId[c.id] || 0;
      const len = total ? (amt / total) * CIRC : 0;
      const dash = Math.max(0, len - gap);
      k.setAttribute('stroke-dasharray', dash.toFixed(2) + ' ' + (CIRC - dash).toFixed(2));
      k.setAttribute('stroke-dashoffset', (-start).toFixed(2));
      k.firstChild.textContent = amt ? c.name + ': ' + fmt(amt) : '';
      k.classList.toggle('is-dim', state.cat !== 'all' && state.cat !== c.id);
      k.style.pointerEvents = amt ? 'auto' : 'none';
      start += len;
    }
    $('donut').setAttribute('aria-label', total ? 'Spending by category, total ' + fmt(total) : 'No spending this month');
    $('donut-amount').textContent = fmtRound(total);
    $('donut-label').textContent = 'this month';
  }

  function renderLegend(total, totals) {
    const ul = $('legend');
    ul.textContent = '';
    if (!totals.length) {
      ul.appendChild(el('li', 'legend-empty', 'No spending in this month yet.'));
      return;
    }
    for (const t of totals) {
      const li = document.createElement('li');
      const b = el('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.cat === t.cat.id));
      b.setAttribute('aria-label', 'Filter by ' + t.cat.name);
      const dot = el('span', 'dot');
      dot.style.background = t.cat.color;
      const amt = el('span', 'amt', fmtRound(t.amount));
      amt.appendChild(el('small', '', Math.round((t.amount / total) * 100) + '%'));
      b.append(dot, el('span', 'nm', t.cat.name), amt);
      b.addEventListener('click', () => setCat(state.cat === t.cat.id ? 'all' : t.cat.id));
      li.appendChild(b);
      ul.appendChild(li);
    }
  }

  function renderTrend() {
    const box = $('trend');
    box.textContent = '';
    const nowKey = monthKey(new Date());
    const keys = [];
    for (let i = 5; i >= 0; i--) keys.push(shiftMonth(nowKey, -i));
    const totals = keys.map((k) => sum(monthItems(k)));
    const max = Math.max(1, ...totals);
    keys.forEach((k, i) => {
      const b = el('button', 'trend__col');
      b.type = 'button';
      const name = monthDate(k).toLocaleDateString('en-IN', { month: 'short' });
      b.setAttribute('aria-label', monthDate(k).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) + ': ' + fmtRound(totals[i]));
      if (k === state.month) b.setAttribute('aria-current', 'true');
      const well = el('div', 'trend__well');
      const bar = el('div', 'trend__bar');
      bar.style.height = '0%';
      well.appendChild(bar);
      b.append(el('span', 'trend__val', short(totals[i])), well, el('span', 'trend__name', name));
      b.addEventListener('click', () => { state.month = k; render(); });
      box.appendChild(b);
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.height = Math.max(2, Math.round((totals[i] / max) * 100)) + '%'; }));
    });
  }

  function renderChips() {
    const box = $('cat-filter');
    if (!box.children.length) {
      const mk = (id, name, icon) => {
        const b = el('button', 'cat');
        b.type = 'button';
        b.dataset.cat = id;
        if (icon) b.appendChild(svgIcon(icon));
        b.appendChild(document.createTextNode(name));
        b.addEventListener('click', () => setCat(id === state.cat ? 'all' : id));
        box.appendChild(b);
      };
      mk('all', 'All', null);
      CATS.forEach((c) => mk(c.id, c.name, c.icon));
    }
    for (const b of box.children) b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat));
  }

  function dayLabel(s) {
    const t = today();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const base = parseYmd(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    if (s === t) return 'Today · ' + base;
    if (s === ymd(y)) return 'Yesterday · ' + base;
    return base;
  }

  let lastAdded = null;
  function renderList() {
    const list = visibleItems();
    const box = $('list');
    box.textContent = '';
    $('list-count').textContent = list.length + (list.length === 1 ? ' entry' : ' entries') + ' · ' + fmtRound(sum(list));
    const empty = $('empty');
    empty.hidden = list.length > 0;
    if (!list.length) {
      const none = state.items.length === 0;
      empty.dataset.mode = none ? 'none' : 'filtered';
      $('empty-title').textContent = none ? 'No expenses yet' : 'Nothing matches';
      $('empty-text').textContent = none ? 'Add your first one, or reset the demo data below.' : 'Try another month, category or search.';
      $('empty-add').textContent = none ? 'Add expense' : 'Clear filters';
    }
    const grouped = state.sort === 'new' || state.sort === 'old';
    let lastDate = null;
    list.forEach((it, i) => {
      if (grouped && it.date !== lastDate) {
        lastDate = it.date;
        const day = el('div', 'day');
        const dayTotal = sum(list.filter((x) => x.date === it.date));
        day.append(el('span', '', dayLabel(it.date)), el('span', '', fmtRound(dayTotal)));
        box.appendChild(day);
      }
      box.appendChild(rowFor(it, grouped, i));
    });
    lastAdded = null;
  }

  function rowFor(it, grouped, i) {
    const c = CAT[it.cat];
    const row = el('div', 'row' + (it.id === lastAdded ? ' is-new' : ''));
    row.dataset.id = it.id;
    if (i < 12) row.style.animationDelay = i * 25 + 'ms';
    const icon = el('div', 'row__icon');
    icon.style.background = c.color;
    icon.appendChild(svgIcon(c.icon));
    const main = el('div', 'row__main');
    const meta = grouped ? c.name : c.name + ' · ' + parseYmd(it.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: state.all ? 'numeric' : undefined });
    main.append(el('span', 'row__note', it.note || c.name), el('span', 'row__meta', meta));
    const amt = el('span', 'row__amt', fmt(it.amount));
    const btns = el('div', 'row__btns');
    const edit = el('button', 'icon-btn');
    edit.type = 'button'; edit.dataset.act = 'edit';
    edit.setAttribute('aria-label', 'Edit ' + (it.note || c.name));
    edit.appendChild(svgIcon('M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4'));
    const del = el('button', 'icon-btn icon-btn--del');
    del.type = 'button'; del.dataset.act = 'delete';
    del.setAttribute('aria-label', 'Delete ' + (it.note || c.name));
    del.appendChild(svgIcon('M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6'));
    btns.append(edit, del);
    row.append(icon, main, amt, btns);
    return row;
  }

  function render() {
    const items = monthItems(state.month);
    const totals = catTotals(items);
    const total = sum(items);
    renderHeader();
    renderStats(items, totals);
    renderBudget(total);
    renderDonut(total, totals);
    renderLegend(total, totals);
    renderTrend();
    renderChips();
    renderList();
  }

  function setCat(id) { state.cat = id; render(); }

  /* ---------- Toast ---------- */
  let toastTimer = 0;
  let undoFn = null;
  function toast(msg, undo) {
    $('toast-text').textContent = msg;
    undoFn = undo || null;
    $('toast-undo').hidden = !undo;
    $('toast').classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').classList.remove('is-show'); undoFn = null; }, undo ? 6000 : 2200);
  }
  $('toast-undo').addEventListener('click', () => {
    if (undoFn) undoFn();
    undoFn = null;
    $('toast').classList.remove('is-show');
  });

  /* ---------- Add / edit dialog ---------- */
  const dlg = $('dlg');
  const form = $('form');
  let editingId = null;

  function openDialog(el_) { if (typeof el_.showModal === 'function') el_.showModal(); else el_.setAttribute('open', ''); }
  function closeDialog(el_) { if (typeof el_.close === 'function') el_.close(); else el_.removeAttribute('open'); }

  function buildCatPicker() {
    const box = $('f-cats');
    CATS.forEach((c, i) => {
      const lab = el('label', 'pick');
      const inp = document.createElement('input');
      inp.type = 'radio'; inp.name = 'f-cat'; inp.value = c.id;
      if (i === 0) inp.checked = true;
      const span = el('span');
      span.style.setProperty('--c', c.color);
      span.append(svgIcon(c.icon), document.createTextNode(c.name));
      lab.append(inp, span);
      box.appendChild(lab);
    });
  }

  function defaultDate() {
    const t = today();
    if (t.slice(0, 7) === state.month) return t;
    return state.month + '-' + pad(daysIn(state.month));
  }

  function showErr(field, id, msg) {
    $(id).textContent = msg;
    field.classList.toggle('is-bad', !!msg);
  }

  function openForm(item) {
    editingId = item ? item.id : null;
    $('dlg-title').textContent = item ? 'Edit expense' : 'Add expense';
    $('f-save').textContent = item ? 'Save changes' : 'Save';
    $('f-delete').hidden = !item;
    $('f-amount').value = item ? String(item.amount / 100) : '';
    $('f-date').value = item ? item.date : defaultDate();
    $('f-date').max = today();
    $('f-note').value = item ? item.note : '';
    const radio = form.querySelector('input[name="f-cat"][value="' + (item ? item.cat : 'food') + '"]');
    if (radio) radio.checked = true;
    showErr($('f-amount').closest('.field'), 'err-amount', '');
    showErr($('f-date').closest('.field'), 'err-date', '');
    openDialog(dlg);
    setTimeout(() => $('f-amount').focus(), 30);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseAmount($('f-amount').value);
    const date = $('f-date').value;
    let ok = true;
    if (amount === null || amount <= 0) { showErr($('f-amount').closest('.field'), 'err-amount', 'Enter an amount like 250 or 99.50'); ok = false; }
    else showErr($('f-amount').closest('.field'), 'err-amount', '');
    if (!isYmd(date)) { showErr($('f-date').closest('.field'), 'err-date', 'Pick a valid date'); ok = false; }
    else if (date > today()) { showErr($('f-date').closest('.field'), 'err-date', 'Date cannot be in the future'); ok = false; }
    else showErr($('f-date').closest('.field'), 'err-date', '');
    if (!ok) { (amount === null ? $('f-amount') : $('f-date')).focus(); return; }

    const cat = form.querySelector('input[name="f-cat"]:checked').value;
    const note = $('f-note').value.trim().slice(0, 60);
    if (editingId) {
      const it = state.items.find((x) => x.id === editingId);
      if (it) { it.amount = amount; it.cat = cat; it.date = date; it.note = note; }
      lastAdded = editingId;
      toast('Changes saved');
    } else {
      const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      state.items.push({ id, amount, cat, date, note });
      lastAdded = id;
      toast('Added ' + fmt(amount));
    }
    state.month = date.slice(0, 7);
    if (state.cat !== 'all' && state.cat !== cat) state.cat = 'all';
    save();
    closeDialog(dlg);
    render();
  });

  $('f-cancel').addEventListener('click', () => closeDialog(dlg));
  $('f-delete').addEventListener('click', () => { const id = editingId; closeDialog(dlg); if (id) removeItem(id); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });

  /* ---------- Delete with undo ---------- */
  function removeItem(id) {
    const idx = state.items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const [gone] = state.items.splice(idx, 1);
    save();
    render();
    toast('Deleted ' + fmt(gone.amount), () => {
      state.items.splice(Math.min(idx, state.items.length), 0, gone);
      lastAdded = gone.id;
      save();
      render();
    });
  }

  $('list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('.row').dataset.id;
    if (btn.dataset.act === 'delete') removeItem(id);
    else openForm(state.items.find((x) => x.id === id));
  });

  /* ---------- Budget dialog ---------- */
  const bdlg = $('dlg-budget');
  $('edit-budget').addEventListener('click', () => {
    $('b-amount').value = state.budget ? String(state.budget / 100) : '';
    showErr($('b-amount').closest('.field'), 'err-budget', '');
    openDialog(bdlg);
    setTimeout(() => $('b-amount').focus(), 30);
  });
  $('b-cancel').addEventListener('click', () => closeDialog(bdlg));
  bdlg.addEventListener('click', (e) => { if (e.target === bdlg) closeDialog(bdlg); });
  $('form-budget').addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = $('b-amount').value.trim();
    const v = raw === '' ? 0 : parseAmount(raw);
    if (v === null) { showErr($('b-amount').closest('.field'), 'err-budget', 'Enter a number like 30000'); return; }
    state.budget = v;
    save();
    closeDialog(bdlg);
    render();
    toast(v ? 'Budget set to ' + fmtRound(v) : 'Budget switched off');
  });

  /* ---------- Controls ---------- */
  $('prev').addEventListener('click', () => { state.month = shiftMonth(state.month, -1); render(); });
  $('next').addEventListener('click', () => {
    if (state.month < monthKey(new Date())) { state.month = shiftMonth(state.month, 1); render(); }
  });
  $('add').addEventListener('click', () => openForm(null));
  $('q').addEventListener('input', (e) => { state.q = e.target.value; renderList(); });
  $('sort').addEventListener('change', (e) => { state.sort = e.target.value; renderList(); });
  $('all-time').addEventListener('change', (e) => { state.all = e.target.checked; render(); });
  $('empty-add').addEventListener('click', () => {
    if ($('empty').dataset.mode === 'none') { openForm(null); return; }
    state.cat = 'all'; state.q = ''; $('q').value = ''; state.all = false; $('all-time').checked = false;
    render();
  });

  /* Two-tap confirm for destructive buttons */
  function confirmButton(btn, label, action) {
    let timer = 0;
    const original = btn.textContent;
    btn.addEventListener('click', () => {
      if (btn.dataset.armed) {
        clearTimeout(timer);
        delete btn.dataset.armed;
        btn.textContent = original;
        action();
        return;
      }
      btn.dataset.armed = '1';
      btn.textContent = label;
      timer = setTimeout(() => { delete btn.dataset.armed; btn.textContent = original; }, 3000);
    });
  }
  confirmButton($('demo'), 'Tap again to reset', () => {
    state.items = makeDemo(); state.budget = 1500000; state.cat = 'all'; state.q = ''; $('q').value = '';
    state.month = monthKey(new Date()); save(); render(); toast('Demo data loaded');
  });
  confirmButton($('clear'), 'Tap again to clear', () => {
    state.items = []; save(); render(); toast('All expenses cleared');
  });

  /* ---------- CSV export ---------- */
  function csvCell(v) {
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  $('export').addEventListener('click', () => {
    const list = visibleItems();
    if (!list.length) { toast('Nothing to export'); return; }
    const rows = [['Date', 'Category', 'Note', 'Amount (INR)']];
    for (const it of list) rows.push([it.date, CAT[it.cat].name, it.note, (it.amount / 100).toFixed(2)]);
    const text = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses-' + (state.all ? 'all' : state.month) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Exported ' + list.length + (list.length === 1 ? ' row' : ' rows'));
  });

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    if (typing || dlg.open || bdlg.open) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openForm(null); }
    else if (e.key === '/') { e.preventDefault(); $('q').focus(); }
  });

  /* ---------- Go ---------- */
  buildCatPicker();
  buildDonut();
  load();
  render();
})();
