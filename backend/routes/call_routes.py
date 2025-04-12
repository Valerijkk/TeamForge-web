# -*- coding: utf-8 -*-

from datetime import datetime
from flask import Blueprint, request, jsonify
from ..models import CallHistory, User
from ..extensions import db

# Добавляем pytz, чтобы делать astimezone локальным
import pytz

call_bp = Blueprint('call_bp', __name__)

# Задаём ваш часовой пояс – здесь, например, 'Europe/Moscow'.
# Если у вас другой, поменяйте строку:
LOCAL_TZ = pytz.timezone("Europe/Moscow")

@call_bp.route('/call_history', methods=['POST'])
def add_call_history():
    data = request.json
    try:
        caller_id = data['caller_id']
        call_type = data['call_type']
        participants = data.get('participants', '')

        # Заменяем 'Z' на '+00:00', чтобы Python понял, что время в UTC
        start_time_str = data['start_time'].replace('Z', '+00:00')
        end_time_str = data['end_time'].replace('Z', '+00:00')

        # Парсим как tz-aware UTC datetime
        start_time_utc = datetime.fromisoformat(start_time_str)
        end_time_utc = datetime.fromisoformat(end_time_str)

        # Вычисляем длительность
        duration = int((end_time_utc - start_time_utc).total_seconds())

    except Exception as e:
        return jsonify({'status': 'fail', 'message': f'Ошибка обработки данных: {str(e)}'}), 400

    # Сохраняем в базу (у нас tz-aware datetime)
    record = CallHistory(
        caller_id=caller_id,
        call_type=call_type,
        participants=participants,
        start_time=start_time_utc,
        end_time=end_time_utc,
        duration=duration
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Запись звонка добавлена'})

@call_bp.route('/call_history/<int:user_id>', methods=['GET'])
def get_call_history(user_id):
    pattern = f'%,{user_id},%'
    records = CallHistory.query.filter(
        (CallHistory.caller_id == user_id) | (CallHistory.participants.like(pattern))
    ).order_by(CallHistory.start_time.desc()).all()

    result = []
    for rec in records:
        caller = User.query.get(rec.caller_id)
        caller_username = caller.username if caller else "Неизвестно"

        # Преобразуем список ID-участников в имена
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

        # Переводим UTC во "внутренний" (местный) часовой пояс
        local_start = rec.start_time.astimezone(LOCAL_TZ)
        local_end = rec.end_time.astimezone(LOCAL_TZ)

        # Форматируем строки для вывода
        start_str = local_start.strftime("%Y-%m-%d %H:%M")
        end_str = local_end.strftime("%Y-%m-%d %H:%M")

        result.append({
            'id': rec.id,
            'caller_id': rec.caller_id,
            'caller_username': caller_username,
            'call_type': rec.call_type,
            'recipients': recipient_usernames,
            'start_time': start_str,
            'end_time': end_str,
            'duration': rec.duration
        })
    return jsonify(result)
