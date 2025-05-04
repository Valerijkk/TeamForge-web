def test_software_admin_flow(client):
    # пусто
    assert client.get("/software").get_json() == []

    # не-admin ➜ 403
    rv = client.post("/software", json={"title": "App"})
    assert rv.status_code == 403

    # admin OK
    rv = client.post("/software", json={
        "admin": True,
        "title": "App",
        "description": "desc"
    })
    assert rv.status_code == 200
    sw_id = rv.get_json()["software_id"]

    # update
    rv = client.put(f"/software/{sw_id}", json={"admin": True, "description": "new"})
    assert rv.status_code == 200

    # delete
    rv = client.delete(f"/software/{sw_id}", json={"admin": True})
    assert rv.status_code == 200
    assert client.get("/software").get_json() == []
