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

    // Функции-загрузчики данных оборачиваются в useCallback, чтобы не создавать их заново
    const loadProfileData = useCallback(() => {
        // Создаем флаг монтирования
        let isMounted = true;
        fetch(`http://localhost:5000/profile_data/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) {
                    setChatsCount(data.chats_count);
                    setMessagesCount(data.messages_count);
                    setDocs(data.docs);
                }
            })
            .catch(error => console.error('Ошибка получения данных профиля:', error));

        return () => { isMounted = false; };
    }, [user.id]);

    const loadFriends = useCallback(() => {
        let isMounted = true;
        fetch(`http://localhost:5000/friends/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) setFriends(data);
            })
            .catch(error => console.error('Ошибка получения друзей:', error));

        return () => { isMounted = false; };
    }, [user.id]);

    const loadFriendRequests = useCallback(() => {
        let isMounted = true;
        fetch(`http://localhost:5000/friend_requests/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) setFriendRequests(data);
            })
            .catch(error => console.error('Ошибка получения запросов в друзья:', error));

        return () => { isMounted = false; };
    }, [user.id]);

    const loadCallHistory = useCallback(() => {
        let isMounted = true;
        fetch(`http://localhost:5000/call_history/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) setCallHistory(data);
            })
            .catch(error => console.error('Ошибка получения истории звонков:', error));

        return () => { isMounted = false; };
    }, [user.id]);

    // useEffect запускается при загрузке и когда изменяется пользователь или его id
    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        // Монтирование: запускаем загрузку данных
        const cleanupProfileData = loadProfileData();
        const cleanupFriends = loadFriends();
        const cleanupFriendReq = loadFriendRequests();
        const cleanupCallHistory = loadCallHistory();
        // Функция очистки
        return () => {
            cleanupProfileData();
            cleanupFriends();
            cleanupFriendReq();
            cleanupCallHistory();
        };
    }, [user, navigate, loadProfileData, loadFriends, loadFriendRequests, loadCallHistory]);

    // Поиск пользователей для добавления в друзья
    const handleSearch = () => {
        if (searchQuery.trim() !== '') {
            fetch(`http://localhost:5000/search_users?q=${searchQuery}`)
                .then(res => res.json())
                .then(data => {
                    const filtered = data.filter(u => u.id !== user.id && !friends.some(f => f.id === u.id));
                    setSearchResults(filtered);
                })
                .catch(error => console.error('Ошибка поиска пользователей:', error));
        } else {
            setSearchResults([]);
        }
    };

    // Функция для отправки запроса на добавление друга
    const addFriend = (receiverId) => {
        const body = { requester_id: user.id, receiver_id: receiverId };
        fetch('http://localhost:5000/friend_request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
            .then(res => res.json())
            .then(data => {
                console.log('Ответ addFriend:', data.message);
            })
            .catch(error => console.error('Ошибка при добавлении в друзья:', error));
    };

    // Функции подтверждения и отклонения входящих запросов в друзья
    const confirmFriendRequest = (friendRequestId) => {
        fetch('http://localhost:5000/friend_request/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friend_request_id: friendRequestId })
        })
            .then(res => res.json())
            .then(data => {
                console.log('Ответ confirmFriendRequest:', data.message);
                loadFriends();
                loadFriendRequests();
            })
            .catch(error => console.error('Ошибка подтверждения запроса в друзья:', error));
    };

    const rejectFriendRequest = (friendRequestId) => {
        fetch('http://localhost:5000/friend_request/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friend_request_id: friendRequestId })
        })
            .then(res => res.json())
            .then(data => {
                console.log('Ответ rejectFriendRequest:', data.message);
                loadFriendRequests();
            })
            .catch(error => console.error('Ошибка отклонения запроса в друзья:', error));
    };

    // Функция удаления друга
    const removeFriend = (friendId) => {
        fetch(`http://localhost:5000/friendship?user_id=${user.id}&friend_id=${friendId}`, {
            method: 'DELETE'
        })
            .then(res => res.json())
            .then(data => {
                console.log('Ответ removeFriend:', data.message);
                loadFriends();
            })
            .catch(error => console.error('Ошибка при удалении друга:', error));
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
