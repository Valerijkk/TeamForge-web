# backend/tests/load_test_heavy.py
# ---------------------------------------------------------------
# Нагрузочный сценарий для Locust:
#   • заранее создаёт пачку тестовых пользователей;
#   • каждый виртуальный пользователь (VU) имитирует активность:
#       - просматривает различные API-эндпоинты,
#       - создаёт задачи,
#       - шлёт / принимает запросы дружбы.
#
# Запуск файла напрямую (`python load_test_heavy.py`) сформирует
# команду Locust в headless-режиме и запишет HTML-отчёт + лог.

import os, sys, random, string, threading, datetime as dt
from pathlib import Path
from typing import Dict, List

from locust import HttpUser, task, between, events, main as locust_main

# ─────────── НАСТРОЙКИ ─────────────────────────────────────────
USERS_TOTAL  = 1_000                    # сколько аккаунтов генерируем заранее
DEFAULT_VUS  = 50                       # одновременно активных VU
RUN_TIME     = "10m"                    # длительность прогона Locust
API_PREFIX   = os.getenv("API_PREFIX", "").rstrip("/")  # опц. префикс к URL
PWD_TPL      = "{username}@mail.test"   # шаблон пароля

# Шаблоны страниц, которые VU «гуляют», подставляя свой uid
PAGES_TPL = [
    "/user_chats/{uid}",
    "/friend_requests/{uid}",
    "/friends/{uid}",
    "/search_users?q=test",
    "/tasks?user_id={uid}",
]

_pool_lock  = threading.Lock()          # защищает общий пул учёток
_user_pool: List[Dict[str, str]] = []   # сюда кладём сгенерированные креды


# ─────────── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ───────────────────────────
def api(path: str) -> str:
    """Возвращает URL с учётом опционального префикса."""
    return f"{API_PREFIX}{path}"

def _rand(n: int = 5) -> str:
    """Псевдослучайная строка длиной n (для уникализации)."""
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choices(alphabet, k=n))

def _gen_creds(n: int) -> List[Dict[str, str]]:
    """Генерирует n словарей с логином/почтой/паролем."""
    for i in range(n):
        username = f"load_{i:04d}_{_rand(3)}"
        yield {
            "username": username,
            "email":    f"{username}@example.test",
            "password": PWD_TPL.format(username=username)
        }


# ─────────── ПРЕДВАРИТЕЛЬНАЯ МАССОВАЯ РЕГИСТРАЦИЯ ──────────────
@events.test_start.add_listener
def _mass_register(environment, **kw):
    """Перед стартом теста создаём USERS_TOTAL аккаунтов."""
    global _user_pool
    _user_pool = list(_gen_creds(USERS_TOTAL))

    # сохраняем список учёток — удобно исследовать при отладке
    Path("generated_users.txt").write_text(
        "\n".join(f"{c['username']}:{c['password']}" for c in _user_pool),
        encoding="utf-8"
    )

    client = environment.runner.client
    # Шлём регистрации пачками по 200, чтобы не застрять на time-outs
    for batch in (_user_pool[i:i + 200] for i in range(0, USERS_TOTAL, 200)):
        for cred in batch:
            client.post(
                api("/register"),
                json=cred,
                name="POST /register (bulk)",
                timeout=10
            )


# ─────────── ВИРТУАЛЬНЫЙ ПОЛЬЗОВАТЕЛЬ ──────────────────────────
class HeavyUser(HttpUser):
    """Каждый экземпляр класса — один VU."""
    wait_time = between(0.5, 2.0)       # «думалка» между действиями

    # ---------- жизненный цикл ----------
    def on_start(self):
        """При запуске VU достаём креды и логинимся."""
        self.cred = self._take_cred()
        self.uid  = self._login_and_get_uid()

    def _take_cred(self):
        """Берём свободную учётку из пула (thread-safe)."""
        with _pool_lock:
            return _user_pool.pop()

    def _login_and_get_uid(self) -> int:
        """
        Пытаемся войти. Если сервер вернул 401 (учётка ещё не создана),
        регистрируемся «на лету» и пробуем ещё раз.
        """
        with self.client.post(
                api("/login"),
                json={"username": self.cred["username"],
                      "password": self.cred["password"]},
                name="POST /login",
                catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
                return resp.json()["user_id"]
            resp.success()   # 401 — ок, значит нужно зарегистрироваться

        # поздняя регистрация
        self.client.post(
            api("/register"),
            json=self.cred,
            name="POST /register (late)"
        )

        # вторая попытка логина
        with self.client.post(
                api("/login"),
                json={"username": self.cred["username"],
                      "password": self.cred["password"]},
                name="POST /login (2nd)",
                catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
                return resp.json()["user_id"]
            resp.failure("second login failed")
            return -1        # «-1», чтобы не сломать типизацию

    # ---------- набор задач ----------
    @task(10)
    def browse_api(self):
        """Случайный просмотр одного из «ленточных» эндпоинтов."""
        url = random.choice(PAGES_TPL).format(uid=self.uid)
        base_name = url.split("?")[0]    # чтобы в отчёте группировать без query

        with self.client.get(
                api(url),
                name=f"GET {base_name}",
                catch_response=True
        ) as resp:
            if resp.status_code < 500:
                resp.success()
            else:
                resp.failure(str(resp.status_code))

    @task(5)
    def create_task(self):
        """Создаём персональную задачу с рандомным дедлайном."""
        due = (dt.date.today() + dt.timedelta(days=random.randint(0, 30))
               ).strftime("%Y-%m-%d")

        with self.client.post(
                api("/tasks"),
                json={
                    "user_id":     self.uid,
                    "title":       f"auto {_rand()}",
                    "description": "load-gen",
                    "due_date":    due
                },
                name="POST /tasks",
                catch_response=True
        ) as resp:
            if resp.status_code in (200, 201, 400):   # 400 = дедлайны в прошлом
                resp.success()
            else:
                resp.failure(str(resp.status_code))

    @task(3)
    def send_friend_request(self):
        """Отправляем запрос в друзья случайному пользователю."""
        target = random.randint(1, USERS_TOTAL)
        if target == self.uid:
            return  # не добавляем самого себя

        with self.client.post(
                api("/friend_request"),
                json={"requester_id": self.uid, "receiver_id": target},
                name="POST /friend_request",
                catch_response=True
        ) as resp:
            if resp.status_code in (200, 400):  # 400 = уже отправлен
                resp.success()
            else:
                resp.failure(str(resp.status_code))

    @task(3)
    def accept_requests(self):
        """Принимаем до трёх входящих заявок в друзья."""
        with self.client.get(
                api(f"/friend_requests/{self.uid}"),
                name="GET /friend_requests/<id>",
                catch_response=True
        ) as resp:
            if resp.status_code != 200:
                resp.failure(str(resp.status_code))
                return
            resp.success()

            for fr in resp.json()[:3]:          # берём максимум три
                self.client.post(
                    api("/friend_request/confirm"),
                    json={"friend_request_id": fr["id"]},
                    name="POST /friend_request/confirm"
                )

    @task(2)
    def read_tasks(self):
        """Читаем перечень своих задач."""
        with self.client.get(
                api(f"/tasks?user_id={self.uid}"),
                name="GET /tasks",
                catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(str(resp.status_code))


# ─────────── ЗАПУСК В ОДИН КЛИК (HEADLESS) ─────────────────────
if __name__ == "__main__":
    # Собираем параметры запуска Locust и передаём их в CLI-парсер
    sys.argv += [
        "-f", __file__,                    # текущий файл как сценарий
        "-u", str(DEFAULT_VUS),            # сколько одновременно пользователей
        "-r", str(DEFAULT_VUS),            # скорость раздачи VU (spawn rate)
        "--headless",                      # без Web-интерфейса
        "-t", RUN_TIME,                    # общая длительность теста
        "--host", "http://localhost:5000", # адрес тестируемого сервера
        "--html", "heavy_report.html",     # подробный HTML-отчёт
        "--logfile", "heavy_locust.log",   # файл лога
    ]
    locust_main.main()
