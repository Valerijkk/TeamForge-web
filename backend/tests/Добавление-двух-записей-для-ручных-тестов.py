"""
Точечная проверка — создаём две фиксированные учётки:
  1. username='admin',      email='admin@mail.ru', password='admin@mail.ru'
  2. username='1@mail.ru',  email='1@mail.ru',     password='1@mail.ru'
Если сервер возвращает не 200 OK — падаем.
"""

import os
import logging
import requests
import pytest

# ===== базовые настройки =====
BASE_URL = "http://127.0.0.1:5000"   # подменяй, если у тебя другой порт/хост

# Каталог и файл логов
log_dir  = os.path.join(os.getcwd(), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'test_logs.txt')

logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)


# ===== утилиты =====
def create_user(username: str, email: str, password: str) -> requests.Response:
    """POST /register — создаёт пользователя и возвращает Response"""
    return requests.post(
        f"{BASE_URL}/register",
        json={"username": username, "email": email, "password": password},
        timeout=10,
    )


def log(message: str) -> None:
    logging.info(message)
    print(message)


# ===== сами тесты =====
@pytest.mark.parametrize(
    "username,email,password",
    [
        ("admin",     "admin@mail.ru", "admin@mail.ru"),
        ("1@mail.ru", "1@mail.ru",     "1@mail.ru"),
    ],
    ids=["admin-account", "one-account"],
)
def test_create_fixed_users(username: str, email: str, password: str) -> None:
    """Создаём две предопределённые учётки и ждём 200 OK."""
    resp = create_user(username, email, password)

    if resp.status_code == 200:
        log(f"✔ Пользователь {username!r} успешно зарегистрирован.")
    else:
        log(f"✖ Ошибка при регистрации {username!r}: "
            f"status={resp.status_code}, body='{resp.text}'")

    assert resp.status_code == 200, "Сервер вернул не 200 OK"
