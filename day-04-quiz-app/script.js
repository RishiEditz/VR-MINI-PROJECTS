// Quiz App (Exploring Mini Projects, Day 4)
// Plain JavaScript, no libraries. Topics, a 15 second timer per question,
// points (10 + seconds left), a progress bar, a review of every answer,
// and the best score per topic saved in localStorage.

const QUESTION_SECONDS = 15;
const POINTS_PER_CORRECT = 10;
const STORAGE_KEY = 'quiz-app-best-v1';
const COLORS = ['#ffd27a', '#ff5c8a', '#3ee6a0', '#8a5cff', '#ffb23f', '#fff7f2'];

const TOPICS = [
  {
    id: 'coding', name: 'Coding basics', icon: '</>',
    questions: [
      { q: 'What does HTML stand for?', options: ['High Tech Modern Language', 'HyperText Markup Language', 'Home Tool Markup Language', 'Hyperlink and Text Markup Language'], answer: 1 },
      { q: 'Which keyword declares a constant in modern JavaScript?', options: ['var', 'let', 'const', 'static'], answer: 2 },
      { q: 'Which CSS property changes the text colour?', options: ['font-style', 'color', 'text-decoration', 'background-size'], answer: 1 },
      { q: 'What does CSS stand for?', options: ['Cascading Style Sheets', 'Computer Style Sheets', 'Creative Style System', 'Colourful Sheet Styles'], answer: 0 },
      { q: 'Which array method adds an item to the end?', options: ['pop()', 'push()', 'shift()', 'reverse()'], answer: 1 },
    ],
  },
  {
    id: 'space', name: 'Space', icon: '*',
    questions: [
      { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Saturn', 'Mercury'], answer: 1 },
      { q: 'What is the largest planet in our solar system?', options: ['Saturn', 'Neptune', 'Jupiter', 'Uranus'], answer: 2 },
      { q: 'How many planets are in our solar system?', options: ['Six', 'Seven', 'Eight', 'Nine'], answer: 2 },
      { q: 'What is the closest star to Earth?', options: ['Sirius', 'The Sun', 'Proxima Centauri', 'Polaris'], answer: 1 },
      { q: 'Which galaxy contains our solar system?', options: ['Andromeda', 'Whirlpool', 'Milky Way', 'Sombrero'], answer: 2 },
    ],
  },
  {
    id: 'geo', name: 'Geography', icon: '()',
    questions: [
      { q: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },
      { q: 'Which is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
      { q: 'Which continent is the Sahara Desert in?', options: ['Asia', 'Africa', 'South America', 'Australia'], answer: 1 },
      { q: 'Mount Everest is in which mountain range?', options: ['Alps', 'Andes', 'Himalayas', 'Rockies'], answer: 2 },
      { q: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], answer: 1 },
    ],
  },
  {
    id: 'science', name: 'Science', icon: '~',
    questions: [
      { q: 'Which gas do plants take in for photosynthesis?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], answer: 2 },
      { q: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2 },
      { q: 'How many bones does an adult human have?', options: ['106', '206', '306', '156'], answer: 1 },
      { q: 'Roughly how fast does light travel?', options: ['300 km per second', '3,000 km per second', '300,000 km per second', '3 million km per second'], answer: 2 },
      { q: 'What is H2O more commonly called?', options: ['Salt', 'Water', 'Hydrogen', 'Oxygen'], answer: 1 },
    ],
  },
];

const $ = (id) => document.getElementById(id);

const els = {
  best: $('best'),
  topics: $('topics'),
  screens: {
    start: $('screen-start'),
    quiz: $('screen-quiz'),
    result: $('screen-result'),
  },
  count: $('count'),
  score: $('score'),
  progress: $('progress'),
  progressFill: $('progress-fill'),
  timerFill: $('timer-fill'),
  timerText: $('timer-text'),
  question: $('question'),
  options: $('options'),
  feedback: $('feedback'),
  feedbackTitle: $('feedback-title'),
  feedbackText: $('feedback-text'),
  next: $('next'),
  resultScore: $('result-score'),
  resultMsg: $('result-msg'),
  resultLabel: $('result-label'),
  resultBest: $('result-best'),
  review: $('review'),
  restart: $('restart'),
  changeTopic: $('change-topic'),
  burst: $('burst'),
  status: $('status'),
};

const state = {
  topic: null,
  index: 0,
  score: 0,
  correct: 0,
  answers: [],
  timeLeft: QUESTION_SECONDS,
  timer: null,
  locked: false,
};

// ---------- Best scores (localStorage, safe if blocked) ----------

function readBest() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    return {};
  }
}

function writeBest(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    /* storage blocked: the game still works */
  }
}

function bestFor(topicId) {
  const value = readBest()[topicId];
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

// ---------- Screens ----------

function showScreen(name) {
  Object.entries(els.screens).forEach(([key, node]) => {
    const active = key === name;
    node.classList.toggle('is-active', active);
    node.hidden = !active;
  });
  const first = els.screens[name].querySelector('h2, h1, button');
  if (first && name !== 'quiz') first.focus({ preventScroll: true });
}

function announce(text) {
  els.status.textContent = text;
}

// ---------- Start screen ----------

function renderTopics() {
  els.topics.innerHTML = '';
  TOPICS.forEach((topic) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'topic';
    button.dataset.topic = topic.id;

    const best = bestFor(topic.id);
    button.innerHTML = `
      <span class="topic__icon" aria-hidden="true">${topic.icon}</span>
      <span class="topic__name"></span>
      <span class="topic__meta"></span>`;
    button.querySelector('.topic__name').textContent = topic.name;
    button.querySelector('.topic__meta').textContent =
      `${topic.questions.length} questions` + (best === null ? '' : ` · best ${best} pts`);
    button.addEventListener('click', () => startQuiz(topic.id));
    els.topics.appendChild(button);
  });
}

// ---------- Quiz flow ----------

function startQuiz(topicId) {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) return;
  state.topic = topic;
  state.index = 0;
  state.score = 0;
  state.correct = 0;
  state.answers = [];
  showScreen('quiz');
  renderQuestion();
}

function renderQuestion() {
  const { topic, index } = state;
  const item = topic.questions[index];
  state.locked = false;
  state.timeLeft = QUESTION_SECONDS;

  els.count.textContent = `Question ${index + 1} of ${topic.questions.length}`;
  els.score.textContent = String(state.score);
  els.progress.setAttribute('aria-valuenow', String(Math.round((index / topic.questions.length) * 100)));
  els.progressFill.style.width = `${(index / topic.questions.length) * 100}%`;

  els.question.textContent = item.q;
  els.question.classList.remove('question');
  void els.question.offsetWidth; // restart the slide-in animation
  els.question.classList.add('question');

  els.options.innerHTML = '';
  item.options.forEach((text, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    button.dataset.index = String(i);
    const key = document.createElement('span');
    key.className = 'option__key';
    key.textContent = String(i + 1);
    const label = document.createElement('span');
    label.textContent = text;
    button.append(key, label);
    button.addEventListener('click', () => answer(i));
    els.options.appendChild(button);
  });

  els.feedback.hidden = true;
  els.feedback.className = 'feedback';
  els.next.disabled = true;
  els.next.textContent = index === topic.questions.length - 1 ? 'See results' : 'Next';
  updateTimer();
  startTimer();
}

function startTimer() {
  stopTimer();
  state.timer = window.setInterval(() => {
    state.timeLeft = Math.max(0, state.timeLeft - 0.1);
    updateTimer();
    if (state.timeLeft <= 0) {
      stopTimer();
      answer(-1);
    }
  }, 100);
}

function stopTimer() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
}

function updateTimer() {
  const left = Math.ceil(state.timeLeft);
  const pct = (state.timeLeft / QUESTION_SECONDS) * 100;
  els.timerFill.style.width = `${pct}%`;
  els.timerText.textContent = String(left);
  const low = state.timeLeft <= 5;
  els.timerFill.classList.toggle('is-low', low);
  els.timerText.classList.toggle('is-low', low);
}

function answer(choice) {
  if (state.locked) return;
  state.locked = true;
  stopTimer();

  const { topic, index } = state;
  const item = topic.questions[index];
  const isCorrect = choice === item.answer;
  const buttons = [...els.options.querySelectorAll('.option')];

  buttons.forEach((button) => {
    const i = Number(button.dataset.index);
    button.disabled = true;
    if (i === item.answer) button.classList.add('is-correct');
    else if (i === choice) button.classList.add('is-wrong');
  });

  let points = 0;
  if (isCorrect) {
    points = POINTS_PER_CORRECT + Math.round(state.timeLeft);
    state.correct += 1;
    state.score += points;
    burst();
  }

  state.answers.push({
    question: item.q,
    options: item.options,
    chosen: choice,
    correct: item.answer,
    points,
  });

  const timedOut = choice === -1;
  els.feedback.hidden = false;
  els.feedback.className = `feedback ${isCorrect ? 'is-good' : 'is-bad'}`;
  if (isCorrect) {
    els.feedbackTitle.textContent = `Correct! +${points} pts`;
    els.feedbackText.textContent = 'Quick hands. Keep the streak going.';
  } else {
    els.feedbackTitle.textContent = timedOut ? 'Time is up' : 'Not quite';
    els.feedbackText.textContent = `The answer is ${item.options[item.answer]}.`;
  }

  els.score.textContent = String(state.score);
  els.score.parentElement.classList.remove('pop');
  void els.score.parentElement.offsetWidth;
  els.score.parentElement.classList.add('pop');

  announce(isCorrect ? `Correct. ${points} points.` : `Wrong. The answer is ${item.options[item.answer]}.`);
  els.next.disabled = false;
  els.next.focus({ preventScroll: true });
}

function next() {
  if (!state.locked) return;
  state.index += 1;
  if (state.index >= state.topic.questions.length) {
    finish();
  } else {
    renderQuestion();
  }
}

function finish() {
  stopTimer();
  const total = state.topic.questions.length;
  const data = readBest();
  const previous = typeof data[state.topic.id] === 'number' ? data[state.topic.id] : null;
  const isNew = previous === null || state.score > previous;
  if (isNew) {
    data[state.topic.id] = state.score;
    writeBest(data);
  }
  renderHeaderBest();

  const ratio = state.correct / total;
  let message = 'Good effort. Try again and beat it.';
  if (ratio === 1) message = 'Perfect score. Flawless!';
  else if (ratio >= 0.6) message = 'Nice work. So close to perfect.';

  els.resultLabel.textContent = `${state.topic.name} complete`;
  els.resultScore.textContent = `${state.correct}/${total}`;
  els.resultMsg.textContent = `${state.score} points. ${message}`;
  els.resultBest.textContent = isNew
    ? (previous === null ? 'First score saved as your best.' : 'New best score for this topic!')
    : `Your best for this topic is ${previous} pts.`;

  els.progressFill.style.width = '100%';
  els.progress.setAttribute('aria-valuenow', '100');

  renderReview();
  showScreen('result');
  announce(`Quiz complete. ${state.correct} of ${total} correct.`);
}

function renderReview() {
  els.review.innerHTML = '';
  state.answers.forEach((entry, i) => {
    const li = document.createElement('li');
    const right = entry.chosen === entry.correct;
    li.className = right ? 'is-right' : 'is-wrong';
    li.style.animationDelay = `${i * 0.08}s`;

    const q = document.createElement('p');
    q.className = 'review__q';
    q.textContent = `${i + 1}. ${entry.question}`;

    const a = document.createElement('p');
    a.className = 'review__a';
    if (right) {
      a.textContent = `You got it: ${entry.options[entry.correct]}`;
    } else if (entry.chosen === -1) {
      a.textContent = `Time ran out. Answer: ${entry.options[entry.correct]}`;
    } else {
      a.textContent = `You picked ${entry.options[entry.chosen]}. Answer: ${entry.options[entry.correct]}`;
    }

    li.append(q, a);
    els.review.appendChild(li);
  });
}

// ---------- Confetti burst on a right answer ----------

function burst() {
  const count = 18;
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'burst';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 140 + Math.random() * 160;
    piece.style.left = '50%';
    piece.style.top = '42%';
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * dist + 120}px`);
    piece.style.setProperty('--rot', `${Math.round(Math.random() * 540 - 270)}deg`);
    els.burst.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1300);
  }
}

// ---------- Keyboard ----------

document.addEventListener('keydown', (event) => {
  if (!els.screens.quiz.classList.contains('is-active')) return;
  if (event.key >= '1' && event.key <= '4' && !state.locked) {
    const i = Number(event.key) - 1;
    if (i < state.topic.questions[state.index].options.length) answer(i);
  } else if (event.key === 'Enter' && state.locked) {
    event.preventDefault();
    next();
  }
});

// ---------- Wiring ----------

els.next.addEventListener('click', next);
els.restart.addEventListener('click', () => { if (state.topic) startQuiz(state.topic.id); });
els.changeTopic.addEventListener('click', () => {
  renderTopics();
  showScreen('start');
});

renderTopics();
renderHeaderBest();
showScreen('start');
