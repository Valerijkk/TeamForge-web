import requests
import pytest
import uuid

BASE = "http://localhost:5000"

def test_software_crud():
    title = f"Soft_{uuid.uuid4().hex[:6]}"
    # GET пустой
    r0 = requests.get(f"{BASE}/software")
    assert r0.status_code == 200

    # POST без admin
    r1 = requests.post(f"{BASE}/software", json={"title": title})
    assert r1.status_code == 403

    # POST с admin
    r2 = requests.post(f"{BASE}/software", json={
        "admin": True, "title": title, "description":"d","image_url":"i","github_url":"g"
    })
    assert r2.status_code == 200
    sid = r2.json()["software_id"]

    # PUT без прав
    r3 = requests.put(f"{BASE}/software/{sid}", json={"title":"X"})
    assert r3.status_code == 403

    # PUT с правами
    r4 = requests.put(f"{BASE}/software/{sid}", json={"admin":True,"title":"X2"})
    assert r4.status_code == 200

    # DELETE без прав
    r5 = requests.delete(f"{BASE}/software/{sid}", json={})
    assert r5.status_code == 403

    # DELETE с правами
    r6 = requests.delete(f"{BASE}/software/{sid}", json={"admin":True})
    assert r6.status_code == 200

def test_tasks_crud():
    # создаём задачу без user_id
    r0 = requests.post(f"{BASE}/tasks", json={"title":"T"})
    assert r0.status_code == 400

    # создаём задачу с user_id
    due = "2025-05-20"
    r1 = requests.post(f"{BASE}/tasks", json={
        "user_id": 1, "title":"T1", "due_date": due
    })
    assert r1.status_code == 200
    tid = r1.json()["task_id"]

    # GET все
    r2 = requests.get(f"{BASE}/tasks", params={"user_id":1})
    assert any(t["id"] == tid for t in r2.json())

    # GET по дате
    r3 = requests.get(f"{BASE}/tasks", params={"user_id":1, "date": due})
    assert any(t["id"] == tid for t in r3.json())

    # PUT
    r4 = requests.put(f"{BASE}/tasks/{tid}", json={"title":"Updated"})
    assert r4.status_code == 200

    # DELETE
    r5 = requests.delete(f"{BASE}/tasks/{tid}")
    assert r5.status_code == 200
