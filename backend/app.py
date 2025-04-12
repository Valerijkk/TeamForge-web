# ------------------- BACKEND (app.py) -------------------
import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

import os
from datetime import datetime, date
from flask_mail import Mail, Message as MailMessage
from itsdangerous import URLSafeTimedSerializer

app = Flask(__name__)
CORS(app)

# ------------------- CONFIG -------------------
app.config['SECRET_KEY'] = 'secret!'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///teamforge.db'
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Настройки Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.mail.ru'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USERNAME'] = 'valerich.tv.88@mail.ru'
app.config['MAIL_PASSWORD'] = 'nM2bxy56cby8TwA4cx3E'
app.config['MAIL_DEFAULT_SENDER'] = 'valerich.tv.88@mail.ru'

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")
mail = Mail(app)

ts = URLSafeTimedSerializer(app.config["SECRET_KEY"])

# ------------------- MODELS -------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)  # Новый уникальный email
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
    deleted_for_all = db.Column(db.Boolean, default=False)
    reply_to_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=True)
    forwarded_from_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

class Reaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reaction = db.Column(db.String(20), nullable=False)

class DeletedMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Friendship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'accepted'

class CallHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    caller_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    call_type = db.Column(db.String(20), nullable=False)
    participants = db.Column(db.String(200))  # строка вида ",2,3,"
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer, nullable=False)

# Добавили user_id, чтобы у каждого пользователя были свои задачи
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Владелец задачи
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Software(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    github_url = db.Column(db.String(255), nullable=True)

# ------------------- HELPERS -------------------
def generate_confirmation_token(email):
    return ts.dumps(email, salt='password-reset-salt')

def confirm_token(token, expiration=3600):
    try:
        email = ts.loads(token, salt="password-reset-salt", max_age=expiration)
    except Exception:
        return None
    return email

# ------------------- AUTH ROUTES -------------------
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'status': 'fail', 'message': 'Необходимо указать username, email и password'}), 400

    # Проверка username
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'status': 'fail', 'message': 'Имя пользователя уже занято'}), 400
    # Проверка email
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'status': 'fail', 'message': 'Эта почта уже используется'}), 400

    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password'])
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Пользователь успешно зарегистрирован'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password_hash, data['password']):
        return jsonify({'status': 'success', 'user_id': user.id})
    return jsonify({'status': 'fail', 'message': 'Неверные логин или пароль'}), 401

# ------------------- RESET PASSWORD ROUTES -------------------
@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'message': 'Email обязателен'}), 400

    user = User.query.filter_by(email=email).first()  # Ищем по email
    if user:
        token = generate_confirmation_token(email)
        reset_url = f'http://localhost:3000/reset-password-confirm/{token}'
        msg = MailMessage(
            subject='Сброс пароля',
            sender=app.config['MAIL_DEFAULT_SENDER'],
            recipients=[email]
        )
        msg.body = f'Для сброса пароля перейдите по ссылке: {reset_url}'
        try:
            mail.send(msg)
        except Exception as e:
            print(f"Ошибка отправки письма: {e}")
            return jsonify({'message': 'Ошибка отправки письма'}), 500

    # Ответ "всегда ок", чтобы не светить, есть такой email или нет
    return jsonify({'message': 'Инструкции по сбросу пароля отправлены на вашу почту'}), 200

@app.route('/reset-password-confirm/<token>', methods=['POST'])
def reset_password_confirm(token):
    data = request.get_json()
    password = data.get('password')
    password_confirm = data.get('password_confirm')
    if not password or not password_confirm:
        return jsonify({'message': 'Пароль и подтверждение обязательны'}), 400
    if password != password_confirm:
        return jsonify({'message': 'Пароли не совпадают'}), 400

    email = confirm_token(token)
    if not email:
        return jsonify({'message': 'Ссылка для сброса пароля недействительна или истекла'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'Пользователь не найден'}), 404

    user.password_hash = generate_password_hash(password)
    db.session.commit()
    return jsonify({'message': 'Пароль успешно сброшен'}), 200

# ------------------- USER ROUTES -------------------
@app.route('/users', methods=['GET'])
def get_users():
    # При желании оставляем доступный список всех пользователей (используется для поиска)
    users = User.query.all()
    result = [{'id': u.id, 'username': u.username, 'email': u.email} for u in users]
    return jsonify(result)

@app.route('/profile_data/<int:user_id>', methods=['GET'])
def get_profile_data(user_id):
    chats_count = ChatUser.query.filter_by(user_id=user_id).count()
    messages_count = Message.query.filter_by(sender_id=user_id).count()
    docs_messages = Message.query.filter_by(sender_id=user_id).filter(Message.media_filename.isnot(None)).all()
    docs = [msg.media_filename for msg in docs_messages]
    return jsonify({
        'chats_count': chats_count,
        'messages_count': messages_count,
        'docs': docs
    })

# ------------------- FRIENDSHIP ROUTES -------------------
@app.route('/friend_request', methods=['POST'])
def send_friend_request():
    data = request.json
    requester_id = data.get('requester_id')
    receiver_id = data.get('receiver_id')
    if not requester_id or not receiver_id:
        return jsonify({'status': 'fail', 'message': 'Не указан один из ID'}), 400
    if requester_id == receiver_id:
        return jsonify({'status': 'fail', 'message': 'Нельзя добавить себя в друзья'}), 400

    existing = Friendship.query.filter(
        ((Friendship.requester_id == requester_id) & (Friendship.receiver_id == receiver_id)) |
        ((Friendship.requester_id == receiver_id) & (Friendship.receiver_id == requester_id))
    ).first()
    if existing:
        return jsonify({'status': 'fail', 'message': 'Запрос уже отправлен или вы уже друзья'}), 400

    fr = Friendship(requester_id=requester_id, receiver_id=receiver_id, status='pending')
    db.session.add(fr)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Запрос в друзья отправлен', 'friend_request_id': fr.id})

@app.route('/friend_requests/<int:user_id>', methods=['GET'])
def get_friend_requests(user_id):
    requests = Friendship.query.filter_by(receiver_id=user_id, status='pending').all()
    result = [{'id': fr.id, 'requester_id': fr.requester_id, 'receiver_id': fr.receiver_id, 'status': fr.status}
              for fr in requests]
    return jsonify(result)

@app.route('/friend_request/confirm', methods=['POST'])
def confirm_friend_request():
    data = request.json
    friend_request_id = data.get('friend_request_id')
    if not friend_request_id:
        return jsonify({'status': 'fail', 'message': 'Не указан ID запроса'}), 400
    fr = Friendship.query.get(friend_request_id)
    if not fr or fr.status != 'pending':
        return jsonify({'status': 'fail', 'message': 'Запрос не найден или уже обработан'}), 404
    fr.status = 'accepted'
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Запрос подтвержден'})

@app.route('/friend_request/reject', methods=['POST'])
def reject_friend_request():
    data = request.json
    friend_request_id = data.get('friend_request_id')
    if not friend_request_id:
        return jsonify({'status': 'fail', 'message': 'Не указан ID запроса'}), 400
    fr = Friendship.query.get(friend_request_id)
    if not fr or fr.status != 'pending':
        return jsonify({'status': 'fail', 'message': 'Запрос не найден или уже обработан'}), 404
    db.session.delete(fr)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Запрос отклонен'})

@app.route('/friends/<int:user_id>', methods=['GET'])
def get_friends(user_id):
    friendships = Friendship.query.filter(
        ((Friendship.requester_id == user_id) | (Friendship.receiver_id == user_id)) &
        (Friendship.status == 'accepted')
    ).all()
    friends = []
    for fr in friendships:
        friend_id = fr.receiver_id if fr.requester_id == user_id else fr.requester_id
        friend = User.query.get(friend_id)
        if friend:
            friends.append({'id': friend.id, 'username': friend.username, 'email': friend.email})
    return jsonify(friends)

@app.route('/friendship', methods=['DELETE'])
def remove_friendship():
    user_id = request.args.get('user_id', type=int)
    friend_id = request.args.get('friend_id', type=int)
    if not user_id or not friend_id:
        return jsonify({'status': 'fail', 'message': 'Не указан один из ID'}), 400
    fr = Friendship.query.filter(
        ((Friendship.requester_id == user_id) & (Friendship.receiver_id == friend_id)) |
        ((Friendship.requester_id == friend_id) & (Friendship.receiver_id == user_id))
    ).filter(Friendship.status == 'accepted').first()
    if not fr:
        return jsonify({'status': 'fail', 'message': 'Дружба не найдена'}), 404
    db.session.delete(fr)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Дружба удалена'})

@app.route('/search_users', methods=['GET'])
def search_users():
    query = request.args.get('q', '')
    if query:
        users = User.query.filter(User.username.contains(query)).all()
    else:
        users = []
    result = [{'id': u.id, 'username': u.username, 'email': u.email} for u in users]
    return jsonify(result)

# ------------------- CHAT ROUTES -------------------
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

@app.route('/user_chats/<int:user_id>', methods=['GET'])
def get_user_chats(user_id):
    chat_users = ChatUser.query.filter_by(user_id=user_id).all()
    chats = []
    for cu in chat_users:
        chat = Chat.query.get(cu.chat_id)
        if chat:
            chats.append({'id': chat.id, 'name': chat.name, 'is_group': chat.is_group})
    return jsonify(chats)

@app.route('/messages/<int:chat_id>', methods=['GET'])
def get_messages(chat_id):
    user_id = request.args.get('user_id', type=int)
    keyword = request.args.get('q', '')
    query = Message.query.filter(Message.chat_id == chat_id, Message.deleted_for_all == False)
    if keyword:
        query = query.filter(Message.content.contains(keyword))
    if user_id:
        deleted_ids = DeletedMessage.query.filter_by(user_id=user_id).all()
        deleted_ids_list = [dm.message_id for dm in deleted_ids]
        if deleted_ids_list:
            query = query.filter(~Message.id.in_(deleted_ids_list))
    messages = query.order_by(Message.timestamp).all()
    result = []
    for msg in messages:
        result.append({
            'id': msg.id,
            'chat_id': msg.chat_id,
            'sender_id': msg.sender_id,
            'content': msg.content,
            'timestamp': msg.timestamp.isoformat(),
            'media_filename': msg.media_filename,
            'reply_to_id': msg.reply_to_id,
            'forwarded_from_id': msg.forwarded_from_id
        })
    return jsonify(result)

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

@app.route('/messages/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    mode = request.args.get('mode')
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({'status': 'fail', 'message': 'Не указан user_id'}), 400
    message = Message.query.get(message_id)
    if not message:
        return jsonify({'status': 'fail', 'message': 'Сообщение не найдено'}), 404

    if mode == 'everyone':
        message.deleted_for_all = True
        db.session.commit()
        socketio.emit('message_deleted_for_all', {'message_id': message_id}, room=str(message.chat_id))
        return jsonify({'status': 'success', 'message': 'Сообщение удалено для всех'})
    else:
        deleted_entry = DeletedMessage.query.filter_by(message_id=message_id, user_id=user_id).first()
        if not deleted_entry:
            deleted_entry = DeletedMessage(message_id=message_id, user_id=user_id)
            db.session.add(deleted_entry)
            db.session.commit()
        socketio.emit('message_deleted_for_user', {'message_id': message_id, 'user_id': user_id}, room=str(message.chat_id))
        return jsonify({'status': 'success', 'message': 'Сообщение удалено только для вас'})

@app.route('/forward_message', methods=['POST'])
def forward_message():
    data = request.json
    from_message_id = data.get('message_id')
    to_chat_id = data.get('to_chat_id')
    user_id = data.get('user_id')
    if not (from_message_id and to_chat_id and user_id):
        return jsonify({'status': 'fail', 'message': 'Не хватает параметров'}), 400
    old_msg = Message.query.get(from_message_id)
    if not old_msg:
        return jsonify({'status': 'fail', 'message': 'Исходное сообщение не найдено'}), 404
    new_msg = Message(
        chat_id=to_chat_id,
        sender_id=user_id,
        content=old_msg.content,
        media_filename=old_msg.media_filename,
        forwarded_from_id=old_msg.sender_id
    )
    db.session.add(new_msg)
    db.session.commit()
    socketio.emit('receive_message', {
        'id': new_msg.id,
        'chat_id': new_msg.chat_id,
        'sender_id': new_msg.sender_id,
        'content': new_msg.content,
        'timestamp': new_msg.timestamp.isoformat(),
        'media_filename': new_msg.media_filename,
        'reply_to_id': new_msg.reply_to_id,
        'forwarded_from_id': new_msg.forwarded_from_id
    }, room=str(to_chat_id))
    return jsonify({'status': 'success', 'message': 'Сообщение переслано', 'new_message_id': new_msg.id})

# ------------------- CALL HISTORY ROUTES -------------------
@app.route('/call_history', methods=['POST'])
def add_call_history():
    data = request.json
    try:
        caller_id = data['caller_id']
        call_type = data['call_type']
        participants = data.get('participants', '')
        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])
        duration = int((end_time - start_time).total_seconds())
    except Exception as e:
        return jsonify({'status': 'fail', 'message': f'Ошибка обработки данных: {str(e)}'}), 400

    record = CallHistory(
        caller_id=caller_id,
        call_type=call_type,
        participants=participants,
        start_time=start_time,
        end_time=end_time,
        duration=duration
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Запись звонка добавлена'})

@app.route('/call_history/<int:user_id>', methods=['GET'])
def get_call_history(user_id):
    pattern = f'%,{user_id},%'
    records = CallHistory.query.filter(
        (CallHistory.caller_id == user_id) | (CallHistory.participants.like(pattern))
    ).order_by(CallHistory.start_time.desc()).all()
    result = []
    for rec in records:
        caller = User.query.get(rec.caller_id)
        caller_username = caller.username if caller else "Неизвестно"
        recipient_usernames = []
        if rec.participants:
            participant_ids = rec.participants.strip(',').split(',')
            for pid in participant_ids:
                try:
                    u = User.query.get(int(pid))
                    if u:
                        recipient_usernames.append(u.username)
                except:
                    continue
        result.append({
            'id': rec.id,
            'caller_id': rec.caller_id,
            'caller_username': caller_username,
            'call_type': rec.call_type,
            'recipients': recipient_usernames,
            'start_time': rec.start_time.strftime("%Y-%m-%d %H:%M"),
            'end_time': rec.end_time.strftime("%Y-%m-%d %H:%M"),
            'duration': rec.duration
        })
    return jsonify(result)

# ------------------- TASK (Календарь/Задачи) ROUTES -------------------
@app.route('/tasks', methods=['GET'])
def get_tasks():
    """
    Для выборки нужно передавать в запросе &user_id=... (обязательный)
    и &date=YYYY-MM-DD (необязательный)
    """
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({'status': 'fail', 'message': 'Не указан user_id'}), 400

    date_filter = request.args.get('date')  # формат YYYY-MM-DD
    if date_filter:
        try:
            due_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        except:
            return jsonify({'status': 'fail', 'message': 'Неверный формат даты'}), 400
        tasks = Task.query.filter_by(user_id=user_id, due_date=due_date).all()
    else:
        tasks = Task.query.filter_by(user_id=user_id).all()

    result = []
    for task in tasks:
        result.append({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.strftime("%Y-%m-%d"),
            'created_at': task.created_at.isoformat()
        })
    return jsonify(result)

@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.json
    title = data.get('title')
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'status': 'fail', 'message': 'Не указан user_id'}), 400
    if not title:
        return jsonify({'status': 'fail', 'message': 'Название обязательно'}), 400

    due_date_str = data.get('due_date')
    if not due_date_str:
        return jsonify({'status': 'fail', 'message': 'Дата обязательна'}), 400

    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
    except:
        return jsonify({'status': 'fail', 'message': 'Неверный формат даты'}), 400

    task = Task(
        user_id=user_id,
        title=title,
        description=data.get('description', ''),
        due_date=due_date
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Задача создана', 'task_id': task.id})

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'status': 'fail', 'message': 'Задача не найдена'}), 404

    # Дополнительно можно проверить, что user_id == автор, если требуется строгое разграничение
    data = request.json
    task.title = data.get('title', task.title)
    task.description = data.get('description', task.description)
    due_date_str = data.get('due_date')
    if due_date_str:
        try:
            task.due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
        except:
            return jsonify({'status': 'fail', 'message': 'Неверный формат даты'}), 400
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Задача обновлена'})

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'status': 'fail', 'message': 'Задача не найдена'}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Задача удалена'})

# ------------------- SOFTWARE (Программное обеспечение) ROUTES -------------------
@app.route('/software', methods=['GET'])
def get_software():
    softwares = Software.query.all()
    result = []
    for sw in softwares:
        result.append({
            'id': sw.id,
            'title': sw.title,
            'description': sw.description,
            'image_url': sw.image_url,
            'github_url': sw.github_url
        })
    return jsonify(result)

@app.route('/software', methods=['POST'])
def create_software():
    data = request.json
    if not data.get('admin', False):
        return jsonify({'status': 'fail', 'message': 'Нет прав доступа'}), 403
    title = data.get('title')
    if not title:
        return jsonify({'status': 'fail', 'message': 'Название обязательно'}), 400
    sw = Software(
        title=title,
        description=data.get('description', ''),
        image_url=data.get('image_url', ''),
        github_url=data.get('github_url', '')
    )
    db.session.add(sw)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Программное обеспечение создано', 'software_id': sw.id})

@app.route('/software/<int:software_id>', methods=['PUT'])
def update_software(software_id):
    data = request.json
    if not data.get('admin', False):
        return jsonify({'status': 'fail', 'message': 'Нет прав доступа'}), 403
    sw = Software.query.get(software_id)
    if not sw:
        return jsonify({'status': 'fail', 'message': 'Запись не найдена'}), 404
    sw.title = data.get('title', sw.title)
    sw.description = data.get('description', sw.description)
    sw.image_url = data.get('image_url', sw.image_url)
    sw.github_url = data.get('github_url', sw.github_url)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Запись обновлена'})

@app.route('/software/<int:software_id>', methods=['DELETE'])
def delete_software(software_id):
    data = request.json
    if not data.get('admin', False):
        return jsonify({'status': 'fail', 'message': 'Нет прав доступа'}), 403
    sw = Software.query.get(software_id)
    if not sw:
        return jsonify({'status': 'fail', 'message': 'Запись не найдена'}), 404
    db.session.delete(sw)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Запись удалена'})

# ------------------- WEBSOCKET EVENTS -------------------
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
    chat_id = data['chat_id']
    sender_id = data['sender_id']
    content = data.get('content', '')
    media_filename = data.get('media_filename')
    reply_to_id = data.get('reply_to_id')
    msg = Message(
        chat_id=chat_id,
        sender_id=sender_id,
        content=content,
        media_filename=media_filename,
        reply_to_id=reply_to_id
    )
    db.session.add(msg)
    db.session.commit()
    emit('receive_message', {
        'id': msg.id,
        'chat_id': msg.chat_id,
        'sender_id': msg.sender_id,
        'content': msg.content,
        'timestamp': msg.timestamp.isoformat(),
        'media_filename': msg.media_filename,
        'reply_to_id': msg.reply_to_id,
        'forwarded_from_id': msg.forwarded_from_id
    }, room=str(chat_id))

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

# ------------- WEBRTC / CALL SIGNALING -------------
@socketio.on('register_user')
def handle_register_user(data):
    user_id = data.get('user_id')
    if user_id:
        join_room(str(user_id))

@socketio.on('initiate_call')
def handle_initiate_call(data):
    targets = data.get('targets', [])
    for target in targets:
        socketio.emit('incoming_call', data, room=str(target))

@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    target = data.get('to')
    if target:
        socketio.emit('webrtc_offer', data, room=str(target))

@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    target = data.get('to')
    if target:
        socketio.emit('webrtc_answer', data, room=str(target))

@socketio.on('webrtc_candidate')
def handle_webrtc_candidate(data):
    target = data.get('to')
    if target:
        socketio.emit('webrtc_candidate', data, room=str(target))

@socketio.on('end_call')
def handle_end_call(data):
    targets = data.get('targets', [])
    for target in targets:
        socketio.emit('end_call', data, room=str(target))
# ------------- END OF SIGNALING -------------

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True)
