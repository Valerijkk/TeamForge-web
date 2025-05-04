def test_register_duplicate_username(client, make_user):
    make_user("user", "one@example.com")
    rv = client.post("/register", json={
        "username": "user",
        "email": "two@example.com",
        "password": "123"
    })
    assert rv.status_code == 400
    assert "уже занято" in rv.get_json()["message"]


def test_register_duplicate_email(client, make_user):
    make_user("first", "dup@example.com")
    rv = client.post("/register", json={
        "username": "second",
        "email": "dup@example.com",
        "password": "123"
    })
    assert rv.status_code == 400
    assert "используется" in rv.get_json()["message"]


def test_login_success(client, make_user):
    uid = make_user("mike", "mike@example.org")
    rv = client.post("/login", json={"username": "mike", "password": "pass"})
    assert rv.status_code == 200
    assert rv.get_json()["user_id"] == uid


def test_login_wrong_pwd(client, make_user):
    make_user("kate", "kate@example.org")
    rv = client.post("/login", json={"username": "kate", "password": "bad"})
    assert rv.status_code == 401
