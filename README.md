# CodeGuess — Угадай язык по снипету кода

[![GitHub Pages](https://img.shields.io/badge/demo-live-00f5ff?style=flat-square&logo=github)](https://your-username.github.io/codeguess)
![HTML5](https://img.shields.io/badge/HTML5-semantic-e34f26?style=flat-square&logo=html5)
![CSS3](https://img.shields.io/badge/CSS3-custom%20properties-1572b6?style=flat-square&logo=css3)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-f7df1e?style=flat-square&logo=javascript)
![XML](https://img.shields.io/badge/Data-XML-orange?style=flat-square)

> Квиз-игра: определи язык программирования по фрагменту кода.  
> Неоновый дизайн · Таймер · Система очков · Таблица лидеров

---

## Скриншоты

| Главная | Квиз | Результаты |
|---------|------|-----------|
| ![home](docs/screen-home.png) | ![quiz](docs/screen-quiz.png) | ![results](docs/screen-results.png) |

---

## Стек технологий

| Слой | Технологии |
|------|-----------|
| **Разметка** | HTML5 (семантические теги: `<main>`, `<header>`, `<article>`, `<section>`, `<nav>`, `<footer>`) |
| **Стили** | CSS3 + CSS Custom Properties (нео-неоновая тема, адаптивная верстка) |
| **Шрифт** | JetBrains Mono (Google Fonts) |
| **Данные** | XML (вопросы, снипеты, ответы) + DOMParser API |
| **Логика** | Vanilla JavaScript ES2022 (XMLParser, QuizEngine, Renderer, Router) |
| **Хранение** | localStorage (таблица лидеров) |
| **Графика** | SVG (логотип, иконки, декоративные элементы) |
| **Лinter** | ESLint + HTMLHint |

---

## Структура проекта

```
codeguess/
├── index.html              # Главная страница (SPA — все 4 страницы внутри)
├── css/
│   └── style.css           # Стили с CSS-переменными, адаптив
├── js/
│   └── app.js              # Вся логика: парсер XML, движок квиза, рендерер
├── data/
│   └── questions.xml       # 15 вопросов с снипетами и вариантами ответов
├── .eslintrc.json          # Конфигурация ESLint
├── .htmlhintrc             # Конфигурация HTMLHint
└── README.md
```

---

## Страницы сайта

1. **`page-home`** — главная с превью кода и статистикой
2. **`page-quiz`** — квиз (снипет + 4 варианта + таймер)
3. **`page-results`** — итоги с кольцом прогресса и полем ввода имени
4. **`page-leaderboard`** — таблица лидеров (localStorage)
5. **`page-about`** — правила и система очков

---

## Структура XML-данных

```xml
<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question id="1" difficulty="easy">
    <snippet><![CDATA[def greet(name):
    print(f"Hello, {name}!")]]></snippet>
    <correct>Python</correct>
    <options>
      <option>Python</option>
      <option>Ruby</option>
      <option>Kotlin</option>
      <option>Swift</option>
    </options>
    <hint>f-строки и отступы</hint>
  </question>
  <!-- ... 14 вопросов -->
</quiz>
```

Поля:
- `id` — уникальный идентификатор
- `difficulty` — `easy` / `medium` / `hard`
- `snippet` — фрагмент кода (CDATA)
- `correct` — правильный ответ
- `options` — 4 варианта (перемешиваются при загрузке)
- `hint` — подсказка о характерных чертах языка

---

## Система очков

| Событие | Очки |
|---------|------|
| Правильный ответ (база) | +50 |
| Бонус за скорость (ответ за 1 сек) | +50 |
| Сложность: medium | +15 |
| Сложность: hard | +30 |
| Неверный ответ / таймаут | 0 |

**Максимум за вопрос** (hard + мгновенный ответ): **130 очков**

---

## Запуск локально

```bash
# Клонируй репозиторий
git clone https://github.com/your-username/codeguess.git
cd codeguess

# Запусти локальный сервер (XML требует HTTP, не file://)
npx serve .
# или
python3 -m http.server 8080
```



---

## Линтинг

```bash
# Установка
npm install -D eslint htmlhint

# Запуск ESLint
npx eslint js/app.js

# Запуск HTMLHint
npx htmlhint index.html
```

---

## Добавление вопросов

Открой `data/questions.xml` и добавь новый блок `<question>`:

```xml
<question id="16" difficulty="medium">
  <snippet><![CDATA[// твой код здесь]]></snippet>
  <correct>ЯзыкПрограммирования</correct>
  <options>
    <option>ЯзыкПрограммирования</option>
    <option>Вариант2</option>
    <option>Вариант3</option>
    <option>Вариант4</option>
  </options>
  <hint>Характерная черта</hint>
</question>
```

---

## Технические требования (выполнены)

| Требование | Статус |
|-----------|--------|
| 3.1 Прототип в Figma/XD | ✅ Figma-файл в `/docs/prototype.fig` |
| 3.2 Хранение данных в XML | ✅ `data/questions.xml` |
| 3.3 HTML5 + XML разметка | ✅ Семантический HTML5, DOMParser для XML |
| 3.4 CSS3 (Sass/CSS3) | ✅ Нативный CSS3 с Custom Properties |
| 3.5 Семантические теги, SVG, несколько страниц | ✅ 5 страниц, SVG-иконки и декор |
| 3.6 Адаптивная и кроссбраузерная верстка | ✅ Flexbox/Grid, media queries |
| 3.7 Linter | ✅ ESLint + HTMLHint |
| 3.8 GitHub + документация | ✅ Этот README |
| JavaScript: XML-парсер | ✅ `XMLParser` модуль |
| JavaScript: логика квиза | ✅ `QuizEngine` — таймер, счёт, ответы |

---

## Автор

Храбрый А. Р.
ГУО "Белоруский государственный технологический университет"
Факултет информационных технологий
Специальность: "Информационные системы и технологии"
Дисциплина: "Компьютерные языки разметки"

---

*// сделано с JetBrains Mono и слишком большим количеством кофе*
