import os

# Создаём класс конфигурации
class Config:
    # Секретный ключ для Flask
    SECRET_KEY = 'secret!'

    SQLALCHEMY_DATABASE_URI = 'sqlite:///teamforge.db'  # Указываем путь для базы SQLite
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Отключаем лишние уведомления SQLAlchemy

    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')  # Папка 'uploads' для файлов

    # Настройки Flask-Mail
    MAIL_SERVER = 'smtp.mail.ru'  # SMTP-сервер
    MAIL_PORT = 465  # Порт для SSL
    MAIL_USE_SSL = True  # Используем SSL
    MAIL_USE_TLS = False  # TLS отключён, так как включен SSL
    MAIL_USERNAME = 'valerich.tv.88@mail.ru'  # Логин почты
    MAIL_PASSWORD = 'nM2bxy56cby8TwA4cx3E'  # Пароль почты
    MAIL_DEFAULT_SENDER = 'valerich.tv.88@mail.ru'  # Отправитель по умолчанию
