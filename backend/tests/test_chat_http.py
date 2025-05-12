import requests
import pytest
import io

BASE = "http://localhost:5000"

def test_create_chat_and_list():
    # два «псевдо»-пользователя с id=1,2 должны существовать
    r = requests.post(f"{BASE}/create_chat", json={
        "name": "TestChat",
        "user_ids": [1,2],
        "creator_id": 1
    })
    assert r.status_code == 200
    cid = r.json()["chat_id"]

    r2 = requests.get(f"{BASE}/user_chats/1")
    assert r2.status_code == 200
    lst = r2.json()
    assert any(c["id"] == cid for c in lst)

def test_get_messages_empty():
    # чат с id=9999, вероятно, пуст
    r = requests.get(f"{BASE}/messages/9999")
    assert r.status_code == 200
    assert r.json() == []

def test_upload_and_download_file(tmp_path):
    # файл для загрузки
    content = b"hello world"
    f = tmp_path / "file.txt"
    f.write_bytes(content)
    files = {"file": open(str(f), "rb")}
    r = requests.post(f"{BASE}/upload", files=files)
    assert r.status_code == 200
    fname = r.json()["filename"]

    r2 = requests.get(f"{BASE}/uploads/{fname}")
    assert r2.status_code == 200
    assert r2.content == content

def test_delete_nonexistent_message():
    r = requests.delete(f"{BASE}/messages/12345", params={"mode":"self","user_id":1})
    assert r.status_code == 404
