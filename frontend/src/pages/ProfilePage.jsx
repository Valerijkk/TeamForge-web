import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";

const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function ProfilePage({ user, onLogout }) {
    const navigate = useNavigate();

    const [chatsCount, setChatsCount] = useState(0);
    const [messagesCount, setMessagesCount] = useState(0);

    const [docs, setDocs] = useState([]);
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);

    const [callHistory, setCallHistory] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const loadProfileData = useCallback(() => {
        setError("");
        return fetch(`${BASE_URL}/profile_data/${user.id}`)
            .then((res) => res.json())
            .then((data) => {
                if (!mountedRef.current) return;
                setChatsCount(data?.chats_count ?? 0);
                setMessagesCount(data?.messages_count ?? 0);
                setDocs(Array.isArray(data?.docs) ? data.docs : []);
            })
            .catch(() => {
                if (!mountedRef.current) return;
                setError("Не удалось загрузить профиль.");
            });
    }, [user?.id]);

    const loadFriends = useCallback(() => {
        return fetch(`${BASE_URL}/friends/${user.id}`)
            .then((res) => res.json())
            .then((data) => {
                if (!mountedRef.current) return;
                setFriends(Array.isArray(data) ? data : []);
            })
            .catch((e) => console.error("Ошибка получения друзей:", e));
    }, [user?.id]);

    const loadFriendRequests = useCallback(() => {
        return fetch(`${BASE_URL}/friend_requests/${user.id}`)
            .then((res) => res.json())
            .then((data) => {
                if (!mountedRef.current) return;
                setFriendRequests(Array.isArray(data) ? data : []);
            })
            .catch((e) => console.error("Ошибка получения запросов в друзья:", e));
    }, [user?.id]);

    const loadCallHistory = useCallback(() => {
        return fetch(`${BASE_URL}/call_history/${user.id}`)
            .then((res) => res.json())
            .then((data) => {
                if (!mountedRef.current) return;
                setCallHistory(Array.isArray(data) ? data : []);
            })
            .catch((e) => console.error("Ошибка получения истории звонков:", e));
    }, [user?.id]);

    // грузим данные только если user существует; без редиректа
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        Promise.all([loadProfileData(), loadFriends(), loadFriendRequests(), loadCallHistory()])
            .catch(() => {})
            .finally(() => mountedRef.current && setLoading(false));
    }, [user, loadProfileData, loadFriends, loadFriendRequests, loadCallHistory, navigate]);

    const handleSearch = () => {
        const q = (searchQuery || "").trim();
        if (!q) {
            setSearchResults([]);
            return;
        }
        fetch(`${BASE_URL}/search_users?q=${encodeURIComponent(q)}`)
            .then((res) => res.json())
            .then((data) => {
                const list = Array.isArray(data) ? data : [];
                const filtered = list.filter((u) => u.id !== (user?.id ?? -1) && !friends.some((f) => f.id === u.id));
                if (mountedRef.current) setSearchResults(filtered);
            })
            .catch((error) => console.error("Ошибка поиска пользователей:", error));
    };

    const addFriend = (receiverId) => {
        const body = { requester_id: user.id, receiver_id: receiverId };
        fetch(`${BASE_URL}/friend_request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("Ответ addFriend:", data.message);
                setSearchResults((prev) => prev.filter((u) => u.id !== receiverId));
                loadFriendRequests();
            })
            .catch((error) => console.error("Ошибка при добавлении в друзья:", error));
    };

    const confirmFriendRequest = (friendRequestId) => {
        fetch(`${BASE_URL}/friend_request/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ friend_request_id: friendRequestId }),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("Ответ confirmFriendRequest:", data.message);
                loadFriends();
                loadFriendRequests();
            })
            .catch((error) => console.error("Ошибка подтверждения запроса в друзья:", error));
    };

    const rejectFriendRequest = (friendRequestId) => {
        fetch(`${BASE_URL}/friend_request/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ friend_request_id: friendRequestId }),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("Ответ rejectFriendRequest:", data.message);
                loadFriendRequests();
            })
            .catch((error) => console.error("Ошибка отклонения запроса в друзья:", error));
    };

    const removeFriend = (friendId) => {
        fetch(`${BASE_URL}/friendship?user_id=${user.id}&friend_id=${friendId}`, {
            method: "DELETE",
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("Ответ removeFriend:", data.message);
                loadFriends();
            })
            .catch((error) => console.error("Ошибка при удалении друга:", error));
    };

    const formatUTC = (localStr) => {
        if (!localStr) return "";
        const iso = localStr.replace(" ", "T") + ":00Z";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return localStr;
        return d.toLocaleString();
    };

    return (
        <div className="profile-page container">
            <h2 className="profile-title">Профиль пользователя</h2>

            {!user && (
                <div className="error-inline" role="alert" style={{ marginBottom: 12 }}>
                    Пожалуйста, войдите!
                </div>
            )}

            {user && (
                <>
                    {loading && <div className="loading-inline">Загрузка…</div>}
                    {error && <div className="error-inline">{error}</div>}

                    <div className="profile-info">
                        <p>
                            <strong>Имя пользователя:</strong> {user.username}
                        </p>
                        <p>
                            <strong>Количество чатов:</strong> {chatsCount}
                        </p>
                        <p>
                            <strong>Количество сообщений:</strong> {messagesCount}
                        </p>
                    </div>

                    <div className="profile-docs">
                        <h3>Отправленные документы:</h3>
                        {docs.length === 0 ? (
                            <p>Нет загруженных документов</p>
                        ) : (
                            <ul>
                                {docs.map((doc, index) => (
                                    <li key={index}>
                                        <a href={`${BASE_URL}/uploads/${doc}`} target="_blank" rel="noreferrer">
                                            {doc}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <hr />

                    <div className="profile-friends">
                        <h3>Друзья</h3>
                        {friends.length === 0 ? (
                            <p>У вас нет друзей.</p>
                        ) : (
                            <ul className="friends-list">
                                {friends.map((f) => (
                                    <li key={f.id}>
                                        {f.username}{" "}
                                        <button onClick={() => removeFriend(f.id)} title="Удалить из друзей">
                                            Удалить
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <hr />

                    <div className="profile-requests">
                        <h3>Входящие запросы в друзья</h3>
                        {friendRequests.length === 0 ? (
                            <p>Нет входящих запросов.</p>
                        ) : (
                            <ul className="requests-list">
                                {friendRequests.map((fr) => (
                                    <li key={fr.id}>
                                        Запрос от пользователя ID {fr.requester_id}{" "}
                                        <button onClick={() => confirmFriendRequest(fr.id)}>Принять</button>{" "}
                                        <button onClick={() => rejectFriendRequest(fr.id)}>Отклонить</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <hr />

                    <div className="profile-search">
                        <h3>Добавить друга</h3>
                        <div>
                            <input
                                type="text"
                                placeholder="Введите ник пользователя"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                            <button onClick={handleSearch}>Искать</button>
                        </div>
                        {searchResults.length > 0 && (
                            <ul className="search-results">
                                {searchResults.map((u) => (
                                    <li key={u.id}>
                                        {u.username} <button onClick={() => addFriend(u.id)}>Добавить</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <hr />

                    <div className="profile-calls">
                        <h3>История звонков</h3>
                        {callHistory.length === 0 ? (
                            <p>Нет записей о звонках.</p>
                        ) : (
                            <ul className="calls-list">
                                {callHistory.map((call) => (
                                    <li key={call.id}>
                                        {call.call_type === "personal" ? "Личный" : "Групповой"} звонок от{" "}
                                        {call.caller_username}
                                        {call.recipients?.length > 0 && <> к {call.recipients.join(", ")}</>} с{" "}
                                        {formatUTC(call.start_time)} до {formatUTC(call.end_time)} (Длительность:{" "}
                                        {call.duration} сек.)
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <hr />

                    <div className="profile-logout">
                        <button onClick={onLogout}>Выйти</button>
                    </div>
                </>
            )}
        </div>
    );
}

export default ProfilePage;
