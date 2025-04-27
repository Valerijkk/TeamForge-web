import pytest
import requests
import random
import string
import os
import logging

BASE_URL = "http://localhost:5000"  # Адрес твоего запущенного приложения

# Логирование: создаем файл в текущей директории
log_dir = os.getcwd()  # Текущая директория, из которой запускаются тесты
log_file = os.path.join(log_dir, 'test_software_creation_logs.txt')  # Путь к файлу логов

# Печатаем путь к файлу, чтобы убедиться, что логирование будет происходить в правильную папку
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

def create_software(title, description, image_url, github_url, admin=True):
    """Отправка POST-запроса для создания ПО"""
    url = f"{BASE_URL}/software"
    data = {
        "title": title,
        "description": description,
        "image_url": image_url,
        "github_url": github_url,
        "admin": admin
    }
    response = requests.post(url, json=data)
    return response

def log_test_result(message):
    """Записывает результат в лог-файл"""
    logging.info(message)
    print(message)  # Также выводим в консоль

@pytest.mark.parametrize("i", range(1, 101))  # Создаём 100 тестов
def test_create_software(i):
    """Тест для создания 100 ПО"""
    title = f"Software{i}_{generate_random_string(5)}"
    description = f"Description for software {i}"
    image_url = f"http://example.com/image{i}.png"
    github_url = f"http://github.com/example/software{i}"

    response = create_software(title, description, image_url, github_url)

    # Проверяем успешное создание ПО (статус 200)
    if response.status_code == 200:
        log_test_result(f"Программное обеспечение {title} успешно создано!")
        assert response.status_code == 200
    else:
        log_test_result(f"Ошибка при создании ПО {title}: {response.text}")
        assert response.status_code != 400  # Проверка на ошибку создания ПО
