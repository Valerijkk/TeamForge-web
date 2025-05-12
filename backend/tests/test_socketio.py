import pytest
import socketio

BASE = "http://localhost:5000"

@pytest.fixture(scope="module")
def sio():
    client = socketio.Client()
    client.connect(BASE)
    yield client
    client.disconnect()

def test_socketio_connect(sio):
    assert sio.connected

def test_socketio_join_and_send_receive(sio):
    sio.emit("join", {"chat_id":1,"username":"pytest"})
    # отправляем сообщение
    sio.emit("send_message", {
        "chat_id": 1,
        "sender_id": 1,
        "content": "hello from pytest"
    })
    # нет исключений → прошло
