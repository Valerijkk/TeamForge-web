# backend/tests/load_test_heavy.py
# --------------------------------
import os, sys, random, string, threading, datetime as dt
from pathlib import Path
from typing import Dict, List

from locust import HttpUser, task, between, events, main as locust_main


# ─────────── SETTINGS ──────────────────────────────────────────
USERS_TOTAL  = 1_000
DEFAULT_VUS  = 50
RUN_TIME     = "10m"
API_PREFIX   = os.getenv("API_PREFIX", "").rstrip("/")
PWD_TPL      = "{username}@mail.test"

PAGES_TPL = [
    "/user_chats/{uid}",
    "/friend_requests/{uid}",
    "/friends/{uid}",
    "/search_users?q=test",
    "/tasks?user_id={uid}",
]

_pool_lock  = threading.Lock()
_user_pool: List[Dict[str, str]] = []


# ─────────── HELPERS ───────────────────────────────────────────
def api(path: str) -> str:            # добавляет возможный префикс
    return f"{API_PREFIX}{path}"

def _rand(n=5) -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=n))

def _gen_creds(n: int) -> List[Dict[str, str]]:
    for i in range(n):
        username = f"load_{i:04d}_{_rand(3)}"
        yield dict(
            username=username,
            email=f"{username}@example.test",
            password=PWD_TPL.format(username=username)
        )


# ─────────── PRE-RUN MASS REGISTRATION ─────────────────────────
@events.test_start.add_listener
def _mass_register(environment, **kw):
    """Создаём USERS_TOTAL аккаунтов перед началом теста."""
    global _user_pool
    _user_pool = list(_gen_creds(USERS_TOTAL))

    Path("generated_users.txt").write_text(
        "\n".join(f"{c['username']}:{c['password']}" for c in _user_pool),
        encoding="utf-8"
    )

    client = environment.runner.client
    for batch in (_user_pool[i:i+200] for i in range(0, USERS_TOTAL, 200)):
        for cred in batch:
            client.post(api("/register"),
                        json=cred,
                        name="POST /register (bulk)",
                        timeout=10)


# ─────────── VIRTUAL USER ──────────────────────────────────────
class HeavyUser(HttpUser):
    wait_time = between(0.5, 2.0)

    # ---------- lifecycle ----------
    def on_start(self):
        self.cred = self._take_cred()
        self.uid  = self._login_and_get_uid()

    def _take_cred(self):
        with _pool_lock:
            return _user_pool.pop()

    def _login_and_get_uid(self) -> int:
        """Логинимся. При 401 — регистрируемся и пробуем ещё раз."""
        with self.client.post(api("/login"),
                              json={"username": self.cred["username"],
                                    "password": self.cred["password"]},
                              name="POST /login",
                              catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
                return resp.json()["user_id"]
            resp.success()   # 401 допустим – переходим к регистрации

        # late registration
        self.client.post(api("/register"),
                         json=self.cred,
                         name="POST /register (late)")      # <-- без .success()

        with self.client.post(api("/login"),
                              json={"username": self.cred["username"],
                                    "password": self.cred["password"]},
                              name="POST /login (2nd)",
                              catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
                return resp.json()["user_id"]
            resp.failure("second login failed")
            return -1        # чтобы не сломать типизацию

    # ---------- tasks mix ----------
    @task(10)
    def browse_api(self):
        url = random.choice(PAGES_TPL).format(uid=self.uid)
        base_name = url.split("?")[0]            # для красивой статистики

        with self.client.get(api(url),
                             name=f"GET {base_name}",
                             catch_response=True) as resp:
            if resp.status_code < 500:
                resp.success()
            else:
                resp.failure(str(resp.status_code))

    @task(5)
    def create_task(self):
        due = (dt.date.today() + dt.timedelta(random.randint(0, 30))
               ).strftime("%Y-%m-%d")

        with self.client.post(api("/tasks"),
                              json={"user_id": self.uid,
                                    "title": f"auto {_rand()}",
                                    "description": "load-gen",
                                    "due_date": due},
                              name="POST /tasks",
                              catch_response=True) as resp:
            if resp.status_code in (200, 201, 400):
                resp.success()
            else:
                resp.failure(str(resp.status_code))

    @task(3)
    def send_friend_request(self):
        target = random.randint(1, USERS_TOTAL)
        if target == self.uid:
            return
        with self.client.post(api("/friend_request"),
                              json={"requester_id": self.uid,
                                    "receiver_id": target},
                              name="POST /friend_request",
                              catch_response=True) as resp:
            if resp.status_code in (200, 400):
                resp.success()
            else:
                resp.failure(str(resp.status_code))

    @task(3)
    def accept_requests(self):
        # получаем pending-запросы
        with self.client.get(api(f"/friend_requests/{self.uid}"),
                             name="GET /friend_requests/<id>",
                             catch_response=True) as resp:
            if resp.status_code != 200:
                resp.failure(str(resp.status_code))
                return
            resp.success()
            for fr in resp.json()[:3]:
                self.client.post(api("/friend_request/confirm"),
                                 json={"friend_request_id": fr["id"]},
                                 name="POST /friend_request/confirm")

    @task(2)
    def read_tasks(self):
        with self.client.get(api(f"/tasks?user_id={self.uid}"),
                             name="GET /tasks",
                             catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(str(resp.status_code))


# ─────────── ONE-CLICK HEADLESS RUN ────────────────────────────
if __name__ == "__main__":
    sys.argv += [
        "-f", __file__,
        "-u", str(DEFAULT_VUS),
        "-r", str(DEFAULT_VUS),
        "--headless",
        "-t", RUN_TIME,
        "--host", "http://localhost:5000",
        "--html", "heavy_report.html",
        "--logfile", "heavy_locust.log",
    ]
    locust_main.main()
