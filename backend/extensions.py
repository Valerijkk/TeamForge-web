from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_mail import Mail
from flask_cors import CORS

# Инициализация
db       = SQLAlchemy()
socketio = SocketIO()
mail     = Mail()
cors     = CORS()
