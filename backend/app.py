# backend/app.py
import os
import eventlet
eventlet.monkey_patch()

from flask import Flask

from .config import Config
from .extensions import db, socketio, mail, cors

# блюпринты
from .routes.auth_routes import auth_bp
from .routes.user_routes import user_bp
from .routes.friendship_routes import friendship_bp
from .routes.chat_routes import chat_bp
from .routes.call_routes import call_bp
from .routes.task_routes import task_bp
from .routes.software_routes import software_bp
from .routes import socketio_events  # noqa: F401  (регистрирует события)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # создаём папку для файлов, если её нет
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # подключаем расширения
    db.init_app(app)
    mail.init_app(app)
    cors.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode="eventlet")

    # регистрируем маршруты
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(friendship_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(call_bp)
    app.register_blueprint(task_bp)
    app.register_blueprint(software_bp)

    # при первом старте создаём пустую схему
    with app.app_context():
        db.create_all()

    @app.route("/healthz", methods=["GET"])
    def health_check():
        return "OK", 200

    return app


def main() -> None:
    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)


if __name__ == "__main__":
    main()