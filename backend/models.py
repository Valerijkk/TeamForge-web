# -*- coding: utf-8 -*-

# Импортируем datetime для полей дат
from datetime import datetime, date
# Импортируем db из extensions
from .extensions import db

# Модель пользователя
class User(db.Model):
    # Колонка id - первичный ключ
    id = db.Column(db.Integer, primary_key=True)
    # username - уникальный логин
    username = db.Column(db.String(80), unique=True, nullable=False)
    # email - уникальный email
    email = db.Column(db.String(120), unique=True, nullable=False)
    # password_hash - хэш пароля
    password_hash = db.Column(db.String(255), nullable=False)

# Модель чата
class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # id
    name = db.Column(db.String(80), nullable=False)  # название чата
    is_group = db.Column(db.Boolean, default=False)  # флаг, групповой чат или нет

# Модель связывающая чаты и пользователей
class ChatUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # id
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)  # чат
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # пользователь
    notifications_enabled = db.Column(db.Boolean, default=True)  # включены ли уведомления

# Модель сообщения
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # id
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)  # id чата
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # отправитель
    content = db.Column(db.Text)  # текст сообщения
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)  # время отправки
    media_filename = db.Column(db.String(120), nullable=True)  # имя файла (медиа)
    deleted_for_all = db.Column(db.Boolean, default=False)  # удалено ли для всех
    reply_to_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=True)  # ссылка на исходное сообщение (реплай)
    forwarded_from_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # id пользователя, от кого переслали

# Модель реакции на сообщение
class Reaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # id
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)  # на какое сообщение реакция
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # кто поставил реакцию
    reaction = db.Column(db.String(20), nullable=False)  # какой смайлик или реакция

# Модель "удалённого" сообщения для конкретного пользователя (логика "удалено для себя")
class DeletedMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # id
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)  # какое сообщение
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # какой пользователь

# Модель дружбы (Friendship)
class Friendship(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # id
    requester_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # кто запросил дружбу
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # кому
    status = db.Column(db.String(20), default='pending')  # статус ('pending', 'accepted')

# Модель истории звонков
class CallHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # id
    caller_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # инициатор звонка
    call_type = db.Column(db.String(20), nullable=False)  # тип (audio/video/групповой?)
    participants = db.Column(db.String(200))  # строка вида ",2,3," с id участников
    start_time = db.Column(db.DateTime, nullable=False)  # время начала
    end_time = db.Column(db.DateTime, nullable=False)  # время конца
    duration = db.Column(db.Integer, nullable=False)  # длительность в секундах

# Модель задачи (Task)
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # id
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # владелец задачи
    title = db.Column(db.String(120), nullable=False)  # заголовок задачи
    description = db.Column(db.Text, nullable=True)  # описание
    due_date = db.Column(db.Date, nullable=False)  # дата дедлайна
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # дата создания

# Модель программного обеспечения
class Software(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # id
    title = db.Column(db.String(120), nullable=False)  # название
    description = db.Column(db.Text, nullable=True)  # описание
    image_url = db.Column(db.String(255), nullable=True)  # ссылка на изображение
    github_url = db.Column(db.String(255), nullable=True)  # ссылка на GitHub