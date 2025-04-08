/* ------------------- pages/ChatsPage.jsx ------------------- */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function sanitizeInput(value) {
    const forbiddenSQLPatterns = /drop\s+table|delete\s+from|truncate\s+table|update\s+.*\s+set|insert\s+into|select\s+.*\s+from/gi;
    let cleaned = value.replace(forbiddenSQLPatterns, '');
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    cleaned = cleaned.slice(0, 100);
    return cleaned.trim();
}

function ChatsPage({ user }) {
    const [chats, setChats] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selected, setSelected] = useState([]);
    const [chatName, setChatName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        // Локальный флаг монтирования
        let isMounted = true;

        // Получаем список чатов
        fetch(`http://localhost:5000/user_chats/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) {
                    setChats(data);
                }
            })
            .catch(err => console.error(err));

        // Получаем список всех пользователей и фильтруем себя
        fetch('http://localhost:5000/users')
            .then(res => res.json())
            .then(data => {
                if (isMounted) {
                    const filtered = data.filter(u => u.id !== user.id);
                    setAllUsers(filtered);
                }
            })
            .catch(err => console.error(err));

        return () => {
            isMounted = false;
        };
    }, [user, navigate]);

    const toggleSelect = (u) => {
        if (selected.find(s => s.id === u.id)) {
            setSelected(selected.filter(s => s.id !== u.id));
        } else {
            setSelected([...selected, u]);
        }
    };

    const createChat = async () => {
        const safeName = sanitizeInput(chatName);
        if (!safeName || selected.length === 0) {
            alert('Укажите название чата и выберите участников.');
            return;
        }
        const userIds = selected.map(u => u.id);
        try {
            const res = await fetch('http://localhost:5000/create_chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: safeName,
                    user_ids: userIds,
                    creator_id: user.id
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                const newChat = { id: data.chat_id, name: safeName, is_group: true };
                setChats(prev => [...prev, newChat]);
                navigate(`/chat/${newChat.id}`); // После создания переходим в чат
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Ошибка создания чата:', error);
        }
    };

    const openChat = (chat) => {
        navigate(`/chat/${chat.id}`);
    };

    return (
        <div className="container">
            <h2>Ваши чаты</h2>
            {chats.length === 0 ? (
                <p>У вас пока нет ни одного чата.</p>
            ) : (
                <ul className="chat-list">
                    {chats.map(chat => (
                        <li key={chat.id} onClick={() => openChat(chat)}>
                            {chat.name}
                        </li>
                    ))}
                </ul>
            )}
            <hr />
            <h3>Создать групповой чат</h3>
            <div className="form-group">
                <input
                    type="text"
                    placeholder="Название чата"
                    value={chatName}
                    onChange={e => setChatName(e.target.value)}
                />
            </div>
            <h4>Выберите участников:</h4>
            {allUsers.map(u => (
                <div key={u.id}>
                    <label>
                        <input
                            type="checkbox"
                            checked={!!selected.find(s => s.id === u.id)}
                            onChange={() => toggleSelect(u)}
                        />
                        {u.username}
                    </label>
                </div>
            ))}
            <button onClick={createChat}>Создать чат</button>
        </div>
    );
}

export default ChatsPage;
