import React, { useState, useEffect } from 'react';

function ChatList({ user, setActiveChat }) {
    const [chats, setChats] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selected, setSelected] = useState([]);
    const [chatName, setChatName] = useState('');

    // Получаем список чатов для текущего пользователя
    useEffect(() => {
        fetch(`http://localhost:5000/user_chats/${user.id}`)
            .then(res => res.json())
            .then(data => setChats(data));
    }, [user.id]);

    // Получаем список всех пользователей для создания нового чата
    useEffect(() => {
        fetch('http://localhost:5000/users')
            .then(res => res.json())
            .then(data => setAllUsers(data.filter(u => u.id !== user.id)));
    }, [user.id]);

    const toggleSelect = (u) => {
        if (selected.find(s => s.id === u.id)) {
            setSelected(selected.filter(s => s.id !== u.id));
        } else {
            setSelected([...selected, u]);
        }
    };

    const createChat = async () => {
        if (!chatName || selected.length === 0) {
            alert("Введите имя чата и выберите участников");
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
            // После создания, обновляем список чатов
            const newChat = { id: data.chat_id, name: chatName, is_group: true };
            setChats(prev => [...prev, newChat]);
            setActiveChat(newChat);
        } else {
            alert(data.message);
        }
    };

    return (
        <div>
            <h3>Your Chats</h3>
            <ul>
                {chats.map(chat => (
                    <li key={chat.id} onClick={() => setActiveChat(chat)}>
                        {chat.name}
                    </li>
                ))}
            </ul>
            <hr />
            <h3>Create Group Chat</h3>
            <input
                type="text"
                placeholder="Chat Name"
                value={chatName}
                onChange={e => setChatName(e.target.value)}
            />
            <h4>Select Users:</h4>
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
            <button onClick={createChat}>Create Chat</button>
        </div>
    );
}

export default ChatList;
