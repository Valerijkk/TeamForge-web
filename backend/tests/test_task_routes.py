from datetime import date, timedelta


def test_task_crud_flow(client, two_users):
    user_id, _ = two_users
    due = date.today() + timedelta(days=1)

    # ➜ create
    rv = client.post("/tasks", json={
        "user_id": user_id,
        "title": "Write tests",
        "due_date": due.isoformat()
    })
    assert rv.status_code == 200
    task_id = rv.get_json()["task_id"]

    # ➜ update
    rv = client.put(f"/tasks/{task_id}", json={
        "title": "Write MORE tests",
        "description": "cover edge cases"
    })
    assert rv.status_code == 200

    # ➜ list (по дате)
    tasks = client.get("/tasks", query_string={
        "user_id": user_id,
        "date": due.isoformat()
    }).get_json()
    assert any(t["id"] == task_id and t["title"] == "Write MORE tests" for t in tasks)

    # ➜ delete
    rv = client.delete(f"/tasks/{task_id}")
    assert rv.status_code == 200
    assert client.get("/tasks", query_string={"user_id": user_id}).get_json() == []
