# **TeamForge** — демонстрационное чат-приложение с бекендом на Flask, поддержкой Socket.IO и СУБД PostgreSQL. Проект включает:

- WebRTC-звонки (голосовые, групповые, демонстрация экрана)  
- Система задач (календарь)  
- Сеть «друзей» (запросы, подтверждение, поиск)  
- CRUD-интерфейс для «программного обеспечения» (для администратора)  
- Интерактивная база знаний (iframe–статьи)  
- Страницу ИИ-помощника (интеграция внешнего сервиса)  

---


## 📋 Содержание

1. [Возможности](#-возможности)  
2. [Структура](#-структура-проекта)  
3. [Установка и запуск](#-установка-и-запуск)  
4. [Полезные ссылки](#-полезные-ссылки)  
5. [Лицензия](#-лицензия)  

---

## 🚀 Возможности

### Пользователи и аутентификация
- Регистрация/вход с хешированием паролей.  
- Сброс пароля по email.

### Чаты
- Личные и групповые чаты.  
- Текстовые сообщения, файлы, ответы, пересылка, удаление (для всех или только для себя).  
- Реакции (👍, ❤️ и т.п.).  
- Поиск по содержимому сообщений.

### Звонки и WebRTC
- Голосовые звонки (личные/групповые).  
- Включение/выключение камеры, демонстрация экрана.  
- Лог звонков (тип, участники, время начала/окончания, длительность).

### Система дружбы
- Отправка, подтверждение и отклонение запросов в друзья.  
- Удаление друзей.  
- Поиск пользователей.

### Задачи и календарь
- Добавление/редактирование/удаление задач с указанием даты.  
- Просмотр задач на выбранный день и на ближайшую неделю.

### Программное обеспечение
- Страница карточек ПО.  
- CRUD-операции (только для администратора).

### База знаний
- Интерактивные статьи через `<iframe>`.

### ИИ-помощник
- Встроенный внешний сервис ИИ (iframe).

---

## 📂 Структура проекта

```

teamforge/
├─ backend/           — Flask-API + Socket.IO
│  ├─ routes/         — all\_blueprints (auth, chat, call, tasks, software, user, friendship, socketio\_events)
│  ├─ models.py       — ORM-модели
│  ├─ extensions.py   — init Flask-extensions
│  ├─ utils.py        — утилиты (email-сброс, токены)
│  ├─ app.py          — entry point
│  ├─ config.py       — настройки
│  └─ tests/          — pytest-тесты, locust
├─ frontend/          — React SPA
│  ├─ public/
│  └─ src/
│     ├─ pages/       — MainPage, Login, Register, Chats, Chat, Calls, Calendar, Profile, KnowledgeBase, AIAssistant, Software, ResetPassword(Confirm)
│     ├─ App.jsx      — маршрутизация
│     └─ setupTests.js, App.test.js, …
├─ uploads/           — медиа-файлы
├─ docker-compose.yml
├─ Dockerfile.backend
├─ Dockerfile.frontend
├─ README.md         — вы здесь
└─ teamforge\_erd.puml, UseCase.puml, …


---

## 🛠 Установка и запуск

### 🚚 С Docker

```bash
git clone https://github.com/Valerijkk/TeamForge-web.git
cd TeamForge-web
docker-compose up --build -d
````

* Бекенд будет доступен на `http://localhost:5000`
* Фронтенд — на `http://localhost:3000`

### ⚙️ Локальная разработка

1. **Бекенд**

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   flask db upgrade      # миграции
   flask run
   ```

2. **Фронтенд**

   ```bash
   cd frontend
   npm install
   npm start
   ```

### 🧪 Тесты

* **Backend**: `pytest backend/tests/`
* **Frontend**: `npm test` (Jest + React Testing Library)
* **Нагрузочное**: `locust -f backend/tests/locustfile.py`

---

## 🔗 Полезные ссылки

* [Flask](https://flask.palletsprojects.com/)
* [Flask-SocketIO](https://flask-socketio.readthedocs.io/)
* [React Router DOM](https://reactrouter.com/)
* [PostgreSQL](https://www.postgresql.org/)
* [GitHub Pages](https://pages.github.com/)

---

## 📄 Лицензия

Проект предназначен для демонстрации.
Коммерческое использование, модификация или распространение без согласия автора запрещены.

---

✨ **Онлайн-демо:** [https://Valerijkk.github.io/TeamForge-web](https://Valerijkk.github.io/TeamForge-web)
© 2025 Valerijkk — Все права защищены.

