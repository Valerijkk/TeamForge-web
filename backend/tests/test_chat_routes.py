import pytest


@pytest.mark.xfail(reason="Пока нет проверки дружбы в create_chat() — должен быть 403")
def test_create_chat_without_friendship_fails(client, two_users):
    alice, bob = two_users
    rv = client.post("/create_chat", json={
        "name": "private",
        "creator_id": alice,
        "user_ids": [alice, bob]
    })
    assert rv.status_code == 403


def test_create_chat_after_friendship_ok(client, two_users):
    alice, bob = two_users

    # сначала дружим
    fr_id = client.post("/friend_request",
                        json={"requester_id": alice, "receiver_id": bob}).get_json()["friend_request_id"]
    client.post("/friend_request/confirm", json={"friend_request_id": fr_id})

    # создаём чат
    rv = client.post("/create_chat", json={
        "name": "private",
        "creator_id": alice,
        "user_ids": [alice, bob]
    })
    assert rv.status_code == 200
    chat_id = rv.get_json()["chat_id"]

    for uid in (alice, bob):
        chats = client.get(f"/user_chats/{uid}").get_json()
        assert any(c["id"] == chat_id for c in chats)
