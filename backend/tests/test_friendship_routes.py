def test_full_friendship_flow(client, two_users):
    alice, bob = two_users

    # ➜ запрос
    rv = client.post("/friend_request", json={"requester_id": alice, "receiver_id": bob})
    assert rv.status_code == 200
    fr_id = rv.get_json()["friend_request_id"]

    # ➜ входящие у Bob
    incoming = client.get(f"/friend_requests/{bob}").get_json()
    assert any(r["id"] == fr_id for r in incoming)

    # ➜ подтверждение
    rv = client.post("/friend_request/confirm", json={"friend_request_id": fr_id})
    assert rv.status_code == 200

    # ➜ проверяем список друзей
    friends = client.get(f"/friends/{alice}").get_json()
    assert any(f["id"] == bob for f in friends)
