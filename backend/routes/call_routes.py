# -*- coding: utf-8 -*-

# Импортируем datetime
from datetime import datetime
# Импортируем Blueprint, request, jsonify
from flask import Blueprint, request, jsonify
# Импортируем модели
from ..models import CallHistory, User
# Импортируем db
from ..extensions import db

# Создаём blueprint
call_bp = Blueprint('call_bp', __name__)

# Роут записи истории звонка
@call_bp.route('/call_history', methods=['POST'])
def add_call_history():
    data = request.json  # получаем данные
    try:
        caller_id = data['caller_id']  # инициатор
        call_type = data['call_type']  # тип звонка
        participants = data.get('participants', '')  # участники
        start_time = datetime.fromisoformat(data['start_time'])  # начало
        end_time = datetime.fromisoformat(data['end_time'])      # конец
        duration = int((end_time - start_time).total_seconds())  # считаем разницу
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

# Роут получения истории звонков для пользователя
@call_bp.route('/call_history/<int:user_id>', methods=['GET'])
def get_call_history(user_id):
    pattern = f'%,{user_id},%'  # шаблон вида ",2,"
    # Ищем записи, где user_id — инициатор, либо находится в participants
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
