from itsdangerous import URLSafeTimedSerializer
from flask import current_app

# Функция для генерации токена подтверждения/сброса пароля
def generate_confirmation_token(email):
    # Создаём сериализатор с секретным ключом приложения
    ts = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])  # создаём serializer
    # Возвращаем зашифрованный токен
    return ts.dumps(email, salt='password-reset-salt')  # dumps() кодирует с солью

# Функция для подтверждения (дешифровки) токена
def confirm_token(token, expiration=3600):
    # Пытаемся прочесть токен
    try:
        # Снова создаём сериализатор
        ts = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])  # serializer
        # Декодируем email
        email = ts.loads(token, salt="password-reset-salt", max_age=expiration)  # loads() декодирует
    except Exception:
        # Если не удалось, возвращаем None
        return None
    # Возвращаем email
    return email
