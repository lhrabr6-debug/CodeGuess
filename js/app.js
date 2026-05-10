/**
 * CodeGuess — Угадай язык по снипету кода
 * Main JavaScript module
 *
 * Архитектура:
 *  - XMLParser      : парсинг questions.xml
 *  - QuizEngine     : логика квиза, таймер, счёт
 *  - Renderer       : отрисовка UI
 *  - LeaderboardDB  : хранение в localStorage
 *  - Router         : переключение страниц
 */

'use strict';

/* =========================================
   XML PARSER
   ========================================= */
const XMLParser = {
  /**
   * Загружает и парсит XML-файл с вопросами
   * @returns {Promise<Question[]>}
   */
  async load(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load XML: ${resp.status}`);
    const text = await resp.text();
    return this.parse(text);
  },

  /**
   * Парсит XML-строку в массив объектов Question
   * @param {string} xmlText
   * @returns {Question[]}
   */
  parse(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) throw new Error('XML parse error: ' + parseError.textContent);

    const questions = [];
    const nodes = doc.querySelectorAll('question');

    nodes.forEach(node => {
      const options = Array.from(node.querySelectorAll('option'))
        .map(o => o.textContent.trim());

      // Перемешиваем варианты ответов
      const shuffled = this._shuffle([...options]);

      questions.push({
        id:         node.getAttribute('id'),
        difficulty: node.getAttribute('difficulty') || 'medium',
        snippet:    node.querySelector('snippet').textContent,
        correct:    node.querySelector('correct').textContent.trim(),
        options:    shuffled,
        hint:       node.querySelector('hint')?.textContent || '',
      });
    });

    return questions;
  },

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
};

/* =========================================
   LEADERBOARD (localStorage)
   ========================================= */
const LeaderboardDB = {
  KEY: 'codeguess_leaderboard',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch { return []; }
  },

  add(entry) {
    const all = this.getAll();
    all.push({ ...entry, date: new Date().toLocaleDateString('ru-RU') });
    all.sort((a, b) => b.score - a.score);
    const top = all.slice(0, 10);
    localStorage.setItem(this.KEY, JSON.stringify(top));
    return top;
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },
};

/* =========================================
   QUIZ ENGINE
   ========================================= */
const QuizEngine = {
  TIMER_SECONDS: 20,
  MAX_SCORE_PER_Q: 100,

  state: {
    questions:    [],
    current:      0,
    score:        0,
    correctCount: 0,
    wrongCount:   0,
    answered:     false,
    timerVal:     0,
    timerInterval: null,
  },

  /**
   * Инициализация новой игры
   * @param {Question[]} questions
   */
  init(questions) {
    // Берём случайные 10 вопросов из пула
    const shuffled = XMLParser._shuffle([...questions]);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));

    this.state = {
      questions:    selected,
      current:      0,
      score:        0,
      correctCount: 0,
      wrongCount:   0,
      answered:     false,
      timerVal:     this.TIMER_SECONDS,
      timerInterval: null,
    };
  },

  get currentQuestion() {
    return this.state.questions[this.state.current];
  },

  get totalQuestions() {
    return this.state.questions.length;
  },

  get isLastQuestion() {
    return this.state.current === this.totalQuestions - 1;
  },

  /**
   * Запускает таймер для текущего вопроса
   * @param {Function} onTick  (secondsLeft) => void
   * @param {Function} onExpire () => void
   */
  startTimer(onTick, onExpire) {
    this.stopTimer();
    this.state.timerVal = this.TIMER_SECONDS;
    onTick(this.state.timerVal);

    this.state.timerInterval = setInterval(() => {
      this.state.timerVal -= 1;
      onTick(this.state.timerVal);

      if (this.state.timerVal <= 0) {
        this.stopTimer();
        onExpire();
      }
    }, 1000);
  },

  stopTimer() {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
  },

  /**
   * Обрабатывает ответ пользователя
   * @param {string} chosen  - выбранный вариант
   * @returns {{ isCorrect: boolean, points: number }}
   */
  answer(chosen) {
    if (this.state.answered) return null;
    this.state.answered = true;
    this.stopTimer();

    const q = this.currentQuestion;
    const isCorrect = chosen === q.correct;

    let points = 0;
    if (isCorrect) {
      // Бонус за скорость: до 50 бонусных очков
      const timeBonus = Math.round((this.state.timerVal / this.TIMER_SECONDS) * 50);
      const diffBonus = { easy: 0, medium: 15, hard: 30 }[q.difficulty] || 0;
      points = 50 + timeBonus + diffBonus;
      this.state.score += points;
      this.state.correctCount++;
    } else {
      this.state.wrongCount++;
    }

    return { isCorrect, points, correct: q.correct };
  },

  /**
   * Переходит к следующему вопросу
   * @returns {boolean} — true если есть следующий
   */
  next() {
    if (this.isLastQuestion) return false;
    this.state.current++;
    this.state.answered = false;
    return true;
  },

  get progressPercent() {
    return ((this.state.current + 1) / this.totalQuestions) * 100;
  },

  get resultGrade() {
    const pct = this.state.correctCount / this.totalQuestions;
    if (pct >= 0.8) return { label: '// MASTER CODER', color: 'var(--neon-cyan)', arcClass: 'good' };
    if (pct >= 0.5) return { label: '// GOOD JOB', color: 'var(--neon-yellow)', arcClass: 'average' };
    return { label: '// KEEP LEARNING', color: 'var(--neon-pink)', arcClass: 'poor' };
  },
};

/* =========================================
   RENDERER
   ========================================= */
const Renderer = {
  /**
   * Отрисовывает текущий вопрос
   */
  renderQuestion() {
    const q = QuizEngine.currentQuestion;
    const idx = QuizEngine.state.current;
    const total = QuizEngine.totalQuestions;

    // Счётчик
    document.getElementById('q-num').textContent = idx + 1;
    document.getElementById('q-total').textContent = total;

    // Прогресс-бар
    document.querySelector('.progress-bar-inner').style.width =
      QuizEngine.progressPercent + '%';

    // Очки
    document.getElementById('live-score').textContent = QuizEngine.state.score;

    // Difficulty badge
    const badge = document.getElementById('difficulty-badge');
    badge.textContent = q.difficulty;
    badge.className = `badge badge-${q.difficulty}`;

    // Файл-имитация
    document.getElementById('snippet-filename').textContent =
      `snippet_${String(q.id).padStart(3, '0')}.${this._langToExt(q.correct)}`;

    // Код с нумерацией строк
    const snippetEl = document.getElementById('code-snippet');
    const lines = q.snippet.split('\n');
    snippetEl.innerHTML = lines
      .map((line, i) =>
        `<div class="line"><span class="line-num">${i + 1}</span><span class="line-code">${this._escapeHtml(line)}</span></div>`
      )
      .join('');

    // Варианты ответов
    const grid = document.getElementById('options-grid');
    const keys = ['Q', 'W', 'E', 'R'];
    grid.innerHTML = q.options
      .map((opt, i) => `
        <button class="option-btn" data-value="${this._escapeHtml(opt)}" aria-label="Вариант ${keys[i]}: ${opt}">
          <span class="option-key">${keys[i]}</span>
          <span>${opt}</span>
        </button>
      `)
      .join('');

    // Вешаем обработчики
    grid.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => App.handleAnswer(btn.dataset.value, btn));
    });

    // Клавиатура A/B/C/D
    this._rebindKeyboard(q.options);
  },

  _rebindKeyboard(options) {
    const handler = (e) => {
      const map = { q: 0, w: 1, e: 2, r: 3 };
      const idx = map[e.key.toLowerCase()];
      if (idx !== undefined && options[idx]) {
        const btns = document.querySelectorAll('.option-btn');
        if (btns[idx]) App.handleAnswer(options[idx], btns[idx]);
      }
    };
    document.removeEventListener('keydown', window._quizKeyHandler);
    window._quizKeyHandler = handler;
    document.addEventListener('keydown', handler);
  },

  /**
   * Подсвечивает выбранные кнопки
   */
  highlightAnswer(clickedBtn, isCorrect, correctValue) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.value === correctValue) {
        btn.classList.add('correct');
      } else if (btn === clickedBtn && !isCorrect) {
        btn.classList.add('wrong');
      } else {
        btn.classList.add('dimmed');
      }
    });
  },

  /**
   * Показывает тост с фидбэком
   */
  showFeedback(isCorrect, points) {
    const toast = document.getElementById('feedback-toast');
    toast.textContent = isCorrect
      ? `✓ Верно! +${points} pts`
      : `✗ Неверно`;
    toast.className = `feedback-toast ${isCorrect ? 'correct-fb' : 'wrong-fb'} show`;
    setTimeout(() => toast.classList.remove('show'), 2000);
  },

  /**
   * Показывает всплывающий счёт
   */
  showScorePopup(points) {
    const el = document.getElementById('score-popup');
    el.textContent = `+${points}`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1200);
  },

  /**
   * Обновляет таймер
   */
  updateTimer(seconds) {
    const max = QuizEngine.TIMER_SECONDS;
    const circumference = 163;
    const offset = circumference * (1 - seconds / max);

    const arc = document.getElementById('timer-arc');
    const num = document.getElementById('timer-num');

    if (arc) arc.style.strokeDashoffset = offset;
    if (num) num.textContent = seconds;

    // Цвета
    arc?.classList.remove('warning', 'danger');
    num?.classList.remove('danger');
    if (seconds <= 5) {
      arc?.classList.add('danger');
      num?.classList.add('danger');
    } else if (seconds <= 10) {
      arc?.classList.add('warning');
    }
  },

  /**
   * Отрисовывает страницу результатов
   */
  renderResults() {
    const s = QuizEngine.state;
    const grade = QuizEngine.resultGrade;
    const pct = Math.round((s.correctCount / QuizEngine.totalQuestions) * 100);

    document.getElementById('result-grade').textContent = grade.label;
    document.getElementById('result-grade').style.color = grade.color;
    document.getElementById('result-score-big').textContent = s.score;
    document.getElementById('result-correct').textContent = s.correctCount;
    document.getElementById('result-wrong').textContent = s.wrongCount;
    document.getElementById('result-total-q').textContent = QuizEngine.totalQuestions;

    // Анимация кольца
    setTimeout(() => {
      const arc = document.getElementById('result-arc');
      if (!arc) return;
      arc.className = `result-arc ${grade.arcClass}`;
      const circumference = 502;
      arc.style.strokeDashoffset = circumference * (1 - pct / 100);
    }, 100);
  },

  /**
   * Отрисовывает таблицу лидеров
   */
  renderLeaderboard() {
    const data = LeaderboardDB.getAll();
    const tbody = document.getElementById('lb-tbody');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--text-muted);padding:32px;text-align:center;">
        Пока никого нет. Начни первым!
      </td></tr>`;
      return;
    }

    const rankClass = (i) => i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const medals = ['🥇', '🥈', '🥉'];

    tbody.innerHTML = data.map((entry, i) => `
      <tr>
        <td><span class="rank-num ${rankClass(i)}">${medals[i] || i + 1}</span></td>
        <td>${this._escapeHtml(entry.name || 'Anonymous')}</td>
        <td><span class="lb-score">${entry.score}</span></td>
        <td style="color:var(--text-muted)">${entry.date}</td>
      </tr>
    `).join('');
  },

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _langToExt(lang) {
    const map = {
      'Python': 'py', 'JavaScript': 'js', 'TypeScript': 'ts',
      'Rust': 'rs', 'Go': 'go', 'Java': 'java', 'C#': 'cs',
      'C++': 'cpp', 'Kotlin': 'kt', 'Swift': 'swift', 'Ruby': 'rb',
      'Elixir': 'ex', 'Haskell': 'hs', 'Scala': 'scala', 'Dart': 'dart',
    };
    return map[lang] || 'txt';
  },
};

/* =========================================
   ROUTER — переключение страниц
   ========================================= */
const Router = {
  pages: {},

  init() {
    document.querySelectorAll('.page').forEach(p => {
      this.pages[p.id] = p;
    });
    // nav links
    document.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.go(link.dataset.nav);
      });
    });
  },

  go(pageId) {
    Object.values(this.pages).forEach(p => p.classList.remove('active'));
    if (this.pages[pageId]) {
      this.pages[pageId].classList.add('active');
    }

    // Обновляем nav
    document.querySelectorAll('[data-nav]').forEach(link => {
      link.classList.toggle('active', link.dataset.nav === pageId);
    });

    // Сайд-эффекты при переходе
    if (pageId === 'page-leaderboard') Renderer.renderLeaderboard();
    if (pageId === 'page-results')     Renderer.renderResults();
  },
};

/* =========================================
   APP — главный контроллер
   ========================================= */
const App = {
  questions: [],

  async init() {
    Router.init();

    // Кнопки навигации
    document.getElementById('btn-start')?.addEventListener('click', () => this.startGame());
    document.getElementById('btn-restart')?.addEventListener('click', () => this.startGame());
    document.getElementById('btn-save-score')?.addEventListener('click', () => this.saveScore());
    document.getElementById('btn-clear-lb')?.addEventListener('click', () => {
      LeaderboardDB.clear();
      Renderer.renderLeaderboard();
    });

    // Загружаем XML
    try {
      this.questions = await XMLParser.load('./data/questions.xml');
      console.log(`[CodeGuess] Loaded ${this.questions.length} questions from XML`);
    } catch (err) {
      console.error('[CodeGuess] XML load error:', err);
      this.showError('Не удалось загрузить вопросы. Убедитесь, что файл questions.xml доступен.');
    }
  },

  async startGame() {
    if (!this.questions.length) {
      this.showError('Вопросы ещё не загружены!');
      return;
    }

    QuizEngine.init(this.questions);
    Router.go('page-quiz');
    Renderer.renderQuestion();

    QuizEngine.startTimer(
      (s) => Renderer.updateTimer(s),
      ()  => this.handleTimeout(),
    );
  },

  handleAnswer(value, btn) {
    const result = QuizEngine.answer(value);
    if (!result) return;

    Renderer.highlightAnswer(btn, result.isCorrect, result.correct);
    Renderer.showFeedback(result.isCorrect, result.points);
    if (result.isCorrect && result.points > 0) {
      Renderer.showScorePopup(result.points);
    }

    // Переход через 1.6 секунды
    setTimeout(() => this.advance(), 1600);
  },

  handleTimeout() {
    // Время вышло — как неверный ответ
    QuizEngine.state.answered = true;
    QuizEngine.state.wrongCount++;

    const correctVal = QuizEngine.currentQuestion.correct;
    // Подсветить правильный без выбранного
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.value === correctVal) btn.classList.add('correct');
      else btn.classList.add('dimmed');
    });

    Renderer.showFeedback(false, 0);

    setTimeout(() => this.advance(), 1600);
  },

  advance() {
    if (QuizEngine.next()) {
      Renderer.renderQuestion();
      QuizEngine.startTimer(
        (s) => Renderer.updateTimer(s),
        ()  => this.handleTimeout(),
      );
    } else {
      QuizEngine.stopTimer();
      Router.go('page-results');
    }
  },

  saveScore() {
    const nameEl = document.getElementById('result-name');
    const name = nameEl?.value?.trim() || 'Anonymous';
    LeaderboardDB.add({
      name,
      score:   QuizEngine.state.score,
      correct: QuizEngine.state.correctCount,
      total:   QuizEngine.totalQuestions,
    });
    Router.go('page-leaderboard');
  },

  showError(msg) {
    const el = document.getElementById('error-msg');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    else alert(msg);
  },
};

// Запуск
document.addEventListener('DOMContentLoaded', () => App.init());

/* =========================================
   BURGER MENU
   ========================================= */
const BurgerMenu = {
  btn:     null,
  nav:     null,
  overlay: null,
  isOpen:  false,

  init() {
    this.btn     = document.getElementById('burger-btn');
    this.nav     = document.getElementById('nav-links');
    this.overlay = document.getElementById('nav-overlay');

    if (!this.btn || !this.nav) return;

    this.btn.addEventListener('click', () => this.toggle());
    this.overlay.addEventListener('click', () => this.close());

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    // Закрытие при смене страницы через data-nav
    document.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', () => this.close());
    });

    // Закрытие при ресайзе на десктоп
    window.addEventListener('resize', () => {
      if (window.innerWidth > 640 && this.isOpen) this.close();
    });
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.nav.classList.add('open');
    this.overlay.style.display = 'block';
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    this.btn.setAttribute('aria-expanded', 'true');
    this.btn.setAttribute('aria-label', 'Закрыть меню');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.isOpen = false;
    this.nav.classList.remove('open');
    this.overlay.classList.remove('visible');
    this.btn.setAttribute('aria-expanded', 'false');
    this.btn.setAttribute('aria-label', 'Открыть меню');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!this.isOpen) this.overlay.style.display = 'none';
    }, 300);
  },
};

document.addEventListener('DOMContentLoaded', () => BurgerMenu.init());
