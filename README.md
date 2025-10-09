<!-- Banner -->
<h1 align="center">🧩 TeamForge</h1>
<p align="center">
  <b>Демо-чат с бэкендом на Flask, Socket.IO, WebRTC и PostgreSQL</b><br/>
  Личные/групповые чаты, звонки, задачи, друзья, база знаний и админ-CRUD.
</p>

<p align="center">
  <!-- Repo meta -->
  <a href="https://github.com/Valerijkk/TeamForge-web/stargazers"><img src="https://img.shields.io/github/stars/Valerijkk/TeamForge-web?style=flat-square&logo=github" /></a>
  <a href="https://github.com/Valerijkk/TeamForge-web/issues"><img src="https://img.shields.io/github/issues/Valerijkk/TeamForge-web?style=flat-square" /></a>
  <a href="https://github.com/Valerijkk/TeamForge-web/network/members"><img src="https://img.shields.io/github/forks/Valerijkk/TeamForge-web?style=flat-square" /></a>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" />
</p>

<p align="center">
  <!-- Tech stack -->
  <img src="https://img.shields.io/badge/Flask-000?logo=flask&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/WebRTC-333?logo=webrtc&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white&style=for-the-badge" />
</p>

<p align="center">
  <a href="#-возможности">Возможности</a> •
  <a href="#-архитектура--скриншоты">Архитектура & Скриншоты</a> •
  <a href="#-установка-и-запуск">Установка</a> •
  <a href="#-api-обзор">API</a> •
  <a href="#-тестирование--qa">Тесты</a> •
  <a href="#-безопасность">Безопасность</a> •
  <a href="#-лицензия">Лицензия</a>
</p>

> ✨ Онлайн-демо: **https://Valerijkk.github.io/TeamForge-web**  
> 🛠 Репозиторий: **Valerijkk/TeamForge-web**

---

## 🚀 Возможности

### 👤 Пользователи и аутентификация
- 🔐 Регистрация/логин, хеширование паролей  
- ✉️ Сброс пароля по e-mail  
- 🛡️ JWT-сессии / refresh-токены

### 💬 Чаты
- 👥 Личные и групповые чаты  
- 📝 Сообщения, файлы, ответы, пересылка  
- 🗑 Удаление (для всех / только для себя)  
- 🔎 Поиск по истории  
- 😄 Реакции (👍 ❤️ 🔥 …)  
- 🟢 Индикатор онлайн-статуса и «печатает…»

### 📞 WebRTC и звонки
- 📱 Голосовые/групповые  
- 🖥 Демонстрация экрана  
- 🧾 Лог звонков (участники, время, длительность)

### 🤝 Система дружбы
- ➕ Запросы в друзья / подтверждение / отклонение  
- 🔍 Поиск пользователей  
- 🗑 Удаление из друзей

### 🗓 Задачи и календарь
- ➕/✏️/🗑 CRUD задач  
- 📅 Просмотр на день и неделю, быстрые фильтры

### 🧰 «Программное обеспечение» (админ)
- 📦 Каталог карточек ПО  
- 🛠 Полный CRUD (только для администратора)

### 📚 База знаний
- 📖 Интерактивные статьи через `<iframe>`

### 🤖 ИИ-помощник
- 🔗 Встроенный внешний сервис (iframe-вью)

---

## 📦 Архитектура & Скриншоты

```

teamforge/
├─ backend/                    # Flask API + Socket.IO
│  ├─ routes/                  # auth, chat, call, tasks, software, user, friendship, socketio_events
│  ├─ models.py                # SQLAlchemy ORM
│  ├─ extensions.py            # init Flask-extensions
│  ├─ utils.py                 # e-mail reset, tokens, helpers
│  ├─ app.py                   # app factory/entry
│  ├─ config.py                # конфиги
│  └─ tests/                   # pytest, locust
├─ frontend/                   # React SPA
│  └─ src/
│     ├─ pages/                # Main, Login, Register, Chats, Chat, Calls, Calendar, Profile, KB, AI, Software, ResetPassword(Confirm)
│     ├─ App.jsx               # маршрутизация
│     └─ setupTests.js, *.test.js
├─ uploads/                    # медиа
├─ docker-compose.yml
├─ Dockerfile.backend
├─ Dockerfile.frontend
└─ README.md

````

## 🛠 Установка и запуск

### 🚚 Быстрый старт в Docker
```bash
git clone https://github.com/Valerijkk/TeamForge-web.git
cd TeamForge-web
docker-compose up --build -d
# backend → http://localhost:5000
# frontend → http://localhost:3000
````

### ⚙️ Локальная разработка

**1) Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# ENV (пример):
# export FLASK_ENV=development
# export DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/teamforge
# export SECRET_KEY=supersecret
# export MAIL_SERVER=smtp.example.com
# export MAIL_USERNAME=...
# export MAIL_PASSWORD=...

flask db upgrade            # миграции
flask run                   # http://localhost:5000
```

**2) Frontend**

```bash
cd frontend
npm install
npm start                   # http://localhost:3000
```

---

## 🧪 Тестирование & QA

* **Backend (pytest)**

  ```bash
  pytest -q backend/tests
  ```
* **Frontend (Jest + RTL)**

  ```bash
  cd frontend && npm test
  ```
* **Нагрузочное (Locust)**

  ```bash
  locust -f backend/tests/locustfile.py
  ```

## 🔌 API обзор (фрагмент)

| Метод | Путь                      | Описание            |
| ----: | ------------------------- | ------------------- |
|  POST | `/api/auth/login`         | Логин, выдача JWT   |
|  POST | `/api/auth/register`      | Регистрация         |
|   GET | `/api/users/search?q=`    | Поиск пользователей |
|   GET | `/api/chats/:id/messages` | История сообщений   |
|  POST | `/api/messages`           | Отправка сообщения  |
|  POST | `/api/calls/start`        | Инициация звонка    |
|   GET | `/api/tasks?date=`        | Задачи на дату      |
|  CRUD | `/api/software/*`         | Каталог ПО (админ)  |

---

## 🧷 Переменные окружения (пример `.env`)

```dotenv
FLASK_ENV=development
SECRET_KEY=supersecret
DATABASE_URL=postgresql+psycopg2://user:pass@db:5432/teamforge
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your@mail.com
MAIL_PASSWORD=********
JWT_SECRET=anothersecret
```

---

## 🧭 Roadmap

* [ ] Push-уведомления (web & mobile)
* [ ] История редактирования сообщений
* [ ] Запись/архив звонков
* [ ] Роли и права (RBAC) в админке
* [ ] Мульти-язычность (i18n)
* [ ] Докер-оркестрация + Nginx SSL

---

## 🛡 Безопасность

* Ответственная публикация уязвимостей приветствуется ❤️
* См. **[SECURITY.md](SECURITY.md)**
* E-mail для отчётов: **[valerich.tv.88@mail.ru](mailto:valerich.tv.88@mail.ru)**

---

## 🔗 Полезные ссылки

* [Flask](https://flask.palletsprojects.com/)
* [Flask-SocketIO](https://flask-socketio.readthedocs.io/)
* [React Router](https://reactrouter.com/)
* [PostgreSQL](https://www.postgresql.org/)
* [GitHub Pages](https://pages.github.com/)
