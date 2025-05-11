import os
from urllib.parse import quote_plus

# Папка для аплоадов
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")


class Config:
    """Базовая конфигурация приложения."""

    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "secret!")

    # ───────  База данных  ────────────────────────────────────────────────────
    # Можно задать готовый DSN через DATABASE_URL, либо 5 переменными ниже.
    DB_USER     = os.getenv("POSTGRES_USER", "postgres")
    DB_PASSWORD = quote_plus(os.getenv("POSTGRES_PASSWORD", "postgres"))
    DB_HOST     = os.getenv("POSTGRES_HOST", "localhost")
    DB_PORT     = os.getenv("POSTGRES_PORT", "5432")
    DB_NAME     = os.getenv("POSTGRES_DB",  "teamforge")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # uploads (используется в app.py)
    UPLOAD_FOLDER = UPLOAD_FOLDER

    # ───────  Почта  ──────────────────────────────────────────────────────────
    MAIL_SERVER = "smtp.mail.ru"
    MAIL_PORT = 465
    MAIL_USE_SSL = True
    MAIL_USE_TLS = False
    MAIL_USERNAME = 'valerich.tv.88@mail.ru'  # Логин почты
    MAIL_PASSWORD = 'nM2bxy56cby8TwA4cx3E'  # Пароль почты
    MAIL_DEFAULT_SENDER = 'valerich.tv.88@mail.ru'  # Отправитель по умолчанию
