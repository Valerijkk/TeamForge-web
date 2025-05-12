import requests
import pytest
import uuid

BASE = "http://localhost:5000"

def unique():
    return uuid.uuid4().hex[:8]

@pytest.mark.parametrize("missing", ["username", "email", "password"])
def test_register_missing_fields(missing):
    payload = {"username":"u","email":"e@x.com","password":"p"}
    del payload[missing]
    r = requests.post(f"{BASE}/register", json=payload)
    assert r.status_code == 400
    data = r.json()
    assert data["status"] == "fail"
    assert missing in data["message"]

def test_register_and_login_success():
    uname = f"user_{unique()}"
    email = f"{unique()}@example.com"
    pw = "StrongP@55"
    # регистрация
    r1 = requests.post(f"{BASE}/register", json={
        "username": uname, "email": email, "password": pw
    })
    assert r1.status_code == 200
    assert r1.json()["status"] == "success"
    # дублировать email
    r_dupe = requests.post(f"{BASE}/register", json={
        "username": f"{uname}2", "email": email, "password": pw
    })
    assert r_dupe.status_code == 400
    assert "почта уже используется" in r_dupe.json()["message"]
    # логин
    r2 = requests.post(f"{BASE}/login", json={
        "username": uname, "password": pw
    })
    assert r2.status_code == 200
    body = r2.json()
    assert body["status"] == "success"
    assert isinstance(body["user_id"], int)

def test_login_wrong_password():
    uname = f"user_{unique()}"
    email = f"{unique()}@test.com"
    pw = "RightPass"
    # регистрируем
    requests.post(f"{BASE}/register", json={
        "username": uname, "email": email, "password": pw
    })
    # неправильно
    r = requests.post(f"{BASE}/login", json={
        "username": uname, "password": "BadPass"
    })
    assert r.status_code == 401
    assert r.json()["status"] == "fail"
    assert "Неверные логин или пароль" in r.json()["message"]

def test_reset_password_endpoints():
    # делаем нового пользователя
    uname = f"user_{unique()}"
    email = f"{unique()}@reset.com"
    pw = "InitPass"
    requests.post(f"{BASE}/register", json={
        "username": uname, "email": email, "password": pw
    })
    # запрос сброса без email
    r0 = requests.post(f"{BASE}/reset-password", json={})
    assert r0.status_code == 400
    # запрос сброса с email
    r1 = requests.post(f"{BASE}/reset-password", json={"email": email})
    assert r1.status_code == 200
    assert "Инструкции по сбросу" in r1.json()["message"]
    # подтверждение с некорректным токеном
    r2 = requests.post(f"{BASE}/reset-password-confirm/bad-token", json={
        "password": "New1", "password_confirm": "New1"
    })
    assert r2.status_code == 400
    assert "недействительна" in r2.json()["message"]
