import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatsPage.css';

function ChatsPage({ user }) {
    // Состояние: список чатов, все друзья и выбранные участники
    const [chats, setChats] = useState([]);
    const [allFriends, setAllFriends] = useState([]);
    const [selected, setSelected] = useState([]);
    const [chatName, setChatName] = useState('');
    const navigate = useNavigate();

    // Функция для очистки потенциально опасного ввода
    function sanitizeInput(value) {
        const forbiddenSQLPatterns = /drop\s+table|delete\s+from|truncate\s+table|update\s+.*\s+set|insert\s+into|select\s+.*\s+from/gi;
        let cleaned = value.replace(forbiddenSQLPatterns, '');
        cleaned = cleaned.replace(/<[^>]*>/g, '');
        cleaned = cleaned.slice(0, 100);
        return cleaned.trim();
    }

    // Загрузка чатов пользователя и списка друзей при монтировании
    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        let isMounted = true;

        // Получаем чаты
        fetch(`http://localhost:5000/user_chats/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) {
                    setChats(data);
                }
            })
            .catch(err => console.error(err));

        // Получаем друзей
        fetch(`http://localhost:5000/friends/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) {
                    setAllFriends(data);
                }
            })
            .catch(err => console.error(err));

        return () => {
            isMounted = false;
        };
    }, [user, navigate]);

    // Переключение включения/отключения пользователя в списке участников
    const toggleSelect = (u) => {
        if (selected.find(s => s.id === u.id)) {
            setSelected(selected.filter(s => s.id !== u.id));
        } else {
            setSelected([...selected, u]);
        }
    };

    // Создание нового группового чата
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
                // Добавляем новый чат в список и переходим в него
                const newChat = { id: data.chat_id, name: safeName, is_group: true };
                setChats(prev => [...prev, newChat]);
                navigate(`/chat/${newChat.id}`);
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Ошибка создания чата:', error);
        }
    };

    // Переход в выбранный чат
    const openChat = (chat) => {
        navigate(`/chat/${chat.id}`);
    };

    /* ====== ДОБАВЛЕНО: удаление чата ====== */
    const deleteChat = async (chat, e) => {
        e.stopPropagation(); // чтобы клик по корзине не открыл чат
        if (!window.confirm(`Удалить чат «${chat.name}»?`)) return;

        try {
            const res = await fetch(
                `http://localhost:5000/chat/${chat.id}?user_id=${user.id}`,
                { method: 'DELETE' }
            );
            const data = await res.json();
            if (data.status === 'success') {
                // Убираем чат из локального состояния
                setChats(prev => prev.filter(c => c.id !== chat.id));
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error('Ошибка удаления чата:', err);
        }
    };
    /* ====================================== */

    return (
        <div className="container chats-container">
            <h2>Ваши чаты</h2>
            {chats.length === 0 ? (
                <p>У вас пока нет ни одного чата.</p>
            ) : (
                <ul className="chat-list">
                    {chats.map(chat => (
                        <li key={chat.id} onClick={() => openChat(chat)}>
                            {/* имя чата слева */}
                            {chat.name}

                            {/* кнопка-корзина справа */}
                            <button
                                className="delete-chat-btn"
                                title="Удалить чат"
                                onClick={(e) => deleteChat(chat, e)}
                            >
                                🗑️
                            </button>
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

            <h4>Выберите участников (ваших друзей):</h4>
            <div className="select-users">
                {allFriends.map(u => (
                    <label key={u.id} className="user-checkbox">
                        <input
                            type="checkbox"
                            checked={!!selected.find(s => s.id === u.id)}
                            onChange={() => toggleSelect(u)}
                        />
                        {u.username}
                    </label>
                ))}
            </div>

            <button onClick={createChat} className="create-chat-btn">Создать чат</button>
        </div>
    );
}

export default ChatsPage;
