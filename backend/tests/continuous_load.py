# --------------------------------------------------------------
# Бесконечный «фоновый» автотест-нагрузка (Locust без времени).
# Параметры берёт из переменных окружения:
#   CONT_VUS      — количество одновременных VU    (по умолчанию 20)
#   CONT_SPAWN    — скорость появления VU          (по умолчанию = CONT_VUS)
#   CONT_HOST     — базовый URL (по умолчанию http://localhost:5000)
#
# Пример: CONT_VUS=50 CONT_HOST=http://dev:8000  python continuous_load.py
# Остановить: Ctrl-C
# --------------------------------------------------------------
import os, sys, random, string, threading, datetime as dt
from typing import Dict, List
from locust import HttpUser, task, between, events, main as locust_main

# ─────────── КОНФИГ И ГЛОБАЛЫ ─────────────────────────────────
VU_TOTAL   = int(os.getenv("CONT_VUS",   20))
SPAWN_RATE = int(os.getenv("CONT_SPAWN", VU_TOTAL))
HOST_URL   = os.getenv("CONT_HOST", "http://localhost:5000")
API_PREFIX = os.getenv("API_PREFIX", "").rstrip("/")

PWD_TPL    = "cont_{username}"
_pool_lock = threading.Lock()
_user_pool: List[Dict[str, str]] = []

# ─────────── HELPERS ──────────────────────────────────────────
def api(p: str) -> str: return f"{API_PREFIX}{p}"

def _rnd(s=6): return "".join(random.choices(string.ascii_letters, k=s))

def _new_user():
    u = f"cont_{_rnd()}"
    return dict(username=u, email=f"{u}@ex.test", password=PWD_TPL.format(username=u))

# ─────────── МИНИ-РЕГИСТРАЦИЯ ПЕРЕД ЗАПУСКОМ ──────────────────
@events.test_start.add_listener
def _prepare(env, **kw):
    global _user_pool
    _user_pool = [_new_user() for _ in range(VU_TOTAL * 2)]   # запас

    client = env.runner.client
    for cred in _user_pool:
        client.post(api("/register"), json=cred, name="prep /register")

# ─────────── VU ───────────────────────────────────────────────
class ContinuousUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        self.cred = self._take()
        self.uid  = self._login()

    # ── инструменты ──
    def _take(self):
        with _pool_lock:
            return _user_pool.pop()

    def _login(self):
        r = self.client.post(api("/login"),
                             json={"username": self.cred["username"],
                                   "password": self.cred["password"]})
        return r.json().get("user_id", -1)

    # ── задачи ──
    @task(3)
    def browse(self):
        page = random.choice(("/users", "/software", "/search_users?q=l"))
        self.client.get(api(page), name=f"GET {page}")

    @task(1)
    def my_tasks(self):
        self.client.get(api(f"/tasks?user_id={self.uid}"), name="GET /tasks")

    @task(1)
    def add_task(self):
        due = (dt.date.today() + dt.timedelta(days=random.randint(1, 14))
               ).strftime("%Y-%m-%d")
        self.client.post(api("/tasks"),
                         json={"user_id": self.uid,
                               "title": f"cont {_rnd(4)}",
                               "due_date": due},
                         name="POST /tasks")

# ─────────── ЗАПУСК БЕЗ -t (бесконечно) ───────────────────────
if __name__ == "__main__":
    sys.argv += [
        "-f", __file__,
        "-u", str(VU_TOTAL),
        "-r", str(SPAWN_RATE),
        "--headless",
        "--host", HOST_URL,
        "--html", "continuous_report.html",
        "--logfile", "continuous_locust.log",
    ]
    locust_main.main()
