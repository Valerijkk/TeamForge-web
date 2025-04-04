# ------------------- БЭКЕНД (app.py) -------------------
import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'secret!'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///teamforge.db'  # Переименуем под проект
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# ------------------- МОДЕЛИ -------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    is_group = db.Column(db.Boolean, default=False)

class ChatUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    notifications_enabled = db.Column(db.Boolean, default=True)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    media_filename = db.Column(db.String(120), nullable=True)

class Reaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reaction = db.Column(db.String(20), nullable=False)

# ------------------- РЕГИСТРАЦИЯ -------------------
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'status': 'fail', 'message': 'Имя пользователя уже занято'}), 400
    user = User(username=data['username'], password_hash=generate_password_hash(data['password']))
    db.session.add(user)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Пользователь успешно зарегистрирован'})

# ------------------- ЛОГИН -------------------
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password_hash, data['password']):
        return jsonify({'status': 'success', 'user_id': user.id})
    return jsonify({'status': 'fail', 'message': 'Неверные логин или пароль'}), 401

# ------------------- СПИСОК ВСЕХ ПОЛЬЗОВАТЕЛЕЙ -------------------
@app.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    result = [{'id': u.id, 'username': u.username} for u in users]
    return jsonify(result)

# ------------------- СОЗДАНИЕ ГРУППОВОГО ЧАТА -------------------
@app.route('/create_chat', methods=['POST'])
def create_chat():
    data = request.json
    if not data.get('name') or not data.get('user_ids'):
        return jsonify({'status': 'fail', 'message': 'Нужно указать название чата и участников'}), 400
    chat = Chat(name=data['name'], is_group=True)
    db.session.add(chat)
    db.session.commit()
    if data.get('creator_id') not in data['user_ids']:
        data['user_ids'].append(data.get('creator_id'))
    for user_id in data['user_ids']:
        chat_user = ChatUser(chat_id=chat.id, user_id=user_id, notifications_enabled=True)
        db.session.add(chat_user)
    db.session.commit()
    return jsonify({'status': 'success', 'chat_id': chat.id})

# ------------------- СПИСОК ЧАТОВ ДЛЯ ПОЛЬЗОВАТЕЛЯ -------------------
@app.route('/user_chats/<int:user_id>', methods=['GET'])
def get_user_chats(user_id):
    chat_users = ChatUser.query.filter_by(user_id=user_id).all()
    chats = []
    for cu in chat_users:
        chat = Chat.query.get(cu.chat_id)
        if chat:
            chats.append({'id': chat.id, 'name': chat.name, 'is_group': chat.is_group})
    return jsonify(chats)

# ------------------- ИСТОРИЯ СООБЩЕНИЙ (С ПОИСКОМ) -------------------
@app.route('/messages/<int:chat_id>', methods=['GET'])
def get_messages(chat_id):
    keyword = request.args.get('q', '')
    query = Message.query.filter(Message.chat_id == chat_id)
    if keyword:
        query = query.filter(Message.content.contains(keyword))
    messages = query.order_by(Message.timestamp).all()
    result = []
    for msg in messages:
        result.append({
            'id': msg.id,
            'chat_id': msg.chat_id,
            'sender_id': msg.sender_id,
            'content': msg.content,
            'timestamp': msg.timestamp.isoformat(),
            'media_filename': msg.media_filename
        })
    return jsonify(result)

# ------------------- ЗАГРУЗКА МЕДИАФАЙЛОВ -------------------
@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'status': 'fail', 'message': 'Файл не найден'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'fail', 'message': 'Файл не выбран'}), 400
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)
    return jsonify({'status': 'success', 'filename': file.filename})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ------------------- ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ ДЛЯ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ -------------------
@app.route('/profile_data/<int:user_id>', methods=['GET'])
def get_profile_data(user_id):
    # Кол-во чатов
    chats_count = ChatUser.query.filter_by(user_id=user_id).count()
    # Кол-во сообщений
    messages_count = Message.query.filter_by(sender_id=user_id).count()
    # Документы (файлы), которые отправлял пользователь
    docs_messages = Message.query.filter_by(sender_id=user_id).filter(Message.media_filename.isnot(None)).all()
    docs = [msg.media_filename for msg in docs_messages]
    return jsonify({
        'chats_count': chats_count,
        'messages_count': messages_count,
        'docs': docs
    })

# ------------------- WEBSOCKET -------------------
@socketio.on('connect')
def handle_connect():
    emit('status', {'message': 'Подключено'})

@socketio.on('join')
def handle_join(data):
    chat_id = data['chat_id']
    username = data.get('username', 'Аноним')
    join_room(str(chat_id))
    emit('status', {'message': f"{username} вошёл в чат {chat_id}"}, room=str(chat_id))

@socketio.on('leave')
def handle_leave(data):
    chat_id = data['chat_id']
    username = data.get('username', 'Аноним')
    leave_room(str(chat_id))
    emit('status', {'message': f"{username} покинул(а) чат {chat_id}"}, room=str(chat_id))

@socketio.on('send_message')
def handle_send_message(data):
    msg = Message(
        chat_id=data['chat_id'],
        sender_id=data['sender_id'],
        content=data.get('content'),
        media_filename=data.get('media_filename')
    )
    db.session.add(msg)
    db.session.commit()
    emit('receive_message', {
        'id': msg.id,
        'chat_id': msg.chat_id,
        'sender_id': msg.sender_id,
        'content': msg.content,
        'timestamp': msg.timestamp.isoformat(),
        'media_filename': msg.media_filename
    }, room=str(data['chat_id']))

@socketio.on('send_reaction')
def handle_send_reaction(data):
    reaction = Reaction(
        message_id=data['message_id'],
        user_id=data['user_id'],
        reaction=data['reaction']
    )
    db.session.add(reaction)
    db.session.commit()
    emit('receive_reaction', {
        'message_id': data['message_id'],
        'user_id': data['user_id'],
        'reaction': data['reaction']
    }, room=str(data['chat_id']))

@socketio.on('update_notification')
def handle_update_notification(data):
    chat_user = ChatUser.query.filter_by(chat_id=data['chat_id'], user_id=data['user_id']).first()
    if chat_user:
        chat_user.notifications_enabled = data['notifications_enabled']
        db.session.commit()
        emit('notification_updated', {
            'chat_id': data['chat_id'],
            'user_id': data['user_id'],
            'notifications_enabled': data['notifications_enabled']
        }, room=str(data['chat_id']))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True)
