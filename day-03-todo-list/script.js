/* To-do List - Day 3 of Exploring Mini Projects.
   Plain JavaScript, no libraries. Tasks are saved in this browser (localStorage). */
(function () {
  'use strict';

  var KEY = 'mini-todo-v1';
  var PRIO_LABEL = { low: 'Low', med: 'Medium', high: 'High' };
  var PRIO_ORDER = ['low', 'med', 'high'];
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var form = document.getElementById('composer');
  var input = document.getElementById('new-task');
  var list = document.getElementById('list');
  var counter = document.getElementById('counter');
  var empty = document.getElementById('empty');
  var clearBtn = document.getElementById('clear-done');
  var statusEl = document.getElementById('status');
  var confettiLayer = document.getElementById('confetti');
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll('.filter'));

  var tasks = load();
  var filter = 'all';
  var nextId = tasks.reduce(function (max, t) { return Math.max(max, t.id); }, 0) + 1;
  var lastAddedId = null;
  var focusAfterRender = null; // { id, control }

  /* ---------- storage ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr
        .filter(function (t) { return t && typeof t.text === 'string' && t.text.trim(); })
        .map(function (t, i) {
          return {
            id: Number(t.id) > 0 ? Number(t.id) : i + 1,
            text: String(t.text).slice(0, 120),
            prio: PRIO_ORDER.indexOf(t.prio) >= 0 ? t.prio : 'med',
            done: !!t.done
          };
        });
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(tasks));
    } catch (e) {
      /* storage blocked: the list still works for this visit */
    }
  }

  /* ---------- helpers ---------- */

  function say(message) {
    statusEl.textContent = '';
    window.setTimeout(function () { statusEl.textContent = message; }, 20);
  }

  function svg(paths, extra) {
    var ns = 'http://www.w3.org/2000/svg';
    var el = document.createElementNS(ns, 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('focusable', 'false');
    paths.forEach(function (d) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      el.appendChild(p);
    });
    if (extra) el.setAttribute('class', extra);
    return el;
  }

  function iconButton(label, paths, onClick, extraClass) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon' + (extraClass ? ' ' + extraClass : '');
    b.setAttribute('aria-label', label);
    b.title = label;
    b.appendChild(svg(paths));
    b.addEventListener('click', onClick);
    return b;
  }

  function burst(anchor, color) {
    if (reduceMotion || !anchor) return;
    var rect = anchor.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var colors = ['#bef264', '#5eead4', '#f472b6', '#facc15', '#a78bfa', '#ffffff'];
    for (var i = 0; i < 26; i++) {
      var bit = document.createElement('span');
      bit.className = 'bit';
      var angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
      var dist = 90 + Math.random() * 120;
      bit.style.left = cx + 'px';
      bit.style.top = cy + 'px';
      bit.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      bit.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      bit.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      bit.style.setProperty('--c', colors[i % colors.length]);
      confettiLayer.appendChild(bit);
      bit.addEventListener('animationend', function () { this.remove(); });
    }
  }

  function visibleTasks() {
    return tasks.filter(function (t) {
      if (filter === 'active') return !t.done;
      if (filter === 'done') return t.done;
      return true;
    });
  }

  function indexOf(id) {
    for (var i = 0; i < tasks.length; i++) if (tasks[i].id === id) return i;
    return -1;
  }

  /* ---------- actions ---------- */

  function addTask(text, prio) {
    var task = { id: nextId++, text: text, prio: prio, done: false };
    tasks.push(task);
    lastAddedId = task.id;
    save();
    render();
    say('Task added: ' + text);
  }

  function toggleTask(id, checkEl) {
    var i = indexOf(id);
    if (i < 0) return;
    tasks[i].done = !tasks[i].done;
    save();
    if (tasks[i].done) burst(checkEl);
    focusAfterRender = { id: id, control: 'check' };
    render();
    say(tasks[i].done ? 'Marked done' : 'Marked active');
  }

  function deleteTask(id) {
    var i = indexOf(id);
    if (i < 0) return;
    var removed = tasks[i];
    var row = list.querySelector('[data-id="' + id + '"]');
    var doRemove = function () {
      tasks.splice(indexOf(id), 1);
      save();
      render();
      say('Deleted: ' + removed.text);
    };
    if (row && !reduceMotion) {
      row.classList.add('leaving');
      window.setTimeout(doRemove, 260);
    } else {
      doRemove();
    }
  }

  function moveTask(id, dir) {
    var i = indexOf(id);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= tasks.length) return;
    var tmp = tasks[i];
    tasks[i] = tasks[j];
    tasks[j] = tmp;
    save();
    focusAfterRender = { id: id, control: dir < 0 ? 'up' : 'down' };
    render();
    say('Moved ' + (dir < 0 ? 'up' : 'down'));
  }

  function cyclePriority(id) {
    var i = indexOf(id);
    if (i < 0) return;
    var next = PRIO_ORDER[(PRIO_ORDER.indexOf(tasks[i].prio) + 1) % PRIO_ORDER.length];
    tasks[i].prio = next;
    save();
    render();
    say('Priority: ' + PRIO_LABEL[next]);
  }

  function startEdit(id) {
    var row = list.querySelector('[data-id="' + id + '"]');
    if (!row || row.querySelector('.edit')) return;
    var i = indexOf(id);
    var textEl = row.querySelector('.text');
    var field = document.createElement('input');
    field.type = 'text';
    field.className = 'edit';
    field.maxLength = 120;
    field.value = tasks[i].text;
    field.setAttribute('aria-label', 'Edit task');
    textEl.replaceWith(field);
    field.focus();
    field.select();

    var finished = false;
    var finish = function (save_) {
      if (finished) return;
      finished = true;
      var value = field.value.trim();
      var idx = indexOf(id);
      if (save_ && value && idx >= 0) {
        tasks[idx].text = value;
        save();
        say('Task updated');
      }
      focusAfterRender = { id: id, control: 'text' };
      render();
    };
    field.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    field.addEventListener('blur', function () { finish(true); });
  }

  function clearCompleted() {
    var before = tasks.length;
    tasks = tasks.filter(function (t) { return !t.done; });
    if (tasks.length === before) return;
    save();
    focusAfterRender = null;
    render();
    say('Cleared completed tasks');
  }

  function setFilter(name) {
    filter = name;
    filterButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === name));
    });
    render();
  }

  /* ---------- rendering ---------- */

  function buildItem(task, index, total) {
    var li = document.createElement('li');
    li.className = 'item item--' + task.prio + (task.done ? ' done' : '');
    if (task.id === lastAddedId) li.classList.add('enter');
    li.setAttribute('data-id', String(task.id));

    var check = document.createElement('button');
    check.type = 'button';
    check.className = 'check';
    check.setAttribute('aria-label', (task.done ? 'Mark as active: ' : 'Mark as done: ') + task.text);
    check.setAttribute('aria-pressed', String(task.done));
    check.appendChild(svg(['M4 12.5 L9.5 18 L20 6.5']));
    check.addEventListener('click', function () { toggleTask(task.id, check); });

    var body = document.createElement('div');
    body.className = 'body';

    var text = document.createElement('span');
    text.className = 'text';
    text.textContent = task.text;
    text.title = 'Double-click to edit';
    text.addEventListener('dblclick', function () { startEdit(task.id); });

    var badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'badge badge--' + task.prio;
    badge.textContent = PRIO_LABEL[task.prio];
    badge.title = 'Change priority';
    badge.setAttribute('aria-label', 'Priority ' + PRIO_LABEL[task.prio] + '. Press to change.');
    badge.addEventListener('click', function () { cyclePriority(task.id); });

    body.appendChild(text);
    body.appendChild(badge);

    var actions = document.createElement('div');
    actions.className = 'actions';
    var up = iconButton('Move up', ['M6 14 L12 8 L18 14'], function () { moveTask(task.id, -1); });
    var down = iconButton('Move down', ['M6 10 L12 16 L18 10'], function () { moveTask(task.id, 1); });
    up.disabled = index === 0;
    down.disabled = index === total - 1;
    up.setAttribute('data-control', 'up');
    down.setAttribute('data-control', 'down');
    actions.appendChild(up);
    actions.appendChild(down);
    actions.appendChild(iconButton('Edit task', ['M4 20 L8 19 L19 8 L16 5 L5 16 Z', 'M14.5 6.5 L17.5 9.5'], function () { startEdit(task.id); }));
    actions.appendChild(iconButton('Delete task', ['M5 7 H19', 'M9 7 V5 H15 V7', 'M7 7 L8 20 H16 L17 7'], function () { deleteTask(task.id); }, 'icon--danger'));

    li.appendChild(check);
    li.appendChild(body);
    li.appendChild(actions);
    return li;
  }

  function render() {
    var vis = visibleTasks();
    list.innerHTML = '';
    vis.forEach(function (task) {
      var idxAll = indexOf(task.id);
      list.appendChild(buildItem(task, idxAll, tasks.length));
    });

    var left = tasks.filter(function (t) { return !t.done; }).length;
    var doneCount = tasks.length - left;
    counter.textContent = left + (left === 1 ? ' task left' : ' tasks left');

    var counts = { all: tasks.length, active: left, done: doneCount };
    filterButtons.forEach(function (b) {
      var key = b.getAttribute('data-filter');
      b.querySelector('.count').textContent = String(counts[key]);
    });

    clearBtn.disabled = doneCount === 0;

    if (vis.length === 0) {
      if (tasks.length === 0) empty.textContent = 'Nothing here yet. Add your first task above.';
      else if (filter === 'done') empty.textContent = 'No completed tasks yet. Tick one off to see it here.';
      else if (filter === 'active') empty.textContent = 'All done. Nice work!';
      else empty.textContent = '';
      empty.hidden = false;
    } else {
      empty.hidden = true;
    }

    if (focusAfterRender) {
      var row = list.querySelector('[data-id="' + focusAfterRender.id + '"]');
      var target = null;
      if (row) {
        if (focusAfterRender.control === 'check') target = row.querySelector('.check');
        else if (focusAfterRender.control === 'up') target = row.querySelector('[data-control="up"]');
        else if (focusAfterRender.control === 'down') target = row.querySelector('[data-control="down"]');
        else if (focusAfterRender.control === 'text') target = row.querySelector('.badge');
      }
      focusAfterRender = null;
      if (target && !target.disabled) target.focus({ preventScroll: true });
    }

    if (lastAddedId !== null) {
      lastAddedId = null;
    }
  }

  /* ---------- events ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) {
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
      input.focus();
      return;
    }
    var checked = form.querySelector('input[name="prio"]:checked');
    addTask(text.slice(0, 120), checked ? checked.value : 'med');
    input.value = '';
    input.focus();
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') input.value = '';
  });

  filterButtons.forEach(function (b) {
    b.addEventListener('click', function () { setFilter(b.getAttribute('data-filter')); });
  });

  clearBtn.addEventListener('click', clearCompleted);

  list.addEventListener('keydown', function (e) {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    var row = e.target.closest ? e.target.closest('.item') : null;
    if (!row) return;
    e.preventDefault();
    moveTask(Number(row.getAttribute('data-id')), e.key === 'ArrowUp' ? -1 : 1);
  });

  /* ---------- start ---------- */

  setFilter('all');
})();
