def test_users_and_profile_data(client, two_users):
    alice, bob = two_users

    all_users = client.get("/users").get_json()
    assert len(all_users) == 2
    assert {u["id"] for u in all_users} == {alice, bob}

    profile = client.get(f"/profile_data/{alice}").get_json()
    assert profile["chats_count"] == 0
    assert profile["messages_count"] == 0
