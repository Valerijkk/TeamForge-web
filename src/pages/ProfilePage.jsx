import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function ProfilePage({ user, onLogout }) {
    const navigate = useNavigate();
    const [chatsCount, setChatsCount] = useState(0);
    const [messagesCount, setMessagesCount] = useState(0);
    const [docs, setDocs] = useState([]);
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [callHistory, setCallHistory] = useState([]);

    const loadProfileData = useCallback(() => {
        fetch(`http://localhost:5000/profile_data/${user.id}`)
            .then(res => res.json())
            .then(data => {
                setChatsCount(data.chats_count);
                setMessagesCount(data.messages_count);
                setDocs(data.docs);
            });
    }, [user.id]);

    const loadFriends = useCallback(() => {
        fetch(`http://localhost:5000/friends/${user.id}`)
            .then(res => res.json())
            .then(data => setFriends(data));
    }, [user.id]);

    const loadFriendRequests = useCallback(() => {
        fetch(`http://localhost:5000/friend_requests/${user.id}`)
            .then(res => res.json())
            .then(data => setFriendRequests(data));
    }, [user.id]);

    const loadCallHistory = useCallback(() => {
        fetch(`http://localhost:5000/call_history/${user.id}`)
            .then(res => res.json())
            .then(data => setCallHistory(data));
    }, [user.id]);

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        loadProfileData();
        loadFriends();
        loadFriendRequests();
        loadCallHistory();
    }, [user, navigate, loadProfileData, loadFriends, loadFriendRequests, loadCallHistory]);

    const handleSearch = () => {
        if (searchQuery.trim() !== '') {
            fetch(`http://localhost:5000/search_users?q=${searchQuery}`)
                .then(res => res.json())
                .then(data => {
                    const filtered = data.filter(u => u.id !== user.id && !friends.some(f => f.id === u.id));
                    setSearchResults(filtered);
                });
        } else {
            setSearchResults([]);
        }
    };

    const addFriend = (receiverId) => {
        const body = { requester_id: user.id, receiver_id: receiverId };
        fetch('http://localhost:5000/friend_request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
            });
    };

    const confirmFriendRequest = (friendRequestId) => {
        fetch('http://localhost:5000/friend_request/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friend_request_id: friendRequestId })
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                loadFriends();
                loadFriendRequests();
            });
    };

    const rejectFriendRequest = (friendRequestId) => {
        fetch('http://localhost:5000/friend_request/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friend_request_id: friendRequestId })
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                loadFriendRequests();
            });
    };

    const removeFriend = (friendId) => {
        fetch(`http://localhost:5000/friendship?user_id=${user.id}&friend_id=${friendId}`, {
            method: 'DELETE'
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                loadFriends();
            });
    };

    return (
        <div className="profile-container">
            <h2>Профиль пользователя</h2>
            <p><strong>Имя пользователя:</strong> {user.username}</p>
            <p><strong>Количество чатов:</strong> {chatsCount}</p>
            <p><strong>Количество сообщений:</strong> {messagesCount}</p>
            <p><strong>Отправленные документы:</strong></p>
            {docs.length === 0 ? (
                <p>Нет загруженных документов</p>
            ) : (
                <ul>
                    {docs.map((doc, index) => (
                        <li key={index}>
                            <a href={`http://localhost:5000/uploads/${doc}`} target="_blank" rel="noreferrer">
                                {doc}
                            </a>
                        </li>
                    ))}
                </ul>
            )}

            <hr />
            <h3>Друзья</h3>
            {friends.length === 0 ? (
                <p>У вас нет друзей.</p>
            ) : (
                <ul>
                    {friends.map(f => (
                        <li key={f.id}>
                            {f.username} <button onClick={() => removeFriend(f.id)}>Удалить</button>
                        </li>
                    ))}
                </ul>
            )}

            <hr />
            <h3>Входящие запросы в друзья</h3>
            {friendRequests.length === 0 ? (
                <p>Нет входящих запросов.</p>
            ) : (
                <ul>
                    {friendRequests.map(fr => (
                        <li key={fr.id}>
                            Запрос от пользователя ID {fr.requester_id}{' '}
                            <button onClick={() => confirmFriendRequest(fr.id)}>Принять</button>{' '}
                            <button onClick={() => rejectFriendRequest(fr.id)}>Отклонить</button>
                        </li>
                    ))}
                </ul>
            )}

            <hr />
            <h3>Добавить друга</h3>
            <div>
                <input
                    type="text"
                    placeholder="Введите ник пользователя"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={handleSearch}>Искать</button>
            </div>
            {searchResults.length > 0 && (
                <ul>
                    {searchResults.map(u => (
                        <li key={u.id}>
                            {u.username} <button onClick={() => addFriend(u.id)}>Добавить в друзья</button>
                        </li>
                    ))}
                </ul>
            )}

            <hr />
            <h3>История звонков</h3>
            {callHistory.length === 0 ? (
                <p>Нет записей о звонках.</p>
            ) : (
                <ul>
                    {callHistory.map(call => (
                        <li key={call.id}>
                            {call.call_type === 'personal' ? 'Личный' : 'Групповой'} звонок от {call.caller_username}
                            {call.recipients.length > 0 && <> к {call.recipients.join(', ')}</>}
                            с {call.start_time} до {call.end_time} (Длительность: {call.duration} сек.)
                        </li>
                    ))}
                </ul>
            )}

            <hr />
            <button onClick={onLogout}>Выйти</button>
        </div>
    );
}

export default ProfilePage;
