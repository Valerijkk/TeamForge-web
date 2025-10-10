import os
import time

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
from .routes import socketio_events  # noqa: F401


def strtobool_env(val: str) -> bool:
    return str(val).strip().lower() in {"1", "true", "yes", "y", "on"}

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # --- CI/ENV оверрайды (безопасны локально и в проде) ---
    # Почта: в CI можно глушить отправку
    if "MAIL_SUPPRESS_SEND" in os.environ:
        app.config["MAIL_SUPPRESS_SEND"] = strtobool_env(os.getenv("MAIL_SUPPRESS_SEND", "0"))

    # Порт можно задавать из окружения (для совместимости с контейнерами/PAAS)
    if "PORT" in os.environ:
        try:
            app.config["PORT"] = int(os.getenv("PORT"))
        except Exception:
            pass

    # Папка для upload — подстрахуемся дефолтом
    app.config.setdefault("UPLOAD_FOLDER", "uploads")
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

    # при первом старте создаём пустую схему (с коротким retry для CI)
    with app.app_context():
        attempts = int(os.getenv("DB_INIT_RETRIES", "10"))
        for i in range(attempts):
            try:
                db.create_all()
                break
            except Exception as e:
                if i == attempts - 1:
                    raise
                time.sleep(1)

    @app.route("/healthz", methods=["GET"])
    def health_check():
        return "OK", 200

    return app


def main() -> None:
    app = create_app()
    # В CI выключаем reloader, чтобы не было двойного процесса
    debug = strtobool_env(os.getenv("FLASK_DEBUG", "0"))
    use_reloader = strtobool_env(os.getenv("FLASK_USE_RELOADER", "0")) and not strtobool_env(os.getenv("CI", "0"))
    port = int(os.getenv("PORT", str(app.config.get("PORT", 5000))))
    socketio.run(app, host="0.0.0.0", port=port, debug=debug, use_reloader=use_reloader)


if __name__ == "__main__":
    main()
