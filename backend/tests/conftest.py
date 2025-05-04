import tempfile
import pytest
from flask import Flask

from backend.extensions import db, mail, socketio, cors
from backend.routes.auth_routes import auth_bp
from backend.routes.user_routes import user_bp
from backend.routes.friendship_routes import friendship_bp
from backend.routes.chat_routes import chat_bp
from backend.routes.call_routes import call_bp
from backend.routes.task_routes import task_bp
from backend.routes.software_routes import software_bp


@pytest.fixture(scope="session")
def app():
    """Мини-приложение Flask с in-memory SQLite и зарегистрированными блюпринтами."""
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        SECRET_KEY="test",
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        UPLOAD_FOLDER=tempfile.mkdtemp(),
        MAIL_SUPPRESS_SEND=True
    )

    # инициализируем расширения
    db.init_app(app)
    mail.init_app(app)
    cors.init_app(app)
    socketio.init_app(app, async_mode="threading", logger=False, engineio_logger=False)

    # регистрируем блюпринты
    for bp in (
            auth_bp, user_bp, friendship_bp, chat_bp,
            call_bp, task_bp, software_bp
    ):
        app.register_blueprint(bp)

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


# ---------- фабрики ---------- #

@pytest.fixture
def make_user(client):
    """Регистрация + логин; возвращает user_id."""
    def _mk(username: str, email: str, pwd: str = "pass"):
        client.post("/register", json={
            "username": username,
            "email": email,
            "password": pwd
        })
        rv = client.post("/login", json={
            "username": username,
            "password": pwd
        })
        assert rv.status_code == 200
        return rv.get_json()["user_id"]
    return _mk


@pytest.fixture
def two_users(make_user):
    """Создаёт двух пользователей, возвращает (alice_id, bob_id)."""
    return make_user("alice", "alice@example.org"), make_user("bob", "bob@example.org")
