# -*- coding: utf-8 -*-

# Импортируем os и создаём Flask-приложение
import os
import eventlet
eventlet.monkey_patch()  # monkey_patch для совместимости socketio + eventlet

from flask import Flask
# Импортируем свой класс Config
from .config import Config
# Импортируем созданные расширения
from .extensions import db, socketio, mail, cors
# Импортируем наши блюпринты
from .routes.auth_routes import auth_bp
from .routes.user_routes import user_bp
from .routes.friendship_routes import friendship_bp
from .routes.chat_routes import chat_bp
from .routes.call_routes import call_bp
from .routes.task_routes import task_bp
from .routes.software_routes import software_bp
# События SocketIO импортируются, чтобы они зарегистрировались
from .routes import socketio_events  # noqa

def create_app():
    # Создаём приложение
    app = Flask(__name__)
    # Загружаем конфигурацию
    app.config.from_object(Config)
    # Инициируем папку upload (если нужно)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Инициализируем расширения
    db.init_app(app)
    mail.init_app(app)
    cors.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode="eventlet")

    # Регистрируем блюпринты
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(friendship_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(call_bp)
    app.register_blueprint(task_bp)
    app.register_blueprint(software_bp)

    # Создаём таблицы, если их нет
    with app.app_context():
        db.create_all()

    return app

# Точка входа
def main():
    # Получаем app
    app = create_app()
    # Запускаем с socketio
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)

# Запускаем, если скрипт напрямую
if __name__ == '__main__':
    main()
