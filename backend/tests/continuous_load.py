# backend/tests/continuous_load.py
# -----------------------------------------------------------------
# Непрерывная нагрузка Locust. Исправлено:
#   • VU больше не падают, если _user_pool ещё пуст или опустел;
#   • при нехватке логинов генерируем + регистрируем новую пачку.
#
# Переменные окружения:
#   CONT_VUS   — одновременных VU      (по умолчанию 20)
#   CONT_SPAWN — скорость спавна VU    (по умолчанию = CONT_VUS)
#   CONT_HOST  — адрес сервера         (по умолчанию http://localhost:5000)
#   API_PREFIX — префикс к URL         (можно оставить пустым)
# -----------------------------------------------------------------
import os, sys, random, string, threading, datetime as dt
from typing import Dict, List
from locust import HttpUser, task, between, events, main as locust_main

# ─────────── КОНФИГ ────────────────────────────────────────────
VU_TOTAL   = int(os.getenv("CONT_VUS",   20))
SPAWN_RATE = int(os.getenv("CONT_SPAWN", VU_TOTAL))
HOST_URL   = os.getenv("CONT_HOST", "http://localhost:5000")
API_PREFIX = os.getenv("API_PREFIX", "").rstrip("/")

PWD_TPL    = "cont_{username}"
BULK_SIZE  = 50                           # сколько доп. учёток генерировать,
# когда пул закончился

_pool_lock = threading.Lock()
_user_pool: List[Dict[str, str]] = []     # общая очередь логинов

# ─────────── ВСПОМОГАТЕЛЬНЫЕ ──────────────────────────────────
def api(p: str) -> str:
    return f"{API_PREFIX}{p}"

def _rnd(n=6) -> str:
    return "".join(random.choices(string.ascii_letters, k=n))

def _gen_user() -> Dict[str, str]:
    username = f"cont_{_rnd()}"
    return {
        "username": username,
        "email":    f"{username}@ex.test",
        "password": PWD_TPL.format(username=username)
    }

def _bulk_generate(client, n=BULK_SIZE):
    """Создаёт и регистрирует n новых аккаунтов, кладёт их в пул."""
    new_creds = [_gen_user() for _ in range(n)]
    for cred in new_creds:
        client.post(api("/register"), json=cred, name="prep /register")
    _user_pool.extend(new_creds)

# ─────────── ПЕРВОНАЧАЛЬНАЯ ПОДГОТОВКА ────────────────────────
@events.test_start.add_listener
def _prepare(env, **kw):
    # Заполняем стартовый пул в 2×-запас (VU_TOTAL*2)
    client = env.runner.client
    _bulk_generate(client, n=VU_TOTAL * 2)

# ─────────── ВИРТУАЛЬНЫЙ ПОЛЬЗОВАТЕЛЬ ─────────────────────────
class ContinuousUser(HttpUser):
    wait_time = between(1, 5)            # «думаем» 1-5 сек
    host      = HOST_URL

    # ---------- lifecycle ----------
    def on_start(self):
        self.cred = self._take_cred_safely()
        self.uid  = self._login()

    # ---------- helpers ----------
    def _take_cred_safely(self) -> Dict[str, str]:
        """
        Берёт логин из пула; если пул пуст — генерирует доп. пачку
        (под локом, чтобы не нагенерировать лишнего).
        """
        while True:
            with _pool_lock:
                if _user_pool:
                    return _user_pool.pop()

                # пул пуст — создаём новую партию
                _bulk_generate(self.client)      # <- внутри расширит _user_pool

    def _login(self) -> int:
        r = self.client.post(api("/login"),
                             json={"username": self.cred["username"],
                                   "password": self.cred["password"]},
                             name="POST /login")
        return r.json().get("user_id", -1)

    # ---------- tasks ----------
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

# ─────────── HEADLESS RUN ─────────────────────────────────────
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
