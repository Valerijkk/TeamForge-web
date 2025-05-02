import pytest
import requests
import random
import string
import os
import logging

BASE_URL = "http://localhost:5000"  # Адрес твоего запущенного приложения

# Логирование: создание директории и лог-файла
log_dir = os.path.join(os.getcwd(), 'logs')
os.makedirs(log_dir, exist_ok=True)  # Создаем директорию для логов, если её нет

log_file = os.path.join(log_dir, 'test_logs.txt')  # Путь к файлу логов

print(f"Логирование будет сохранено в файл: {log_file}")

# Конфигурация логирования
logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def generate_random_string(length=8):
    """Генерирует случайную строку заданной длины"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def create_user(username, email, password):
    """Отправка POST-запроса для создания пользователя"""
    url = f"{BASE_URL}/register"
    data = {
        "username": username,
        "email": email,
        "password": password
    }
    response = requests.post(url, json=data)
    return response

def log_test_result(message):
    """Записывает результат в лог-файл"""
    logging.info(message)
    print(message)  # Также выводим в консоль

@pytest.mark.parametrize("i", range(1, 1000))  # Создаём 100 тестов
def test_create_user(i):
    """Тест для создания 100 пользователей"""
    username = f"user{i}_{generate_random_string(5)}"
    email = f"{username}@example.com"
    password = "Password123!"

    response = create_user(username, email, password)

    # Проверяем успешную регистрацию (статус 200)
    if response.status_code == 200:
        log_test_result(f"Пользователь {username} успешно зарегистрирован!")
        assert response.status_code == 200
    else:
        log_test_result(f"Ошибка при регистрации {username}: {response.text}")
        assert response.status_code != 400  # Проверка на ошибку регистрации
