/*
 * Typing Speed Test
 * - WPM: correct characters / 5 (one word), divided by the minutes that have passed.
 * - Accuracy: keys that matched the passage / every key pressed. Deleting does not count as a key press.
 * - The timer starts on the first key and stops when the whole passage has been typed.
 */
(() => {
  'use strict';

  const PASSAGES = [
    'Small steps every day can build something big over time.',
    'A good habit works quietly for you, even on the days you rest.',
    'Clear code reads like a short story with no surprises in it.',
    'Progress comes from practice, and each round makes the next one easier.',
    'The best projects start small, then grow one feature at a time.',
    'Keep your eyes on the screen and let your fingers find the keys.'
  ];

  const TICK_MS = 100;
  const CHARS_PER_WORD = 5;

  const els = {
    passage: document.getElementById('passage'),
    input: document.getElementById('typing-input'),
    wpm: document.getElementById('wpm'),
    accuracy: document.getElementById('accuracy'),
    time: document.getElementById('time'),
    progress: document.getElementById('progress-bar'),
    result: document.getElementById('result'),
    verdict: document.getElementById('verdict'),
    finalWpm: document.getElementById('final-wpm'),
    finalAcc: document.getElementById('final-acc'),
    finalTime: document.getElementById('final-time'),
    restart: document.getElementById('restart-btn')
  };

  let target = '';
  let lastPick = -1;
  let startTime = 0;     // performance.now() of the first key, 0 means not started
  let timerId = null;
  let finished = false;
  let previousLength = 0; // length of the box after the last input event
  let keysPressed = 0;   // every character added to the box
  let keysCorrect = 0;   // added characters that matched the passage

  /** Words per minute from correct characters and elapsed milliseconds. */
  function calcWpm(correctChars, elapsedMs) {
    const minutes = elapsedMs / 60000;
    if (minutes <= 0) return 0;
    return Math.round((correctChars / CHARS_PER_WORD) / minutes);
  }

  /** Accuracy in whole percent. */
  function calcAccuracy(correctKeys, totalKeys) {
    if (totalKeys === 0) return 100;
    return Math.round((correctKeys / totalKeys) * 100);
  }

  /** How many positions of the typed text match the passage. */
  function countCorrect(typed, passage) {
    let count = 0;
    const limit = Math.min(typed.length, passage.length);
    for (let i = 0; i < limit; i++) {
      if (typed[i] === passage[i]) count++;
    }
    return count;
  }

  function elapsedMs() {
    return startTime ? performance.now() - startTime : 0;
  }

  function formatSeconds(ms) {
    return (ms / 1000).toFixed(1) + 's';
  }

  function pickPassage() {
    let index = lastPick;
    while (PASSAGES.length > 1 && index === lastPick) {
      index = Math.floor(Math.random() * PASSAGES.length);
    }
    lastPick = index;
    return PASSAGES[index];
  }

  function renderPassage() {
    els.passage.textContent = '';
    for (const ch of target) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch;
      els.passage.appendChild(span);
    }
  }

  function paintPassage(typed) {
    const chars = els.passage.children;
    for (let i = 0; i < chars.length; i++) {
      let cls = 'char';
      if (i < typed.length) {
        cls += typed[i] === target[i] ? ' char--ok' : ' char--bad';
      } else if (i === typed.length) {
        cls += ' char--next';
      }
      chars[i].className = cls;
    }
  }

  function updateStats() {
    const typed = els.input.value;
    const ms = elapsedMs();
    els.wpm.textContent = calcWpm(countCorrect(typed, target), ms);
    els.accuracy.textContent = calcAccuracy(keysCorrect, keysPressed) + '%';
    els.time.textContent = formatSeconds(ms);
    els.progress.style.width = (typed.length / target.length) * 100 + '%';
  }

  function verdictFor(wpm) {
    if (wpm < 30) return 'Keep practicing. Every round gets easier.';
    if (wpm < 50) return 'Getting there. Your fingers are warming up.';
    if (wpm < 70) return 'Solid speed. You are typing like a pro.';
    return 'Fast fingers! Try a new passage and beat this one.';
  }

  function finishTest() {
    finished = true;
    clearInterval(timerId);
    timerId = null;
    els.input.disabled = true;

    const ms = elapsedMs();
    const wpm = calcWpm(countCorrect(els.input.value, target), ms);

    updateStats();
    els.finalWpm.textContent = wpm;
    els.finalAcc.textContent = calcAccuracy(keysCorrect, keysPressed) + '%';
    els.finalTime.textContent = formatSeconds(ms);
    els.verdict.textContent = verdictFor(wpm);
    els.result.hidden = false;
  }

  function onInput(event) {
    if (finished) return;
    const typed = els.input.value;

    // Count the characters this event added. Deleting adds nothing.
    const isDelete = (event.inputType || '').startsWith('delete');
    if (!isDelete) {
      for (let i = previousLength; i < typed.length; i++) {
        keysPressed++;
        if (typed[i] === target[i]) keysCorrect++;
      }
    }
    previousLength = typed.length;

    if (!startTime && typed.length > 0) {
      startTime = performance.now();
      timerId = setInterval(updateStats, TICK_MS);
    }

    paintPassage(typed);
    updateStats();

    if (typed.length === target.length) finishTest();
  }

  function newTest() {
    clearInterval(timerId);
    timerId = null;
    target = pickPassage();
    startTime = 0;
    finished = false;
    previousLength = 0;
    keysPressed = 0;
    keysCorrect = 0;

    renderPassage();
    els.input.value = '';
    els.input.disabled = false;
    els.input.maxLength = target.length;
    els.result.hidden = true;
    els.wpm.textContent = '0';
    els.accuracy.textContent = '100%';
    els.time.textContent = '0.0s';
    els.progress.style.width = '0%';
    paintPassage('');
    els.input.focus();
  }

  els.input.addEventListener('input', onInput);
  els.input.addEventListener('paste', (event) => event.preventDefault());
  els.restart.addEventListener('click', newTest);

  // Exposed so the logic can be checked from the browser console.
  window.typingTest = { calcWpm, calcAccuracy, countCorrect, PASSAGES };

  newTest();
})();
