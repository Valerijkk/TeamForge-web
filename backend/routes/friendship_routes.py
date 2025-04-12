# -*- coding: utf-8 -*-

# Импортируем нужные модули
from flask import Blueprint, request, jsonify
# Импортируем модели
from ..models import Friendship, User
# Импортируем db
from ..extensions import db

# Создаём blueprint для дружбы
friendship_bp = Blueprint('friendship_bp', __name__)

# Роут отправки запроса дружбы
@friendship_bp.route('/friend_request', methods=['POST'])
def send_friend_request():
    data = request.json  # JSON
    requester_id = data.get('requester_id')  # кто
    receiver_id = data.get('receiver_id')    # кому
    if not requester_id or not receiver_id:  # проверка
        return jsonify({'status': 'fail', 'message': 'Не указан один из ID'}), 400
    if requester_id == receiver_id:  # нельзя самому себе
        return jsonify({'status': 'fail', 'message': 'Нельзя добавить себя в друзья'}), 400

    # Проверяем, не существует ли уже
    existing = Friendship.query.filter(
        ((Friendship.requester_id == requester_id) & (Friendship.receiver_id == receiver_id)) |
        ((Friendship.requester_id == receiver_id) & (Friendship.receiver_id == requester_id))
    ).first()
    if existing:
        return jsonify({'status': 'fail', 'message': 'Запрос уже отправлен или вы уже друзья'}), 400

    # Создаём запись
    fr = Friendship(requester_id=requester_id, receiver_id=receiver_id, status='pending')
    db.session.add(fr)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Запрос в друзья отправлен', 'friend_request_id': fr.id})

# Роут получения входящих запросов дружбы
@friendship_bp.route('/friend_requests/<int:user_id>', methods=['GET'])
def get_friend_requests(user_id):
    # Ищем все pending-запросы этому пользователю
    requests = Friendship.query.filter_by(receiver_id=user_id, status='pending').all()
    # Формируем результат
    result = [{'id': fr.id, 'requester_id': fr.requester_id, 'receiver_id': fr.receiver_id, 'status': fr.status}
              for fr in requests]
    return jsonify(result)

# Роут подтверждения дружбы
@friendship_bp.route('/friend_request/confirm', methods=['POST'])
def confirm_friend_request():
    data = request.json  # JSON
    friend_request_id = data.get('friend_request_id')  # ID записи
    if not friend_request_id:  # проверка
        return jsonify({'status': 'fail', 'message': 'Не указан ID запроса'}), 400
    fr = Friendship.query.get(friend_request_id)  # ищем
    if not fr or fr.status != 'pending':  # проверка статуса
        return jsonify({'status': 'fail', 'message': 'Запрос не найден или уже обработан'}), 404
    # Меняем статус на accepted
    fr.status = 'accepted'
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Запрос подтвержден'})

# Роут отклонения дружбы
@friendship_bp.route('/friend_request/reject', methods=['POST'])
def reject_friend_request():
    data = request.json
    friend_request_id = data.get('friend_request_id')
    if not friend_request_id:
        return jsonify({'status': 'fail', 'message': 'Не указан ID запроса'}), 400
    fr = Friendship.query.get(friend_request_id)
    if not fr or fr.status != 'pending':
        return jsonify({'status': 'fail', 'message': 'Запрос не найден или уже обработан'}), 404
    # Удаляем запись (отклоняем)
    db.session.delete(fr)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Запрос отклонен'})

# Роут получения друзей (у которых статус accepted)
@friendship_bp.route('/friends/<int:user_id>', methods=['GET'])
def get_friends(user_id):
    # Ищем все записи, где этот user_id фигурирует и статус accepted
    friendships = Friendship.query.filter(
        ((Friendship.requester_id == user_id) | (Friendship.receiver_id == user_id)) &
        (Friendship.status == 'accepted')
    ).all()
    # Собираем друзей в список
    friends = []
    for fr in friendships:
        friend_id = fr.receiver_id if fr.requester_id == user_id else fr.requester_id
        friend = User.query.get(friend_id)
        if friend:
            friends.append({'id': friend.id, 'username': friend.username, 'email': friend.email})
    return jsonify(friends)

# Роут удаления дружбы
@friendship_bp.route('/friendship', methods=['DELETE'])
def remove_friendship():
    user_id = request.args.get('user_id', type=int)
    friend_id = request.args.get('friend_id', type=int)
    if not user_id or not friend_id:
        return jsonify({'status': 'fail', 'message': 'Не указан один из ID'}), 400
    # Ищем дружбу
    fr = Friendship.query.filter(
        ((Friendship.requester_id == user_id) & (Friendship.receiver_id == friend_id)) |
        ((Friendship.requester_id == friend_id) & (Friendship.receiver_id == user_id))
    ).filter(Friendship.status == 'accepted').first()
    if not fr:
        return jsonify({'status': 'fail', 'message': 'Дружба не найдена'}), 404
    db.session.delete(fr)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Дружба удалена'})

# Роут поиска пользователей (по username)
@friendship_bp.route('/search_users', methods=['GET'])
def search_users():
    query = request.args.get('q', '')
    if query:
        users = User.query.filter(User.username.contains(query)).all()
    else:
        users = []
    result = [{'id': u.id, 'username': u.username, 'email': u.email} for u in users]
    return jsonify(result)
