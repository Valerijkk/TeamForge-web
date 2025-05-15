from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_mail import Mail
from flask_cors import CORS

# Инициализация, но без привязки к Flask-приложению
db       = SQLAlchemy()
socketio = SocketIO()
mail     = Mail()
cors     = CORS()
