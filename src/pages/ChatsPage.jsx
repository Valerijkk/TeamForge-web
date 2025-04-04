/* ------------------- pages/ChatsPage.jsx ------------------- */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

        // Получаем список чатов
        fetch(`http://localhost:5000/user_chats/${user.id}`)
            .then(res => res.json())
            .then(data => setChats(data));

        // Список всех пользователей
        fetch('http://localhost:5000/users')
            .then(res => res.json())
            .then(data => {
                // Исключаем себя
                const filtered = data.filter(u => u.id !== user.id);
                setAllUsers(filtered);
            });
    }, [user, navigate]);

    const toggleSelect = (u) => {
        if (selected.find(s => s.id === u.id)) {
            setSelected(selected.filter(s => s.id !== u.id));
        } else {
            setSelected([...selected, u]);
        }
    };

    const createChat = async () => {
        if (!chatName || selected.length === 0) {
            alert('Укажите название чата и выберите участников');
            return;
        }
        const userIds = selected.map(u => u.id);
        const res = await fetch('http://localhost:5000/create_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: chatName,
                user_ids: userIds,
                creator_id: user.id
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            const newChat = { id: data.chat_id, name: chatName, is_group: true };
            setChats(prev => [...prev, newChat]);
            navigate(`/chat/${newChat.id}`); // После создания переходим в чат
        } else {
            alert(data.message);
        }
    };

    const openChat = (chat) => {
        navigate(`/chat/${chat.id}`);
    };

    return (
        <div>
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
            <input
                type="text"
                placeholder="Название чата"
                value={chatName}
                onChange={e => setChatName(e.target.value)}
            />
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
