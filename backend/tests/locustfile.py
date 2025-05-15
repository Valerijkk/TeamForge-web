import os
import csv
import uuid
import random
import time
import sys
import requests
from locust import HttpUser, between, task, events
import locust.main as locust_main

# ───── Параметры ───────────────────────────────────────────────────────────────
HOST                = "http://localhost:5000"
TOTAL_PRE_REGISTER  = 1_0000
CREDENTIALS_FILE    = "credentials.csv"
CONCURRENT_USERS    = 10_000
SPAWN_RATE          = 1000
RUN_TIME            = "30m"

# ───── Глобальный список учёток ─────────────────────────────────────────────────
credentials = []

@events.init.add_listener
def on_locust_init(environment, **kwargs):
    # Сначала считаем, сколько уже зарегано
    existing = []
    if os.path.exists(CREDENTIALS_FILE):
        with open(CREDENTIALS_FILE, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) == 2:
                    existing.append(tuple(row))
    needed = TOTAL_PRE_REGISTER - len(existing)
    if needed > 0:
        print(f"[PRE-REGISTER] Нужно дописать {needed} учёток…")
        with open(CREDENTIALS_FILE, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            for _ in range(needed):
                uname = f"user_{uuid.uuid4().hex[:8]}"
                pw    = uuid.uuid4().hex
                email = f"{uuid.uuid4().hex[:8]}@example.com"
                r = requests.post(f"{HOST}/register", json={
                    "username": uname,
                    "email":    email,
                    "password": pw
                })
                if r.status_code == 200:
                    writer.writerow([uname, pw])
                # небольшая пауза, чтобы не обрушить сразу
                time.sleep(0.001)
        print("[PRE-REGISTER] Готово.")
    # Теперь загружаем все учётки в память
    with open(CREDENTIALS_FILE, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            credentials.append({"username": row[0], "password": row[1]})
    print(f"[LOAD] Загружено учёток: {len(credentials)}")

class LoadTestUser(HttpUser):
    host       = HOST
    wait_time  = between(0.5, 1.5)

    def on_start(self):
        # Логинимся случайной учёткой
        cred = random.choice(credentials)
        r = self.client.post("/login", json={
            "username": cred["username"],
            "password": cred["password"]
        })
        if r.status_code == 200:
            self.user_id = r.json().get("user_id")
        else:
            # если упало — пробуем ещё раз
            return self.on_start()

    @task(3)
    def add_and_confirm_friend(self):
        friend_cred = random.choice(credentials)
        # получаем friend_id
        r1 = self.client.post("/login", json={
            "username": friend_cred["username"],
            "password": friend_cred["password"]
        })
        if r1.status_code != 200:
            return
        friend_id = r1.json().get("user_id")
        if friend_id == self.user_id:
            return
        r2 = self.client.post("/friend_request", json={
            "requester_id": self.user_id,
            "receiver_id":  friend_id
        })
        if r2.status_code == 200:
            req_id = r2.json()["friend_request_id"]
            self.client.post("/friend_request/confirm", json={
                "friend_request_id": req_id
            })
        time.sleep(0.01)

    @task(5)
    def send_messages(self):
        # 10 сообщений с паузой 0.1 → 10 msg/sec
        for _ in range(10):
            self.client.post("/messages/1", json={
                "chat_id":   1,
                "sender_id": self.user_id,
                "content":   "load test msg"
            })
            time.sleep(0.1)

    @task(2)
    def make_call(self):
        callee_cred = random.choice(credentials)
        r = self.client.post("/login", json={
            "username": callee_cred["username"],
            "password": callee_cred["password"]
        })
        if r.status_code != 200:
            return
        callee_id = r.json().get("user_id")
        now = time.time()
        payload = {
            "caller_id":    self.user_id,
            "call_type":    "audio",
            "participants": f",{callee_id},",
            "start_time":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
            "end_time":     time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now + 30))
        }
        self.client.post("/call_history", json=payload)
        time.sleep(0.01)

    @task(4)
    def create_tasks(self):
        due = time.strftime("%Y-%m-%d", time.gmtime(time.time() + 86400))
        for i in range(10):
            self.client.post("/tasks", json={
                "user_id":  self.user_id,
                "title":    f"Task {i} by {self.user_id}",
                "due_date": due
            })
        time.sleep(0.01)

    @task(1)
    def page_switching(self):
        endpoints = [
            "/software",
            "/users",
            f"/profile_data/{self.user_id}",
            "/friends/1",
            "/healthz"
        ]
        self.client.get(random.choice(endpoints))
        time.sleep(20)

# ───── Запуск ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sys.argv = [
        "locust",
        "-f", __file__,
        "--headless",
        "-u", str(CONCURRENT_USERS),
        "-r", str(SPAWN_RATE),
        "-t", RUN_TIME,
        "--html", "massive_report.html",
        "--logfile", "massive_locust.log",
    ]
    locust_main.main()
