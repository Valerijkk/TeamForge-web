from flask import Blueprint, request, jsonify
# Импортируем модели
from ..models import User, ChatUser, Message
# Импортируем базу
from ..extensions import db

# Создаём blueprint
user_bp = Blueprint('user_bp', __name__)

# Роут получения всех пользователей
@user_bp.route('/users', methods=['GET'])
def get_users():
    # Получаем список всех пользователей
    users = User.query.all()
    # Формируем результат
    result = [{'id': u.id, 'username': u.username, 'email': u.email} for u in users]
    return jsonify(result)  # возвращаем JSON

# Роут данных профиля
@user_bp.route('/profile_data/<int:user_id>', methods=['GET'])
def get_profile_data(user_id):
    # Считаем количество чатов у пользователя
    chats_count = ChatUser.query.filter_by(user_id=user_id).count()
    # Считаем количество сообщений
    messages_count = Message.query.filter_by(sender_id=user_id).count()
    # Ищем сообщения с медиа
    docs_messages = Message.query.filter_by(sender_id=user_id).filter(Message.media_filename.isnot(None)).all()
    # Достаём имена файлов
    docs = [msg.media_filename for msg in docs_messages]
    # Возвращаем результат
    return jsonify({
        'chats_count': chats_count,
        'messages_count': messages_count,
        'docs': docs
    })
