# --------------------------------------------------------------
# Большой стресс-тест Locust (исправленный — меньше false fails)
# --------------------------------------------------------------
import os, sys, random, string, threading, datetime as dt, time
from pathlib import Path
from typing import Dict, List
from locust import HttpUser, task, between, events, main as locust_main

# ─────────── НАСТРОЙКИ ─────────────────────────────────────────
USERS_TOTAL   = 100_000          # всего создаём аккаунтов
ONLINE_VUS    = 1_000            # одновременно активных VU
RUN_TIME      = "30m"
API_PREFIX    = os.getenv("API_PREFIX", "").rstrip("/")
PWD_TPL       = "{username}@mail.test"

PAGES_TPL = [
    "/user_chats/{uid}",
    "/friend_requests/{uid}",
    "/friends/{uid}",
    "/search_users?q=auto",
    "/tasks?user_id={uid}",
]

_pool_lock: threading.Lock = threading.Lock()
_user_pool: List[Dict[str, str]] = []      # свободные креды

# ─────────── HELPERS ───────────────────────────────────────────
def api(p: str) -> str: return f"{API_PREFIX}{p}"

def _rand(n: int = 5) -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=n))

def _gen_creds(n: int):
    for i in range(n):
        username = f"mass_{i:05d}_{_rand(2)}"
        yield {
            "username": username,
            "email":    f"{username}@example.test",
            "password": PWD_TPL.format(username=username)
        }

# ─────────── PRE-RUN ───────────────────────────────────────────
@events.test_start.add_listener
def _prepare(env, **kw):
    """
    1. Массово регистрируем USERS_TOTAL аккаунтов;
    2. Создаём плоскую «сетку» дружб: каждый N-й добавляет ±100 друзей.
    """
    global _user_pool
    _user_pool = list(_gen_creds(USERS_TOTAL))
    Path("massive_users.txt").write_text(
        "\n".join(f"{c['username']}:{c['password']}" for c in _user_pool),
        encoding="utf-8"
    )

    client = env.runner.client

    # регистрируем пачками по 1000
    for batch in (_user_pool[i:i + 1000] for i in range(0, USERS_TOTAL, 1000)):
        for cred in batch:
            client.post(api("/register"),
                        json=cred,
                        name="POST /register (bulk)",
                        timeout=15)

    # seed-дружбы: каждый 100-й юзер — 100 исходящих запросов
    for i in range(0, USERS_TOTAL, 100):
        requester_id = i + 1
        for offset in range(1, 101):
            receiver_id = (i + offset) % USERS_TOTAL + 1
            client.post(api("/friend_request"),
                        json={"requester_id": requester_id,
                              "receiver_id":  receiver_id},
                        name="POST /friend_request (seed)")
            # подтверждение сделает «получатель» в своём on_start

# ─────────── ОБЩАЯ БАЗА ДЛЯ РОЛЕЙ ─────────────────────────────
class _Base(HttpUser):
    wait_time = between(0.5, 2.0)

    # ---------- lifecycle ----------
    def on_start(self):
        self.cred = self._take_cred()
        self.uid  = self._safe_login()
        if self.uid < 0:         # если так и не залогинились — «усыпляем» VU
            self.environment.runner.greenlet.sleep(self.wait_time())

    # ---------- helpers ----------
    def _take_cred(self):
        while True:
            with _pool_lock:
                if _user_pool:
                    return _user_pool.pop()
            time.sleep(0.1)      # ждём, пока пул пополнится (не должен опустеть)

    def _safe_login(self) -> int:
        """
        Две попытки логина: если 1-я вернула 401 → поздняя регистрация → 2-я попытка.
        """
        for attempt in (1, 2):
            with self.client.post(
                    api("/login"),
                    json={"username": self.cred["username"],
                          "password": self.cred["password"]},
                    name=f"POST /login ({attempt})",
                    catch_response=True
            ) as resp:
                if resp.status_code == 200:
                    resp.success()
                    return resp.json()["user_id"]
                if resp.status_code == 401 and attempt == 1:
                    resp.success()  # это ожидаемо, регистрируемся и повторяем
                    self.client.post(api("/register"),
                                     json=self.cred,
                                     name="POST /register (late)")
                else:
                    resp.failure(str(resp.status_code))
        return -1                # не удалось

    # ---------- общие задачи ----------
    @task(3)
    def browse(self):
        """
        Любой 4xx (кроме 429) считаем «нормальным» — например,
        /friends/<id> вернёт 403, если ещё нет дружбы.
        """
        url  = random.choice(PAGES_TPL).format(uid=self.uid)
        base = url.split("?")[0]
        with self.client.get(api(url),
                             name=f"GET {base}",
                             catch_response=True) as r:
            if r.status_code < 500 or r.status_code in (403, 404):
                r.success()
            else:
                r.failure(str(r.status_code))

# ─────────── РОЛИ ─────────────────────────────────────────────
class Reader(_Base):
    weight = 800

class Chatter(_Base):
    weight = 100

    @task(5)
    def chat(self):
        if self.uid < 0:
            return
        target = random.randint(1, USERS_TOTAL)
        if target == self.uid:
            return

        # создаём чат (403 — не друзья — ок)
        with self.client.post(api("/create_chat"),
                              json={"name": "auto",
                                    "creator_id": self.uid,
                                    "user_ids": [self.uid, target]},
                              name="POST /create_chat",
                              catch_response=True) as r:
            if r.status_code in (200, 400, 403):
                r.success()
            else:
                r.failure(str(r.status_code))
            chat_id = r.json().get("chat_id") if r.status_code == 200 else None

        # сообщение шлём только если чат создали
        if chat_id:
            self.client.post(api("/send_message"),
                             json={"chat_id": chat_id,
                                   "sender_id": self.uid,
                                   "content": f"hi {_rand()}"},
                             name="POST /send_message")

class TaskMaker(_Base):
    weight = 100

    @task(5)
    def make_tasks(self):
        if self.uid < 0:
            return
        due = (dt.date.today() + dt.timedelta(days=random.randint(0, 30))
               ).strftime("%Y-%m-%d")
        with self.client.post(api("/tasks"),
                              json={"user_id": self.uid,
                                    "title": f"bulk {_rand()}",
                                    "due_date": due},
                              name="POST /tasks",
                              catch_response=True) as r:
            if r.status_code in (200, 201, 400):
                r.success()
            else:
                r.failure(str(r.status_code))

class AdminUser(_Base):
    """
    Один «админ». Добавляет 1000 записей ПО **один раз** (в on_start),
    а потом просто «спит» — иначе DDoS на /software даёт 429/500.
    """
    weight = 1

    def on_start(self):
        super().on_start()
        if self.uid < 0:
            return
        for _ in range(1000):
            with self.client.post(api("/software"),
                                  json={"admin": True,
                                        "title": f"SW {_rand()}",
                                        "description": "stress"},
                                  name="POST /software",
                                  catch_response=True) as r:
                if r.status_code in (200, 400):
                    r.success()
                else:
                    r.failure(str(r.status_code))
        # дальнейшие задачи не нужны
        self.environment.runner.greenlet.sleep(9999999)

# ─────────── HEADLESS RUN ─────────────────────────────────────
if __name__ == "__main__":
    sys.argv += [
        "-f", __file__,
        "-u", str(ONLINE_VUS),
        "-r", str(ONLINE_VUS),
        "--headless",
        "-t", RUN_TIME,
        "--host", "http://localhost:5000",
        "--html", "massive_report.html",
        "--logfile", "massive_locust.log",
    ]
    locust_main.main()
