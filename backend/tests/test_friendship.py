import requests
import pytest

BASE = "http://localhost:5000"

def test_send_and_confirm_friend_request():
    # создаём два пользователя (1 и 2) заранее
    r1 = requests.post(f"{BASE}/friend_request", json={"requester_id":1,"receiver_id":2})
    assert r1.status_code == 200
    rid = r1.json()["friend_request_id"]

    r2 = requests.get(f"{BASE}/friend_requests/2")
    assert r2.status_code == 200
    assert any(fr["id"] == rid for fr in r2.json())

    r3 = requests.post(f"{BASE}/friend_request/confirm", json={"friend_request_id": rid})
    assert r3.status_code == 200
    assert r3.json()["status"] == "success"

    r4 = requests.get(f"{BASE}/friends/1")
    assert r4.status_code == 200
    assert any(f["id"] == 2 for f in r4.json())

def test_reject_and_remove_friendship():
    # новый запрос
    r1 = requests.post(f"{BASE}/friend_request", json={"requester_id":1,"receiver_id":3})
    rid = r1.json()["friend_request_id"]
    r2 = requests.post(f"{BASE}/friend_request/reject", json={"friend_request_id": rid})
    assert r2.status_code == 200

    # создаём и принимаем снова
    r3 = requests.post(f"{BASE}/friend_request", json={"requester_id":1,"receiver_id":3})
    rid2 = r3.json()["friend_request_id"]
    requests.post(f"{BASE}/friend_request/confirm", json={"friend_request_id": rid2})

    # удаляем
    r4 = requests.delete(f"{BASE}/friendship", params={"user_id":1,"friend_id":3})
    assert r4.status_code == 200
    assert r4.json()["status"] == "success"

def test_search_users():
    q = "user"
    r = requests.get(f"{BASE}/search_users", params={"q": q})
    assert r.status_code == 200
    arr = r.json()
    assert isinstance(arr, list)
    # просто проверяем, что ответ JSON-массив
