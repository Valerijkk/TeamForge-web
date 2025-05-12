import requests

BASE = "http://localhost:5000"

def test_get_users_and_profile():
    r1 = requests.get(f"{BASE}/users")
    assert r1.status_code == 200
    users = r1.json()
    if not users:
        pytest.skip("Нет пользователей для профиля")
    uid = users[0]["id"]

    r2 = requests.get(f"{BASE}/profile_data/{uid}")
    assert r2.status_code == 200
    data = r2.json()
    assert "chats_count" in data and "messages_count" in data and "docs" in data
