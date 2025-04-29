from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Message as MailMessage

# Импортируем наши расширения и модели
from ..extensions import db, mail
from ..models import User
# Импортируем функции для работы с токенами
from ..utils import generate_confirmation_token, confirm_token

# Создаём blueprint для роутов аутентификации
auth_bp = Blueprint('auth_bp', __name__)

# Роут регистрации
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json  # получаем JSON
    if not data.get('username') or not data.get('email') or not data.get('password'):  # проверяем поля
        return jsonify({'status': 'fail', 'message': 'Необходимо указать username, email и password'}), 400

    # Проверяем уникальность username
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'status': 'fail', 'message': 'Имя пользователя уже занято'}), 400
    # Проверяем уникальность email
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'status': 'fail', 'message': 'Эта почта уже используется'}), 400

    # Создаём нового пользователя
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password'])
    )
    db.session.add(user)  # добавляем в сессию
    db.session.commit()   # сохраняем в базе
    return jsonify({'status': 'success', 'message': 'Пользователь успешно зарегистрирован'})  # ответ

# Роут логина
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json  # получаем JSON
    user = User.query.filter_by(username=data['username']).first()  # ищем пользователя по username
    if user and check_password_hash(user.password_hash, data['password']):  # проверяем пароль
        return jsonify({'status': 'success', 'user_id': user.id})  # если ок
    return jsonify({'status': 'fail', 'message': 'Неверные логин или пароль'}), 401  # если нет

# Роут сброса пароля (отправка письма)
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()  # получаем JSON
    email = data.get('email')  # забираем email
    if not email:  # проверка
        return jsonify({'message': 'Email обязателен'}), 400

    # Ищем пользователя по email
    user = User.query.filter_by(email=email).first()
    if user:
        # Генерируем токен
        token = generate_confirmation_token(email)
        # Формируем ссылку сброса
        reset_url = f'http://localhost:3000/reset-password-confirm/{token}'
        # Создаём письмо
        msg = MailMessage(
            subject='Сброс пароля',
            sender='valerich.tv.88@mail.ru',
            recipients=[email]
        )
        # Текст письма со ссылкой
        msg.body = f'Для сброса пароля перейдите по ссылке: {reset_url}'
        try:
            mail.send(msg)  # отправляем письмо
        except Exception as e:
            print(f"Ошибка отправки письма: {e}")
            return jsonify({'message': 'Ошибка отправки письма'}), 500

    # Не говорим, найден ли пользователь - всегда 200
    return jsonify({'message': 'Инструкции по сбросу пароля отправлены на вашу почту'}), 200

# Роут подтверждения сброса пароля (по ссылке с токеном)
@auth_bp.route('/reset-password-confirm/<token>', methods=['POST'])
def reset_password_confirm(token):
    data = request.get_json()  # получаем JSON
    password = data.get('password')  # новый пароль
    password_confirm = data.get('password_confirm')  # подтверждение пароля
    if not password or not password_confirm:  # проверка наличия
        return jsonify({'message': 'Пароль и подтверждение обязательны'}), 400
    if password != password_confirm:  # совпадают ли
        return jsonify({'message': 'Пароли не совпадают'}), 400

    # Расшифровываем токен в email
    email = confirm_token(token)
    if not email:
        return jsonify({'message': 'Ссылка для сброса пароля недействительна или истекла'}), 400

    # Ищем пользователя
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'Пользователь не найден'}), 404

    # Сохраняем новый пароль
    user.password_hash = generate_password_hash(password)
    db.session.commit()
    return jsonify({'message': 'Пароль успешно сброшен'}), 200
