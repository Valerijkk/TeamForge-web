from backend.models import User, Chat, ChatUser, Message
from backend.extensions import db


def test_user_model_integrity(app):
    with app.app_context():
        u = User(username="x", email="x@ex", password_hash="h")
        db.session.add(u)
        db.session.commit()
        assert u.id is not None


def test_chat_and_message_relations(app):
    with app.app_context():
        u1 = User(username="u1", email="u1@ex", password_hash="h")
        u2 = User(username="u2", email="u2@ex", password_hash="h")
        db.session.add_all([u1, u2]); db.session.commit()

        chat = Chat(name="c", is_group=False)
        db.session.add(chat); db.session.commit()

        db.session.add_all([
            ChatUser(chat_id=chat.id, user_id=u1.id),
            ChatUser(chat_id=chat.id, user_id=u2.id)
        ])
        db.session.commit()

        msg = Message(chat_id=chat.id, sender_id=u1.id, content="hi")
        db.session.add(msg); db.session.commit()
        assert msg.id is not None
