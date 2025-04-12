# -*- coding: utf-8 -*-

from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Software

# Создаём blueprint
software_bp = Blueprint('software_bp', __name__)

# Роут получения списка ПО
@software_bp.route('/software', methods=['GET'])
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

# Роут создания ПО
@software_bp.route('/software', methods=['POST'])
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

# Роут обновления ПО
@software_bp.route('/software/<int:software_id>', methods=['PUT'])
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

# Роут удаления ПО
@software_bp.route('/software/<int:software_id>', methods=['DELETE'])
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
