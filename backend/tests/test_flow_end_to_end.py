import requests
import pytest
import uuid

BASE = "http://localhost:5000"

def test_full_user_journey():
    # Регистрация A и B
    ua = f"A_{uuid.uuid4().hex[:6]}"
    ub = f"B_{uuid.uuid4().hex[:6]}"
    ea = f"{ua}@ex.com"
    eb = f"{ub}@ex.com"
    pw = "Pwd12345"
    ra = requests.post(f"{BASE}/register", json={"username":ua,"email":ea,"password":pw})
    rb = requests.post(f"{BASE}/register", json={"username":ub,"email":eb,"password":pw})
    assert ra.status_code == 200 and rb.status_code == 200

    # Add friend & confirm
    req = requests.post(f"{BASE}/friend_request", json={"requester_id":1,"receiver_id":2}).json()
    cf = requests.post(f"{BASE}/friend_request/confirm", json={"friend_request_id":req["friend_request_id"]})
    assert cf.status_code == 200

    # Create chat & send message via socketio
    import socketio as _sio
    client = _sio.Client()
    client.connect(BASE)
    client.emit("join", {"chat_id":1,"username":ua})
    client.emit("send_message", {"chat_id":1,"sender_id":1,"content":"end2end"})
    client.disconnect()

    # Call history
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    later = now + timedelta(minutes=1)
    cr = requests.post(f"{BASE}/call_history", json={
        "caller_id":1,
        "call_type":"audio",
        "participants":",2,",
        "start_time": now.replace(microsecond=0).isoformat()+"Z",
        "end_time": later.replace(microsecond=0).isoformat()+"Z"
    })
    assert cr.status_code == 200

    # Software & Tasks flows (используем admin/user_id=1)
    sw = requests.post(f"{BASE}/software", json={"admin":True,"title":"X"})
    assert sw.status_code == 200
    tk = requests.post(f"{BASE}/tasks", json={"user_id":1,"title":"T","due_date":"2025-05-25"})
    assert tk.status_code == 200
