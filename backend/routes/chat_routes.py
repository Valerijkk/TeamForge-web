import os
from flask import Blueprint, request, jsonify, send_from_directory
from ..models import Chat, ChatUser, Message, DeletedMessage, Reaction
from ..extensions import db, socketio

# Создаём blueprint
chat_bp = Blueprint('chat_bp', __name__)

# Роут создания чата
@chat_bp.route('/create_chat', methods=['POST'])
def create_chat():
    data = request.json  # JSON
    if not data.get('name') or not data.get('user_ids'):  # проверка
        return jsonify({'status': 'fail', 'message': 'Нужно указать название чата и участников'}), 400
    # Создаём чат
    chat = Chat(name=data['name'], is_group=True)
    db.session.add(chat)
    db.session.commit()

    # Добавляем создателя если нет
    if data.get('creator_id') not in data['user_ids']:
        data['user_ids'].append(data.get('creator_id'))
    # Создаём ChatUser записи
    for user_id in data['user_ids']:
        chat_user = ChatUser(chat_id=chat.id, user_id=user_id, notifications_enabled=True)
        db.session.add(chat_user)
    db.session.commit()
    return jsonify({'status': 'success', 'chat_id': chat.id})

# DELETE /chat/<chat_id>?user_id=<current_user>
@chat_bp.route('/chat/<int:chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({'status': 'fail', 'message': 'Не указан user_id'}), 400

    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'status': 'fail', 'message': 'Чат не найден'}), 404

    # 1) разрешаем удалять только участнику (или автору/админу, если нужен жёсткий контроль)
    is_member = ChatUser.query.filter_by(chat_id=chat_id, user_id=user_id).first()
    if not is_member:
        return jsonify({'status': 'fail', 'message': 'Нет прав удалять этот чат'}), 403

    # 2) чистим связанную информацию.
    #    Если у моделей настроены cascade-delete, двух строчек хватит;
    #    если нет – вручную удаляем зависимые записи:
    Reaction.query.join(Message).filter(Message.chat_id == chat_id).delete(synchronize_session=False)
    DeletedMessage.query.join(Message).filter(Message.chat_id == chat_id).delete(synchronize_session=False)
    Message.query.filter_by(chat_id=chat_id).delete(synchronize_session=False)
    ChatUser.query.filter_by(chat_id=chat_id).delete(synchronize_session=False)

    db.session.delete(chat)
    db.session.commit()

    # 3) уведомляем комнату, чтобы открытые вкладки могли авто-закрыться
    socketio.emit('chat_deleted', {'chat_id': chat_id}, room=str(chat_id))
    return jsonify({'status': 'success', 'message': 'Чат удалён'})


# Роут получения чатов пользователя
@chat_bp.route('/user_chats/<int:user_id>', methods=['GET'])
def get_user_chats(user_id):
    chat_users = ChatUser.query.filter_by(user_id=user_id).all()
    chats = []
    for cu in chat_users:
        chat = Chat.query.get(cu.chat_id)
        if chat:
            chats.append({'id': chat.id, 'name': chat.name, 'is_group': chat.is_group})
    return jsonify(chats)

# Роут получения сообщений в чате
@chat_bp.route('/messages/<int:chat_id>', methods=['GET'])
def get_messages(chat_id):
    user_id = request.args.get('user_id', type=int)
    keyword = request.args.get('q', '')
    query = Message.query.filter(Message.chat_id == chat_id, Message.deleted_for_all == False)
    # Если есть ключевое слово, фильтруем
    if keyword:
        query = query.filter(Message.content.contains(keyword))
    # Фильтруем удалённые сообщения
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

# Роут загрузки файла
@chat_bp.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:  # проверяем наличие файла
        return jsonify({'status': 'fail', 'message': 'Файл не найден'}), 400
    file = request.files['file']  # получаем объект файла
    if file.filename == '':  # проверяем имя
        return jsonify({'status': 'fail', 'message': 'Файл не выбран'}), 400
    # Путь к папке загрузок
    from flask import current_app
    upload_folder = current_app.config['UPLOAD_FOLDER']
    # Сохраняем
    filepath = os.path.join(upload_folder, file.filename)
    file.save(filepath)
    return jsonify({'status': 'success', 'filename': file.filename})

# Роут отдачи загруженного файла
@chat_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    from flask import current_app
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

# Роут удаления сообщения
@chat_bp.route('/messages/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    mode = request.args.get('mode')  # проверяем режим (everyone/self)
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({'status': 'fail', 'message': 'Не указан user_id'}), 400
    message = Message.query.get(message_id)
    if not message:
        return jsonify({'status': 'fail', 'message': 'Сообщение не найдено'}), 404

    if mode == 'everyone':
        # Ставим флаг deleted_for_all
        message.deleted_for_all = True
        db.session.commit()
        # Шлём событие всем в чат
        socketio.emit('message_deleted_for_all', {'message_id': message_id}, room=str(message.chat_id))
        return jsonify({'status': 'success', 'message': 'Сообщение удалено для всех'})
    else:
        # Удаляем только для себя
        deleted_entry = DeletedMessage.query.filter_by(message_id=message_id, user_id=user_id).first()
        if not deleted_entry:
            deleted_entry = DeletedMessage(message_id=message_id, user_id=user_id)
            db.session.add(deleted_entry)
            db.session.commit()
        # Шлём событие
        socketio.emit('message_deleted_for_user', {'message_id': message_id, 'user_id': user_id}, room=str(message.chat_id))
        return jsonify({'status': 'success', 'message': 'Сообщение удалено только для вас'})

# Роут пересылки сообщения
@chat_bp.route('/forward_message', methods=['POST'])
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
    # Создаём новое сообщение
    new_msg = Message(
        chat_id=to_chat_id,
        sender_id=user_id,
        content=old_msg.content,
        media_filename=old_msg.media_filename,
        forwarded_from_id=old_msg.sender_id
    )
    db.session.add(new_msg)
    db.session.commit()
    # Уведомляем сокетом
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

# получить инфу о конкретном чате
@chat_bp.route('/chat/<int:chat_id>', methods=['GET'])
def get_chat(chat_id):
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'status':'fail','message':'Чат не найден'}),404
    return jsonify({'id': chat.id, 'name': chat.name, 'is_group': chat.is_group})
