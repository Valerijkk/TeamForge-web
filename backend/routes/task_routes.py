# -*- coding: utf-8 -*-

from datetime import datetime
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Task

# Создаём blueprint
task_bp = Blueprint('task_bp', __name__)

# Роут получения задач
@task_bp.route('/tasks', methods=['GET'])
def get_tasks():
    """
    Можно передавать user_id и date (YYYY-MM-DD).
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

# Роут создания задачи
@task_bp.route('/tasks', methods=['POST'])
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

# Роут обновления задачи
@task_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'status': 'fail', 'message': 'Задача не найдена'}), 404

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

# Роут удаления задачи
@task_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'status': 'fail', 'message': 'Задача не найдена'}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Задача удалена'})
