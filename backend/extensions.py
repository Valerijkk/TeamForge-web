from flask_sqlalchemy import SQLAlchemy  # Для работы с БД
from flask_socketio import SocketIO      # Для WebSocket (SocketIO)
from flask_mail import Mail             # Для отправки почты
from flask_cors import CORS             # Для CORS

# Создаём объекты расширений
db = SQLAlchemy()       # Инициализация SQLAlchemy (но без привязки к app)
socketio = SocketIO()   # Инициализация SocketIO (пока без app)
mail = Mail()           # Инициализация почтового клиента
cors = CORS()           # Инициализация CORS
