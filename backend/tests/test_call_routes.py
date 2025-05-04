from datetime import datetime, timedelta
import pytest, pytz

UTC = pytz.UTC


@pytest.mark.xfail(reason="Пока нет проверки дружбы в add_call_history() — должен быть 403")
def test_call_history_blocked_without_friendship(client, two_users):
    alice, bob = two_users
    now = datetime.now(UTC)

    rv = client.post("/call_history", json={
        "caller_id": alice,
        "call_type": "audio",
        "participants": f",{bob},",
        "start_time": now.isoformat().replace("+00:00", "Z"),
        "end_time": (now + timedelta(minutes=3)).isoformat().replace("+00:00", "Z")
    })
    assert rv.status_code == 403


def test_call_history_saved_after_friendship(client, two_users):
    alice, bob = two_users
    fr_id = client.post("/friend_request",
                        json={"requester_id": alice, "receiver_id": bob}).get_json()["friend_request_id"]
    client.post("/friend_request/confirm", json={"friend_request_id": fr_id})

    now = datetime.now(UTC)
    rv = client.post("/call_history", json={
        "caller_id": alice,
        "call_type": "video",
        "participants": f",{bob},",
        "start_time": now.isoformat().replace("+00:00", "Z"),
        "end_time": (now + timedelta(minutes=2)).isoformat().replace("+00:00", "Z")
    })
    assert rv.status_code == 200

    for uid in (alice, bob):
        history = client.get(f"/call_history/{uid}").get_json()
        assert len(history) == 1
        assert history[0]["caller_id"] == alice
