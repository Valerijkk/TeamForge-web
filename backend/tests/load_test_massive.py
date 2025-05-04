# --------------------------------------------------------------
# Огромный стресс-тест Locust:
#   • 100 000 пользователей в базе;
#   • 1000 VU одновременно;
#   • 100 «болтунов», 100 «таск-мейкеров», 800 «читателей»;
#   • один админ добавляет 1000 записей ПО.
#
# Запуск:  python load_test_massive.py
# --------------------------------------------------------------
import os, sys, random, string, threading, datetime as dt
from pathlib import Path
from typing import Dict, List

from locust import HttpUser, task, between, events, main as locust_main

# ─────────── НАСТРОЙКИ ─────────────────────────────────────────
USERS_TOTAL   = 100_000          # всего аккаунтов
ONLINE_VUS    = 1_000            # одновременно активных
RUN_TIME      = "30m"            # длительность («30m» или «1h»)
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
_user_pool: List[Dict[str, str]] = []     # хранит креды

# ─────────── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ───────────────────────────
def api(path: str) -> str:
    return f"{API_PREFIX}{path}"

def _rand(n: int = 5) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choices(alphabet, k=n))

def _gen_creds(n: int) -> List[Dict[str, str]]:
    for i in range(n):
        username = f"mass_{i:05d}_{_rand(2)}"
        yield {
            "username": username,
            "email":    f"{username}@example.test",
            "password": PWD_TPL.format(username=username)
        }

# ─────────── МАССОВАЯ РЕГИСТРАЦИЯ И ПЕРВЫЕ ДРУЖБЫ ──────────────
@events.test_start.add_listener
def _mass_prepare(environment, **kw):
    """Перед запуском создаём пользователей и делаем «клинч» дружбы."""
    global _user_pool
    _user_pool = list(_gen_creds(USERS_TOTAL))

    Path("massive_users.txt").write_text(
        "\n".join(f"{c['username']}:{c['password']}" for c in _user_pool),
        encoding="utf-8"
    )

    client = environment.runner.client

    # 1) Регистрация пачками по 1000.
    for batch in (_user_pool[i:i+1000] for i in range(0, USERS_TOTAL, 1000)):
        for cred in batch:
            client.post(api("/register"),
                        json=cred,
                        name="POST /register (bulk)",
                        timeout=15)

    # 2) Каждый N-ный юзер шлёт запросы дружбы  (≈ 10 млн пар — долго,
    #    поэтому ограничиваемся первым «кольцом» 100 000×2).
    for i, cred in enumerate(_user_pool[:200_000]):
        requester_id = i + 1
        receiver_id  = (i + 100) % USERS_TOTAL + 1
        client.post(api("/friend_request"),
                    json={"requester_id": requester_id,
                          "receiver_id":  receiver_id},
                    name="POST /friend_request (seed)")

        client.post(api("/friend_request/confirm"),
                    json={"friend_request_id": i + 1},
                    name="POST /friend_request/confirm (seed)")

# ─────────── БАЗОВЫЙ VU (общие методы) ─────────────────────────
class _Base(HttpUser):
    wait_time = between(0.5, 2.0)

    def on_start(self):
        self.cred = self._take_cred()
        self.uid  = self._login()

    # ---------- вспомогательные ----------
    def _take_cred(self):
        with _pool_lock:
            return _user_pool.pop()

    def _login(self):
        with self.client.post(api("/login"),
                              json={"username": self.cred["username"],
                                    "password": self.cred["password"]},
                              name="POST /login",
                              catch_response=True) as r:
            if r.status_code == 200:
                r.success()
                return r.json()["user_id"]
            r.failure(str(r.status_code))
            return -1

    # ---------- общие задачи ----------
    @task(3)
    def browse(self):
        url = random.choice(PAGES_TPL).format(uid=self.uid)
        base = url.split("?")[0]
        with self.client.get(api(url),
                             name=f"GET {base}",
                             catch_response=True) as r:
            if r.status_code < 500:
                r.success()
            else:
                r.failure(str(r.status_code))

    def _ensure_friends(self, count: int = 100):
        """Пока друзей < count — рассылаем заявки и принимаем входящие."""
        while True:
            with self.client.get(api(f"/friends/{self.uid}"),
                                 name="GET /friends/<id>",
                                 catch_response=True) as r:
                if r.status_code != 200:
                    r.failure(str(r.status_code))
                    break
                friends = r.json()
                if len(friends) >= count:
                    r.success()
                    break
                r.success()

            target = random.randint(1, USERS_TOTAL)
            if target == self.uid:
                continue
            self.client.post(api("/friend_request"),
                             json={"requester_id": self.uid,
                                   "receiver_id":  target},
                             name="POST /friend_request")

# ─────────── 3 КЛАССА VU - РОЛИ ────────────────────────────────
class Reader(_Base):
    weight = 800   # ≈ 80 % от 1000 VU

class Chatter(_Base):
    weight = 100   # ≈ 100 VU

    @task(5)
    def chat(self):
        """Если нет личного чата с target — создаём и шлём сообщение."""
        target = random.randint(1, USERS_TOTAL)
        if target == self.uid:
            return

        # сначала убеждаемся, что друзья
        self._ensure_friends(100)

        # создаём чат
        with self.client.post(api("/create_chat"),
                              json={"name": "auto",
                                    "creator_id": self.uid,
                                    "user_ids": [self.uid, target]},
                              name="POST /create_chat",
                              catch_response=True) as r:
            if r.status_code not in (200, 400):   # 400=уже есть
                r.failure(str(r.status_code))
                return
            r.success()
            chat_id = r.json().get("chat_id")

        # шлём сообщение
        if chat_id:
            self.client.post(api("/send_message"),
                             json={"chat_id": chat_id,
                                   "sender_id": self.uid,
                                   "content": f"hi {_rand()}"},
                             name="POST /send_message")

class TaskMaker(_Base):
    weight = 100   # ≈ 100 VU

    @task(5)
    def make_tasks(self):
        due = (dt.date.today() + dt.timedelta(days=random.randint(0, 30))
               ).strftime("%Y-%m-%d")
        with self.client.post(api("/tasks"),
                              json={"user_id": self.uid,
                                    "title": f"bulk {_rand()}",
                                    "due_date": due},
                              name="POST /tasks",
                              catch_response=True) as r:
            if r.status_code in (200, 201):
                r.success()
            else:
                r.failure(str(r.status_code))

class AdminUser(_Base):
    weight = 1     # один админ

    @task
    def add_software(self):
        """Добавляем по 1000 записей ПО одним пользователем-админом."""
        for _ in range(1000):
            with self.client.post(api("/software"),
                                  json={"admin": True,
                                        "title": f"SW {_rand()}",
                                        "description": "stress"},
                                  name="POST /software",
                                  catch_response=True) as r:
                if r.status_code == 200:
                    r.success()
                else:
                    r.failure(str(r.status_code))

# ─────────── HEADLESS-ЗАПУСК ───────────────────────────────────
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
