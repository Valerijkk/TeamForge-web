# -*- coding: utf-8 -*-

# Импортируем нужные модули
from flask_socketio import emit, join_room, leave_room
# Импортируем db, socketio
from ..extensions import db, socketio
# Импортируем модели
from ..models import Message, Reaction, ChatUser

# Событие при подключении сокета
@socketio.on('connect')
def handle_connect():
    emit('status', {'message': 'Подключено'})

# Событие "join" - вход в комнату чата
@socketio.on('join')
def handle_join(data):
    chat_id = data['chat_id']
    username = data.get('username', 'Аноним')
    join_room(str(chat_id))
    emit('status', {'message': f"{username} вошёл в чат {chat_id}"}, room=str(chat_id))

# Событие "leave" - выход из комнаты чата
@socketio.on('leave')
def handle_leave(data):
    chat_id = data['chat_id']
    username = data.get('username', 'Аноним')
    leave_room(str(chat_id))
    emit('status', {'message': f"{username} покинул(а) чат {chat_id}"}, room=str(chat_id))

# Событие отправки сообщения
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

# Событие отправки реакции
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

# Событие обновления уведомлений
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

# --- WebRTC / Сигналинг ---
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
