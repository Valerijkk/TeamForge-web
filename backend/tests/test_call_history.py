import requests
import pytest
from datetime import datetime, timedelta

BASE = "http://localhost:5000"

def iso(dt):
    return dt.replace(microsecond=0).isoformat() + "Z"

def test_add_and_get_call_history():
    now = datetime.utcnow()
    later = now + timedelta(minutes=3)
    payload = {
        "caller_id": 1,
        "call_type": "audio",
        "participants": ",2,3,",
        "start_time": iso(now),
        "end_time": iso(later)
    }
    r = requests.post(f"{BASE}/call_history", json=payload)
    assert r.status_code == 200
    assert r.json()["status"] == "success"

    # GET истории по user_id=1
    r2 = requests.get(f"{BASE}/call_history/1")
    assert r2.status_code == 200
    arr = r2.json()
    assert isinstance(arr, list)
    rec = arr[0]
    assert rec["caller_id"] == 1
    assert rec["duration"] == 180
    assert "start_time" in rec and "end_time" in rec
